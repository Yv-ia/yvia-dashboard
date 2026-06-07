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

const chip = (actif: boolean) =>
  `rounded-md px-2.5 py-1 text-xs ${
    actif ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
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
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-sm text-muted-foreground">Métrique :</span>
        {METRIQUES.map((m) => (
          <button key={m.key} onClick={() => setMetrique(m.key)} className={chip(metrique === m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {lignes.map((l) => {
          const v = l[metrique];
          const pct = max > 0 ? (v / max) * 100 : 0;
          return (
            <div key={l.cle} className="flex items-center gap-3">
              <div className="w-36 shrink-0 truncate text-sm" title={l.label}>
                {l.label}
              </div>
              <div className="flex-1">
                <div
                  className="h-5 rounded-sm bg-primary"
                  style={{ width: `${v > 0 ? Math.max(pct, 1.5) : 0}%` }}
                />
              </div>
              <div className="w-24 shrink-0 text-right text-sm tabular-nums">{fmt(v)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
