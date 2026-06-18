"use client";
// KPI principal du Dashboard : le résultat distribuable (post-IS), affiché AU CENTRE
// d'un graphe de progression. Un curseur permet de NAVIGUER mois par mois : le chiffre
// central montre le résultat distribuable cumulé à fin du mois choisi, l'objectif de
// fin d'année reste indiqué. Le détail du calcul (résultat avant impôts, IS 15 %/25 %,
// mère-fille) et la saisie des frais de structure sont dans le panneau « Détail ».

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatMois } from "@/lib/format";
import { calculerDividende } from "@/lib/finance/dividende";
import { definirFraisStructure } from "./actions";

const MOIS_COURT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export type MargeMois = { mois: string; marge: number };

export function DividendeCard({
  annee,
  moisSelectionne,
  margePrevAnnee,
  margeMensuelle,
  fraisStructureInitial,
}: {
  annee: number;
  moisSelectionne: number; // 1..12 (mois courant par défaut)
  margePrevAnnee: number; // marge brute prévisionnelle annuelle
  margeMensuelle: MargeMois[]; // 12 marges mensuelles
  fraisStructureInitial: number;
}) {
  const router = useRouter();
  const [moisSel, setMoisSel] = useState(Math.min(Math.max(moisSelectionne, 1), 12));
  const [frais, setFrais] = useState(fraisStructureInitial);
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // Détail plein exercice + série cumulée mois par mois (recalcul si les frais changent).
  const detail = useMemo(
    () => calculerDividende({ margeBrute: margePrevAnnee, fraisStructure: frais }),
    [margePrevAnnee, frais]
  );
  const serie = useMemo(
    () =>
      margeMensuelle.map((m, i) => {
        const margeCumul = margeMensuelle.slice(0, i + 1).reduce((s, x) => s + x.marge, 0);
        const d = calculerDividende({
          margeBrute: margeCumul,
          fraisStructure: (frais * (i + 1)) / 12,
        });
        return { mois: m.mois, valeur: d.resultatApresIS };
      }),
    [margeMensuelle, frais]
  );

  const idx = Math.min(Math.max(moisSel - 1, 0), serie.length - 1);
  const cumulMois = serie[idx]?.valeur ?? 0;
  const objectif = serie[serie.length - 1]?.valeur ?? 0;
  const modifie = frais !== fraisStructureInitial;

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const fd = new FormData();
    fd.set("annee", String(annee));
    fd.set("montant", String(frais));
    const res = await definirFraisStructure(fd);
    setEnCours(false);
    if (res.ok) {
      toast.success("Frais de structure enregistrés.");
      router.refresh();
    } else {
      toast.error(res.message ?? "Échec de l'enregistrement.");
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Résultat à distribuer — {annee}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-4 py-2 sm:px-8">
        {/* Graphe : résultat distribuable cumulé, avec le chiffre au centre */}
        <GrapheResultat
          serie={serie}
          idx={idx}
          annee={annee}
          cumulMois={cumulMois}
          objectif={objectif}
        />

        {/* Curseur de navigation mois par mois */}
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMoisSel((m) => Math.max(1, m - 1))}
            disabled={moisSel <= 1}
            aria-label="Mois précédent"
          >
            <ChevronLeft />
          </Button>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={moisSel}
            onChange={(e) => setMoisSel(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Mois"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMoisSel((m) => Math.min(12, m + 1))}
            disabled={moisSel >= 12}
            aria-label="Mois suivant"
          >
            <ChevronRight />
          </Button>
          <span className="w-28 shrink-0 text-center text-sm font-medium capitalize">
            {formatMois(annee, moisSel)}
          </span>
        </div>

        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setOuvert((o) => !o)}>
            <ChevronDown className={cn("size-4 transition-transform", ouvert && "rotate-180")} />
            Détail du calcul
          </Button>
        </div>

        {ouvert ? (
          <div className="mx-auto max-w-xl space-y-1 rounded-lg border bg-background p-3 text-sm">
            <Ligne label="Marge brute dégagée" valeur={detail.margeBrute} />
            <Ligne label="Frais de structure" valeur={-detail.fraisStructure} />
            <Ligne label="= Résultat avant impôts" valeur={detail.resultatAvantIS} fort sep />
            <Ligne label="IS à 15 % (jusqu'à 42 500 €)" valeur={-detail.isSocietePartReduite} />
            <Ligne label="IS à 25 % (au-delà de 42 500 €)" valeur={-detail.isSocietePartNormale} />
            <Ligne
              label="= Résultat net post-IS (à distribuer)"
              valeur={detail.resultatApresIS}
              fort
              sep
              accent
            />
            <Ligne
              label={`Si remontée en holding — mère-fille (quote-part 5 % imposée = ${formatEuro(
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
                  value={frais}
                  onChange={(e) => setFrais(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9 rounded-md border bg-background px-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <Button type="submit" size="sm" disabled={enCours || !modifie}>
                {enCours ? "..." : "Enregistrer"}
              </Button>
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Courbe d'aire (résultat distribuable cumulé) en fond, avec le chiffre du mois
// sélectionné affiché au centre et l'objectif de fin d'année en dessous.
function GrapheResultat({
  serie,
  idx,
  annee,
  cumulMois,
  objectif,
}: {
  serie: { mois: string; valeur: number }[];
  idx: number;
  annee: number;
  cumulMois: number;
  objectif: number;
}) {
  const n = serie.length;
  const vals = serie.map((p) => Math.max(p.valeur, 0));
  const max = Math.max(...vals, 1);
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`);
  const ligne = `M ${pts.join(" L ")}`;
  const aire = `M ${x(0)},100 L ${pts.join(" L ")} L ${x(n - 1)},100 Z`;

  return (
    <div>
      <div className="relative h-56 text-primary">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id="aire-resultat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={aire} fill="url(#aire-resultat)" />
          <path
            d={ligne}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {/* Repère du mois sélectionné : guide + point */}
        <div className="absolute top-0 h-full w-px bg-primary/25" style={{ left: `${x(idx)}%` }} />
        <div
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background"
          style={{ left: `${x(idx)}%`, top: `${y(vals[idx] ?? 0)}%` }}
        />

        {/* Chiffre central : résultat distribuable cumulé à fin du mois sélectionné */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border bg-card px-7 py-4 text-center shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Résultat à distribuer — à fin {MOIS_COURT[idx]}
            </p>
            <p className="font-display text-4xl tabular-nums text-primary sm:text-5xl">
              {formatEuro(cumulMois)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Objectif fin {annee} :{" "}
              <span className="font-medium tabular-nums text-foreground">{formatEuro(objectif)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Axe des mois (alignement exact sur les points) */}
      <div className="relative mt-2 h-4">
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
