"use server";
// Le middleware ne protège PAS les Server Actions : chaque mutation vérifie la session.

import { db } from "@/db";
import { missions, affectations, clients } from "@/db/schema";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { exigerDelivery } from "@/lib/auth/garde";
import {
  premierJourDuMois,
  dernierJourDuMois,
  listeJoursOuvresDuMois,
} from "@/lib/calculs/jours-ouvres";

export type MissionCree = {
  id: number;
  freelanceId: number;
  clientId: number;
  nom: string;
  clientNom: string;
  tjmAchat: string;
  tjmVente: string;
};
export type Resultat = { ok: false; message?: string } | { ok: true; mission?: MissionCree };

type ValeursMission = {
  freelanceId: number;
  clientId: number;
  nom: string;
  tjmAchat: string;
  tjmVente: string;
};

type Lecture = { ok: false; erreur: string } | { ok: true; valeurs: ValeursMission };

// Le delivery (missions) n'est pas modifiable par un commercial.
async function verifierConnecte(): Promise<Resultat> {
  return exigerDelivery();
}

function lireChampsMission(formData: FormData): Lecture {
  const freelanceId = Number(formData.get("freelanceId"));
  const clientId = Number(formData.get("clientId"));
  const nom = String(formData.get("nom") ?? "").trim();
  const tjmAchat = String(formData.get("tjmAchat") ?? "").trim();
  const tjmVente = String(formData.get("tjmVente") ?? "").trim();

  if (!freelanceId || !clientId) {
    return { ok: false, erreur: "Le freelance et le client sont obligatoires." };
  }
  if (!nom) return { ok: false, erreur: "Le nom de la mission est obligatoire." };
  if (tjmAchat === "" || tjmVente === "") {
    return { ok: false, erreur: "Les TJM achat et vente sont obligatoires." };
  }
  if (Number(tjmVente) < Number(tjmAchat)) {
    return { ok: false, erreur: "Le TJM de vente doit être supérieur ou égal au TJM d'achat." };
  }
  return { ok: true, valeurs: { freelanceId, clientId, nom, tjmAchat, tjmVente } };
}

export async function creerMission(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const champs = lireChampsMission(formData);
  if (!champs.ok) return { ok: false, message: champs.erreur };

  const [mission] = await db.insert(missions).values(champs.valeurs).returning({
    id: missions.id,
    freelanceId: missions.freelanceId,
    clientId: missions.clientId,
    nom: missions.nom,
    tjmAchat: missions.tjmAchat,
    tjmVente: missions.tjmVente,
  });
  const [client] = await db
    .select({ nom: clients.nom })
    .from(clients)
    .where(eq(clients.id, mission.clientId));

  revalidatePath("/missions");
  revalidatePath("/");
  return { ok: true, mission: { ...mission, clientNom: client?.nom ?? "" } };
}

export async function modifierMission(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, message: "Mission introuvable." };

  const champs = lireChampsMission(formData);
  if (!champs.ok) return { ok: false, message: champs.erreur };

  await db.update(missions).set(champs.valeurs).where(eq(missions.id, id));

  const appliquerAuxJoursPoses =
    String(formData.get("appliquerAuxJoursPoses")) === "true";
  if (appliquerAuxJoursPoses) {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    await db
      .update(affectations)
      .set({ tjmAchat: champs.valeurs.tjmAchat, tjmVente: champs.valeurs.tjmVente })
      .where(and(eq(affectations.missionId, id), gte(affectations.date, aujourdhui)));
  }

  revalidatePath("/missions");
  revalidatePath("/");
  return { ok: true };
}

// Génère le planning d'une régie pour un mois à partir d'un simple nombre de jours
// (déclencheur « facture » : pas de saisie jour par jour). Idempotent : on remet à
// zéro les jours de cette régie sur le mois, puis on (re)pose nbJours jours ouvrés où
// le freelance est libre (les jours déjà pris par une autre mission sont sautés). Le
// TJM est figé depuis la mission, comme dans le planning.
export async function genererJoursRegie(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const missionId = Number(formData.get("missionId"));
  const annee = Number(formData.get("annee"));
  const moisNum = Number(formData.get("mois"));
  const nbJours = Number(formData.get("nbJours"));

  if (!missionId) return { ok: false, message: "La régie est obligatoire." };
  if (!annee || moisNum < 1 || moisNum > 12) return { ok: false, message: "Mois invalide." };
  if (!Number.isFinite(nbJours) || nbJours < 0) {
    return { ok: false, message: "Nombre de jours invalide." };
  }

  const [m] = await db
    .select({
      freelanceId: missions.freelanceId,
      tjmAchat: missions.tjmAchat,
      tjmVente: missions.tjmVente,
    })
    .from(missions)
    .where(eq(missions.id, missionId));
  if (!m) return { ok: false, message: "Régie introuvable." };

  const debut = premierJourDuMois(annee, moisNum);
  const fin = dernierJourDuMois(annee, moisNum);
  const joursOuvres = listeJoursOuvresDuMois(annee, moisNum);

  await db.transaction(async (tx) => {
    await tx
      .delete(affectations)
      .where(
        and(
          eq(affectations.missionId, missionId),
          gte(affectations.date, debut),
          lte(affectations.date, fin)
        )
      );
    // Jours du mois déjà occupés par ce freelance sur une AUTRE mission (1 mission/jour).
    const occupes = await tx
      .select({ date: affectations.date })
      .from(affectations)
      .where(
        and(
          eq(affectations.freelanceId, m.freelanceId),
          gte(affectations.date, debut),
          lte(affectations.date, fin)
        )
      );
    const pris = new Set(occupes.map((o) => o.date));
    const cibles = joursOuvres.filter((d) => !pris.has(d)).slice(0, nbJours);
    if (cibles.length > 0) {
      await tx.insert(affectations).values(
        cibles.map((date) => ({
          missionId,
          freelanceId: m.freelanceId,
          date,
          tjmAchat: m.tjmAchat,
          tjmVente: m.tjmVente,
        }))
      );
    }
  });

  revalidatePath("/missions");
  revalidatePath("/");
  return { ok: true };
}

