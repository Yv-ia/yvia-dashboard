import Link from "next/link";
import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { peutVoirMarges } from "@/lib/auth/permissions";
import { missions, freelances, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import { MissionFormDialog } from "./mission-form-dialog";
import { MissionsParClient, type GroupeClient } from "./missions-par-client";
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

  // Groupement par client : une entrée par client, avec le cumul marge/jour
  // (run-rate journalier si chaque mission facturait un jour) et TJM vente. Un
  // freelance peut apparaître sous plusieurs clients (une ligne par mission).
  const groupesMap = new Map<number, GroupeClient>();
  for (const m of liste) {
    const g =
      groupesMap.get(m.clientId) ?? {
        clientId: m.clientId,
        clientNom: m.clientNom,
        missions: [],
        totalMargeJour: 0,
        totalTjmVente: 0,
      };
    g.missions.push(m);
    g.totalTjmVente += Number(m.tjmVente);
    // tjmAchat absent pour le commercial : la marge reste alors à 0 (non affichée).
    if (voirMarges) g.totalMargeJour += Number(m.tjmVente) - Number(m.tjmAchat);
    groupesMap.set(m.clientId, g);
  }
  const groupes = Array.from(groupesMap.values()).sort((a, b) =>
    a.clientNom.localeCompare(b.clientNom)
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
            <MissionsParClient groupes={groupes} voirMarges={voirMarges} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
