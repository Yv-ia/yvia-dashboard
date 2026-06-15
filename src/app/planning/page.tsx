import { db } from "@/db";
import {
  missions,
  freelances,
  clients,
  affectations,
  projets,
  encaissements,
  decaissements,
  jalons,
} from "@/db/schema";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { estJourFerie } from "@/lib/calculs/jours-feries";
import { premierJourDuMois, dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { formatMois } from "@/lib/format";
import { PlanningCalendar, type Couleur, type LigneFreelance, type Jour } from "../planning-calendar";
import { EtendreMoisButton } from "../etendre-mois-button";
import { NavigationMois, moisSuivant } from "../navigation-mois";
import { exigerSession } from "@/lib/auth/server";

const pad2 = (n: number) => String(n).padStart(2, "0");

// Palette pour distinguer les missions dans le planning.
// Tons désaturés et cohérents avec la DA Yvia (dominante froide), assez
// différents les uns des autres pour ne pas confondre deux missions voisines.
const PALETTE: Couleur[] = [
  { bg: "#0571ed", fg: "#ffffff" }, // bleu Yvia
  { bg: "#0b172b", fg: "#ffffff" }, // navy
  { bg: "#2e8b8b", fg: "#ffffff" }, // sarcelle
  { bg: "#52698f", fg: "#ffffff" }, // ardoise
  { bg: "#5b6fb0", fg: "#ffffff" }, // bleu-violet
  { bg: "#5a8f6b", fg: "#ffffff" }, // vert-de-gris
  { bg: "#7a5f99", fg: "#ffffff" }, // prune doux
  { bg: "#b07d3c", fg: "#ffffff" }, // ocre doux
];

const LETTRES = ["D", "L", "M", "M", "J", "V", "S"];

export default async function PagePlanning({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  await exigerSession();

  const params = await searchParams;
  const maintenant = new Date();
  const annee = Number(params.annee) || maintenant.getUTCFullYear();
  const moisParam = Number(params.mois);
  const mois = moisParam >= 1 && moisParam <= 12 ? moisParam : maintenant.getUTCMonth() + 1;

  const suivant = moisSuivant(annee, mois);
  const debutMois = premierJourDuMois(annee, mois);
  const finMois = dernierJourDuMois(annee, mois);

  // Jours du mois (avec week-ends, jours fériés, et repérage d'aujourd'hui).
  const aujourdhuiISO = maintenant.toISOString().slice(0, 10);
  const nbJours = Number(finMois.slice(8, 10));
  const jours: Jour[] = [];
  for (let d = 1; d <= nbJours; d++) {
    const date = `${annee}-${pad2(mois)}-${pad2(d)}`;
    const dow = new Date(date + "T00:00:00Z").getUTCDay();
    jours.push({
      date,
      num: d,
      lettre: LETTRES[dow],
      weekend: dow === 0 || dow === 6,
      ferie: estJourFerie(date),
      estAujourdhui: date === aujourdhuiISO,
    });
  }

  // Données.
  const [
    freelancesActifs,
    clientsActifs,
    missionsDispo,
    affs,
    projetsActifs,
    encMois,
    decMois,
    jalMois,
  ] = await Promise.all([
    db
      .select({
        id: freelances.id,
        prenom: freelances.prenom,
        nom: freelances.nom,
        afficherPlanning: freelances.afficherPlanning,
      })
      .from(freelances)
      .where(eq(freelances.actif, true))
      .orderBy(freelances.nom),
    db
      .select({ id: clients.id, nom: clients.nom })
      .from(clients)
      .where(eq(clients.actif, true))
      .orderBy(clients.nom),
    db
      .select({
        id: missions.id,
        nom: missions.nom,
        freelanceId: missions.freelanceId,
        clientNom: clients.nom,
      })
      .from(missions)
      .innerJoin(clients, eq(missions.clientId, clients.id))
      .where(eq(missions.actif, true)),
    db
      .select({
        freelanceId: affectations.freelanceId,
        date: affectations.date,
        missionId: affectations.missionId,
        missionNom: missions.nom,
        tjmAchat: affectations.tjmAchat,
        tjmVente: affectations.tjmVente,
        clientNom: clients.nom,
        prenom: freelances.prenom,
        nom: freelances.nom,
      })
      .from(affectations)
      .innerJoin(missions, eq(affectations.missionId, missions.id))
      .innerJoin(clients, eq(missions.clientId, clients.id))
      .innerJoin(freelances, eq(affectations.freelanceId, freelances.id))
      .where(and(gte(affectations.date, debutMois), lte(affectations.date, finMois))),
    db
      .select({ id: projets.id, nom: projets.nom, clientNom: clients.nom, budget: projets.budget })
      .from(projets)
      .innerJoin(clients, eq(projets.clientId, clients.id))
      .where(and(eq(projets.actif, true), ne(projets.statutCommercial, "perdu")))
      .orderBy(projets.nom),
    db
      .select({
        id: encaissements.id,
        projetId: encaissements.projetId,
        date: encaissements.date,
        montant: encaissements.montant,
        libelle: encaissements.libelle,
      })
      .from(encaissements)
      .innerJoin(projets, eq(encaissements.projetId, projets.id))
      .where(
        and(
          eq(encaissements.statut, "encaisse"), // réalisé uniquement (le prévu ne compte pas comme CA)
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(encaissements.date, debutMois),
          lte(encaissements.date, finMois)
        )
      ),
    db
      .select({
        id: decaissements.id,
        projetId: decaissements.projetId,
        date: decaissements.date,
        montant: decaissements.montant,
        libelle: decaissements.libelle,
        prenom: freelances.prenom,
        nom: freelances.nom,
      })
      .from(decaissements)
      .innerJoin(projets, eq(decaissements.projetId, projets.id))
      .innerJoin(freelances, eq(decaissements.freelanceId, freelances.id))
      .where(
        and(
          eq(decaissements.statut, "decaisse"), // coût réalisé uniquement
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(decaissements.date, debutMois),
          lte(decaissements.date, finMois)
        )
      ),
    db
      .select({
        id: jalons.id,
        projetId: jalons.projetId,
        date: jalons.date,
        libelle: jalons.libelle,
      })
      .from(jalons)
      .innerJoin(projets, eq(jalons.projetId, projets.id))
      .where(
        and(
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(jalons.date, debutMois),
          lte(jalons.date, finMois)
        )
      ),
  ]);

  // Événements regroupés par projet puis par date.
  type EvenementProjet = {
    id: number;
    type: "encaissement" | "decaissement" | "jalon";
    montant: string | null; // null pour un jalon (pas de montant)
    libelle: string | null;
    freelanceNom: string | null;
  };
  const evenementsParProjet = new Map<number, Record<string, EvenementProjet[]>>();
  const ajouterEvenement = (projetId: number, date: string, ev: EvenementProjet) => {
    const parDate = evenementsParProjet.get(projetId) ?? {};
    parDate[date] = [...(parDate[date] ?? []), ev];
    evenementsParProjet.set(projetId, parDate);
  };
  for (const e of encMois)
    ajouterEvenement(e.projetId, e.date, {
      id: e.id,
      type: "encaissement",
      montant: e.montant,
      libelle: e.libelle,
      freelanceNom: null,
    });
  for (const d of decMois)
    ajouterEvenement(d.projetId, d.date, {
      id: d.id,
      type: "decaissement",
      montant: d.montant,
      libelle: d.libelle,
      freelanceNom: `${d.prenom} ${d.nom}`,
    });
  for (const j of jalMois)
    ajouterEvenement(j.projetId, j.date, {
      id: j.id,
      type: "jalon",
      montant: null,
      libelle: j.libelle,
      freelanceNom: null,
    });

  const projetsLignes = projetsActifs.map((p) => ({
    id: p.id,
    nom: p.nom,
    clientNom: p.clientNom,
    budget: p.budget,
    evenements: evenementsParProjet.get(p.id) ?? {},
  }));

  // Couleur stable par mission.
  const idsMissions = Array.from(
    new Set([...missionsDispo.map((m) => m.id), ...affs.map((a) => a.missionId)])
  ).sort((a, b) => a - b);
  const couleurDe = (missionId: number): Couleur =>
    PALETTE[idsMissions.indexOf(missionId) % PALETTE.length];

  // Lignes de la grille (une par freelance actif affiché dans le planning).
  // Les freelances masqués gardent leurs sélecteurs, affectations et montants :
  // seule la ligne du calendrier disparaît.
  const lignes: LigneFreelance[] = freelancesActifs
    .filter((f) => f.afficherPlanning)
    .map((f) => {
      const cellules: LigneFreelance["cellules"] = {};
      for (const a of affs) {
        if (a.freelanceId === f.id) {
          cellules[a.date] = {
            missionNom: a.missionNom,
            clientNom: a.clientNom,
            couleur: couleurDe(a.missionId),
            tjmAchat: a.tjmAchat,
            tjmVente: a.tjmVente,
          };
        }
      }
      return {
        id: f.id,
        nom: `${f.prenom} ${f.nom}`,
        missions: missionsDispo
          .filter((m) => m.freelanceId === f.id)
          .map((m) => ({
            id: m.id,
            nom: m.nom,
            clientNom: m.clientNom,
            couleur: couleurDe(m.id),
          })),
        cellules,
      };
    });

  const planningCalendarKey = [
    `${annee}-${mois}`,
    freelancesActifs
      .map((f) => `${f.id}:${f.prenom}:${f.nom}:${f.afficherPlanning}`)
      .sort()
      .join("|"),
    missionsDispo
      .map((m) => `${m.id}:${m.freelanceId}:${m.nom}:${m.clientNom}`)
      .sort()
      .join("|"),
    affs
      .map(
        (a) =>
          `${a.freelanceId}:${a.date}:${a.missionId}:${a.missionNom}:${a.clientNom}:${a.tjmAchat}:${a.tjmVente}`
      )
      .sort()
      .join("|"),
  ].join(";");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <NavigationMois basePath="/planning" annee={annee} mois={mois} />
      </div>

      {freelancesActifs.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Ajoutez des freelances et des missions pour commencer à planifier.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Action, juste au-dessus du calendrier */}
          <div className="flex items-center justify-end">
            <EtendreMoisButton
              annee={annee}
              mois={mois}
              libelleMoisSuivant={formatMois(suivant.annee, suivant.mois)}
            />
          </div>

          <PlanningCalendar
            key={planningCalendarKey}
            jours={jours}
            lignes={lignes}
            projets={projetsLignes}
            freelancesActifs={freelancesActifs}
            clientsActifs={clientsActifs}
          />
        </>
      )}
    </div>
  );
}