// Report du mois précédent : reprend les régies facturées le mois dernier et pose
// le même nombre de jours sur le mois cible (mêmes freelances, TJM figés depuis la
// mission). On ne touche qu'aux régies SANS jours sur le mois cible (idempotent :
// relancer ne double pas). Les jours déjà occupés par le freelance sont sautés.
export async function reporterMoisPrecedent(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const annee = Number(formData.get("annee"));
  const moisNum = Number(formData.get("mois"));
  if (!annee || moisNum < 1 || moisNum > 12) return { ok: false, message: "Mois invalide." };

  const prevAnnee = moisNum === 1 ? annee - 1 : annee;
  const prevMois = moisNum === 1 ? 12 : moisNum - 1;
  const debutPrev = premierJourDuMois(prevAnnee, prevMois);
  const finPrev = dernierJourDuMois(prevAnnee, prevMois);
  const debutCur = premierJourDuMois(annee, moisNum);
  const finCur = dernierJourDuMois(annee, moisNum);
  const joursOuvresCur = listeJoursOuvresDuMois(annee, moisNum);

  // Jours facturés le mois précédent, par régie (compte des jours distincts).
  const prevAffs = await db
    .select({ missionId: affectations.missionId, date: affectations.date })
    .from(affectations)
    .innerJoin(missions, eq(affectations.missionId, missions.id))
    .where(and(eq(missions.actif, true), gte(affectations.date, debutPrev), lte(affectations.date, finPrev)));

  const joursParMission = new Map<number, Set<string>>();
  for (const a of prevAffs) {
    (joursParMission.get(a.missionId) ?? joursParMission.set(a.missionId, new Set()).get(a.missionId)!).add(a.date);
  }
  if (joursParMission.size === 0) {
    return { ok: false, message: "Aucune régie facturée le mois précédent." };
  }

  // État du mois cible : régies déjà posées + jours occupés par freelance.
  const curAffs = await db
    .select({
      missionId: affectations.missionId,
      freelanceId: affectations.freelanceId,
      date: affectations.date,
    })
    .from(affectations)
    .where(and(gte(affectations.date, debutCur), lte(affectations.date, finCur)));
  const dejaPosees = new Set(curAffs.map((a) => a.missionId));
  const occupeParFreelance = new Map<number, Set<string>>();
  for (const a of curAffs) {
    (occupeParFreelance.get(a.freelanceId) ?? occupeParFreelance.set(a.freelanceId, new Set()).get(a.freelanceId)!).add(a.date);
  }

  const aReporter = [...joursParMission.keys()].filter((id) => !dejaPosees.has(id));
  if (aReporter.length === 0) {
    return { ok: false, message: "Toutes les régies du mois précédent sont déjà posées ce mois-ci." };
  }

  const ms = await db
    .select({
      id: missions.id,
      freelanceId: missions.freelanceId,
      tjmAchat: missions.tjmAchat,
      tjmVente: missions.tjmVente,
    })
    .from(missions)
    .where(inArray(missions.id, aReporter));

  const aInserer: (typeof affectations.$inferInsert)[] = [];
  for (const m of ms) {
    const nbJours = joursParMission.get(m.id)?.size ?? 0;
    const pris = occupeParFreelance.get(m.freelanceId) ?? new Set<string>();
    const cibles = joursOuvresCur.filter((d) => !pris.has(d)).slice(0, nbJours);
    for (const date of cibles) {
      aInserer.push({ missionId: m.id, freelanceId: m.freelanceId, date, tjmAchat: m.tjmAchat, tjmVente: m.tjmVente });
      pris.add(date);
    }
    occupeParFreelance.set(m.freelanceId, pris);
  }
  if (aInserer.length > 0) await db.insert(affectations).values(aInserer);

  revalidatePath("/missions");
  revalidatePath("/");
  return { ok: true };
}

export async function basculerActifMission(formData: FormData): Promise<Resultat> {
  const session = await verifierConnecte();
  if (!session.ok) return session;

  const id = Number(formData.get("id"));
  const actif = String(formData.get("actif")) === "true";
  if (!id) return { ok: false, message: "Mission introuvable." };

  await db.update(missions).set({ actif: !actif }).where(eq(missions.id, id));

  revalidatePath("/missions");
  revalidatePath("/");
  return { ok: true };
}
