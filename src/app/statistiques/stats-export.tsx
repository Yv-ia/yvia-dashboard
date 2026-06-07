"use client";

import { Button } from "@/components/ui/button";
import type { LigneStat } from "./stats-table";

// Nombre au format français pour Excel (virgule décimale, sans séparateur de milliers).
const nombreFr = (n: number) => String(n).replace(".", ",");

export function StatsExport({
  lignes,
  labelColonne,
}: {
  lignes: LigneStat[];
  labelColonne: string;
}) {
  function exporter() {
    const enTete = [labelColonne, "CA", "Cout", "Marge", "Taux de marge (%)", "Jours"];
    const corps = lignes.map((l) => [
      l.label,
      nombreFr(l.ca),
      nombreFr(l.cout),
      nombreFr(l.marge),
      nombreFr(Math.round(l.taux * 1000) / 10),
      nombreFr(l.jours),
    ]);
    // Séparateur ";" (Excel FR), guillemets échappés, BOM pour l'UTF-8.
    const csv = [enTete, ...corps]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "statistiques.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={exporter} disabled={lignes.length === 0}>
      Exporter CSV
    </Button>
  );
}
