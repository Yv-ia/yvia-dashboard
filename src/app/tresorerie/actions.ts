"use server";
// Server Actions de la Trésorerie : saisie des ENCAISSEMENTS DIRECTS (argent reçu
// d'un client pour une mission), indépendants des deals forfait. Le middleware ne
// protège PAS les Server Actions : chaque mutation vérifie la session/le rôle.

import { db } from "@/db";
import { encaissements } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { normaliserFiabiliteEcheance } from "@/lib/calculs/previsionnel";
import { exigerDelivery } from "@/lib/auth/garde";

export type Resultat = { ok: boolean; message?: string };

function rafraichir() {
  revalidatePath("/tresorerie");
  revalidatePath("/");
}

// Ajoute un encaissement direct : « j'ai reçu (ou j'attends) un paiement de tel
// client, tel montant, telle mission ». Pas de garde-fou budgétaire (pas de projet).
export async function ajouterEncaissementDirect(formData: FormData): Promise<Resultat> {
  const garde = await exigerDelivery();
  if (!garde.ok) return garde;

  const clientId = Number(formData.get("clientId"));
  const missionIdBrut = String(formData.get("missionId") ?? "").trim();
  const missionId = missionIdBrut ? Number(missionIdBrut) : null;
  const date = String(formData.get("date") ?? "").trim();
  const montant = String(formData.get("montant") ?? "").trim();
  const libelle = String(formData.get("libelle") ?? "").trim() || null;
  // Statut : 'encaisse' (réalisé) par défaut, 'prevu' pour un paiement attendu.
  const statut = String(formData.get("statut")) === "prevu" ? "prevu" : "encaisse";
  const fiabilite =
    statut === "prevu"
      ? normaliserFiabiliteEcheance(String(formData.get("fiabilite") ?? ""))
      : null;

  if (!clientId) return { ok: false, message: "Le client est obligatoire." };
  if (!date) return { ok: false, message: "La date est obligatoire." };
  if (montant === "" || Number(montant) <= 0) {
    return { ok: false, message: "Le montant doit être supérieur à 0." };
  }

  // Encaissement direct : pas de projet (projetId reste null).
  await db.insert(encaissements).values({
    projetId: null,
    clientId,
    missionId,
    date,
    montant,
    libelle,
    statut,
    fiabilite,
  });
  rafraichir();
  return { ok: true };
}

// Supprime un encaissement DIRECT (jamais un encaissement de projet forfait : la
// clause `projet_id IS NULL` protège l'échéancier des deals).
export async function supprimerEncaissementDirect(formData: FormData): Promise<Resultat> {
  const garde = await exigerDelivery();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Encaissement introuvable." };
  await db
    .delete(encaissements)
    .where(and(eq(encaissements.id, id), isNull(encaissements.projetId)));
  rafraichir();
  return { ok: true };
}

// Bascule un encaissement direct prévu en réalisé (encaissé).
export async function marquerEncaissementDirectRealise(formData: FormData): Promise<Resultat> {
  const garde = await exigerDelivery();
  if (!garde.ok) return garde;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Encaissement introuvable." };
  await db
    .update(encaissements)
    .set({ statut: "encaisse" })
    .where(and(eq(encaissements.id, id), isNull(encaissements.projetId)));
  rafraichir();
  return { ok: true };
}
