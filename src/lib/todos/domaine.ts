// Domaine métier d'une to-do de pilotage : sous quel chapeau ranger l'action.
// Remplace l'ancien flag « epic » (grosse to-do) par une catégorie. Même esprit
// que src/lib/todos/statut.ts (fonctions pures, testables).

// Domaines = colonnes du Kanban /todo. Cet ordre est l'ordre PAR DÉFAUT ; il peut
// être réorganisé par l'utilisateur (persisté dans `parametres`, cf.
// lib/todos/colonnes.ts). Lu de gauche à droite comme un flux de pilotage.
export const DOMAINES_TODO = [
  { key: "strategie", label: "Stratégie / Pilotage" },
  { key: "sales", label: "Sales" },
  { key: "delivery", label: "Delivery" },
  { key: "finance_admin", label: "Finance & Admin" },
] as const;

export type DomaineTodo = (typeof DOMAINES_TODO)[number]["key"];

const DOMAINES = new Set<string>(DOMAINES_TODO.map((d) => d.key));
const LABELS = new Map<DomaineTodo, string>(DOMAINES_TODO.map((d) => [d.key, d.label]));

// Libellé d'une to-do sans domaine assigné (domaine null en base).
export const DOMAINE_TODO_NON_CLASSE = "Non classé";

// Domaine valide, ou null si vide / inconnu (to-do « non classée »).
export function normaliserDomaineTodo(domaine: string | null | undefined): DomaineTodo | null {
  return DOMAINES.has(domaine ?? "") ? (domaine as DomaineTodo) : null;
}

export function labelDomaineTodo(domaine: string | null | undefined): string {
  const d = normaliserDomaineTodo(domaine);
  return d ? (LABELS.get(d) as string) : DOMAINE_TODO_NON_CLASSE;
}
