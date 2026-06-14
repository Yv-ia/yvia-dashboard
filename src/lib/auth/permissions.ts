// Capacités dérivées du rôle. Fonctions pures (pas d'accès base ni next/headers)
// pour rester utilisables côté proxy (edge), Server Components et tests.
//
// On raisonne par CAPACITÉ plutôt que par rôle dans le reste du code : ajouter
// un rôle plus tard ne demande que de modifier ce fichier.

import type { Role, Session } from "./session";

type AvecRole = { role: Role } | Session | null | undefined;

function role(session: AvecRole): Role | undefined {
  return session?.role;
}

// Gestion des utilisateurs (inviter, supprimer, changer les rôles) : admin seul.
export function peutGererUtilisateurs(session: AvecRole): boolean {
  return role(session) === "admin";
}

// Voir les coûts d'achat et les marges (TJM achat, décaissements, marge calculée).
// Masqué au commercial : il pilote la vente, pas la rentabilité interne.
export function peutVoirMarges(session: AvecRole): boolean {
  return role(session) !== "commercial";
}

// Piloter le delivery : créer/modifier missions, projets, freelances, planning.
// Le commercial gère le pipeline commercial (clients), pas l'exécution.
export function peutEditerDelivery(session: AvecRole): boolean {
  return role(session) !== "commercial";
}

// --- Accès aux routes -------------------------------------------------------
// Le commercial n'a accès qu'à un sous-ensemble de l'application. Tant que le
// masquage fin des marges n'est pas généralisé aux pages delivery, on restreint
// le commercial par liste blanche (sûr par construction).

// Préfixes de routes accessibles au commercial (au-delà des pages publiques).
const ROUTES_COMMERCIAL = ["/clients", "/parametres"];

export function peutAccederRoute(session: AvecRole, pathname: string): boolean {
  if (role(session) !== "commercial") return true; // admin / user : tout
  if (pathname === "/") return false; // le dashboard expose des marges
  return ROUTES_COMMERCIAL.some(
    (prefixe) => pathname === prefixe || pathname.startsWith(prefixe + "/")
  );
}

// Page d'atterrissage d'un commercial qui tente une route interdite.
export const ROUTE_DEFAUT_COMMERCIAL = "/clients";

// Libellé d'affichage d'un rôle (français).
const LABELS_ROLE: Record<Role, string> = {
  admin: "Administrateur",
  user: "Associé",
  commercial: "Commercial",
};

export function labelRole(role: string | null | undefined): string {
  return LABELS_ROLE[role as Role] ?? role ?? "";
}
