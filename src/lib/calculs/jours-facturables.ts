// Calcul des jours facturables d'une mission pour un mois donné.
//
// Formule (spec section 3) :
//   jours_facturables = jours_ouvrés du mois ∩ période de la mission
//                       × (jours_par_semaine / 5)
//                       − jours d'absence du mois
//   (résultat plancher à 0)

import { joursOuvres, premierJourDuMois, dernierJourDuMois } from "./jours-ouvres";

export type ParamsFacturables = {
  annee: number;
  mois: number; // 1 à 12
  dateDebut: string; // "AAAA-MM-JJ"
  dateFin?: string | null; // optionnel : null = mission sans terme défini
  joursParSemaine: number; // 0,5 à 7
  joursAbsence?: number; // défaut 0
};

// Comparaisons de dates au format "AAAA-MM-JJ" : l'ordre alphabétique = l'ordre chronologique.
const plusTard = (a: string, b: string) => (a > b ? a : b);
const plusTot = (a: string, b: string) => (a < b ? a : b);

export function joursFacturables(p: ParamsFacturables): number {
  const debutMois = premierJourDuMois(p.annee, p.mois);
  const finMois = dernierJourDuMois(p.annee, p.mois);

  // On limite la période au mois demandé (intersection mois ∩ mission).
  const debut = plusTard(debutMois, p.dateDebut);
  const fin = plusTot(finMois, p.dateFin ?? finMois);

  const ouvres = joursOuvres(debut, fin); // 0 si la mission ne couvre pas ce mois
  const ratio = p.joursParSemaine / 5;
  const brut = ouvres * ratio - (p.joursAbsence ?? 0);

  const resultat = Math.max(0, brut);
  // Arrondi à 2 décimales pour éviter les imprécisions des nombres à virgule.
  return Math.round(resultat * 100) / 100;
}
