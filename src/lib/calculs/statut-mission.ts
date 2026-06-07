// Statut d'une mission, calculé automatiquement à partir des dates (spec section 2).
// Jamais saisi à la main.

export type StatutMission = "à venir" | "en cours" | "terminée";

// Les dates sont au format "AAAA-MM-JJ" : la comparaison de texte = comparaison chronologique.
export function statutMission(
  dateDebut: string,
  dateFin: string | null,
  aujourdhui: string
): StatutMission {
  if (dateDebut > aujourdhui) return "à venir";
  if (dateFin && dateFin < aujourdhui) return "terminée";
  return "en cours";
}
