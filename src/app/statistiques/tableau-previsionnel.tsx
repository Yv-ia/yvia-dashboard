"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuro, formatJours, formatMois } from "@/lib/format";
import { cn } from "@/lib/utils";
import { lignesDetailMois, type DetailsPrevisionnel, type LignePrevisionnel } from "./pilotage-calculs";

export function TableauPrevisionnel({ lignes }: { lignes: LignePrevisionnel[] }) {
  const [lignesOuvertes, setLignesOuvertes] = useState<Set<string>>(() => new Set());
  const total = totaliserPrevisionnel(lignes);

  function basculer(cle: string) {
    setLignesOuvertes((courant) => {
      const suivant = new Set(courant);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mois</TableHead>
          <TableHead className="text-right">CA max</TableHead>
          <TableHead className="text-right">CA probable</TableHead>
          <TableHead className="text-right">Charges prévues</TableHead>
          <TableHead className="text-right">Marge max</TableHead>
          <TableHead className="text-right">Marge probable</TableHead>
          <TableHead className="text-right">Cumul probable</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((l) => {
          const ouvert = lignesOuvertes.has(l.cle);
          const detailsDisponibles = aDesDetails(l.details);
          const mois = formatMois(l.annee, l.mois);

          return (
            <Fragment key={l.cle}>
              <TableRow aria-expanded={ouvert}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`${ouvert ? "Masquer" : "Afficher"} les détails de ${mois}`}
                      aria-expanded={ouvert}
                      disabled={!detailsDisponibles}
                      onClick={() => basculer(l.cle)}
                      className={cn(!detailsDisponibles && "opacity-40")}
                    >
                      <ChevronDown className={cn("transition-transform", ouvert && "rotate-180")} />
                    </Button>
                    <span className="capitalize">{mois}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatEuro(l.caMax)}</TableCell>
                <TableCell className="text-right">{formatEuro(l.caProb)}</TableCell>
                <TableCell className="text-right text-rose-600">{formatEuro(l.charges)}</TableCell>
                <TableCell className={`text-right ${l.margeMax < 0 ? "text-rose-600" : ""}`}>
                  {formatEuro(l.margeMax)}
                </TableCell>
                <TableCell className={`text-right ${l.margeProb < 0 ? "text-rose-600" : ""}`}>
                  {formatEuro(l.margeProb)}
                </TableCell>
                <TableCell className={`text-right font-medium ${l.cumulProb < 0 ? "text-rose-600" : ""}`}>
                  {formatEuro(l.cumulProb)}
                </TableCell>
              </TableRow>
              {ouvert ? (
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell colSpan={7} className="p-0 whitespace-normal">
                    <DetailsMois details={l.details} />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right">{formatEuro(total.caMax)}</TableCell>
          <TableCell className="text-right">{formatEuro(total.caProb)}</TableCell>
          <TableCell className="text-right">{formatEuro(total.charges)}</TableCell>
          <TableCell className={`text-right ${total.margeMax < 0 ? "text-rose-600" : ""}`}>
            {formatEuro(total.margeMax)}
          </TableCell>
          <TableCell className={`text-right ${total.margeProb < 0 ? "text-rose-600" : ""}`}>
            {formatEuro(total.margeProb)}
          </TableCell>
          <TableCell className={`text-right ${total.cumulProb < 0 ? "text-rose-600" : ""}`}>
            {formatEuro(total.cumulProb)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

// Même tableau que le « Détail du mois » du dashboard.
function DetailsMois({ details }: { details: DetailsPrevisionnel }) {
  const lignes = lignesDetailMois(details);
  const totalMarge = lignes.reduce((s, l) => s + l.marge, 0);

  return (
    <div className="border-t border-border bg-muted/20 p-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mission / Projet</TableHead>
            <TableHead>Freelance</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Encaissements</TableHead>
            <TableHead className="text-right">Décaissements</TableHead>
            <TableHead className="text-right">Jours</TableHead>
            <TableHead className="text-right">Marge du mois</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignes.map((l) => (
            <TableRow key={l.cle}>
              <TableCell>{l.libelle}</TableCell>
              <TableCell>{l.freelanceNom ?? "-"}</TableCell>
              <TableCell>{l.clientNom}</TableCell>
              <TableCell className="text-right">{formatEuro(l.encaissements)}</TableCell>
              <TableCell className="text-right">{formatEuro(l.decaissements)}</TableCell>
              <TableCell className="text-right">
                {l.jours !== null ? formatJours(l.jours) : "-"}
              </TableCell>
              <TableCell className="text-right">{formatEuro(l.marge)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} className="font-medium">
              Total
            </TableCell>
            <TableCell className="text-right font-medium">{formatEuro(totalMarge)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function aDesDetails(details: DetailsPrevisionnel) {
  return details.regie.length > 0 || details.encaissements.length > 0 || details.decaissements.length > 0;
}

function totaliserPrevisionnel(lignes: LignePrevisionnel[]) {
  const total = lignes.reduce(
    (s, l) => ({
      caMax: s.caMax + l.caMax,
      caProb: s.caProb + l.caProb,
      charges: s.charges + l.charges,
      margeMax: s.margeMax + l.margeMax,
      margeProb: s.margeProb + l.margeProb,
    }),
    { caMax: 0, caProb: 0, charges: 0, margeMax: 0, margeProb: 0 }
  );
  return {
    ...total,
    cumulProb: lignes.length ? lignes[lignes.length - 1].cumulProb : 0,
  };
}
