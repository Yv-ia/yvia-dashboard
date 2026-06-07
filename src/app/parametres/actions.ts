"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, invitations } from "@/db/schema";
import { getSession } from "@/lib/auth/server";
import { hasherMotDePasse, verifierMotDePasse } from "@/lib/auth/password";

export type Resultat = { ok: boolean; message?: string };
export type ResultatInvitation = { ok: boolean; message?: string; token?: string };

const DUREE_INVITATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export async function changerMotDePasse(formData: FormData): Promise<Resultat> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Vous n'êtes pas connecté." };

  const actuel = String(formData.get("actuel") ?? "");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (nouveau.length < 8) {
    return { ok: false, message: "Le nouveau mot de passe doit faire au moins 8 caractères." };
  }
  if (nouveau !== confirmation) {
    return { ok: false, message: "La confirmation ne correspond pas au nouveau mot de passe." };
  }

  const [u] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!u || !verifierMotDePasse(actuel, u.passwordHash)) {
    return { ok: false, message: "Mot de passe actuel incorrect." };
  }

  await db
    .update(users)
    .set({ passwordHash: hasherMotDePasse(nouveau) })
    .where(eq(users.id, session.userId));

  return { ok: true };
}

export async function creerInvitation(formData: FormData): Promise<ResultatInvitation> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Vous n'êtes pas connecté." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nom = String(formData.get("nom") ?? "").trim() || null;
  if (!email) return { ok: false, message: "L'email de l'invité est obligatoire." };

  const [existant] = await db.select().from(users).where(eq(users.email, email));
  if (existant) return { ok: false, message: "Un compte existe déjà pour cet email." };

  const token = randomBytes(32).toString("hex");
  const expireLe = new Date(Date.now() + DUREE_INVITATION_MS).toISOString();
  await db.insert(invitations).values({ token, email, nom, expireLe });

  revalidatePath("/parametres");
  return { ok: true, token };
}

export async function supprimerInvitation(formData: FormData): Promise<Resultat> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Vous n'êtes pas connecté." };

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Invitation introuvable." };
  await db.delete(invitations).where(eq(invitations.id, id));

  revalidatePath("/parametres");
  return { ok: true };
}
