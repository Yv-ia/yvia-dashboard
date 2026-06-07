// Calcul des jours ouvrés : du lundi au vendredi, hors jours fériés français.

import { estJourFerie } from "./jours-feries";

// Premier jour du mois, en texte "AAAA-MM-JJ". mois va de 1 (janvier) à 12 (décembre).
export function premierJourDuMois(annee: number, mois: number): string {
  return new Date(Date.UTC(annee, mois - 1, 1)).toISOString().slice(0, 10);
}

// Dernier jour du mois (gère automatiquement 28/29/30/31 jours).
export function dernierJourDuMois(annee: number, mois: number): string {
  // Le "jour 0" du mois suivant = le dernier jour du mois courant.
  return new Date(Date.UTC(annee, mois, 0)).toISOString().slice(0, 10);
}

// Compte les jours ouvrés sur un intervalle inclusif [debut, fin].
// Si debut est après fin (intervalle vide), renvoie 0.
export function joursOuvres(debutISO: string, finISO: string): number {
  let total = 0;
  let courant = new Date(debutISO + "T00:00:00Z");
  const fin = new Date(finISO + "T00:00:00Z");

  while (courant.getTime() <= fin.getTime()) {
    const jourSemaine = courant.getUTCDay(); // 0 = dimanche, 6 = samedi
    const dateTexte = courant.toISOString().slice(0, 10);
    const estWeekend = jourSemaine === 0 || jourSemaine === 6;

    if (!estWeekend && !estJourFerie(dateTexte)) {
      total++;
    }
    courant = new Date(courant.getTime() + 24 * 60 * 60 * 1000);
  }
  return total;
}

// Raccourci : nombre de jours ouvrés dans un mois entier.
export function joursOuvresDuMois(annee: number, mois: number): number {
  return joursOuvres(premierJourDuMois(annee, mois), dernierJourDuMois(annee, mois));
}
