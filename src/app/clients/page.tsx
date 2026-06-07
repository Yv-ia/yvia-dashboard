// Composant serveur : il lit les données directement dans la base, puis affiche la page.

import { db } from "@/db";
import { clients } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientFormDialog } from "./client-form-dialog";
import { DeleteClientButton } from "./delete-client-button";
import { creerClient, modifierClient } from "./actions";

export default async function PageClients() {
  // Lecture de tous les clients, triés par nom.
  const liste = await db.select().from(clients).orderBy(clients.nom);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Clients</h1>
        <ClientFormDialog
          action={creerClient}
          titre="Nouveau client"
          trigger={<Button>Nouveau client</Button>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {liste.length} client{liste.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liste.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun client pour l’instant. Cliquez sur « Nouveau client » pour en ajouter un.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Société</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nom}</TableCell>
                    <TableCell>{client.contactNom ?? "-"}</TableCell>
                    <TableCell>{client.contactEmail ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <ClientFormDialog
                        action={modifierClient}
                        client={client}
                        titre="Modifier le client"
                        trigger={
                          <Button variant="ghost" size="sm">
                            Modifier
                          </Button>
                        }
                      />
                      <DeleteClientButton id={client.id} nom={client.nom} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
