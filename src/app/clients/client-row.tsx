"use client";
// Ligne de client entièrement cliquable : ouvre le drawer du client.

import { TableCell, TableRow } from "@/components/ui/table";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDrawer } from "@/app/_drawer/drawer-stack";
import type { EntiteRef } from "@/app/_drawer/types";
import {
  labelStatutClient,
  normaliserStatutClient,
  type StatutClient,
} from "@/lib/clients/statut";
import type { StatsClient } from "./client-stats";

const STATUT_CLIENT_BADGE_CLASSES: Record<StatutClient, string> = {
  lead: "border-amber-200 bg-amber-50 text-amber-700",
  prospect: "border-sky-200 bg-sky-50 text-sky-700",
  signe: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactif: "border-yvia-line-strong bg-yvia-ice text-yvia-slate",
};

// margeTotale absente = marge masquée (rôle commercial).
type ClientRowProps = Omit<StatsClient, "margeTotale"> & {
  id: number;
  nom: string;
  statut: string;
  margeTotale?: number;
};

type ClientRowViewProps = ClientRowProps & {
  onOpen: (ref: EntiteRef) => void;
};

export function ClientRowView({
  id,
  nom,
  statut,
  caTotal,
  caMois,
  margeTotale,
  onOpen,
}: ClientRowViewProps) {
  const s = normaliserStatutClient(statut);
  return (
    <TableRow onClick={() => onOpen({ type: "client", id })} className="cursor-pointer">
      <TableCell className="font-medium">{nom}</TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-5",
            STATUT_CLIENT_BADGE_CLASSES[s]
          )}
        >
          {labelStatutClient(s)}
        </span>
      </TableCell>
      <TableCell className="text-right">{formatEuro(caTotal)}</TableCell>
      <TableCell className="text-right">{formatEuro(caMois)}</TableCell>
      {margeTotale !== undefined ? (
        <TableCell className={`text-right ${margeTotale < 0 ? "text-rose-600" : ""}`}>
          {formatEuro(margeTotale)}
        </TableCell>
      ) : null}
    </TableRow>
  );
}

export function ClientRow(props: ClientRowProps) {
  const { ouvrir } = useDrawer();

  return <ClientRowView {...props} onOpen={ouvrir} />;
}
