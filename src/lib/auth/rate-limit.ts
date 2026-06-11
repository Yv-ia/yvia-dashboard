import { headers } from "next/headers";

type EntreeLimite = {
  debut: number;
  tentatives: number;
};

const globalForRateLimit = globalThis as unknown as {
  yviaRateLimit?: Map<string, EntreeLimite>;
};

const memoire = globalForRateLimit.yviaRateLimit ?? new Map<string, EntreeLimite>();
if (process.env.NODE_ENV !== "production") globalForRateLimit.yviaRateLimit = memoire;

async function cle(scope: string, identifiant: string): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || h.get("x-real-ip") || "unknown";
  return `${scope}:${ip}:${identifiant.toLowerCase()}`;
}

export async function verifierLimite(
  scope: string,
  identifiant: string,
  maxTentatives: number,
  fenetreMs: number
): Promise<{ ok: boolean; message?: string }> {
  const maintenant = Date.now();
  const k = await cle(scope, identifiant || "anonymous");
  const entree = memoire.get(k);

  if (!entree || maintenant - entree.debut > fenetreMs) {
    memoire.set(k, { debut: maintenant, tentatives: 1 });
    return { ok: true };
  }

  if (entree.tentatives >= maxTentatives) {
    return { ok: false, message: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  entree.tentatives += 1;
  return { ok: true };
}

export async function reinitialiserLimite(scope: string, identifiant: string): Promise<void> {
  memoire.delete(await cle(scope, identifiant || "anonymous"));
}
