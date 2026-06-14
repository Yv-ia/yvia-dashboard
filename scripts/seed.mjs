// Seeder : crée (ou réinitialise) un compte administrateur de démonstration.
// Usage : npm run seed
// Identifiants par défaut surchargeables via variables d'environnement :
//   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NOM
// À utiliser uniquement en développement (mot de passe volontairement simple).

import "dotenv/config";
import { scryptSync, randomBytes } from "node:crypto";
import { createSqlClient } from "./db-url.mjs";

const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@yvia.io").toLowerCase();
const motDePasse = process.env.SEED_ADMIN_PASSWORD ?? "admin";
const nom = process.env.SEED_ADMIN_NOM ?? "Admin";

// Même format que src/lib/auth/password.ts : "scrypt$<sel hex>$<hash hex>".
function hasher(mdp) {
  const sel = randomBytes(16);
  const hash = scryptSync(mdp, sel, 64);
  return `scrypt$${sel.toString("hex")}$${hash.toString("hex")}`;
}

// Compte commercial de démonstration (rôle restreint : pipeline, sans marges).
const emailCommercial = (process.env.SEED_COMMERCIAL_EMAIL ?? "commercial@yvia.io").toLowerCase();
const motDePasseCommercial = process.env.SEED_COMMERCIAL_PASSWORD ?? "commercial";
const nomCommercial = process.env.SEED_COMMERCIAL_NOM ?? "Commercial";

const sql = createSqlClient();
try {
  await sql`
    INSERT INTO users (email, password_hash, nom, role)
    VALUES (${email}, ${hasher(motDePasse)}, ${nom}, 'admin')
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash, nom = EXCLUDED.nom, role = EXCLUDED.role`;
  await sql`
    INSERT INTO users (email, password_hash, nom, role)
    VALUES (${emailCommercial}, ${hasher(motDePasseCommercial)}, ${nomCommercial}, 'commercial')
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash, nom = EXCLUDED.nom, role = EXCLUDED.role`;
  console.log("Comptes créés / réinitialisés :");
  console.log(`  Admin       : ${email} / ${motDePasse}`);
  console.log(`  Commercial  : ${emailCommercial} / ${motDePasseCommercial}`);
  console.log("Connecte-toi sur la page /login.");
} finally {
  await sql.end();
}
