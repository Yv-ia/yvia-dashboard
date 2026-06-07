// Calcul des jours fériés français (France métropolitaine).
// Certains jours sont fixes (14 juillet...), d'autres dépendent de la date de Pâques.
//
// Les dates sont manipulées en "UTC" et représentées en texte "AAAA-MM-JJ"
// pour éviter tout décalage lié au fuseau horaire.

// Calcule la date du dimanche de Pâques pour une année donnée (calendrier grégorien).
// Algorithme dit "de Meeus/Jones/Butcher".
function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31); // 3 = mars, 4 = avril
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jour));
}

// Ajoute un nombre de jours à une date.
function ajouterJours(date: Date, jours: number): Date {
  return new Date(date.getTime() + jours * 24 * 60 * 60 * 1000);
}

// Transforme une date en texte "AAAA-MM-JJ".
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Renvoie la liste (triée) des jours fériés français pour une année.
export function joursFeries(annee: number): string[] {
  const p = paques(annee);
  return [
    iso(new Date(Date.UTC(annee, 0, 1))), // Jour de l'An (1 janvier)
    iso(ajouterJours(p, 1)), // Lundi de Pâques
    iso(new Date(Date.UTC(annee, 4, 1))), // Fête du Travail (1 mai)
    iso(new Date(Date.UTC(annee, 4, 8))), // Victoire 1945 (8 mai)
    iso(ajouterJours(p, 39)), // Ascension
    iso(ajouterJours(p, 50)), // Lundi de Pentecôte
    iso(new Date(Date.UTC(annee, 6, 14))), // Fête nationale (14 juillet)
    iso(new Date(Date.UTC(annee, 7, 15))), // Assomption (15 août)
    iso(new Date(Date.UTC(annee, 10, 1))), // Toussaint (1 novembre)
    iso(new Date(Date.UTC(annee, 10, 11))), // Armistice (11 novembre)
    iso(new Date(Date.UTC(annee, 11, 25))), // Noël (25 décembre)
  ].sort();
}

// Indique si une date "AAAA-MM-JJ" est un jour férié.
export function estJourFerie(dateISO: string): boolean {
  const annee = Number(dateISO.slice(0, 4));
  return joursFeries(annee).includes(dateISO);
}
