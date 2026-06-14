// Statut commercial d'un client : du prospect au compte signé.
// Même esprit que src/lib/projets/statut-commercial.ts.

export const STATUTS_CLIENT = [
  { key: "lead", label: "Lead" },
  { key: "prospect", label: "Prospect" },
  { key: "signe", label: "Signé" },
  { key: "inactif", label: "Inactif" },
] as const;

export type StatutClient = (typeof STATUTS_CLIENT)[number]["key"];

const STATUTS = new Set<string>(STATUTS_CLIENT.map((s) => s.key));
const LABELS = new Map<StatutClient, string>(STATUTS_CLIENT.map((s) => [s.key, s.label]));

// Nouveau client : on part d'un lead.
export const STATUT_CLIENT_DEFAUT: StatutClient = "lead";
// Migration des clients déjà en base : ce sont des comptes signés.
export const STATUT_CLIENT_EXISTANT: StatutClient = "signe";

export function normaliserStatutClient(statut: string | null | undefined): StatutClient {
  return STATUTS.has(statut ?? "") ? (statut as StatutClient) : STATUT_CLIENT_DEFAUT;
}

export function labelStatutClient(statut: string | null | undefined): string {
  return LABELS.get(normaliserStatutClient(statut)) ?? statut ?? "";
}

// Un client est considéré « signé » une fois le contrat acté.
export function estClientSigne(statut: string | null | undefined): boolean {
  return normaliserStatutClient(statut) === "signe";
}
