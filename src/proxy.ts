import { NextResponse, type NextRequest } from "next/server";
import { verifierSession, SESSION_COOKIE } from "@/lib/auth/session";
import { peutAccederRoute, ROUTE_DEFAUT_COMMERCIAL } from "@/lib/auth/permissions";

// Protège toute l'application : sans session valide, on redirige vers /login.
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifierSession(token);
  const { pathname } = req.nextUrl;
  // Pages accessibles sans être connecté : connexion et acceptation d'invitation.
  const estPublique = pathname === "/login" || pathname.startsWith("/invitation/");

  if (!session && !estPublique) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Restriction par rôle : un commercial n'accède qu'à ses pages. Première ligne
  // de défense (UX) ; la vraie barrière reste côté pages/Server Actions.
  if (session && !estPublique && !peutAccederRoute(session, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTE_DEFAUT_COMMERCIAL;
    return NextResponse.redirect(url);
  }
  // Ne pas rediriger /login vers / depuis le proxy : ici on ne vérifie que la
  // signature du cookie, pas sa révocation en base (mot de passe changé, seed de
  // preview, compte recréé). Un vieux cookie signé peut donc être refusé ensuite
  // par getSession(); le laisser accéder à /login évite une boucle / ↔ /login.
  return NextResponse.next();
}

// On exclut :
// - les routes API (/api/*) : elles gèrent leur propre authentification (la
//   route MCP /api/mcp s'appuie sur une clé API en Bearer, pas sur le cookie) ;
// - les assets statiques, le dossier _next et les fichiers PWA (manifest,
//   service worker, page hors-ligne, icônes) qui doivent rester accessibles
//   sans session.
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|.*\\.svg).*)",
  ],
};
