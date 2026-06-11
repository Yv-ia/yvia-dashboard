// Helpers d'authentification réservés au serveur (utilisent next/headers).
// Ne pas importer dans le middleware (edge) ni côté client.

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifierSession, SESSION_COOKIE, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifierSession(token);
  if (!session) return null;

  const [u] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId));
  if (!u) return null;

  return {
    userId: u.id,
    email: u.email,
    exp: session.exp,
    role: u.role === "user" ? "user" : "admin",
  };
}
