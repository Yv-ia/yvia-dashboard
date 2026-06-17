// Du résultat à l'argent réellement remontable aux actionnaires (100 % dividende).
//
// Chaîne de calcul :
//   marge brute dégagée
//   − frais de structure (assurance RC, abonnements…)            = résultat avant IS
//   − IS société (15 % jusqu'à 42 500 €, 25 % au-delà)           = résultat après IS
//   = dividende distribué (100 %), remonté en holding
//   − imposition mère-fille : seule la quote-part de frais et charges (5 % du
//     dividende) est réintégrée et taxée à l'IS de la holding
//   = dividende net remontable
//
// Hypothèses (à valider) : tous les actionnaires détiennent via une holding au
// régime mère-fille ; la quote-part de 5 % est taxée au même barème IS.
// Fonctions pures (testables, sans accès base).

export const IS_SEUIL_REDUIT = 42_500; // € : plafond du taux réduit d'IS
export const IS_TAUX_REDUIT = 0.15;
export const IS_TAUX_NORMAL = 0.25;
export const QUOTE_PART_MERE_FILLE = 0.05; // 5 % réintégrés au régime mère-fille

const arrondi = (n: number) => Math.round(n * 100) / 100;

// IS au barème : 15 % jusqu'à 42 500 €, 25 % au-delà. Renvoie le détail des deux parts.
export function calculerIS(base: number): { partReduite: number; partNormale: number; total: number } {
  if (base <= 0) return { partReduite: 0, partNormale: 0, total: 0 };
  const partReduite = arrondi(Math.min(base, IS_SEUIL_REDUIT) * IS_TAUX_REDUIT);
  const partNormale = arrondi(Math.max(0, base - IS_SEUIL_REDUIT) * IS_TAUX_NORMAL);
  return { partReduite, partNormale, total: arrondi(partReduite + partNormale) };
}

export type DetailDividende = {
  margeBrute: number;
  fraisStructure: number;
  resultatAvantIS: number;
  isSocietePartReduite: number;
  isSocietePartNormale: number;
  isSociete: number;
  resultatApresIS: number;
  quotePartMereFille: number;
  isHolding: number;
  dividendeNet: number; // chiffre principal : argent post-IS remontable
};

export function calculerDividende({
  margeBrute,
  fraisStructure,
}: {
  margeBrute: number;
  fraisStructure: number;
}): DetailDividende {
  const resultatAvantIS = arrondi(margeBrute - fraisStructure);

  // Résultat nul ou négatif : pas d'IS, pas de dividende (perte reportée).
  if (resultatAvantIS <= 0) {
    return {
      margeBrute: arrondi(margeBrute),
      fraisStructure: arrondi(fraisStructure),
      resultatAvantIS,
      isSocietePartReduite: 0,
      isSocietePartNormale: 0,
      isSociete: 0,
      resultatApresIS: resultatAvantIS,
      quotePartMereFille: 0,
      isHolding: 0,
      dividendeNet: 0,
    };
  }

  const isSociete = calculerIS(resultatAvantIS);
  const resultatApresIS = arrondi(resultatAvantIS - isSociete.total);

  // 100 % distribué en dividende, remonté en holding : régime mère-fille → seule
  // la quote-part de frais et charges (5 %) est imposée à l'IS.
  const quotePart = arrondi(resultatApresIS * QUOTE_PART_MERE_FILLE);
  const isHolding = calculerIS(quotePart).total;
  const dividendeNet = arrondi(resultatApresIS - isHolding);

  return {
    margeBrute: arrondi(margeBrute),
    fraisStructure: arrondi(fraisStructure),
    resultatAvantIS,
    isSocietePartReduite: isSociete.partReduite,
    isSocietePartNormale: isSociete.partNormale,
    isSociete: isSociete.total,
    resultatApresIS,
    quotePartMereFille: quotePart,
    isHolding,
    dividendeNet,
  };
}
