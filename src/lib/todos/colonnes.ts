// Ordre des colonnes du Kanban /todo. L'utilisateur peut réorganiser les
// domaines selon ses priorités (qui changent d'une année à l'autre) ; la
// position de chaque domaine est persistée dans la table `parametres`
// (clé "kanban_ordre:<domaine>", valeur = rang). À défaut, on retombe sur
// l'ordre de déclaration de DOMAINES_TODO.

import { db } from "@/db";
import { parametres } from "@/db/schema";
import { like } from "drizzle-orm";
import { DOMAINES_TODO } from "./domaine";

export const PREFIXE_ORDRE_COLONNE = "kanban_ordre:";
export const cleOrdreColonne = (domaine: string) => `${PREFIXE_ORDRE_COLONNE}${domaine}`;

export type ColonneKanban = { cle: string; label: string };

export async function lireColonnesKanban(): Promise<ColonneKanban[]> {
  const rows = await db
    .select({ cle: parametres.cle, valeur: parametres.valeur })
    .from(parametres)
    .where(like(parametres.cle, `${PREFIXE_ORDRE_COLONNE}%`));

  const positions = new Map<string, number>();
  for (const r of rows) positions.set(r.cle.slice(PREFIXE_ORDRE_COLONNE.length), Number(r.valeur));

  return DOMAINES_TODO.map((d, i) => ({
    cle: d.key as string,
    label: d.label,
    pos: positions.has(d.key) ? (positions.get(d.key) as number) : i,
  }))
    .sort((a, b) => a.pos - b.pos)
    .map(({ cle, label }) => ({ cle, label }));
}
