"use server";

import { db } from "@/db";
import { projets, encaissements, decaissements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { formatEuro } from "@/lib/format";

export type Resultat = { ok: boolean; message?: string };

function rafraichir() {
  revalidatePath("/projets");
  revalidatePath("/");
}

// Somme des encaissements déjà saisis pour un projet.
async function totalEncaisse(projetId: number): Promise<number> {
  const lignes = await db
    .select({ montant: encaissements.montant })
    .from(encaissements)
    .where(eq(encaissements.projetId, projetId));
  return lignes.reduce((s, l) => s + Number(l.montant), 0);
}

export async function creerProjet(formData: FormData): Promise<Resultat> {
  const clientId = Number(formData.get("clientId"));
  const nom = String(formData.get("nom") ?? "").trim();
  const budget = String(formData.get("budget") ?? "").trim();

  if (!clientId) return { ok: false, message: "Le client est obligatoire." };
  if (!nom) return { ok: false, message: "Le nom du projet est obligatoire." };
  if (budget === "" || Number(budget) <= 0) {
    return { ok: false, message: "Le budget doit être supérieur à 0." };
  }

  await db.insert(projets).values({ clientId, nom, budget });
  rafraichir();
  return { ok: true };
}

export async function modifierProjet(formData: FormData): Promise<Resultat> {
  const id = Number(formData.get("id"));
  const clientId = Number(formData.get("clientId"));
  const nom = String(formData.get("nom") ?? "").trim();
  const budget = String(formData.get("budget") ?? "").trim();

  if (!id) return { ok: false, message: "Projet introuvable." };
  if (!clientId) return { ok: false, message: "Le client est obligatoire." };
  if (!nom) return { ok: false, message: "Le nom du projet est obligatoire." };
  if (budget === "" || Number(budget) <= 0) {
    return { ok: false, message: "Le budget doit être supérieur à 0." };
  }

  // Le budget ne peut pas passer sous le total déjà encaissé.
  const encaisse = await totalEncaisse(id);
  if (Number(budget) < encaisse) {
    return {
      ok: false,
      message: `Le budget ne peut pas être inférieur au total déjà encaissé (${formatEuro(encaisse)}).`,
    };
  }

  await db.update(projets).set({ clientId, nom, budget }).where(eq(projets.id, id));
  rafraichir();
  return { ok: true };
}

export async function basculerActifProjet(formData: FormData): Promise<Resultat> {
  const id = Number(formData.get("id"));
  const actif = String(formData.get("actif")) === "true";
  if (!id) return { ok: false, message: "Projet introuvable." };

  await db.update(projets).set({ actif: !actif }).where(eq(projets.id, id));
  rafraichir();
  return { ok: true };
}

export async function ajouterEncaissement(formData: FormData): Promise<Resultat> {
  const projetId = Number(formData.get("projetId"));
  const date = String(formData.get("date") ?? "").trim();
  const montant = String(formData.get("montant") ?? "").trim();
  const libelle = String(formData.get("libelle") ?? "").trim() || null;

  if (!projetId) return { ok: false, message: "Projet introuvable." };
  if (!date) return { ok: false, message: "La date est obligatoire." };
  if (montant === "" || Number(montant) <= 0) {
    return { ok: false, message: "Le montant doit être supérieur à 0." };
  }

  const [p] = await db.select({ budget: projets.budget }).from(projets).where(eq(projets.id, projetId));
  if (!p) return { ok: false, message: "Projet introuvable." };

  // Blocage : on ne peut pas encaisser au-delà du budget.
  const encaisse = await totalEncaisse(projetId);
  if (encaisse + Number(montant) > Number(p.budget)) {
    const reste = Number(p.budget) - encaisse;
    return {
      ok: false,
      message: `Cet encaissement dépasse le budget du projet (reste à facturer : ${formatEuro(
        reste
      )}). Modifiez l'enveloppe budgétaire du projet pour pouvoir l'ajouter.`,
    };
  }

  await db.insert(encaissements).values({ projetId, date, montant, libelle });
  rafraichir();
  return { ok: true };
}

export async function supprimerEncaissement(formData: FormData): Promise<Resultat> {
  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Encaissement introuvable." };
  await db.delete(encaissements).where(eq(encaissements.id, id));
  rafraichir();
  return { ok: true };
}

export async function ajouterDecaissement(formData: FormData): Promise<Resultat> {
  const projetId = Number(formData.get("projetId"));
  const freelanceId = Number(formData.get("freelanceId"));
  const date = String(formData.get("date") ?? "").trim();
  const montant = String(formData.get("montant") ?? "").trim();
  const libelle = String(formData.get("libelle") ?? "").trim() || null;

  if (!projetId) return { ok: false, message: "Projet introuvable." };
  if (!freelanceId) return { ok: false, message: "Le freelance est obligatoire." };
  if (!date) return { ok: false, message: "La date est obligatoire." };
  if (montant === "" || Number(montant) <= 0) {
    return { ok: false, message: "Le montant doit être supérieur à 0." };
  }

  await db.insert(decaissements).values({ projetId, freelanceId, date, montant, libelle });
  rafraichir();
  return { ok: true };
}

export async function supprimerDecaissement(formData: FormData): Promise<Resultat> {
  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Décaissement introuvable." };
  await db.delete(decaissements).where(eq(decaissements.id, id));
  rafraichir();
  return { ok: true };
}
