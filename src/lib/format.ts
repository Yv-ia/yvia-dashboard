// Mise en forme des valeurs pour l'affichage (interface en français).

// Montant en euros avec séparateur de milliers, ex : 1250 -> "1 250 €".
export function formatEuro(montant: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(montant);
}

// Nombre de jours, ex : 13.2 -> "13,2".
export function formatJours(jours: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(jours);
}

// Date "AAAA-MM-JJ" -> "JJ/MM/AAAA". Renvoie "-" si vide.
export function formatDate(dateISO: string | null): string {
  if (!dateISO) return "-";
  const [annee, mois, jour] = dateISO.split("-");
  return `${jour}/${mois}/${annee}`;
}

// Pourcentage, ex : 0.2308 -> "23 %".
export function formatPourcent(ratio: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(ratio);
}
