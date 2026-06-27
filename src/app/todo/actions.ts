"use server";
// Gestion des to-do de pilotage. Outil interne d'organisation : toute personne
// connectée peut les gérer (pas de marge ni de donnée sensible exposée).

import { db } from "@/db";
import { todos, parametres } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigerConnecte } from "@/lib/auth/garde";
import { normaliserStatutTodo, basculerStatutTodo } from "@/lib/todos/statut";
import { normaliserDomaineTodo } from "@/lib/todos/domaine";
import { cleOrdreColonne } from "@/lib/todos/colonnes";

export type Resultat = { ok: false; message?: string } | { ok: true; id?: number };

// Les deux pages qui affichent des to-do : la liste complète et le dashboard.
function rafraichir() {
  revalidatePath("/todo");
  revalidatePath("/");
}

export async function creerTodo(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) return { ok: false, message: "Le titre est obligatoire." };
  const description = String(formData.get("description") ?? "").trim() || null;
  const statut = normaliserStatutTodo(String(formData.get("statut") ?? ""));
  const domaine = normaliserDomaineTodo(String(formData.get("domaine") ?? ""));
  const owner = String(formData.get("owner") ?? "").trim() || null;
  // parentId renseigné => sous-tâche rattachée à une macro-tâche.
  const parentBrut = Number(formData.get("parentId"));
  const parentId = Number.isInteger(parentBrut) && parentBrut > 0 ? parentBrut : null;

  const [todo] = await db
    .insert(todos)
    .values({ titre, description, statut, domaine, owner, parentId })
    .returning({ id: todos.id });
  rafraichir();
  return { ok: true, id: todo.id };
}

export async function modifierTodo(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  const titre = String(formData.get("titre") ?? "").trim();
  if (!id) return { ok: false, message: "To-do introuvable." };
  if (!titre) return { ok: false, message: "Le titre est obligatoire." };
  const description = String(formData.get("description") ?? "").trim() || null;
  const statut = normaliserStatutTodo(String(formData.get("statut") ?? ""));
  const domaine = normaliserDomaineTodo(String(formData.get("domaine") ?? ""));
  const owner = String(formData.get("owner") ?? "").trim() || null;

  await db
    .update(todos)
    .set({ titre, description, statut, domaine, owner })
    .where(eq(todos.id, id));
  rafraichir();
  return { ok: true };
}

// Coche / décoche : fait ↔ à faire (cf. basculerStatutTodo).
export async function basculerTodo(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "To-do introuvable." };

  const [todo] = await db.select({ statut: todos.statut }).from(todos).where(eq(todos.id, id));
  if (!todo) return { ok: false, message: "To-do introuvable." };

  await db
    .update(todos)
    .set({ statut: basculerStatutTodo(todo.statut) })
    .where(eq(todos.id, id));
  rafraichir();
  return { ok: true };
}

// Glisser-déposer du Kanban : range une colonne entière. Chaque id de la liste
// (dans l'ordre, séparés par des virgules) reçoit le `domaine` cible (vide =>
// null, « Non classé ») et un `ordre` = sa position. Sert à la fois à déplacer
// une carte vers un autre domaine et à fixer la priorité intra-colonne.
export async function ordonnerColonneTodos(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const domaine = normaliserDomaineTodo(String(formData.get("domaine") ?? ""));
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return { ok: false, message: "Ordre invalide." };

  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(todos).set({ domaine, ordre: i }).where(eq(todos.id, ids[i]));
    }
  });
  rafraichir();
  return { ok: true };
}

// Réordonne les colonnes du Kanban : persiste la position (rang) de chaque
// domaine selon la liste fournie (clés séparées par des virgules). Les clés
// inconnues sont ignorées.
export async function ordonnerColonnesKanban(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const cles = String(formData.get("cles") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((c) => normaliserDomaineTodo(c) !== null);
  if (cles.length === 0) return { ok: false, message: "Ordre invalide." };

  await db.transaction(async (tx) => {
    for (let i = 0; i < cles.length; i++) {
      await tx
        .insert(parametres)
        .values({ cle: cleOrdreColonne(cles[i]), valeur: String(i) })
        .onConflictDoUpdate({ target: parametres.cle, set: { valeur: String(i) } });
    }
  });
  rafraichir();
  return { ok: true };
}

export async function supprimerTodo(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "To-do introuvable." };

  await db.delete(todos).where(eq(todos.id, id));
  rafraichir();
  return { ok: true };
}
