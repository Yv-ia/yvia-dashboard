import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react";
import { db } from "@/db";
import { recurrents, affectations, clients } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
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
import { formatEuro, formatDate } from "@/lib/format";
import { exigerSession } from "@/lib/auth/server";
import { peutEditerDelivery } from "@/lib/auth/permissions";
import { EntityLink } from "../_drawer/drawer-stack";
import { HypotheseRegieDialog } from "../missions/hypothese-regie-dialog";
import { OngletsRegie } from "./onglets-regie";

const MOIS_COURT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

const versMois = (date: string) => date.slice(0, 7);

export default async function PageRegie({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const session = await exigerSession();
  const peutEditer = peutEditerDelivery(session); // le commercial consulte sans modifier

  const { annee: anneeParam } = await searchParams;
  const annee = Number(anneeParam) || new Date().getUTCFullYear();
  const debutAnnee = `${annee}-01-01`;
  const finAnnee = `${annee}-12-31`;

  const [hypotheses, affs, clientsListe] = await Promise.all([
    // Hypothèses de régie = récurrents catégorie régie (le coût est dérivé du planning).
    db
      .select({
        id: recurrents.id,
        clientId: recurrents.clientId,
        clientNom: clients.nom,
        nom: recurrents.nom,
        montantRecurrent: recurrents.montantRecurrent,
        dateDebut: recurrents.dateDebut,
        dateFin: recurrents.dateFin,
      })
      .from(recurrents)
      .innerJoin(clients, eq(recurrents.clientId, clients.id))
      .where(and(eq(recurrents.actif, true), eq(recurrents.categorie, "regie")))
      .orderBy(clients.nom),
    // Réel du planning : Σ TJM vente des affectations de l'année.
    db
      .select({ date: affectations.date, tjmVente: affectations.tjmVente })
      .from(affectations)
      .where(and(gte(affectations.date, debutAnnee), lte(affectations.date, finAnnee))),
    db
      .select({ id: clients.id, nom: clients.nom })
      .from(clients)
      .where(eq(clients.actif, true))
      .orderBy(clients.nom),
  ]);

  const arrondi = (n: number) => Math.round(n * 100) / 100;
  const mois = Array.from({ length: 12 }, (_, i) => `${annee}-${String(i + 1).padStart(2, "0")}`);

  // Réel du planning, agrégé par mois.
  const reelParMois = new Map<string, number>();
  for (const a of affs) {
    const m = versMois(a.date);
    reelParMois.set(m, (reelParMois.get(m) ?? 0) + Number(a.tjmVente));
  }

  // Une hypothèse couvre un mois si celui-ci est dans sa fenêtre [début, fin].
  const couvre = (h: (typeof hypotheses)[number], m: string) => {
    const debut = versMois(h.dateDebut);
    const fin = h.dateFin ? versMois(h.dateFin) : null;
    return m >= debut && (fin == null || m <= fin);
  };

  // Synthèse par deal : total de l'hypothèse sur les mois de l'année couverts.
  const lignesHypotheses = hypotheses.map((h) => {
    const moisCouverts = mois.filter((m) => couvre(h, m)).length;
    return { ...h, moisCouverts, totalAnnee: arrondi(Number(h.montantRecurrent) * moisCouverts) };
  });
  const totalHypotheses = arrondi(lignesHypotheses.reduce((s, l) => s + l.totalAnnee, 0));

  // Détail mensuel : le réel du planning prime ; sinon, somme des hypothèses du mois.
  const detailMensuel = mois.map((m) => {
    const reel = reelParMois.get(m) ?? 0;
    const macro = hypotheses.reduce(
      (s, h) => s + (couvre(h, m) ? Number(h.montantRecurrent) : 0),
      0
    );
    const valeur = reel > 0 ? reel : macro;
    const source: "reel" | "hypothese" | "vide" = reel > 0 ? "reel" : macro > 0 ? "hypothese" : "vide";
    return { mois: m, valeur: arrondi(valeur), source };
  });
  const totalMensuel = arrondi(detailMensuel.reduce((s, l) => s + l.valeur, 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OngletsRegie actif="regie" />
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={
              <Link href={`/regie?annee=${annee - 1}`} aria-label="Année précédente">
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
              <Link href={`/regie?annee=${annee + 1}`} aria-label="Année suivante">
                <ChevronRight />
              </Link>
            }
          />
        </div>
      </div>

      {/* Synthèse des deals régie (hypothèses), éditables */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Hypothèses de régie</CardTitle>
          {peutEditer ? (
            <HypotheseRegieDialog
              clientsListe={clientsListe}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  Nouvelle hypothèse
                </Button>
              }
            />
          ) : null}
        </CardHeader>
        <CardContent>
          {lignesHypotheses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune hypothèse de régie. Créez-en une pour projeter le CA régie des mois non
              planifiés.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Montant / mois</TableHead>
                  <TableHead className="text-right">Période</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignesHypotheses.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.nom}</TableCell>
                    <TableCell>
                      <EntityLink
                        type="client"
                        id={h.clientId}
                        className="hover:text-primary hover:underline"
                      >
                        {h.clientNom}
                      </EntityLink>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEuro(Number(h.montantRecurrent))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDate(h.dateDebut)}
                      {" → "}
                      {h.dateFin ? formatDate(h.dateFin) : "en cours"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEuro(h.totalAnnee)}
                    </TableCell>
                    <TableCell className="text-right">
                      {peutEditer ? (
                        <HypotheseRegieDialog
                          clientsListe={clientsListe}
                          hypothese={h}
                          trigger={
                            <Button variant="ghost" size="icon-sm" title="Modifier l’hypothèse">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-medium">
                    Total hypothèses
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatEuro(totalHypotheses)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Détail mensuel : réel du planning prioritaire, hypothèse en relais */}
      <Card>
        <CardHeader>
          <CardTitle>Détail mensuel</CardTitle>
          <p className="text-sm text-muted-foreground">
            Le réel du planning prime ; l’hypothèse prend le relais sur les mois non planifiés.
          </p>
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
                <TableRow>
                  <TableCell className="sticky left-0 bg-background font-medium">CA régie</TableCell>
                  {detailMensuel.map((d) => (
                    <TableCell key={d.mois} className="text-right tabular-nums">
                      {d.valeur > 0 ? formatEuro(d.valeur) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatEuro(totalMensuel)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="sticky left-0 bg-background text-xs text-muted-foreground">
                    Origine
                  </TableCell>
                  {detailMensuel.map((d) => (
                    <TableCell key={d.mois} className="text-right text-xs text-muted-foreground">
                      {d.source === "reel" ? "Réel" : d.source === "hypothese" ? "Hypo." : "—"}
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
