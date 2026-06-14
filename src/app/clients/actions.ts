"use server";
// Le middleware ne protège PAS les Server Actions : chaque mutation vérifie la session.

import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigerConnecte } from "@/lib/auth/garde";
import { normaliserStatutClient } from "@/lib/clients/statut";

export type ClientCree = { id: number; nom: string };
export type Resultat = { ok: false; message?: string } | { ok: true; client?: ClientCree };

// La gestion des clients fait partie du périmètre commercial : tout utilisateur
// connecté (y compris commercial) peut créer/modifier un client.
async function verifierConnecte(): Promise<Resultat> {
  return exigerConnecte();
}

export async function creerClient(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { ok: false, message: "Le nom de la société est obligatoire." };
  // Statut optionnel à la création ; défaut 'lead' (cf. normaliserStatutClient).
  const statut = normaliserStatutClient(String(formData.get("statut") ?? ""));

  const [client] = await db
    .insert(clients)
    .values({ nom, statut })
    .returning({ id: clients.id, nom: clients.nom });
  revalidatePath("/clients");
  revalidatePath("/missions");
  revalidatePath("/projets");
  revalidatePath("/");
  return { ok: true, client };
}

export async function modifierClient(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const id = Number(formData.get("id"));
  const nom = String(formData.get("nom") ?? "").trim();
  if (!id) return { ok: false, message: "Client introuvable." };
  if (!nom) return { ok: false, message: "Le nom de la société est obligatoire." };
  const statut = normaliserStatutClient(String(formData.get("statut") ?? ""));

  await db.update(clients).set({ nom, statut }).where(eq(clients.id, id));

  revalidatePath("/clients");
  return { ok: true };
}

// Change uniquement le statut commercial d'un client (lead/prospect/signé/inactif),
// par ex. depuis la liste. Réservé aux utilisateurs connectés (commercial inclus).
export async function definirStatutClient(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Client introuvable." };
  const statut = normaliserStatutClient(String(formData.get("statut") ?? ""));

  await db.update(clients).set({ statut }).where(eq(clients.id, id));
  revalidatePath("/clients");
  return { ok: true };
}

export async function basculerActifClient(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const id = Number(formData.get("id"));
  const actif = String(formData.get("actif")) === "true";
  if (!id) return { ok: false, message: "Client introuvable." };

  await db.update(clients).set({ actif: !actif }).where(eq(clients.id, id));
  revalidatePath("/clients");
  revalidatePath("/");
  return { ok: true };
}
