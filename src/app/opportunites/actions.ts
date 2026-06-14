"use server";
// Le middleware ne protège PAS les Server Actions : chaque mutation vérifie la
// session. Le pipeline commercial fait partie du périmètre du commercial : on
// exige seulement d'être connecté (exigerConnecte), pas le droit delivery.

import { db } from "@/db";
import { opportunites, projets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigerConnecte } from "@/lib/auth/garde";
import {
  normaliserStatutCommercial,
  STATUT_COMMERCIAL_EXISTANT,
} from "@/lib/projets/statut-commercial";
import { normaliserTypeOpportunite } from "@/lib/opportunites/type";

export type Resultat = { ok: false; message?: string } | { ok: true; id?: number };

// Montant € HT entier, ou null si vide / invalide (montant estimé optionnel).
function montantOuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? String(Math.round(n)) : null;
}

export async function creerOpportunite(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const clientId = Number(formData.get("clientId"));
  const nom = String(formData.get("nom") ?? "").trim();
  if (!clientId) return { ok: false, message: "Le client est obligatoire." };
  if (!nom) return { ok: false, message: "Le nom de l'opportunité est obligatoire." };

  const type = normaliserTypeOpportunite(String(formData.get("type") ?? ""));
  const statut = normaliserStatutCommercial(String(formData.get("statut") ?? ""));
  const montantEstime = montantOuNull(formData.get("montantEstime"));

  const [opp] = await db
    .insert(opportunites)
    .values({ clientId, nom, type, statut, montantEstime })
    .returning({ id: opportunites.id });
  revalidatePath("/opportunites");
  return { ok: true, id: opp.id };
}

export async function modifierOpportunite(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  const nom = String(formData.get("nom") ?? "").trim();
  if (!id) return { ok: false, message: "Opportunité introuvable." };
  if (!nom) return { ok: false, message: "Le nom de l'opportunité est obligatoire." };

  const type = normaliserTypeOpportunite(String(formData.get("type") ?? ""));
  const statut = normaliserStatutCommercial(String(formData.get("statut") ?? ""));
  const montantEstime = montantOuNull(formData.get("montantEstime"));

  await db
    .update(opportunites)
    .set({ nom, type, statut, montantEstime })
    .where(eq(opportunites.id, id));
  revalidatePath("/opportunites");
  return { ok: true };
}

// Déplacement Kanban : change le statut (et la position dans la colonne).
export async function definirStatutOpportunite(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Opportunité introuvable." };
  const statut = normaliserStatutCommercial(String(formData.get("statut") ?? ""));
  const ordre = Number(formData.get("ordre"));

  await db
    .update(opportunites)
    .set({ statut, ordre: Number.isFinite(ordre) ? ordre : 0 })
    .where(eq(opportunites.id, id));
  revalidatePath("/opportunites");
  return { ok: true };
}

export async function basculerActifOpportunite(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  const actif = String(formData.get("actif")) === "true";
  if (!id) return { ok: false, message: "Opportunité introuvable." };

  await db.update(opportunites).set({ actif: !actif }).where(eq(opportunites.id, id));
  revalidatePath("/opportunites");
  return { ok: true };
}

// Conversion d'une opportunité gagnée vers son entité cible. Pour un forfait, on
// crée un projet (budget = montant estimé) et on relie l'opportunité au projet.
// Le récurrent sera géré au lot suivant (table `recurrents`).
export async function convertirOpportunite(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Opportunité introuvable." };

  const [opp] = await db.select().from(opportunites).where(eq(opportunites.id, id));
  if (!opp) return { ok: false, message: "Opportunité introuvable." };
  if (opp.projetId) return { ok: false, message: "Opportunité déjà convertie." };

  const type = normaliserTypeOpportunite(opp.type);
  if (type === "forfait") {
    const [projet] = await db
      .insert(projets)
      .values({
        clientId: opp.clientId,
        nom: opp.nom,
        budget: opp.montantEstime ?? "0",
        statutCommercial: STATUT_COMMERCIAL_EXISTANT,
      })
      .returning({ id: projets.id });
    await db
      .update(opportunites)
      .set({ statut: "gagne", projetId: projet.id })
      .where(eq(opportunites.id, id));
    revalidatePath("/opportunites");
    revalidatePath("/projets");
    return { ok: true, id: projet.id };
  }

  return {
    ok: false,
    message: "La conversion des opportunités récurrentes arrive au lot suivant.",
  };
}
