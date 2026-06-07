// Sélection du tarif applicable à un mois donné (spec : option B, historique des TJM).
//
// Une mission a une liste de périodes de tarification, chacune avec un "mois d'effet".
// Le tarif applicable pour un mois M est celui de la période la plus récente
// dont le mois d'effet est <= M.

import { premierJourDuMois } from "./jours-ouvres";

export type PeriodeTarif = {
  moisEffet: string; // 1er du mois, ex : "2026-07-01"
  tjmAchat: number;
  tjmVente: number;
};

export function tarifDuMois(
  tarifs: PeriodeTarif[],
  annee: number,
  mois: number
): PeriodeTarif | null {
  const moisCible = premierJourDuMois(annee, mois); // "AAAA-MM-01"

  // On garde les périodes déjà en vigueur ce mois-là...
  const eligibles = tarifs.filter((t) => t.moisEffet <= moisCible);
  if (eligibles.length === 0) return null;

  // ...et on prend la plus récente (mois d'effet le plus grand).
  return eligibles.reduce((meilleur, t) =>
    t.moisEffet > meilleur.moisEffet ? t : meilleur
  );
}
