import { db } from "@/db";
import { parametres } from "@/db/schema";
import { eq } from "drizzle-orm";

// Clé conventionnelle des frais de structure annuels dans la table `parametres`.
export const cleFraisStructure = (annee: number) => `frais_structure:${annee}`;

// Frais de structure saisis pour l'année (0 si non renseignés).
export async function lireFraisStructure(annee: number): Promise<number> {
  const [row] = await db
    .select({ valeur: parametres.valeur })
    .from(parametres)
    .where(eq(parametres.cle, cleFraisStructure(annee)));
  return row ? Number(row.valeur) : 0;
}
