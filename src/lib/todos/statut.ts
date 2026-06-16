// Statut d'une to-do de pilotage : à faire → en cours → fait.
// Même esprit que src/lib/clients/statut.ts (fonctions pures, testables).

export const STATUTS_TODO = [
  { key: "a_faire", label: "À faire" },
  { key: "en_cours", label: "En cours" },
  { key: "fait", label: "Fait" },
] as const;

export type StatutTodo = (typeof STATUTS_TODO)[number]["key"];

const STATUTS = new Set<string>(STATUTS_TODO.map((s) => s.key));
const LABELS = new Map<StatutTodo, string>(STATUTS_TODO.map((s) => [s.key, s.label]));

// Nouvelle to-do : on part de « à faire ».
export const STATUT_TODO_DEFAUT: StatutTodo = "a_faire";

export function normaliserStatutTodo(statut: string | null | undefined): StatutTodo {
  return STATUTS.has(statut ?? "") ? (statut as StatutTodo) : STATUT_TODO_DEFAUT;
}

export function labelStatutTodo(statut: string | null | undefined): string {
  return LABELS.get(normaliserStatutTodo(statut)) ?? statut ?? "";
}

// Une to-do est terminée quand elle est « faite ».
export function estTodoFaite(statut: string | null | undefined): boolean {
  return normaliserStatutTodo(statut) === "fait";
}

// Bascule de la case à cocher : faite ↔ à faire. Une to-do « en cours » qu'on
// coche passe à « fait » ; qu'on décoche, repasse à « à faire ».
export function basculerStatutTodo(statut: string | null | undefined): StatutTodo {
  return estTodoFaite(statut) ? "a_faire" : "fait";
}
