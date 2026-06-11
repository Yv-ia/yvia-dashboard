"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth/server";
import { hasherMotDePasse, verifierMotDePasse } from "@/lib/auth/password";
import { reinitialiserLimite, verifierLimite } from "@/lib/auth/rate-limit";

export type Resultat = { ok: boolean; message?: string };

export async function changerMotDePasse(formData: FormData): Promise<Resultat> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Vous n'êtes pas connecté." };

  const actuel = String(formData.get("actuel") ?? "");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const limite = await verifierLimite("password-change", session.email, 5, 10 * 60 * 1000);
  if (!limite.ok) return limite;

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

  await reinitialiserLimite("password-change", session.email);
  return { ok: true };
}
