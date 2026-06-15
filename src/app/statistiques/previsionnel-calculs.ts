// Synthèse prévisionnelle sur 12 mois, par source de CA. Module pur (testable).
//
//  - Régie      : réel du planning là où il existe (Σ TJM vente des affectations du
//                 mois), sinon l'hypothèse macro (récurrents catégorie régie : un
//                 montant mensuel sur une période début→fin). Le détail jour-par-jour
//                 prime, le macro prend le relais sur les mois non encore planifiés.
//  - Récurrence : projection des contrats récurrents RUN / licence (la régie est
//                 portée par sa propre ligne → exclue ici, pas de double compte).
//  - Forfait    : booking — le CA d'un deal forfait gagné compte dans le mois de sa
//                 signature (date_gagne). Le suivi des encaissements est ailleurs.

import {
  projeterRecurrent,
  type PlanningMensuel,
  type RecurrentPrevisionnel,
} from "@/lib/recurrents/previsionnel";

type Montant = number | string;

export type LignePrevisionnel12 = {
  mois: string; // 'YYYY-MM'
  regie: number;
  recurrence: number;
  forfait: number;
  total: number;
};

export type TotauxPrevisionnel12 = {
  regie: number;
  recurrence: number;
  forfait: number;
  total: number;
};

const arrondi = (n: number) => Math.round(n * 100) / 100;
const versMois = (date: string) => date.slice(0, 7);

export function moisDeLAnnee(annee: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${annee}-${String(i + 1).padStart(2, "0")}`);
}

// Projette une liste de récurrents sur l'horizon (planning vide = estimation pure
// par le montant macro), agrégée par mois.
function projeterParMois(recurrents: RecurrentPrevisionnel[], horizon: string[]): Map<string, number> {
  const parMois = new Map<string, number>();
  const planningVide: PlanningMensuel = new Map();
  for (const r of recurrents) {
    for (const p of projeterRecurrent(r, planningVide, horizon)) {
      parMois.set(p.mois, (parMois.get(p.mois) ?? 0) + p.revenu);
    }
  }
  return parMois;
}

export function calculerPrevisionnel12Mois({
  annee,
  affectations,
  recurrentsRegie,
  recurrentsNonRegie,
  forfaitsGagnes,
}: {
  annee: number;
  affectations: { date: string; tjmVente: Montant }[];
  recurrentsRegie: RecurrentPrevisionnel[]; // hypothèses macro de régie (catégorie régie)
  recurrentsNonRegie: RecurrentPrevisionnel[]; // RUN / licence → ligne Récurrence
  forfaitsGagnes: { dateGagne: string | null; montant: Montant | null }[]; // opps forfait gagnées
}): { lignes: LignePrevisionnel12[]; totaux: TotauxPrevisionnel12 } {
  const horizon = moisDeLAnnee(annee);

  const regieReel = new Map<string, number>();
  for (const a of affectations) {
    const m = versMois(a.date);
    regieReel.set(m, (regieReel.get(m) ?? 0) + Number(a.tjmVente));
  }
  const regieMacro = projeterParMois(recurrentsRegie, horizon);
  const recurrence = projeterParMois(recurrentsNonRegie, horizon);

  const forfait = new Map<string, number>();
  for (const f of forfaitsGagnes) {
    if (!f.dateGagne) continue; // pas encore signé/daté → pas bookable
    const m = versMois(f.dateGagne);
    forfait.set(m, (forfait.get(m) ?? 0) + Number(f.montant ?? 0));
  }

  const lignes = horizon.map((mois) => {
    const reel = regieReel.get(mois) ?? 0;
    // Réel du planning s'il existe ce mois-ci, sinon l'hypothèse macro.
    const rg = arrondi(reel > 0 ? reel : regieMacro.get(mois) ?? 0);
    const rc = arrondi(recurrence.get(mois) ?? 0);
    const ff = arrondi(forfait.get(mois) ?? 0);
    return { mois, regie: rg, recurrence: rc, forfait: ff, total: arrondi(rg + rc + ff) };
  });

  const totaux: TotauxPrevisionnel12 = {
    regie: arrondi(lignes.reduce((s, l) => s + l.regie, 0)),
    recurrence: arrondi(lignes.reduce((s, l) => s + l.recurrence, 0)),
    forfait: arrondi(lignes.reduce((s, l) => s + l.forfait, 0)),
    total: arrondi(lignes.reduce((s, l) => s + l.total, 0)),
  };

  return { lignes, totaux };
}
