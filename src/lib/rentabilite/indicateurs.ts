// Indicateurs de rentabilité d'un mois, à partir du réalisé (régie posée +
// encaissements/décaissements réalisés). Fonctions pures pour rester testables.
//
// « Client actif » = client ayant généré du CA sur le mois (jour de régie posé
// ou encaissement). Un client qui n'a qu'un coût (décaissement) ne compte pas.

type Montant = string | number;

export type RegieRentabilite = {
  clientId: number;
  date: string; // 'YYYY-MM-DD'
  tjmVente: Montant;
  tjmAchat: Montant;
};

export type FluxRentabilite = {
  clientId: number;
  date: string; // 'YYYY-MM-DD'
  montant: Montant;
};

export type IndicateursMois = {
  clientsActifs: number;
  caTotal: number;
  coutTotal: number;
  margeBrute: number;
  caParClient: number; // CA moyen par client actif (0 si aucun client actif)
};

const arrondi = (n: number) => Math.round(n * 100) / 100;

function dansLeMois(date: string, debutMois: string, finMois: string): boolean {
  return date >= debutMois && date <= finMois;
}

export function calculerIndicateursMois({
  regie,
  encaissements,
  decaissements,
  debutMois,
  finMois,
}: {
  regie: RegieRentabilite[];
  encaissements: FluxRentabilite[];
  decaissements: FluxRentabilite[];
  debutMois: string;
  finMois: string;
}): IndicateursMois {
  const clientsActifs = new Set<number>();
  let caTotal = 0;
  let coutTotal = 0;

  for (const ligne of regie) {
    if (!dansLeMois(ligne.date, debutMois, finMois)) continue;
    caTotal += Number(ligne.tjmVente);
    coutTotal += Number(ligne.tjmAchat);
    clientsActifs.add(ligne.clientId);
  }

  for (const enc of encaissements) {
    if (!dansLeMois(enc.date, debutMois, finMois)) continue;
    caTotal += Number(enc.montant);
    clientsActifs.add(enc.clientId);
  }

  for (const dec of decaissements) {
    if (!dansLeMois(dec.date, debutMois, finMois)) continue;
    coutTotal += Number(dec.montant);
  }

  caTotal = arrondi(caTotal);
  coutTotal = arrondi(coutTotal);
  const nb = clientsActifs.size;

  return {
    clientsActifs: nb,
    caTotal,
    coutTotal,
    margeBrute: arrondi(caTotal - coutTotal),
    caParClient: nb > 0 ? arrondi(caTotal / nb) : 0,
  };
}
