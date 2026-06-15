import Link from "next/link";
import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { recurrents, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecurrentFormDialog } from "./recurrent-form-dialog";
import { RecurrentRow } from "./recurrent-row";
import { creerRecurrent } from "./actions";

export default async function PageRecurrents({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  await exigerSession();
  const { vue } = await searchParams;
  const archives = vue === "archives";

  const [liste, clientsListe] = await Promise.all([
    db
      .select({
        id: recurrents.id,
        clientId: recurrents.clientId,
        clientNom: clients.nom,
        nom: recurrents.nom,
        categorie: recurrents.categorie,
        montantRecurrent: recurrents.montantRecurrent,
        coutRecurrent: recurrents.coutRecurrent,
        dateDebut: recurrents.dateDebut,
        dateFin: recurrents.dateFin,
      })
      .from(recurrents)
      .innerJoin(clients, eq(recurrents.clientId, clients.id))
      .where(eq(recurrents.actif, !archives))
      .orderBy(recurrents.nom),
    db
      .select({ id: clients.id, nom: clients.nom })
      .from(clients)
      .where(eq(clients.actif, true))
      .orderBy(clients.nom),
  ]);

  return (
    <div className="space-y-6">
      <ListViewToolbar
        action={
          <RecurrentFormDialog
            action={creerRecurrent}
            clientsListe={clientsListe}
            titre="Nouveau contrat MCO"
            trigger={<Button>Nouveau contrat MCO</Button>}
          />
        }
      >
        <Link
          href="/recurrents"
          className={`rounded-md px-3 py-1.5 text-sm ${
            !archives ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Actifs
        </Link>
        <Link
          href="/recurrents?vue=archives"
          className={`rounded-md px-3 py-1.5 text-sm ${
            archives ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Archives
        </Link>
      </ListViewToolbar>

      <Card>
        <CardHeader>
          <CardTitle>
            {liste.length} contrat{liste.length > 1 ? "s" : ""} MCO
            {archives ? " archivé" + (liste.length > 1 ? "s" : "") : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liste.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {archives
                ? "Aucun contrat MCO archivé."
                : "Aucun contrat MCO. Créez-en un ou convertissez une opportunité récurrente gagnée."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Montant / mois</TableHead>
                  <TableHead className="text-right">Coût / mois</TableHead>
                  <TableHead className="text-right">Marge / mois</TableHead>
                  <TableHead className="text-right">Période</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste.map((r) => (
                  <RecurrentRow key={r.id} recurrent={r} clientsListe={clientsListe} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
