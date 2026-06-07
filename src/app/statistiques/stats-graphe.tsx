"use client";

import { useState } from "react";
import { formatEuro, formatPourcent, formatJours } from "@/lib/format";
import type { LigneStat } from "./stats-table";

const METRIQUES = [
  { key: "marge", label: "Marge", type: "euro" },
  { key: "ca", label: "CA", type: "euro" },
  { key: "cout", label: "Coût", type: "euro" },
  { key: "jours", label: "Jours", type: "jours" },
  { key: "taux", label: "Taux de marge", type: "pourcent" },
] as const;

type CleMetrique = (typeof METRIQUES)[number]["key"];

const seg = (actif: boolean) =>
  `rounded-md px-3 py-1.5 text-sm transition-colors ${
    actif
      ? "bg-background font-medium text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground"
  }`;

export function StatsGraphe({ lignes }: { lignes: LigneStat[] }) {
  const [metrique, setMetrique] = useState<CleMetrique>("marge");
  const conf = METRIQUES.find((m) => m.key === metrique)!;

  const max = Math.max(0, ...lignes.map((l) => l[metrique]));
  const fmt = (v: number) =>
    conf.type === "euro"
      ? formatEuro(v)
      : conf.type === "pourcent"
        ? formatPourcent(v)
        : formatJours(v);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="w-28 shrink-0 text-sm font-medium">Métrique</span>
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {METRIQUES.map((m) => (
            <button key={m.key} onClick={() => setMetrique(m.key)} className={seg(metrique === m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {lignes.map((l) => {
          const v = l[metrique];
          const pct = max > 0 ? (v / max) * 100 : 0;
          return (
            <div key={l.cle} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-sm" title={l.label}>
                {l.label}
              </div>
              <div className="h-7 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${v > 0 ? Math.max(pct, 2) : 0}%` }}
                />
              </div>
              <div className="w-24 shrink-0 text-right text-sm font-medium tabular-nums">
                {fmt(v)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
