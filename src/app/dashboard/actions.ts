"use server";
// Mutations du Dashboard. Comme les autres Server Actions, on vérifie la session
// (le middleware ne protège pas les actions).

import { db } from "@/db";
import { parametres } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { exigerConnecte } from "@/lib/auth/garde";
import { cleFraisStructure } from "@/lib/finance/frais-structure";

export type Resultat = { ok: false; message?: string } | { ok: true };

// Définit (upsert) les frais de structure annuels servant au calcul du dividende.
export async function definirFraisStructure(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const annee = Number(formData.get("annee"));
  const montant = Math.max(0, Math.round(Number(formData.get("montant")) || 0));
  if (!annee) return { ok: false, message: "Année invalide." };

  await db
    .insert(parametres)
    .values({ cle: cleFraisStructure(annee), valeur: String(montant) })
    .onConflictDoUpdate({ target: parametres.cle, set: { valeur: String(montant) } });

  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}
