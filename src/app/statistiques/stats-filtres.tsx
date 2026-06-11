"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PERIODES, GROUPES } from "./stats-config";

// Élément d'un contrôle segmenté (fond clair, l'actif ressort en blanc + ombre).
const seg = (actif: boolean) =>
  `rounded-md px-3 py-1.5 text-sm transition-colors ${
    actif
      ? "bg-background font-medium text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground"
  }`;

const inputCls =
  "h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function StatsFiltres({
  periode,
  grouper,
  debut,
  fin,
  children,
  showGrouper = true,
}: {
  periode: string;
  grouper: string;
  debut: string; // "AAAA-MM-JJ" pour la plage personnalisée
  fin: string; // "AAAA-MM-JJ"
  children?: React.ReactNode; // emplacement de l'icône filtre, en bout de ligne
  showGrouper?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Construit un lien en conservant les autres paramètres de l'URL.
  function lienAvec(modif: Record<string, string>): string {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(modif)) p.set(k, v);
    return `${pathname}?${p.toString()}`;
  }

  return (
    <div className="space-y-3">
      {/* Une seule ligne : période (boutons) + regrouper (dropdown) + filtre */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {PERIODES.map((x) => (
            <Link key={x.key} href={lienAvec({ periode: x.key })} className={seg(periode === x.key)}>
              {x.label}
            </Link>
          ))}
        </div>

        {showGrouper ? (
          <Select
            value={grouper}
            triggerLabel="Regrouper par"
            onValueChange={(v) => router.push(lienAvec({ grouper: String(v) }))}
            options={GROUPES.map((g) => ({ value: g.key, label: `Par ${g.label.toLowerCase()}` }))}
            className="w-44"
          />
        ) : null}

        {children}
      </div>

      {/* Plage personnalisée (date à date) */}
      {periode === "perso" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            router.push(
              lienAvec({
                periode: "perso",
                debut: String(fd.get("debut")),
                fin: String(fd.get("fin")),
              })
            );
          }}
          className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <span>Du</span>
          <input type="date" name="debut" defaultValue={debut} className={inputCls} />
          <span>au</span>
          <input type="date" name="fin" defaultValue={fin} className={inputCls} />
          <Button type="submit" size="sm">
            Appliquer
          </Button>
        </form>
      ) : null}
    </div>
  );
}
