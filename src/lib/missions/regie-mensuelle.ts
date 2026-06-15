// Agrégation du CA régie d'un mois à partir des affectations du planning. Le CA
// mensuel d'une mission varie selon le nombre de jours posés (congés, durée du
// mois) : on somme les TJM vente/achat des affectations du mois, par client puis
// par mission. Module pur (testable sans base ni rendu).

type Montant = number | string;

export type AffectationRegie = {
  clientId: number;
  clientNom: string;
  missionId: number;
  missionNom: string;
  freelanceId: number;
  freelancePrenom: string;
  freelanceNom: string;
  tjmVente: Montant;
  tjmAchat?: Montant; // absent si l'utilisateur ne peut pas voir les marges (commercial)
};

export type LigneMissionMois = {
  missionId: number;
  missionNom: string;
  freelanceId: number;
  freelancePrenom: string;
  freelanceNom: string;
  jours: number;
  ca: number;
  cout: number;
  marge: number;
};

export type GroupeClientMois = {
  clientId: number;
  clientNom: string;
  jours: number;
  ca: number;
  cout: number;
  marge: number;
  missions: LigneMissionMois[];
};

export type SyntheseRegieMois = {
  groupes: GroupeClientMois[];
  totalCa: number;
  totalCout: number;
  totalMarge: number;
};

const arrondi = (n: number) => Math.round(n * 100) / 100;

export function agregerRegieMensuelle(affectations: AffectationRegie[]): SyntheseRegieMois {
  const groupes = new Map<number, GroupeClientMois>();
  const missions = new Map<string, LigneMissionMois>(); // clé : clientId|missionId

  for (const a of affectations) {
    const ca = Number(a.tjmVente);
    const cout = a.tjmAchat == null ? 0 : Number(a.tjmAchat);

    let groupe = groupes.get(a.clientId);
    if (!groupe) {
      groupe = {
        clientId: a.clientId,
        clientNom: a.clientNom,
        jours: 0,
        ca: 0,
        cout: 0,
        marge: 0,
        missions: [],
      };
      groupes.set(a.clientId, groupe);
    }
    groupe.jours += 1;
    groupe.ca += ca;
    groupe.cout += cout;
    groupe.marge += ca - cout;

    const cle = `${a.clientId}|${a.missionId}`;
    let mission = missions.get(cle);
    if (!mission) {
      mission = {
        missionId: a.missionId,
        missionNom: a.missionNom,
        freelanceId: a.freelanceId,
        freelancePrenom: a.freelancePrenom,
        freelanceNom: a.freelanceNom,
        jours: 0,
        ca: 0,
        cout: 0,
        marge: 0,
      };
      missions.set(cle, mission);
      groupe.missions.push(mission);
    }
    mission.jours += 1;
    mission.ca += ca;
    mission.cout += cout;
    mission.marge += ca - cout;
  }

  const liste = Array.from(groupes.values())
    .map((g) => ({
      ...g,
      ca: arrondi(g.ca),
      cout: arrondi(g.cout),
      marge: arrondi(g.marge),
      missions: g.missions
        .map((m) => ({ ...m, ca: arrondi(m.ca), cout: arrondi(m.cout), marge: arrondi(m.marge) }))
        .sort((a, b) =>
          `${a.freelanceNom} ${a.freelancePrenom}`.localeCompare(
            `${b.freelanceNom} ${b.freelancePrenom}`,
            "fr"
          )
        ),
    }))
    .sort((a, b) => a.clientNom.localeCompare(b.clientNom, "fr"));

  return {
    groupes: liste,
    totalCa: arrondi(liste.reduce((s, g) => s + g.ca, 0)),
    totalCout: arrondi(liste.reduce((s, g) => s + g.cout, 0)),
    totalMarge: arrondi(liste.reduce((s, g) => s + g.marge, 0)),
  };
}
