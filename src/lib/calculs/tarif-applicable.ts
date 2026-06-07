// Sélection du tarif applicable à une DATE donnée (historique des TJM).
//
// Une mission a une liste de périodes de tarification, chacune avec une "date d'effet".
// Le tarif applicable un jour donné est celui de la période la plus récente
// dont la date d'effet est <= ce jour. Les jours antérieurs gardent l'ancien tarif.

export type PeriodeTarif = {
  dateEffet: string; // "AAAA-MM-JJ" : jour à partir duquel ce tarif s'applique
  tjmAchat: number;
  tjmVente: number;
};

export function tarifDuJour(
  tarifs: PeriodeTarif[],
  dateISO: string
): PeriodeTarif | null {
  // Comparaison de texte "AAAA-MM-JJ" = comparaison chronologique.
  const eligibles = tarifs.filter((t) => t.dateEffet <= dateISO);
  if (eligibles.length === 0) return null;
  return eligibles.reduce((meilleur, t) =>
    t.dateEffet > meilleur.dateEffet ? t : meilleur
  );
}
