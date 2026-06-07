// Helpers d'authentification réservés au serveur (utilisent next/headers).
// Ne pas importer dans le middleware (edge) ni côté client.

import { cookies } from "next/headers";
import { verifierSession, SESSION_COOKIE, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifierSession(token);
}
