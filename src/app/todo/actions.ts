"use server";
// Gestion des to-do de pilotage. Outil interne d'organisation : toute personne
// connectée peut les gérer (pas de marge ni de donnée sensible exposée).

import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigerConnecte } from "@/lib/auth/garde";
import { normaliserStatutTodo, basculerStatutTodo } from "@/lib/todos/statut";

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
  const epic = String(formData.get("epic")) === "true";

  const [todo] = await db
    .insert(todos)
    .values({ titre, description, statut, epic })
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
  const epic = String(formData.get("epic")) === "true";

  await db.update(todos).set({ titre, description, statut, epic }).where(eq(todos.id, id));
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

// Marque / démarque une to-do comme « epic » (remontée sur le dashboard).
export async function basculerEpic(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  const epic = String(formData.get("epic")) === "true";
  if (!id) return { ok: false, message: "To-do introuvable." };

  await db.update(todos).set({ epic: !epic }).where(eq(todos.id, id));
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
