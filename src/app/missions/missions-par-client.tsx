"use client";
// Vue des missions groupées par client : une ligne « chapeau » par client avec son
// total (marge / jour, ou TJM vente pour le commercial qui ne voit pas les marges),
// dépliable en accordéon sur le détail mission par mission (freelance). Un même
// freelance peut apparaître sous plusieurs clients (une ligne par mission).

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
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
import { MissionRow, type LigneMission } from "./mission-row";

export type GroupeClient = {
  clientId: number;
  clientNom: string;
  missions: LigneMission[];
  totalMargeJour: number;
  totalTjmVente: number;
};

export function MissionsParClient({
  groupes,
  voirMarges,
}: {
  groupes: GroupeClient[];
  voirMarges: boolean;
}) {
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());
  const toggle = (clientId: number) =>
    setOuverts((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(clientId)) suivant.delete(clientId);
      else suivant.add(clientId);
      return suivant;
    });

  // Colonnes : Mission, Freelance, [TJM achat], TJM vente, [Marge / jour], Statut.
  const nbColonnes = voirMarges ? 6 : 4;
  const totalGlobalMarge = groupes.reduce((s, g) => s + g.totalMargeJour, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mission</TableHead>
          <TableHead>Freelance</TableHead>
          {voirMarges ? <TableHead className="text-right">TJM achat</TableHead> : null}
          <TableHead className="text-right">TJM vente</TableHead>
          {voirMarges ? <TableHead className="text-right">Marge / jour</TableHead> : null}
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupes.map((g) => {
          const ouvert = ouverts.has(g.clientId);
          return (
            <Fragment key={g.clientId}>
              <TableRow
                onClick={() => toggle(g.clientId)}
                className="cursor-pointer bg-muted/40 hover:bg-muted/60"
              >
                <TableCell colSpan={nbColonnes}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      <ChevronRight
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                          ouvert ? "rotate-90" : ""
                        }`}
                      />
                      {g.clientNom}
                      <span className="font-normal text-muted-foreground">
                        · {g.missions.length} mission{g.missions.length > 1 ? "s" : ""}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {voirMarges ? "Marge / jour : " : "TJM vente : "}
                      <span className="font-medium text-foreground">
                        {formatEuro(voirMarges ? g.totalMargeJour : g.totalTjmVente)}
                      </span>
                    </span>
                  </div>
                </TableCell>
              </TableRow>
              {ouvert
                ? g.missions.map((m) => (
                    <MissionRow key={m.id} l={m} voirMarges={voirMarges} masquerClient />
                  ))
                : null}
            </Fragment>
          );
        })}
      </TableBody>
      {voirMarges && groupes.length > 1 ? (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total marge / jour</TableCell>
            <TableCell className="text-right">{formatEuro(totalGlobalMarge)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );
}
