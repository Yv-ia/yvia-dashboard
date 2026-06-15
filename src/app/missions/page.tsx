import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { peutVoirMarges } from "@/lib/auth/permissions";
import { missions, freelances, clients, affectations } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { premierJourDuMois, dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { formatEuro, formatMois } from "@/lib/format";
import { NavigationMois } from "../navigation-mois";
import { OngletsRegie } from "../regie/onglets-regie";
import { MissionFormDialog } from "./mission-form-dialog";
import { ReporterMoisDialog } from "./reporter-mois-dialog";
import { RegieMensuelleBoard } from "./regie-mensuelle-board";
import { agregerRegieMensuelle, type AffectationRegie } from "@/lib/missions/regie-mensuelle";
import { creerMission } from "./actions";

export default async function PageRegie({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  const session = await exigerSession();
  const voirMarges = peutVoirMarges(session);

  const params = await searchParams;
  const maintenant = new Date();
  const annee = Number(params.annee) || maintenant.getUTCFullYear();
  const moisParam = Number(params.mois);
  const mois = moisParam >= 1 && moisParam <= 12 ? moisParam : maintenant.getUTCMonth() + 1;
  const debutMois = premierJourDuMois(annee, mois);
  const finMois = dernierJourDuMois(annee, mois);
  const prevAnnee = mois === 1 ? annee - 1 : annee;
  const prevMois = mois === 1 ? 12 : mois - 1;

  const [affs, freelancesActifs, clientsActifs] = await Promise.all([
    // CA régie du mois = somme des TJM des affectations posées ce mois-ci (varie
    // selon les jours/congés). Le TJM achat (marge) n'est ni lu ni transmis au
    // commercial. Une affectation référence sa mission, son client et son freelance.
    db
      .select({
        clientId: missions.clientId,
        clientNom: clients.nom,
        missionId: affectations.missionId,
        missionNom: missions.nom,
        freelanceId: affectations.freelanceId,
        freelancePrenom: freelances.prenom,
        freelanceNom: freelances.nom,
        tjmVente: affectations.tjmVente,
        ...(voirMarges ? { tjmAchat: affectations.tjmAchat } : {}),
      })
      .from(affectations)
      .innerJoin(missions, eq(affectations.missionId, missions.id))
      .innerJoin(clients, eq(missions.clientId, clients.id))
      .innerJoin(freelances, eq(affectations.freelanceId, freelances.id))
      .where(and(gte(affectations.date, debutMois), lte(affectations.date, finMois))),
    db
      .select({ id: freelances.id, prenom: freelances.prenom, nom: freelances.nom })
      .from(freelances)
      .where(eq(freelances.actif, true))
      .orderBy(freelances.nom),
    db
      .select({ id: clients.id, nom: clients.nom })
      .from(clients)
      .where(eq(clients.actif, true))
      .orderBy(clients.nom),
  ]);

  const synthese = agregerRegieMensuelle(affs as AffectationRegie[]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OngletsRegie actif="planning" />
        <NavigationMois basePath="/missions" annee={annee} mois={mois} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {voirMarges ? (
          <ReporterMoisDialog
            annee={annee}
            mois={mois}
            libelleMois={formatMois(annee, mois)}
            libelleMoisPrecedent={formatMois(prevAnnee, prevMois)}
            trigger={<Button variant="outline">Dupliquer le mois précédent</Button>}
          />
        ) : null}
        <MissionFormDialog
          action={creerMission}
          titre="Ajouter un freelance"
          freelancesActifs={freelancesActifs}
          clientsListe={clientsActifs}
          trigger={<Button>Ajouter un freelance</Button>}
        />
      </div>

      {/* Synthèse du CA régie du mois affiché */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Synthese titre="CA régie du mois" valeur={formatEuro(synthese.totalCa)} />
        {voirMarges ? <Synthese titre="Coût" valeur={formatEuro(synthese.totalCout)} /> : null}
        {voirMarges ? <Synthese titre="Marge" valeur={formatEuro(synthese.totalMarge)} /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Régie</CardTitle>
        </CardHeader>
        <CardContent>
          {synthese.groupes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune affectation de régie ce mois-ci.</p>
          ) : (
            <RegieMensuelleBoard groupes={synthese.groupes} voirMarges={voirMarges} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Synthese({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl sm:text-3xl">{valeur}</p>
      </CardContent>
    </Card>
  );
}
