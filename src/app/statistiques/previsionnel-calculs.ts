// Synthèse prévisionnelle sur 12 mois, par source de CA. Module pur (testable).
//
//  - Régie      : Σ TJM vente des affectations du mois (réalisé passé + jours saisis
//                 d'avance dans le planning = prévisionnel saisi).
//  - Récurrence : projection des contrats récurrents (RUN / licence) — réalisé ou
//                 estimation mensuelle (cf. projeterRecurrent). La régie en est exclue
//                 (déjà portée par la ligne Régie) pour ne pas la compter deux fois.
//  - Forfait    : Σ de l'échéancier des projets signés (encaissements réalisés ET
//                 prévus) — le CA du deal, pas seulement ce qui est déjà encaissé.

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

export function calculerPrevisionnel12Mois({
  annee,
  affectations,
  encaissements,
  recurrents,
}: {
  annee: number;
  affectations: { date: string; tjmVente: Montant }[];
  encaissements: { date: string; montant: Montant }[];
  recurrents: RecurrentPrevisionnel[]; // déjà filtrés hors régie côté requête
}): { lignes: LignePrevisionnel12[]; totaux: TotauxPrevisionnel12 } {
  const horizon = moisDeLAnnee(annee);
  const regie = new Map<string, number>();
  const forfait = new Map<string, number>();
  const recurrence = new Map<string, number>();

  for (const a of affectations) {
    const m = versMois(a.date);
    regie.set(m, (regie.get(m) ?? 0) + Number(a.tjmVente));
  }
  for (const e of encaissements) {
    const m = versMois(e.date);
    forfait.set(m, (forfait.get(m) ?? 0) + Number(e.montant));
  }
  const planningVide: PlanningMensuel = new Map();
  for (const r of recurrents) {
    for (const p of projeterRecurrent(r, planningVide, horizon)) {
      recurrence.set(p.mois, (recurrence.get(p.mois) ?? 0) + p.revenu);
    }
  }

  const lignes = horizon.map((mois) => {
    const rg = arrondi(regie.get(mois) ?? 0);
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
