"use client";
// Ligne de freelance entièrement cliquable : ouvre le drawer du freelance.

import { TableCell, TableRow } from "@/components/ui/table";
import { formatEuro } from "@/lib/format";
import { useDrawer } from "@/app/_drawer/drawer-stack";

export function FreelanceRow({ id, nom, gain }: { id: number; nom: string; gain: number }) {
  const { ouvrir } = useDrawer();
  return (
    <TableRow onClick={() => ouvrir({ type: "freelance", id })} className="cursor-pointer">
      <TableCell className="font-medium">{nom}</TableCell>
      <TableCell className="text-right">{formatEuro(gain)}</TableCell>
    </TableRow>
  );
}
