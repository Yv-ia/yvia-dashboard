import Link from "next/link";
import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { peutVoirMarges } from "@/lib/auth/permissions";
import { missions, freelances, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuro } from "@/lib/format";
import { MissionFormDialog } from "./mission-form-dialog";
import { MissionRow } from "./mission-row";
import { creerMission } from "./actions";

const filtres = [
  { slug: "actives", label: "Actives" },
  { slug: "inactives", label: "Inactives" },
] as const;

export default async function PageMissions({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const session = await exigerSession();
  const voirMarges = peutVoirMarges(session);
  const { statut: filtreActif = "actives" } = await searchParams;

  const [missionsRows, freelancesActifs, clientsActifs] = await Promise.all([
    db
      .select({
        id: missions.id,
        nom: missions.nom,
        freelanceId: missions.freelanceId,
        clientId: missions.clientId,
        tjmVente: missions.tjmVente,
        actif: missions.actif,
        freelancePrenom: freelances.prenom,
        freelanceNom: freelances.nom,
        clientNom: clients.nom,
        // TJM achat (et donc la marge) : ni lu ni transmis si l'utilisateur ne
        // peut pas voir les marges (commercial).
        ...(voirMarges ? { tjmAchat: missions.tjmAchat } : {}),
      })
      .from(missions)
      .innerJoin(freelances, eq(missions.freelanceId, freelances.id))
      .innerJoin(clients, eq(missions.clientId, clients.id))
      .orderBy(missions.id),
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

  const actives = filtreActif !== "inactives";
  const liste = missionsRows.filter((m) => m.actif === actives);
  // Marge/jour cumulée du portefeuille affiché (run-rate journalier si chaque
  // mission facturait un jour). Sommer les TJM eux-mêmes n'aurait pas de sens.
  const totalMargeJour = liste.reduce(
    (s, m) => s + (Number(m.tjmVente) - Number(m.tjmAchat)),
    0
  );

  return (
    <div className="space-y-6">
      <ListViewToolbar
        action={
          <MissionFormDialog
            action={creerMission}
            titre="Nouvelle mission"
            freelancesActifs={freelancesActifs}
            clientsListe={clientsActifs}
            trigger={<Button>Nouvelle mission</Button>}
          />
        }
      >
        {filtres.map((f) => (
          <Link
            key={f.slug}
            href={`/missions?statut=${f.slug}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filtreActif === f.slug
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </ListViewToolbar>

      <Card>
        <CardHeader>
          <CardTitle>
            {liste.length} mission{liste.length > 1 ? "s" : ""}
            {!actives ? " inactive" + (liste.length > 1 ? "s" : "") : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liste.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {actives ? "Aucune mission active." : "Aucune mission inactive."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mission</TableHead>
                  <TableHead>Freelance</TableHead>
                  <TableHead>Client</TableHead>
                  {voirMarges ? <TableHead className="text-right">TJM achat</TableHead> : null}
                  <TableHead className="text-right">TJM vente</TableHead>
                  {voirMarges ? <TableHead className="text-right">Marge / jour</TableHead> : null}
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste.map((mission) => (
                  <MissionRow key={mission.id} l={mission} voirMarges={voirMarges} />
                ))}
              </TableBody>
              {liste.length > 1 ? (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5}>Total marge / jour</TableCell>
                    <TableCell className="text-right">{formatEuro(totalMargeJour)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
