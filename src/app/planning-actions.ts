"use server";

import { db } from "@/db";
import { affectations, missions } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Resultat = { ok: boolean; message?: string };

// Affecte une liste de jours (AAAA-MM-JJ) d'un freelance à une mission.
// Tout jour déjà affecté pour ce freelance est réécrit (1 mission par jour max).
export async function affecterJours(
  missionId: number,
  freelanceId: number,
  dates: string[]
): Promise<Resultat> {
  if (!missionId || !freelanceId || dates.length === 0) {
    return { ok: false, message: "Données manquantes." };
  }

  // Sécurité : la mission doit bien appartenir à ce freelance.
  const [m] = await db
    .select({ freelanceId: missions.freelanceId })
    .from(missions)
    .where(eq(missions.id, missionId));
  if (!m || m.freelanceId !== freelanceId) {
    return { ok: false, message: "Cette mission ne correspond pas au freelance." };
  }

  await db.transaction(async (tx) => {
    // On efface d'abord toute affectation existante de ce freelance sur ces jours...
    await tx
      .delete(affectations)
      .where(
        and(eq(affectations.freelanceId, freelanceId), inArray(affectations.date, dates))
      );
    // ...puis on insère la nouvelle affectation.
    await tx.insert(affectations).values(
      dates.map((date) => ({ missionId, freelanceId, date }))
    );
  });

  revalidatePath("/");
  return { ok: true };
}

// Libère (vide) une liste de jours pour un freelance.
export async function libererJours(
  freelanceId: number,
  dates: string[]
): Promise<Resultat> {
  if (!freelanceId || dates.length === 0) {
    return { ok: false, message: "Données manquantes." };
  }
  await db
    .delete(affectations)
    .where(
      and(eq(affectations.freelanceId, freelanceId), inArray(affectations.date, dates))
    );
  revalidatePath("/");
  return { ok: true };
}
