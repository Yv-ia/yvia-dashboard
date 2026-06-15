"use client";
// Tableau Kanban des opportunités : une colonne par statut commercial, cartes
// déplaçables par glisser-déposer (HTML5 natif, sans dépendance). Déposer une
// carte dans une colonne change son statut. Une opportunité « gagnée » de type
// forfait peut être convertie en projet.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import { EntityLink } from "@/app/_drawer/drawer-stack";
import { Button } from "@/components/ui/button";
import { grouperParStatut } from "@/lib/opportunites/kanban";
import { labelTypeOpportunite, normaliserTypeOpportunite } from "@/lib/opportunites/type";
import { STATUT_COMMERCIAL_BADGE_CLASSES } from "@/lib/projets/statut-commercial";
import { OpportuniteFormDialog } from "./opportunite-form-dialog";
import {
  definirStatutOpportunite,
  convertirOpportunite,
  modifierOpportunite,
  supprimerOpportunite,
} from "./actions";

export type OpportuniteKanban = {
  id: number;
  clientId: number;
  clientNom: string;
  nom: string;
  type: string;
  statut: string;
  montantEstime: string | null;
  ordre: number;
  projetId: number | null;
};

// Un forfait est un montant fixe ; un récurrent (régie / MCO) est un montant par
// mois. On suffixe « /mois » à l'affichage des montants récurrents.
function suffixeMontant(type: string): string {
  return normaliserTypeOpportunite(type) === "recurrent" ? " /mois" : "";
}

// Sous-total des montants estimés d'une colonne, ventilé par catégorie (type
// d'opportunité : forfait / récurrent). Les montants nuls sont ignorés.
function sousTotauxParType(items: OpportuniteKanban[]): { type: string; montant: number }[] {
  const parType = new Map<string, number>();
  for (const opp of items) {
    if (opp.montantEstime == null) continue;
    parType.set(opp.type, (parType.get(opp.type) ?? 0) + Number(opp.montantEstime));
  }
  return [...parType.entries()].map(([type, montant]) => ({ type, montant }));
}

export function KanbanBoard({
  opportunites,
  clientsListe,
}: {
  opportunites: OpportuniteKanban[];
  clientsListe: { id: number; nom: string }[];
}) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const colonnes = grouperParStatut(opportunites);

  async function deposer(statut: string, ordre: number) {
    const id = draggedId;
    setDraggedId(null);
    if (id == null) return;
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("statut", statut);
    fd.set("ordre", String(ordre));
    const res = await definirStatutOpportunite(fd);
    if (res.ok) router.refresh();
    else toast.error(res.message ?? "Déplacement impossible.");
  }

  async function convertir(id: number) {
    const fd = new FormData();
    fd.set("id", String(id));
    const res = await convertirOpportunite(fd);
    if (res.ok) {
      toast.success("Opportunité convertie en projet.");
      router.refresh();
    } else {
      toast.error(res.message ?? "Conversion impossible.");
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {colonnes.map((col) => {
        const sousTotaux = sousTotauxParType(col.items);
        return (
        <section
          key={col.statut}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => deposer(col.statut, col.items.length)}
          className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2"
        >
          <header className="flex items-center justify-between px-1">
            <span className="text-sm font-medium">{col.label}</span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5",
                STATUT_COMMERCIAL_BADGE_CLASSES[col.statut]
              )}
            >
              {col.items.length}
            </span>
          </header>

          {sousTotaux.length > 0 ? (
            <div className="flex flex-col gap-0.5 rounded-md bg-background/70 px-2 py-1">
              {sousTotaux.map(({ type, montant }) => (
                <div
                  key={type}
                  className="flex justify-between text-[11px] text-muted-foreground"
                >
                  <span>{labelTypeOpportunite(type)}</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {formatEuro(montant)}
                    {suffixeMontant(type)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {col.items.map((opp) => {
              const convertible =
                col.statut === "gagne" && opp.type === "forfait" && opp.projetId == null;
              return (
                <article
                  key={opp.id}
                  draggable
                  onDragStart={() => setDraggedId(opp.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className="cursor-grab rounded-md border border-border bg-background p-2 shadow-sm active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <OpportuniteFormDialog
                      action={modifierOpportunite}
                      supprimer={supprimerOpportunite}
                      opportunite={opp}
                      clientsListe={clientsListe}
                      titre="Modifier l'opportunité"
                      trigger={
                        <button className="text-left text-sm font-medium hover:text-primary hover:underline">
                          {opp.nom}
                        </button>
                      }
                    />
                    <span className="shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {labelTypeOpportunite(opp.type)}
                    </span>
                  </div>

                  <div className="mt-1 text-xs">
                    <EntityLink
                      type="client"
                      id={opp.clientId}
                      className="text-muted-foreground hover:text-primary hover:underline"
                    >
                      {opp.clientNom}
                    </EntityLink>
                  </div>

                  {opp.montantEstime ? (
                    <p className="mt-1 text-sm font-medium tabular-nums">
                      {formatEuro(Number(opp.montantEstime))}
                      {suffixeMontant(opp.type)}
                    </p>
                  ) : null}

                  {opp.projetId != null ? (
                    <p className="mt-1 text-[11px] text-emerald-700">Converti en projet</p>
                  ) : convertible ? (
                    <Button
                      variant="outline"
                      className="mt-2 h-7 w-full text-xs"
                      onClick={() => convertir(opp.id)}
                    >
                      Convertir en projet
                    </Button>
                  ) : null}
                </article>
              );
            })}
            {col.items.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                Déposez une opportunité ici
              </p>
            ) : null}
          </div>
        </section>
        );
      })}
    </div>
  );
}
