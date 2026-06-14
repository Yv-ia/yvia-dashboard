// Regroupement des opportunités par statut commercial, pour l'affichage Kanban.
// Pur (testable sans base ni rendu).

import {
  STATUTS_COMMERCIAUX,
  normaliserStatutCommercial,
  type StatutCommercialProjet,
} from "@/lib/projets/statut-commercial";

export type ColonneKanban<T> = {
  statut: StatutCommercialProjet;
  label: string;
  items: T[];
};

// Une colonne par statut (dans l'ordre du pipeline). Les items de chaque colonne
// sont triés par `ordre` croissant.
export function grouperParStatut<T extends { statut: string; ordre: number }>(
  opportunites: T[]
): ColonneKanban<T>[] {
  return STATUTS_COMMERCIAUX.map((s) => ({
    statut: s.key,
    label: s.label,
    items: opportunites
      .filter((o) => normaliserStatutCommercial(o.statut) === s.key)
      .sort((a, b) => a.ordre - b.ordre),
  }));
}
