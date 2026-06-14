// Composant serveur : il lit les données directement dans la base, puis affiche la page.

import Link from "next/link";
import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { peutVoirMarges } from "@/lib/auth/permissions";
import {
  affectations,
  clients,
  decaissements,
  encaissements,
  missions,
  projets,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import { premierJourDuMois, dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { STATUTS_CLIENT, normaliserStatutClient, type StatutClient } from "@/lib/clients/statut";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientFormDialog } from "./client-form-dialog";
import { ClientRow } from "./client-row";
import { creerClient } from "./actions";
import { calculerStatsClients, type StatsClient } from "./client-stats";

const statsVides: StatsClient = {
  caTotal: 0,
  caMois: 0,
  margeTotale: 0,
};

// Filtres rapides par statut commercial (en plus de l'onglet actifs/archives).
const FILTRES_STATUT = STATUTS_CLIENT.map((s) => ({ key: s.key, label: s.label }));

export default async function PageClients({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; statut?: string }>;
}) {
  const session = await exigerSession();
  const voirMarges = peutVoirMarges(session);
  const { vue, statut } = await searchParams;
  const archives = vue === "archives";
  // Filtre de statut optionnel : seule une vraie clé est retenue, sinon "tous".
  const statutFiltre: StatutClient | null = FILTRES_STATUT.some((f) => f.key === statut)
    ? (statut as StatutClient)
    : null;
  const maintenant = new Date();
  const annee = maintenant.getUTCFullYear();
  const mois = maintenant.getUTCMonth() + 1;
  const debutMois = premierJourDuMois(annee, mois);
  const finMois = dernierJourDuMois(annee, mois);

  // Conditions de la liste : actif/archivé + éventuellement le statut commercial.
  const conditions = [eq(clients.actif, !archives)];
  if (statutFiltre) conditions.push(eq(clients.statut, statutFiltre));

  // Le commercial ne voit pas les coûts : on ne lit même pas les décaissements
  // ni les TJM d'achat (la marge n'est ni calculée ni transmise au navigateur).
  const [liste, regie, encaissementsForfait, decaissementsForfait] = await Promise.all([
    db
      .select()
      .from(clients)
      .where(and(...conditions))
      .orderBy(clients.nom),
    db
      .select({
        clientId: missions.clientId,
        date: affectations.date,
        tjmAchat: affectations.tjmAchat,
        tjmVente: affectations.tjmVente,
      })
      .from(affectations)
      .innerJoin(missions, eq(affectations.missionId, missions.id)),
    db
      .select({
        clientId: projets.clientId,
        date: encaissements.date,
        montant: encaissements.montant,
      })
      .from(encaissements)
      .innerJoin(projets, eq(encaissements.projetId, projets.id))
      .where(eq(encaissements.statut, "encaisse")),
    voirMarges
      ? db
          .select({
            clientId: projets.clientId,
            date: decaissements.date,
            montant: decaissements.montant,
          })
          .from(decaissements)
          .innerJoin(projets, eq(decaissements.projetId, projets.id))
          .where(eq(decaissements.statut, "decaisse"))
      : Promise.resolve([]),
  ]);
  const statsParClient = calculerStatsClients({
    regie,
    encaissements: encaissementsForfait,
    decaissements: decaissementsForfait,
    debutMois,
    finMois,
  });

  // Conserve les query params pertinents quand on change d'onglet/filtre.
  const lienFiltre = (params: { vue?: string; statut?: string }) => {
    const sp = new URLSearchParams();
    if (params.vue) sp.set("vue", params.vue);
    if (params.statut) sp.set("statut", params.statut);
    const qs = sp.toString();
    return qs ? `/clients?${qs}` : "/clients";
  };

  return (
    <div className="space-y-6">
      <ListViewToolbar
        action={
          <ClientFormDialog
            action={creerClient}
            titre="Nouveau client"
            trigger={<Button>Nouveau client</Button>}
          />
        }
      >
        <Link
          href={lienFiltre({ statut })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !archives ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Actifs
        </Link>
        <Link
          href={lienFiltre({ vue: "archives", statut })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            archives ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Archives
        </Link>
      </ListViewToolbar>

      {/* Filtre rapide par statut commercial. */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={lienFiltre({ vue })}
          className={`rounded-full border px-3 py-1 text-xs ${
            !statutFiltre ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Tous
        </Link>
        {FILTRES_STATUT.map((f) => (
          <Link
            key={f.key}
            href={lienFiltre({ vue, statut: f.key })}
            className={`rounded-full border px-3 py-1 text-xs ${
              statutFiltre === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {liste.length} client{liste.length > 1 ? "s" : ""}
            {archives ? " archivé" + (liste.length > 1 ? "s" : "") : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liste.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {archives
                ? "Aucun client archivé."
                : "Aucun client pour l’instant. Cliquez sur « Nouveau client » pour en ajouter un."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Société</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">CA depuis le début</TableHead>
                  <TableHead className="text-right">CA du mois</TableHead>
                  {voirMarges ? <TableHead className="text-right">Marge totale</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste.map((client) => {
                  const stats = statsParClient.get(client.id) ?? statsVides;
                  return (
                    <ClientRow
                      key={client.id}
                      id={client.id}
                      nom={client.nom}
                      statut={normaliserStatutClient(client.statut)}
                      caTotal={stats.caTotal}
                      caMois={stats.caMois}
                      margeTotale={voirMarges ? stats.margeTotale : undefined}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
