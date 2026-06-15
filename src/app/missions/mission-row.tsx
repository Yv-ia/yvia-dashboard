"use client";
// Ligne de mission entièrement cliquable (ouvre le drawer de la mission), sauf
// les cellules Freelance et Client qui ouvrent leur propre drawer.

import { TableCell, TableRow } from "@/components/ui/table";
import { formatEuro } from "@/lib/format";
import { useDrawer, EntityLink } from "@/app/_drawer/drawer-stack";

export type LigneMission = {
  id: number;
  nom: string;
  freelanceId: number;
  clientId: number;
  freelancePrenom: string;
  freelanceNom: string;
  clientNom: string;
  tjmAchat?: string; // absent quand l'utilisateur ne peut pas voir les marges
  tjmVente: string;
  actif: boolean;
};

export function MissionRow({ l, voirMarges }: { l: LigneMission; voirMarges: boolean }) {
  const { ouvrir } = useDrawer();
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <TableRow
      onClick={() => ouvrir({ type: "mission", id: l.id })}
      className="cursor-pointer"
    >
      <TableCell className="font-medium">{l.nom}</TableCell>
      <TableCell onClick={stop}>
        <EntityLink type="freelance" id={l.freelanceId} className="hover:text-primary hover:underline">
          {l.freelancePrenom} {l.freelanceNom}
        </EntityLink>
      </TableCell>
      <TableCell onClick={stop}>
        <EntityLink type="client" id={l.clientId} className="hover:text-primary hover:underline">
          {l.clientNom}
        </EntityLink>
      </TableCell>
      {voirMarges ? (
        <TableCell className="text-right">{formatEuro(Number(l.tjmAchat))}</TableCell>
      ) : null}
      <TableCell className="text-right">{formatEuro(Number(l.tjmVente))}</TableCell>
      {voirMarges ? (
        <TableCell className="text-right">
          {formatEuro(Number(l.tjmVente) - Number(l.tjmAchat))}
        </TableCell>
      ) : null}
      <TableCell>{l.actif ? "Actif" : "Inactif"}</TableCell>
    </TableRow>
  );
}
