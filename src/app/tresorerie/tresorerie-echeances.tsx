"use client";
// Échéancier de trésorerie (un onglet : encaissements OU décaissements). Suivi du
// cash : par échéance → réalisé / prévu / en retard, avec « Marquer réalisé » en
// ligne (le futur rapprochement bancaire confirmera ces lignes). « Gérer » rouvre
// le dialogue projet (création / édition fine des échéances et jalons).

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { formatEuro, formatDate } from "@/lib/format";
import { EntityLink } from "@/app/_drawer/drawer-stack";
import { ProjetDetailDialog } from "@/app/projets/projet-detail-dialog";
import { marquerEncaissementRealise, marquerDecaissementRealise } from "@/app/projets/actions";

type Echeancier = {
  id: number;
  date: string;
  montant: string;
  libelle: string | null;
  statut: string;
  fiabilite: string | null;
};
type Decaissement = Echeancier & { freelanceNom: string };

export type ProjetComplet = {
  projet: {
    id: number;
    nom: string;
    clientId: number;
    clientNom: string;
    budget: string;
    fiabiliteDefaut: string | null;
    clientFiabilite: string | null;
    actif: boolean;
  };
  encaissements: Echeancier[];
  decaissements: Decaissement[];
  jalons: { id: number; date: string; libelle: string }[];
};

export type EcheanceTresorerie = {
  id: number;
  projetId: number;
  projetNom: string;
  clientId: number;
  clientNom: string;
  date: string;
  montant: string;
  libelle: string | null;
  statut: string;
  freelanceNom: string | null;
};

export function TresorerieEcheances({
  type,
  echeances,
  projetsParId,
  freelancesActifs,
  aujourdhui,
}: {
  type: "encaissement" | "decaissement";
  echeances: EcheanceTresorerie[];
  projetsParId: Record<number, ProjetComplet>;
  freelancesActifs: { id: number; prenom: string; nom: string }[];
  aujourdhui: string; // 'YYYY-MM-DD' (calculé côté serveur pour rester stable)
}) {
  const router = useRouter();
  const [projetOuvert, setProjetOuvert] = useState<number | null>(null);

  const estPrevu = (e: EcheanceTresorerie) => e.statut === "prevu";
  const enRetard = (e: EcheanceTresorerie) => estPrevu(e) && e.date < aujourdhui;

  const realise = echeances.filter((e) => !estPrevu(e)).reduce((s, e) => s + Number(e.montant), 0);
  const prevu = echeances.filter(estPrevu).reduce((s, e) => s + Number(e.montant), 0);
  const retard = echeances.filter(enRetard).reduce((s, e) => s + Number(e.montant), 0);

  const labelRealise = type === "encaissement" ? "Encaissé" : "Décaissé";
  const labelAction = type === "encaissement" ? "Marquer encaissé" : "Marquer décaissé";
  const marquer = type === "encaissement" ? marquerEncaissementRealise : marquerDecaissementRealise;

  async function realiser(id: number) {
    const fd = new FormData();
    fd.set("id", String(id));
    const res = await marquer(fd);
    if (res.ok) {
      toast.success(type === "encaissement" ? "Encaissement confirmé." : "Décaissement confirmé.");
      router.refresh();
    } else {
      toast.error(res.message ?? "Action impossible.");
    }
  }

  const projet = projetOuvert != null ? projetsParId[projetOuvert] : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Synthese titre={labelRealise} valeur={formatEuro(realise)} />
        <Synthese titre="Prévu (reste)" valeur={formatEuro(prevu)} />
        <Synthese titre="En retard" valeur={formatEuro(retard)} accent={retard > 0} />
      </div>

      {echeances.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune échéance sur les projets actifs.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Échéance</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Client</TableHead>
              {type === "decaissement" ? <TableHead>Freelance</TableHead> : null}
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {echeances.map((e) => (
              <TableRow key={e.id} className={enRetard(e) ? "bg-rose-50/50" : undefined}>
                <TableCell>
                  <span className="font-medium">{formatDate(e.date)}</span>
                  {e.libelle ? (
                    <span className="block text-xs text-muted-foreground">{e.libelle}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setProjetOuvert(e.projetId)}
                    className="text-left font-medium hover:text-primary hover:underline"
                  >
                    {e.projetNom}
                  </button>
                </TableCell>
                <TableCell>
                  <EntityLink
                    type="client"
                    id={e.clientId}
                    className="hover:text-primary hover:underline"
                  >
                    {e.clientNom}
                  </EntityLink>
                </TableCell>
                {type === "decaissement" ? <TableCell>{e.freelanceNom ?? "-"}</TableCell> : null}
                <TableCell className="text-right tabular-nums">
                  {formatEuro(Number(e.montant))}
                </TableCell>
                <TableCell>
                  {estPrevu(e) ? (
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        enRetard(e)
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {enRetard(e) ? "En retard" : "Prévu"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {labelRealise}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {estPrevu(e) ? (
                    <Button variant="outline" size="sm" onClick={() => realiser(e.id)}>
                      {labelAction}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={type === "decaissement" ? 4 : 3}>Total</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatEuro(realise + prevu)}
              </TableCell>
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
