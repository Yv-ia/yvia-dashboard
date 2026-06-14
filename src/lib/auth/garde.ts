// Gardes réutilisables pour les Server Actions (le proxy ne protège PAS les
// actions : chaque mutation doit se garder elle-même). Renvoie un résultat au
// format commun { ok, message } utilisé par les actions.

import { getSession } from "./server";
import { peutEditerDelivery, peutGererUtilisateurs } from "./permissions";

export type Garde = { ok: false; message: string } | { ok: true };

const NON_CONNECTE = "Vous n'êtes pas connecté." as const;
const ROLE_INSUFFISANT = "Action non autorisée pour votre rôle." as const;

// Connecté, quel que soit le rôle.
export async function exigerConnecte(): Promise<Garde> {
  if (await getSession()) return { ok: true };
  return { ok: false, message: NON_CONNECTE };
}

// Connecté ET autorisé à piloter le delivery (exclut le commercial).
export async function exigerDelivery(): Promise<Garde> {
  const session = await getSession();
  if (!session) return { ok: false, message: NON_CONNECTE };
  if (!peutEditerDelivery(session)) return { ok: false, message: ROLE_INSUFFISANT };
  return { ok: true };
}

// Connecté ET administrateur.
export async function exigerAdmin(): Promise<Garde & { userId?: number }> {
  const session = await getSession();
  if (!session) return { ok: false, message: NON_CONNECTE };
  if (!peutGererUtilisateurs(session)) {
    return { ok: false, message: "Seul un administrateur peut gérer les utilisateurs." };
  }
  return { ok: true, userId: session.userId };
}
