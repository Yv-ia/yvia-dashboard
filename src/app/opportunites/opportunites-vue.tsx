"use client";
// Vue Opportunités : barre d'action + bascule entre le tableau Kanban (pipeline +
// gagnées du mois courant) et les archives (gagnées des mois révolus).

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import { KanbanBoard, type OpportuniteKanban } from "./kanban-board";
import { GagneesArchivees } from "./gagnees-archivees";
import { OpportuniteFormDialog } from "./opportunite-form-dialog";
import { creerOpportunite } from "./actions";

export function OpportunitesVue({
  tableau,
  archivees,
  clientsListe,
  moisCourant,
}: {
  tableau: OpportuniteKanban[];
  archivees: OpportuniteKanban[];
  clientsListe: { id: number; nom: string }[];
  moisCourant: string;
}) {
  const [vue, setVue] = useState<"tableau" | "archives">("tableau");

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
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {tableau.length} opportunité{tableau.length > 1 ? "s" : ""} en cours
          </p>
          {archivees.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVue((v) => (v === "archives" ? "tableau" : "archives"))}
            >
              {vue === "archives"
                ? "← Retour au tableau"
                : `Gagnées archivées (${archivees.length})`}
            </Button>
          ) : null}
        </div>
      </ListViewToolbar>

      {vue === "archives" ? (
        <GagneesArchivees items={archivees} clientsListe={clientsListe} />
      ) : (
        <KanbanBoard
          opportunites={tableau}
          clientsListe={clientsListe}
          moisCourant={moisCourant}
        />
      )}
    </div>
  );
}
