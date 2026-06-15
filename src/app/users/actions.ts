"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { getSession } from "@/lib/auth/server";
import { estAdmin, estRoleValide } from "@/lib/auth/session";

export type Resultat = { ok: boolean; message?: string };
export type ResultatInvitation = Resultat & { token?: string };

const DUREE_INVITATION_MS = 7 * 24 * 60 * 60 * 1000;

async function verifierAdmin(): Promise<Resultat & { userId?: number }> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Vous n'êtes pas connecté." };
  if (!estAdmin(session)) {
    return { ok: false, message: "Seul un administrateur peut gérer les utilisateurs." };
  }
  return { ok: true, userId: session.userId };
}

export async function supprimerUtilisateur(formData: FormData): Promise<Resultat> {
  const autorisation = await verifierAdmin();
  if (!autorisation.ok) return autorisation;

  const id = Number(formData.get("id"));

  if (!id) return { ok: false, message: "Utilisateur introuvable." };
  if (id === autorisation.userId) {
    return { ok: false, message: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/users");
  return { ok: true };
}

export async function modifierRoleUtilisateur(formData: FormData): Promise<Resultat> {
  const autorisation = await verifierAdmin();
  if (!autorisation.ok) return autorisation;

  const id = Number(formData.get("id"));
  const roleDemande = String(formData.get("role") ?? "");

  if (!id) return { ok: false, message: "Utilisateur introuvable." };
  if (id === autorisation.userId) {
    return { ok: false, message: "Vous ne pouvez pas modifier votre propre rôle." };
  }
  if (!estRoleValide(roleDemande)) {
    return { ok: false, message: "Rôle invalide." };
  }

  const [utilisateur] = await db
    .update(users)
    .set({ role: roleDemande })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!utilisateur) return { ok: false, message: "Utilisateur introuvable." };

  revalidatePath("/users");
  return { ok: true };
}

export async function creerInvitation(formData: FormData): Promise<ResultatInvitation> {
  const autorisation = await verifierAdmin();
  if (!autorisation.ok) return autorisation;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const prenom = String(formData.get("prenom") ?? "").trim() || null;
  const nom = String(formData.get("nom") ?? "").trim() || null;
  // Rôle attribué au futur compte. Valeur inconnue (ou absente) => 'user'.
  const roleDemande = String(formData.get("role") ?? "");
  const role = estRoleValide(roleDemande) ? roleDemande : "user";
  if (!email) return { ok: false, message: "L'email de l'invité est obligatoire." };

  const [existant] = await db.select().from(users).where(eq(users.email, email));
  if (existant) return { ok: false, message: "Un compte existe déjà pour cet email." };

  const token = randomBytes(32).toString("hex");
  const expireLe = new Date(Date.now() + DUREE_INVITATION_MS).toISOString();
  await db.insert(invitations).values({ token, email, prenom, nom, expireLe, role });

  revalidatePath("/users");
  return { ok: true, token };
}

export async function supprimerInvitation(formData: FormData): Promise<Resultat> {
  const autorisation = await verifierAdmin();
  if (!autorisation.ok) return autorisation;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Invitation introuvable." };
  await db.delete(invitations).where(eq(invitations.id, id));

  revalidatePath("/users");
  return { ok: true };
}
