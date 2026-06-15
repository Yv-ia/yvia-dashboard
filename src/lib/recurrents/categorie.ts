// Catégorie d'un revenu récurrent : régie (adossée à des missions), RUN/maintenance
// ou licence/abonnement. Module pur (serveur, client, tests).

export const CATEGORIES_RECURRENT = [
  { key: "regie", label: "Régie" },
  { key: "run", label: "RUN / Maintenance" },
  { key: "licence", label: "Licence / Abonnement" },
] as const;

export type CategorieRecurrent = (typeof CATEGORIES_RECURRENT)[number]["key"];

const CATEGORIES = new Set<string>(CATEGORIES_RECURRENT.map((c) => c.key));
const LABELS = new Map<CategorieRecurrent, string>(
  CATEGORIES_RECURRENT.map((c) => [c.key, c.label])
);

export const CATEGORIE_RECURRENT_DEFAUT: CategorieRecurrent = "regie";

export function normaliserCategorieRecurrent(
  categorie: string | null | undefined
): CategorieRecurrent {
  return CATEGORIES.has(categorie ?? "")
    ? (categorie as CategorieRecurrent)
    : CATEGORIE_RECURRENT_DEFAUT;
}

export function labelCategorieRecurrent(categorie: string | null | undefined): string {
  return LABELS.get(normaliserCategorieRecurrent(categorie)) ?? categorie ?? "";
}

// Le coût d'une régie est dérivé du planning (affectations) et non saisi à la
// main ; RUN et licence ont un coût récurrent saisi manuellement.
export function coutDerivePlanning(categorie: string | null | undefined): boolean {
  return normaliserCategorieRecurrent(categorie) === "regie";
}
