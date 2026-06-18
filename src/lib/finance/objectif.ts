import { db } from "@/db";
import { parametres } from "@/db/schema";
import { eq } from "drizzle-orm";

// Objectif de résultat à distribuer (fin d'année), stocké dans la table `parametres`
// sous la clé "objectif_resultat:<annee>". Écrit EN DUR par défaut à 100 000 € tant
// qu'aucune valeur n'est saisie ; une valeur en base la surcharge.
export const cleObjectifResultat = (annee: number) => `objectif_resultat:${annee}`;
export const OBJECTIF_RESULTAT_DEFAUT = 100_000;

export async function lireObjectifResultat(annee: number): Promise<number> {
  const [row] = await db
    .select({ valeur: parametres.valeur })
    .from(parametres)
    .where(eq(parametres.cle, cleObjectifResultat(annee)));
  return row ? Number(row.valeur) : OBJECTIF_RESULTAT_DEFAUT;
}
