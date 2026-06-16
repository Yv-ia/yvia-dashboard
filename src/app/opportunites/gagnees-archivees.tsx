"use client";
// Archives des opportunités GAGNÉES : celles signées un mois révolu, sorties du
// tableau Kanban et regroupées par mois de signature (du plus récent au plus
// ancien). Vue de consultation ; la carte reste éditable (même formulaire).

import { formatEuro, formatMoisDepuisDate } from "@/lib/format";
import { EntityLink } from "@/app/_drawer/drawer-stack";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labelTypeOpportunite, normaliserTypeOpportunite } from "@/lib/opportunites/type";
import { moisDeDate } from "@/lib/opportunites/gagnees";
import { OpportuniteFormDialog } from "./opportunite-form-dialog";
import { modifierOpportunite, supprimerOpportunite } from "./actions";
import type { OpportuniteKanban } from "./kanban-board";

function suffixeMontant(type: string): string {
  return normaliserTypeOpportunite(type) === "recurrent" ? " /mois" : "";
}

function totalMois(items: OpportuniteKanban[]): number {
  return items.reduce((s, o) => s + (o.montantEstime ? Number(o.montantEstime) : 0), 0);
}

export function GagneesArchivees({
  items,
  clientsListe,
}: {
  items: OpportuniteKanban[];
  clientsListe: { id: number; nom: string }[];
}) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        Aucune opportunité gagnée archivée.
      </p>
    );
  }

  // Regroupe par mois de signature, puis trie les mois du plus récent au plus ancien.
  const parMois = new Map<string, OpportuniteKanban[]>();
  for (const opp of items) {
    const mois = opp.dateGagne ? moisDeDate(opp.dateGagne) : "—";
    const liste = parMois.get(mois);
    if (liste) liste.push(opp);
    else parMois.set(mois, [opp]);
  }
  const moisTries = [...parMois.keys()].sort().reverse();

  return (
    <div className="space-y-6">
      {moisTries.map((mois) => {
        const opps = parMois.get(mois) ?? [];
        return (
          <section key={mois} className="space-y-2">
            <header className="flex items-baseline justify-between border-b pb-1">
              <h2 className="text-sm font-medium capitalize">
                {mois === "—" ? "Sans date" : formatMoisDepuisDate(`${mois}-01`)}
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {opps.length} gagnée{opps.length > 1 ? "s" : ""} · {formatEuro(totalMois(opps))}
              </span>
            </header>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {opps.map((opp) => (
                <Card key={opp.id} className="gap-0 py-3">
                  <CardHeader className="px-3 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <OpportuniteFormDialog
                        action={modifierOpportunite}
                        supprimer={supprimerOpportunite}
                        opportunite={opp}
                        clientsListe={clientsListe}
                        titre="Modifier l'opportunité"
                        trigger={
                          <button className="text-left">
                            <CardTitle className="text-sm font-medium hover:text-primary hover:underline">
                              {opp.nom}
                            </CardTitle>
                          </button>
                        }
                      />
                      <span className="shrink-0 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {labelTypeOpportunite(opp.type)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3">
                    <EntityLink
                      type="client"
                      id={opp.clientId}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      {opp.clientNom}
                    </EntityLink>
                    {opp.montantEstime ? (
                      <p className="mt-1 text-sm font-medium tabular-nums">
                        {formatEuro(Number(opp.montantEstime))}
                        {suffixeMontant(opp.type)}
                      </p>
                    ) : null}
                    {opp.projetId != null ? (
                      <p className="mt-1 text-[11px] text-emerald-700">Converti en projet</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
