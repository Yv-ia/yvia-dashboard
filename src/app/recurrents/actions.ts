"use server";
// Gestion des revenus récurrents. L'édition touche aux montants/coûts (marge) :
// réservée au delivery (exigerDelivery, donc exclut le commercial). La création
// via conversion d'opportunité reste pilotée par le commercial (cf. opportunites).

import { db } from "@/db";
import { recurrents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigerDelivery } from "@/lib/auth/garde";
import {
  normaliserCategorieRecurrent,
  coutDerivePlanning,
} from "@/lib/recurrents/categorie";

export type Resultat = { ok: false; message?: string } | { ok: true; id?: number };

function montant(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? String(Math.round(n)) : null;
}

// Date 'YYYY-MM-DD' valide, ou null.
function dateOuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// Coût récurrent saisi : ignoré pour la régie (dérivé du planning).
function coutSelonCategorie(categorie: string, v: FormDataEntryValue | null): string | null {
  return coutDerivePlanning(categorie) ? null : montant(v);
}

export async function creerRecurrent(formData: FormData): Promise<Resultat> {
  const garde = await exigerDelivery();
  if (!garde.ok) return garde;

  const clientId = Number(formData.get("clientId"));
  const nom = String(formData.get("nom") ?? "").trim();
  const montantRecurrent = montant(formData.get("montantRecurrent"));
  const dateDebut = dateOuNull(formData.get("dateDebut"));
  if (!clientId) return { ok: false, message: "Le client est obligatoire." };
  if (!nom) return { ok: false, message: "Le nom est obligatoire." };
  if (!montantRecurrent) return { ok: false, message: "Le montant récurrent est obligatoire." };
  if (!dateDebut) return { ok: false, message: "La date de début est obligatoire." };

  const categorie = normaliserCategorieRecurrent(String(formData.get("categorie") ?? ""));

  const [rec] = await db
    .insert(recurrents)
    .values({
      clientId,
      nom,
      categorie,
      montantRecurrent,
      coutRecurrent: coutSelonCategorie(categorie, formData.get("coutRecurrent")),
      dateDebut,
      dateFin: dateOuNull(formData.get("dateFin")),
    })
    .returning({ id: recurrents.id });
  revalidatePath("/recurrents");
  return { ok: true, id: rec.id };
}

export async function modifierRecurrent(formData: FormData): Promise<Resultat> {
  const garde = await exigerDelivery();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  const nom = String(formData.get("nom") ?? "").trim();
  const montantRecurrent = montant(formData.get("montantRecurrent"));
  const dateDebut = dateOuNull(formData.get("dateDebut"));
  if (!id) return { ok: false, message: "Récurrent introuvable." };
  if (!nom) return { ok: false, message: "Le nom est obligatoire." };
  if (!montantRecurrent) return { ok: false, message: "Le montant récurrent est obligatoire." };
  if (!dateDebut) return { ok: false, message: "La date de début est obligatoire." };

  const categorie = normaliserCategorieRecurrent(String(formData.get("categorie") ?? ""));

  await db
    .update(recurrents)
    .set({
      nom,
      categorie,
      montantRecurrent,
      coutRecurrent: coutSelonCategorie(categorie, formData.get("coutRecurrent")),
      dateDebut,
      dateFin: dateOuNull(formData.get("dateFin")),
    })
    .where(eq(recurrents.id, id));
  revalidatePath("/recurrents");
  return { ok: true };
}

export async function basculerActifRecurrent(formData: FormData): Promise<Resultat> {
  const garde = await exigerDelivery();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  const actif = String(formData.get("actif")) === "true";
  if (!id) return { ok: false, message: "Récurrent introuvable." };

  await db.update(recurrents).set({ actif: !actif }).where(eq(recurrents.id, id));
  revalidatePath("/recurrents");
  return { ok: true };
}
