export const STATUTS_COMMERCIAUX = [
  { key: "a_qualifier", label: "À qualifier" },
  { key: "en_discussion", label: "En discussion" },
  { key: "proposition_envoyee", label: "Proposition envoyée" },
  { key: "gagne", label: "Gagné" },
  { key: "perdu", label: "Perdu" },
] as const;

export type StatutCommercialProjet = (typeof STATUTS_COMMERCIAUX)[number]["key"];

// Classes de badge par statut, partagées (liste projets, Kanban des opportunités…).
export const STATUT_COMMERCIAL_BADGE_CLASSES: Record<StatutCommercialProjet, string> = {
  a_qualifier: "border-yvia-line-strong bg-yvia-ice text-yvia-slate",
  en_discussion: "border-amber-200 bg-amber-50 text-amber-700",
  proposition_envoyee: "border-sky-200 bg-sky-50 text-sky-700",
  gagne: "border-emerald-200 bg-emerald-50 text-emerald-700",
  perdu: "border-rose-200 bg-rose-50 text-rose-700",
};

const STATUTS = new Set<string>(STATUTS_COMMERCIAUX.map((s) => s.key));
const LABELS = new Map<StatutCommercialProjet, string>(
  STATUTS_COMMERCIAUX.map((s) => [s.key, s.label])
);

export const STATUT_COMMERCIAL_DEFAUT: StatutCommercialProjet = "a_qualifier";
export const STATUT_COMMERCIAL_EXISTANT: StatutCommercialProjet = "gagne";

export function normaliserStatutCommercial(
  statut: string | null | undefined
): StatutCommercialProjet {
  return STATUTS.has(statut ?? "")
    ? (statut as StatutCommercialProjet)
    : STATUT_COMMERCIAL_DEFAUT;
}

export function labelStatutCommercial(statut: string | null | undefined): string {
  return LABELS.get(normaliserStatutCommercial(statut)) ?? statut ?? "";
}

export function estProjetDansFluxActif(projet: {
  actif: boolean;
  statutCommercial: string | null;
}): boolean {
  return projet.actif && normaliserStatutCommercial(projet.statutCommercial) !== "perdu";
}

export function estProjetTermineOuPerdu(projet: {
  actif: boolean;
  statutCommercial: string | null;
}): boolean {
  return !projet.actif || normaliserStatutCommercial(projet.statutCommercial) === "perdu";
}
