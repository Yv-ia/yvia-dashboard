// Agrégation : pour une mission donnée et un mois donné, calcule tout ce que
// le Dashboard doit afficher (jours facturables, tarif applicable, CA, coût, marge).
// Cette brique combine les briques déjà testées (jours facturables, tarif, marge).

import { joursFacturables } from "./jours-facturables";
import { tarifDuMois } from "./tarif-du-mois";
import { calculMarge } from "./marge";

export type MissionPourCalcul = {
  dateDebut: string;
  dateFin: string | null;
  joursParSemaine: number;
  tarifs: { moisEffet: string; tjmAchat: number; tjmVente: number }[];
  joursAbsence: number; // total d'absences de cette mission pour le mois considéré
};

export type ResultatMissionMois = {
  jours: number;
  tjmAchat: number | null;
  tjmVente: number | null;
  margeParJour: number;
  ca: number;
  cout: number;
  marge: number;
  tauxMarge: number;
};

export function calculMissionMois(
  m: MissionPourCalcul,
  annee: number,
  mois: number
): ResultatMissionMois {
  const jours = joursFacturables({
    annee,
    mois,
    dateDebut: m.dateDebut,
    dateFin: m.dateFin,
    joursParSemaine: m.joursParSemaine,
    joursAbsence: m.joursAbsence,
  });

  const tarif = tarifDuMois(m.tarifs, annee, mois);

  // Pas de tarif en vigueur ce mois-là : aucun montant calculable.
  if (!tarif) {
    return { jours, tjmAchat: null, tjmVente: null, margeParJour: 0, ca: 0, cout: 0, marge: 0, tauxMarge: 0 };
  }

  const { ca, cout, marge, tauxMarge } = calculMarge(jours, tarif.tjmAchat, tarif.tjmVente);
  return {
    jours,
    tjmAchat: tarif.tjmAchat,
    tjmVente: tarif.tjmVente,
    margeParJour: tarif.tjmVente - tarif.tjmAchat,
    ca,
    cout,
    marge,
    tauxMarge,
  };
}
