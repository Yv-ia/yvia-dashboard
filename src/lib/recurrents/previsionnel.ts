// Pont prévisionnel des revenus récurrents : relie le planning opérationnel réel
// (affectations des missions reliées, pour la régie) et l'estimation récurrente
// vendue. Pour chaque mois de l'horizon :
//   - régie AVEC planning ce mois-là → réalisé (vente/coût des affectations) ;
//   - sinon → estimation récurrente (montantRecurrent / coutRecurrent).
// Calcul à la volée, sans échéances matérialisées. Module pur (testable).

import { normaliserCategorieRecurrent } from "./categorie";

export type PointPrevisionnel = {
  mois: string; // 'YYYY-MM'
  revenu: number;
  cout: number;
  marge: number;
  source: "planning" | "estimation";
};

export type RecurrentPrevisionnel = {
  categorie: string;
  montantRecurrent: number;
  coutRecurrent: number | null;
  dateDebut: string; // 'YYYY-MM-DD'
  dateFin: string | null; // 'YYYY-MM-DD' | null (en cours)
};

// Réalisé du planning agrégé par mois 'YYYY-MM' (Σ vente, Σ coût des affectations).
export type PlanningMensuel = Map<string, { vente: number; cout: number }>;

const versMois = (date: string) => date.slice(0, 7); // 'YYYY-MM-DD' → 'YYYY-MM'

export function projeterRecurrent(
  rec: RecurrentPrevisionnel,
  planning: PlanningMensuel,
  horizon: string[] // liste de 'YYYY-MM'
): PointPrevisionnel[] {
  const debut = versMois(rec.dateDebut);
  const fin = rec.dateFin ? versMois(rec.dateFin) : null;
  const estRegie = normaliserCategorieRecurrent(rec.categorie) === "regie";

  const points: PointPrevisionnel[] = [];
  for (const mois of horizon) {
    if (mois < debut) continue; // pas encore commencé
    if (fin && mois > fin) continue; // déjà terminé

    // Le planning ne fait foi que pour la régie (RUN/licence n'a pas d'affectation).
    const reel = estRegie ? planning.get(mois) : undefined;
    if (reel) {
      points.push({ mois, revenu: reel.vente, cout: reel.cout, marge: reel.vente - reel.cout, source: "planning" });
    } else {
      const revenu = rec.montantRecurrent;
      const cout = rec.coutRecurrent ?? 0;
      points.push({ mois, revenu, cout, marge: revenu - cout, source: "estimation" });
    }
  }
  return points;
}

// Total d'une projection (pratique pour un récap annuel / sur horizon).
export function totaliserProjection(points: PointPrevisionnel[]): {
  revenu: number;
  cout: number;
  marge: number;
} {
  return points.reduce(
    (acc, p) => ({ revenu: acc.revenu + p.revenu, cout: acc.cout + p.cout, marge: acc.marge + p.marge }),
    { revenu: 0, cout: 0, marge: 0 }
  );
}
