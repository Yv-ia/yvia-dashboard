"use server";
// Le middleware ne protège PAS les Server Actions : chaque mutation vérifie la
// session. Le pipeline commercial fait partie du périmètre du commercial : on
// exige seulement d'être connecté (exigerConnecte), pas le droit delivery.

import { db } from "@/db";
import { opportunites, projets, recurrents } from "@/db/schema";
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

// Date 'YYYY-MM-DD' valide, ou null.
function dateOuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

// Date de signature à appliquer selon le statut : une opp gagnée porte une date
// (celle saisie, sinon aujourd'hui) ; une opp non gagnée n'en a pas.
function dateGagneSelonStatut(statut: string, saisie: string | null): string | null {
  return statut === STATUT_COMMERCIAL_EXISTANT ? saisie ?? aujourdhui() : null;
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
  const dateGagne = dateGagneSelonStatut(statut, dateOuNull(formData.get("dateGagne")));

  const [opp] = await db
    .insert(opportunites)
    .values({ clientId, nom, type, statut, montantEstime, dateGagne })
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
  const dateGagne = dateGagneSelonStatut(statut, dateOuNull(formData.get("dateGagne")));

  await db
    .update(opportunites)
    .set({ nom, type, statut, montantEstime, dateGagne })
    .where(eq(opportunites.id, id));
  revalidatePath("/opportunites");
  return { ok: true };
}

// Suppression définitive d'une opportunité (carte du pipeline). Ouverte à tout
// utilisateur connecté, comme les autres mutations d'opportunité : le pipeline est
// le périmètre du commercial, et une opportunité est un élément jetable (contrairement
// à un projet, qui n'est pas supprimable). Si l'opportunité a été convertie, le projet
// ou le récurrent lié n'est PAS touché (la FK pointe vers eux, sans cascade inverse).
export async function supprimerOpportunite(formData: FormData): Promise<Resultat> {
  const garde = await exigerConnecte();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Opportunité introuvable." };

  await db.delete(opportunites).where(eq(opportunites.id, id));
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
  const valeurs = { statut, ordre: Number.isFinite(ordre) ? ordre : 0 };

  // Passage en « gagné » via le Kanban : on date la signature (aujourd'hui) si elle
  // ne l'est pas déjà — sans écraser une date existante (simple réordonnancement).
  if (statut === STATUT_COMMERCIAL_EXISTANT) {
    const [cur] = await db
      .select({ dateGagne: opportunites.dateGagne })
      .from(opportunites)
      .where(eq(opportunites.id, id));
    await db
      .update(opportunites)
      .set({ ...valeurs, dateGagne: cur?.dateGagne ?? aujourdhui() })
      .where(eq(opportunites.id, id));
  } else {
    await db.update(opportunites).set(valeurs).where(eq(opportunites.id, id));
  }
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
  if (opp.projetId || opp.recurrentId)
    return { ok: false, message: "Opportunité déjà convertie." };

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
      .set({ statut: "gagne", projetId: projet.id, dateGagne: opp.dateGagne ?? aujourdhui() })
      .where(eq(opportunites.id, id));
    revalidatePath("/opportunites");
    revalidatePath("/projets");
    return { ok: true, id: projet.id };
  }

  // Récurrent : on crée un revenu récurrent (catégorie régie par défaut, début
  // aujourd'hui, en cours). Coût et catégorie s'affinent ensuite côté delivery.
  const dateDebut = new Date().toISOString().slice(0, 10);
  const [rec] = await db
    .insert(recurrents)
    .values({
      clientId: opp.clientId,
      nom: opp.nom,
      montantRecurrent: opp.montantEstime ?? "0",
      dateDebut,
    })
    .returning({ id: recurrents.id });
  await db
    .update(opportunites)
    .set({ statut: "gagne", recurrentId: rec.id, dateGagne: opp.dateGagne ?? aujourdhui() })
    .where(eq(opportunites.id, id));
  revalidatePath("/opportunites");
  revalidatePath("/recurrents");
  return { ok: true, id: rec.id };
}
