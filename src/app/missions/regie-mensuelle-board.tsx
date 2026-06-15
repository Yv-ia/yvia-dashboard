"use client";
// Vue mensuelle de la régie : le CA d'un client/mission = somme des TJM des
// affectations du mois (varie selon les jours posés). Accordéon par client,
// dépliable sur le détail par freelance/mission. Une ligne ouvre le drawer mission.

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuro, formatJours } from "@/lib/format";
import { useDrawer, EntityLink } from "@/app/_drawer/drawer-stack";
import type { GroupeClientMois } from "@/lib/missions/regie-mensuelle";

export function RegieMensuelleBoard({
  groupes,
  voirMarges,
}: {
  groupes: GroupeClientMois[];
  voirMarges: boolean;
}) {
  const { ouvrir } = useDrawer();
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());
  const toggle = (clientId: number) =>
    setOuverts((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(clientId)) suivant.delete(clientId);
      else suivant.add(clientId);
      return suivant;
    });

  // Colonnes : Mission, Freelance, Jours, CA, [Coût], [Marge].
  const nbColonnes = voirMarges ? 6 : 4;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mission</TableHead>
          <TableHead>Freelance</TableHead>
          <TableHead className="text-right">Jours</TableHead>
          <TableHead className="text-right">CA du mois</TableHead>
          {voirMarges ? <TableHead className="text-right">Coût</TableHead> : null}
          {voirMarges ? <TableHead className="text-right">Marge</TableHead> : null}
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
                        · {formatJours(g.jours)}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      CA :{" "}
                      <span className="font-medium text-foreground">{formatEuro(g.ca)}</span>
                      {voirMarges ? (
                        <>
                          {" · Marge : "}
                          <span className="font-medium text-foreground">{formatEuro(g.marge)}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
              {ouvert
                ? g.missions.map((m) => (
                    <TableRow
                      key={m.missionId}
                      onClick={() => ouvrir({ type: "mission", id: m.missionId })}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{m.missionNom}</TableCell>
                      <TableCell onClick={stop}>
                        <EntityLink
                          type="freelance"
                          id={m.freelanceId}
                          className="hover:text-primary hover:underline"
                        >
                          {m.freelancePrenom} {m.freelanceNom}
                        </EntityLink>
                      </TableCell>
                      <TableCell className="text-right">{formatJours(m.jours)}</TableCell>
                      <TableCell className="text-right">{formatEuro(m.ca)}</TableCell>
                      {voirMarges ? (
                        <TableCell className="text-right">{formatEuro(m.cout)}</TableCell>
                      ) : null}
                      {voirMarges ? (
                        <TableCell className="text-right">{formatEuro(m.marge)}</TableCell>
                      ) : null}
                    </TableRow>
                  ))
                : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
