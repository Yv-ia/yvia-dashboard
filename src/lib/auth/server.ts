// Helpers d'authentification réservés au serveur (utilisent next/headers et la
// base). Ne pas importer dans le proxy Next.js ni côté client.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifierSession, pvDepuisHash, estRoleValide, SESSION_COOKIE, type Session } from "./session";

export type SessionServeur = Session & { prenom: string | null; nom: string | null };

export const getSession = cache(async function getSession(): Promise<SessionServeur | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifierSession(token);
  if (!session) return null;

  // Révocation : on compare l'ancre du jeton (pv) au hash du mot de passe
  // courant. S'ils divergent (mot de passe changé, compte recréé) ou si le
  // compte n'existe plus, le jeton est considéré comme révoqué.
  const [u] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      prenom: users.prenom,
      nom: users.nom,
    })
    .from(users)
    .where(eq(users.id, session.userId));
  if (!u || (await pvDepuisHash(u.passwordHash)) !== session.pv) return null;

  return {
    userId: u.id,
    email: u.email,
    exp: session.exp,
    pv: session.pv,
    // Le rôle fait foi en base. Une valeur inconnue retombe sur 'admin' pour ne
    // pas dégrader les comptes associés historiques (créés avant les rôles).
    role: estRoleValide(u.role) ? u.role : "admin",
    prenom: u.prenom,
    nom: u.nom,
  };
});

// À appeler en tête des pages protégées : renvoie la session ou redirige vers
// /login. Centralise le contrôle d'accès des Server Components qui lisent des
// données (le proxy ne fait qu'un filtrage optimiste, sans accès base).
export async function exigerSession(): Promise<SessionServeur> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
