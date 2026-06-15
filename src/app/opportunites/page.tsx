import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { opportunites, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import { KanbanBoard } from "./kanban-board";
import { OpportuniteFormDialog } from "./opportunite-form-dialog";
import { creerOpportunite } from "./actions";

export default async function PageOpportunites() {
  await exigerSession();

  const [opps, clientsListe] = await Promise.all([
    db
      .select({
        id: opportunites.id,
        clientId: opportunites.clientId,
        clientNom: clients.nom,
        nom: opportunites.nom,
        type: opportunites.type,
        statut: opportunites.statut,
        montantEstime: opportunites.montantEstime,
        ordre: opportunites.ordre,
        projetId: opportunites.projetId,
        dateGagne: opportunites.dateGagne,
      })
      .from(opportunites)
      .innerJoin(clients, eq(opportunites.clientId, clients.id))
      .where(eq(opportunites.actif, true))
      .orderBy(opportunites.ordre),
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
          <OpportuniteFormDialog
            action={creerOpportunite}
            clientsListe={clientsListe}
            titre="Nouvelle opportunité"
            trigger={<Button>Nouvelle opportunité</Button>}
          />
        }
      >
        <p className="text-sm text-muted-foreground">
          {opps.length} opportunité{opps.length > 1 ? "s" : ""} en cours
        </p>
      </ListViewToolbar>

      <KanbanBoard opportunites={opps} clientsListe={clientsListe} />
    </div>
  );
}
