import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { affectations, projets, encaissements, recurrents } from "@/db/schema";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuro } from "@/lib/format";
import { exigerSession } from "@/lib/auth/server";
import { OngletsPilotage } from "../onglets-pilotage";
import { calculerPrevisionnel12Mois } from "../previsionnel-calculs";

const MOIS_COURT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

export default async function PagePrevisionnel({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  await exigerSession();

  const { annee: anneeParam } = await searchParams;
  const annee = Number(anneeParam) || new Date().getUTCFullYear();
  const debutAnnee = `${annee}-01-01`;
  const finAnnee = `${annee}-12-31`;

  const [affs, encs, recs] = await Promise.all([
    // Régie : tous les jours posés de l'année (réalisé + saisis d'avance).
    db
      .select({ date: affectations.date, tjmVente: affectations.tjmVente })
      .from(affectations)
      .where(and(gte(affectations.date, debutAnnee), lte(affectations.date, finAnnee))),
    // Forfait : échéancier complet (encaissé ET prévu) des projets signés = le CA du
    // deal, pas seulement ce qui est encaissé.
    db
      .select({ date: encaissements.date, montant: encaissements.montant })
      .from(encaissements)
      .innerJoin(projets, eq(encaissements.projetId, projets.id))
      .where(
        and(
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(encaissements.date, debutAnnee),
          lte(encaissements.date, finAnnee)
        )
      ),
    // Récurrence : contrats RUN / licence (la régie est portée par sa propre ligne).
    db
      .select({
        categorie: recurrents.categorie,
        montantRecurrent: recurrents.montantRecurrent,
        coutRecurrent: recurrents.coutRecurrent,
        dateDebut: recurrents.dateDebut,
        dateFin: recurrents.dateFin,
      })
      .from(recurrents)
      .where(and(eq(recurrents.actif, true), ne(recurrents.categorie, "regie"))),
  ]);

  const { lignes, totaux } = calculerPrevisionnel12Mois({
    annee,
    affectations: affs,
    encaissements: encs,
    recurrents: recs.map((r) => ({
      categorie: r.categorie,
      montantRecurrent: Number(r.montantRecurrent),
      coutRecurrent: r.coutRecurrent == null ? null : Number(r.coutRecurrent),
      dateDebut: r.dateDebut,
      dateFin: r.dateFin,
    })),
  });

  // Une ligne du tableau = une source, avec ses 12 valeurs mensuelles + total.
  const sources = [
    { cle: "regie", label: "Régie", valeurs: lignes.map((l) => l.regie), total: totaux.regie },
    {
      cle: "recurrence",
      label: "Récurrence",
      valeurs: lignes.map((l) => l.recurrence),
      total: totaux.recurrence,
    },
    { cle: "forfait", label: "Forfait", valeurs: lignes.map((l) => l.forfait), total: totaux.forfait },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OngletsPilotage actif="previsionnel" />
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={
              <Link href={`/statistiques/previsionnel?annee=${annee - 1}`} aria-label="Année précédente">
                <ChevronLeft />
              </Link>
            }
          />
          <span className="min-w-16 text-center text-sm font-medium">{annee}</span>
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={
              <Link href={`/statistiques/previsionnel?annee=${annee + 1}`} aria-label="Année suivante">
                <ChevronRight />
              </Link>
            }
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prévisionnel {annee} — CA par source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Source</TableHead>
                  {MOIS_COURT.map((m) => (
                    <TableHead key={m} className="text-right capitalize">
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-medium">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.cle}>
                    <TableCell className="sticky left-0 bg-background font-medium">{s.label}</TableCell>
                    {s.valeurs.map((v, i) => (
                      <TableCell key={i} className="text-right tabular-nums">
                        {formatEuro(v)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatEuro(s.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">Total</TableCell>
                  {lignes.map((l, i) => (
                    <TableCell key={i} className="text-right font-medium tabular-nums">
                      {formatEuro(l.total)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatEuro(totaux.total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
