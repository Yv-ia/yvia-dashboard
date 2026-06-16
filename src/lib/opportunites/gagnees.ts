// Cycle de vie mensuel des opportunités GAGNÉES.
//
// Une opportunité gagnée n'est « du mois » que le mois de sa signature
// (`dateGagne`). Au passage à un nouveau mois, les gagnées des mois précédents
// quittent automatiquement la colonne « Gagné » du tableau et basculent dans les
// archives — sans écriture en base : c'est dérivé de `dateGagne`, donc le CA
// (booké au mois de signature) reste intact.
//
// Fonctions pures pour rester testables (pas d'accès base, pas de `new Date()`).

import { normaliserStatutCommercial } from "@/lib/projets/statut-commercial";

// Mois 'YYYY-MM' d'une date 'YYYY-MM-DD'.
export function moisDeDate(date: string): string {
  return date.slice(0, 7);
}

// Mois courant 'YYYY-MM' à partir d'un instant donné (UTC, cohérent avec le
// booking de `dateGagne` qui est lui aussi en UTC).
export function moisCourantDe(maintenant: Date): string {
  return maintenant.toISOString().slice(0, 7);
}

type AvecStatutEtDate = { statut: string; dateGagne: string | null };

// Vrai si l'opportunité est gagnée ET signée pendant le mois courant.
export function estGagneeDuMois(opp: AvecStatutEtDate, moisCourant: string): boolean {
  if (normaliserStatutCommercial(opp.statut) !== "gagne") return false;
  if (!opp.dateGagne) return true; // gagnée sans date : on la garde sur le tableau
  return moisDeDate(opp.dateGagne) === moisCourant;
}

// Vrai si l'opportunité gagnée appartient à un mois RÉVOLU (à archiver / masquer).
export function estGagneeArchivee(opp: AvecStatutEtDate, moisCourant: string): boolean {
  if (normaliserStatutCommercial(opp.statut) !== "gagne") return false;
  if (!opp.dateGagne) return false;
  return moisDeDate(opp.dateGagne) < moisCourant;
}

// Sépare un lot d'opportunités en deux : celles qui restent sur le tableau Kanban
// (toutes sauf les gagnées des mois révolus) et les gagnées archivées.
export function separerGagneesArchivees<T extends AvecStatutEtDate>(
  opportunites: T[],
  moisCourant: string
): { tableau: T[]; archivees: T[] } {
  const tableau: T[] = [];
  const archivees: T[] = [];
  for (const opp of opportunites) {
    if (estGagneeArchivee(opp, moisCourant)) archivees.push(opp);
    else tableau.push(opp);
  }
  return { tableau, archivees };
}
