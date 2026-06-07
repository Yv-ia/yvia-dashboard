"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
}: {
  periode: string;
  grouper: string;
  debut: string; // "AAAA-MM" pour la plage personnalisée
  fin: string; // "AAAA-MM"
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
      {/* Période */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="w-28 shrink-0 text-sm font-medium">Période</span>
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {PERIODES.map((x) => (
            <Link key={x.key} href={lienAvec({ periode: x.key })} className={seg(periode === x.key)}>
              {x.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Plage personnalisée (mois à mois) */}
      {periode === "perso" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="hidden w-28 shrink-0 sm:block" />
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
            <span>De</span>
            <input type="month" name="debut" defaultValue={debut} className={inputCls} />
            <span>à</span>
            <input type="month" name="fin" defaultValue={fin} className={inputCls} />
            <Button type="submit" size="sm">
              Appliquer
            </Button>
          </form>
        </div>
      ) : null}

      {/* Regrouper par */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="w-28 shrink-0 text-sm font-medium">Regrouper par</span>
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {GROUPES.map((x) => (
            <Link key={x.key} href={lienAvec({ grouper: x.key })} className={seg(grouper === x.key)}>
              {x.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
