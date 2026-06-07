// Calcul de la marge d'une mission pour un mois (spec section 3).
// Les TJM sont en € HT. Tous les montants renvoyés sont arrondis au centime.

const arrondiCentime = (n: number) => Math.round(n * 100) / 100;

// Marge dégagée par jour facturé.
export function margeParJour(tjmAchat: number, tjmVente: number): number {
  return arrondiCentime(tjmVente - tjmAchat);
}

export type ResultatMarge = {
  ca: number; // chiffre d'affaires prévisionnel
  cout: number; // coût prévisionnel
  marge: number; // marge prévisionnelle
  tauxMarge: number; // ratio entre 0 et 1 (ex : 0,25 = 25 %). 0 si le CA est nul.
};

export function calculMarge(
  joursFacturables: number,
  tjmAchat: number,
  tjmVente: number
): ResultatMarge {
  const ca = arrondiCentime(joursFacturables * tjmVente);
  const cout = arrondiCentime(joursFacturables * tjmAchat);
  const marge = arrondiCentime(ca - cout);
  // Le taux de marge n'a pas de sens si le CA est nul : on renvoie 0 pour éviter une division par zéro.
  const tauxMarge = ca > 0 ? marge / ca : 0;
  return { ca, cout, marge, tauxMarge };
}
