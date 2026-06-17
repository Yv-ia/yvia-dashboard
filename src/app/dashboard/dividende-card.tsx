"use client";
// KPI principal du Dashboard : le résultat distribuable projeté en fin d'année.
// Deux gros chiffres centrés — Résultat avant impôts et Résultat net post-IS (à
// distribuer) — + la progression mois par mois du résultat distribuable. Le détail
// du calcul (marge → frais → IS 15 %/25 % → mère-fille) est masqué par défaut,
// révélé au clic ; c'est aussi là qu'on saisit les frais de structure.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { DetailDividende } from "@/lib/finance/dividende";
import { definirFraisStructure } from "./actions";

const MOIS_COURT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

// Point de la progression : résultat distribuable (post-IS) cumulé à ce mois.
export type PointDividende = { mois: string; valeur: number };

export function DividendeCard({
  annee,
  moisSelectionne,
  detail,
  serie,
  fraisStructure,
}: {
  annee: number;
  moisSelectionne: number; // 1..12, pour situer « où on en est »
  detail: DetailDividende; // projection PLEINE année
  serie: PointDividende[]; // 12 points : progression du résultat distribuable
  fraisStructure: number;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [montant, setMontant] = useState(String(fraisStructure));
  const [enCours, setEnCours] = useState(false);

  const idx = Math.min(Math.max(moisSelectionne - 1, 0), serie.length - 1);
  const cumulMois = serie[idx]?.valeur ?? 0;
  const cumulPrec = idx > 0 ? serie[idx - 1].valeur : 0;
  const ecart = cumulMois - cumulPrec;

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const fd = new FormData();
    fd.set("annee", String(annee));
    fd.set("montant", montant);
    const res = await definirFraisStructure(fd);
    setEnCours(false);
    if (res.ok) {
      toast.success("Frais de structure mis à jour.");
      router.refresh();
    } else {
      toast.error(res.message ?? "Échec de l'enregistrement.");
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Résultat à distribuer — projection fin {annee}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deux gros KPI centrés */}
        <div className="grid items-end gap-6 sm:grid-cols-2">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Résultat avant impôts
            </p>
            <p className="font-display text-3xl tabular-nums sm:text-4xl">
              {formatEuro(detail.resultatAvantIS)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Résultat net post-IS — à distribuer
            </p>
            <p className="font-display text-4xl tabular-nums text-primary sm:text-5xl">
              {formatEuro(detail.resultatApresIS)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cumulé à fin {MOIS_COURT[idx]} : {formatEuro(cumulMois)} ·{" "}
              <span className={ecart >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {ecart >= 0 ? "+" : "−"}
                {formatEuro(Math.abs(ecart))}
              </span>{" "}
              vs mois précédent
            </p>
          </div>
        </div>

        {/* Progression du résultat distribuable cumulé, vers l'objectif de fin d'année */}
        <CourbeResultat serie={serie} idx={idx} annee={annee} />

        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setOuvert((o) => !o)}>
            <ChevronDown className={cn("size-4 transition-transform", ouvert && "rotate-180")} />
            Détail du calcul
          </Button>
        </div>

        {/* Détail du calcul (masqué par défaut) */}
        {ouvert ? (
          <div className="mx-auto max-w-xl space-y-1 rounded-lg border bg-background p-3 text-sm">
            <Ligne label="Marge brute dégagée" valeur={detail.margeBrute} />
            <Ligne label="Frais de structure" valeur={-detail.fraisStructure} />
            <Ligne label="= Résultat avant impôts" valeur={detail.resultatAvantIS} fort sep />
            <Ligne
              label="IS à 15 % (jusqu'à 42 500 €)"
              valeur={-detail.isSocietePartReduite}
            />
            <Ligne label="IS à 25 % (au-delà de 42 500 €)" valeur={-detail.isSocietePartNormale} />
            <Ligne
              label="= Résultat net post-IS (à distribuer)"
              valeur={detail.resultatApresIS}
              fort
              sep
              accent
            />
            <Ligne
              label={`Si remontée en holding — régime mère-fille (quote-part 5 % imposée = ${formatEuro(
                detail.quotePartMereFille
              )}) → dividende net : ${formatEuro(detail.dividendeNet)}`}
              valeur={-detail.isHolding}
              discret
            />

            <form onSubmit={enregistrer} className="mt-3 flex items-end gap-2 border-t pt-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Frais de structure {annee} (assurance RC, abonnements…)
                </span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <Button type="submit" size="sm" disabled={enCours}>
                <Pencil className="size-3.5" />
                {enCours ? "..." : "Enregistrer"}
              </Button>
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Courbe d'aire de la progression du résultat distribuable cumulé vers l'objectif
// de fin d'année. SVG (aire + ligne) mis à l'échelle en largeur ; repères (mois
// courant, libellés) positionnés en HTML pour un alignement exact et net.
function CourbeResultat({
  serie,
  idx,
  annee,
}: {
  serie: PointDividende[];
  idx: number;
  annee: number;
}) {
  const n = serie.length;
  const vals = serie.map((p) => Math.max(p.valeur, 0));
  const max = Math.max(...vals, 1);
  const objectif = serie[n - 1]?.valeur ?? 0;

  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`);
  const ligne = `M ${pts.join(" L ")}`;
  const aire = `M ${x(0)},100 L ${pts.join(" L ")} L ${x(n - 1)},100 Z`;
  const courantY = y(vals[idx] ?? 0);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-[11px]">
        <span className="uppercase tracking-wide text-muted-foreground">
          Résultat distribuable cumulé
        </span>
        <span className="text-muted-foreground">
          Objectif fin {annee} :{" "}
          <span className="font-medium tabular-nums text-foreground">{formatEuro(objectif)}</span>
        </span>
      </div>

      <div className="relative h-28 text-primary">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="aire-resultat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={aire} fill="url(#aire-resultat)" />
          <path
            d={ligne}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {/* Repère du mois courant : guide vertical + point sur la courbe */}
        <div className="absolute top-0 h-full w-px bg-primary/25" style={{ left: `${x(idx)}%` }} />
        <div
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background"
          style={{ left: `${x(idx)}%`, top: `${courantY}%` }}
        />
      </div>

      {/* Axe des mois (alignement exact sur les points) */}
      <div className="relative mt-1 h-4">
        {serie.map((p, i) => (
          <span
            key={p.mois}
            className={cn(
              "absolute -translate-x-1/2 text-[9px]",
              i === idx ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
            style={{ left: `${x(i)}%` }}
          >
            {MOIS_COURT[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

function Ligne({
  label,
  valeur,
  fort = false,
  sep = false,
  accent = false,
  discret = false,
}: {
  label: string;
  valeur: number;
  fort?: boolean;
  sep?: boolean;
  accent?: boolean;
  discret?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        sep && "border-t pt-1",
        fort && "font-medium",
        accent && "text-primary",
        discret && "text-xs text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "text-muted-foreground",
          fort && "text-foreground",
          accent && "text-primary",
          discret && "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span className="shrink-0 tabular-nums">{formatEuro(valeur)}</span>
    </div>
  );
}
