// Type d'une opportunité commerciale : forfait (ponctuel) ou récurrent (MRR).
// Module pur (utilisable côté serveur, client et tests), sur le modèle de
// src/lib/clients/statut.ts.

export const TYPES_OPPORTUNITE = [
  { key: "forfait", label: "Forfait" },
  { key: "recurrent", label: "Récurrent" },
] as const;

export type TypeOpportunite = (typeof TYPES_OPPORTUNITE)[number]["key"];

const TYPES = new Set<string>(TYPES_OPPORTUNITE.map((t) => t.key));
const LABELS = new Map<TypeOpportunite, string>(
  TYPES_OPPORTUNITE.map((t) => [t.key, t.label])
);

export const TYPE_OPPORTUNITE_DEFAUT: TypeOpportunite = "forfait";

export function normaliserTypeOpportunite(
  type: string | null | undefined
): TypeOpportunite {
  return TYPES.has(type ?? "") ? (type as TypeOpportunite) : TYPE_OPPORTUNITE_DEFAUT;
}

export function labelTypeOpportunite(type: string | null | undefined): string {
  return LABELS.get(normaliserTypeOpportunite(type)) ?? type ?? "";
}
