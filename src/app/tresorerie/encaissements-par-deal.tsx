"use client";
// Suivi des encaissements PAR DEAL forfait gagné. Le statut (Non / Partiel / Total)
// est CALCULÉ à partir des encaissements réellement saisis (Σ encaissé vs CA du
// deal) : il ne peut pas dériver et se mettra à jour seul au rapprochement bancaire.
// « Gérer » rouvre le dialogue projet pour saisir un événement d'encaissement
// (date + montant).

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { EntityLink } from "@/app/_drawer/drawer-stack";
import { ProjetDetailDialog } from "@/app/projets/projet-detail-dialog";
import type { ProjetComplet } from "./tresorerie-echeances";

export type DealEncaissement = {
  projetId: number;
  projetNom: string;
  clientId: number;
  clientNom: string;
  ca: number;
  encaisse: number;
  reste: number;
  statut: "non" | "partiel" | "total";
};

const BADGE: Record<DealEncaissement["statut"], { label: string; classe: string }> = {
  non: { label: "Non encaissé", classe: "border-yvia-line-strong bg-yvia-ice text-yvia-slate" },
  partiel: { label: "Partiel", classe: "border-amber-200 bg-amber-50 text-amber-700" },
  total: { label: "Encaissé", classe: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

export function EncaissementsParDeal({
  deals,
  projetsParId,
  freelancesActifs,
}: {
  deals: DealEncaissement[];
  projetsParId: Record<number, ProjetComplet>;
  freelancesActifs: { id: number; prenom: string; nom: string }[];
}) {
  const [projetOuvert, setProjetOuvert] = useState<number | null>(null);
  const projet = projetOuvert != null ? projetsParId[projetOuvert] : null;

  const totalCa = deals.reduce((s, d) => s + d.ca, 0);
  const totalEncaisse = deals.reduce((s, d) => s + d.encaisse, 0);
  const totalReste = deals.reduce((s, d) => s + d.reste, 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Synthese titre="CA gagné" valeur={formatEuro(totalCa)} />
        <Synthese titre="Encaissé" valeur={formatEuro(totalEncaisse)} />
        <Synthese titre="Reste à encaisser" valeur={formatEuro(totalReste)} accent={totalReste > 0} />
      </div>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun deal forfait gagné.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">CA</TableHead>
              <TableHead className="text-right">Encaissé</TableHead>
              <TableHead className="text-right">Reste</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((d) => (
              <TableRow key={d.projetId}>
                <TableCell className="font-medium">{d.projetNom}</TableCell>
                <TableCell>
                  <EntityLink
                    type="client"
                    id={d.clientId}
                    className="hover:text-primary hover:underline"
                  >
                    {d.clientNom}
                  </EntityLink>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatEuro(d.ca)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEuro(d.encaisse)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEuro(d.reste)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${BADGE[d.statut].classe}`}
                  >
                    {BADGE[d.statut].label}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setProjetOuvert(d.projetId)}>
                    Encaissements
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuro(totalCa)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuro(totalEncaisse)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuro(totalReste)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {projet ? (
        <ProjetDetailDialog
          open
          onOpenChange={(o) => {
            if (!o) setProjetOuvert(null);
          }}
          projet={projet.projet}
          encaissements={projet.encaissements}
          decaissements={projet.decaissements}
          jalons={projet.jalons}
          freelancesActifs={freelancesActifs}
          voirMarges
        />
      ) : null}
    </>
  );
}

function Synthese({ titre, valeur, accent = false }: { titre: string; valeur: string; accent?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`font-display text-2xl ${accent ? "text-rose-600" : ""}`}>{valeur}</p>
      </CardContent>
    </Card>
  );
}
