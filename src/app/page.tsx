import Link from "next/link";
import { db } from "@/db";
import { missions, freelances, clients, tarifs, absences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { calculMissionMois } from "@/lib/calculs/calcul-mission-mois";
import { dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { formatEuro, formatJours, formatPourcent, formatMois } from "@/lib/format";

const pad2 = (n: number) => String(n).padStart(2, "0");
const moisSuivant = (a: number, m: number) =>
  m === 12 ? { annee: a + 1, mois: 1 } : { annee: a, mois: m + 1 };
const moisPrecedent = (a: number, m: number) =>
  m === 1 ? { annee: a - 1, mois: 12 } : { annee: a, mois: m - 1 };

type LigneAbsence = { missionId: number; jours: string };

export default async function PageDashboard({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  const params = await searchParams;
  const maintenant = new Date();
  const annee = Number(params.annee) || maintenant.getUTCFullYear();
  const moisParam = Number(params.mois);
  const mois = moisParam >= 1 && moisParam <= 12 ? moisParam : maintenant.getUTCMonth() + 1;

  const suivant = moisSuivant(annee, mois);
  const precedent = moisPrecedent(annee, mois);
  const moisISO = `${annee}-${pad2(mois)}-01`;
  const moisSuivantISO = `${suivant.annee}-${pad2(suivant.mois)}-01`;

  // Données : missions (avec noms), tarifs, et absences des deux mois concernés.
  const missionsRows = await db
    .select({
      id: missions.id,
      dateDebut: missions.dateDebut,
      dateFin: missions.dateFin,
      joursParSemaine: missions.joursParSemaine,
      freelancePrenom: freelances.prenom,
      freelanceNom: freelances.nom,
      clientNom: clients.nom,
    })
    .from(missions)
    .innerJoin(freelances, eq(missions.freelanceId, freelances.id))
    .innerJoin(clients, eq(missions.clientId, clients.id))
    .orderBy(freelances.nom);

  const tousTarifs = await db.select().from(tarifs);
  const absencesMois = await db
    .select({ missionId: absences.missionId, jours: absences.jours })
    .from(absences)
    .where(eq(absences.mois, moisISO));
  const absencesMoisSuivant = await db
    .select({ missionId: absences.missionId, jours: absences.jours })
    .from(absences)
    .where(eq(absences.mois, moisSuivantISO));

  const tarifsParMission = (missionId: number) =>
    tousTarifs
      .filter((t) => t.missionId === missionId)
      .map((t) => ({
        moisEffet: t.moisEffet,
        tjmAchat: Number(t.tjmAchat),
        tjmVente: Number(t.tjmVente),
      }));

  // Calcule les lignes et totaux d'un mois donné.
  function calculerMois(a: number, m: number, listeAbsences: LigneAbsence[]) {
    const debutMois = `${a}-${pad2(m)}-01`;
    const finMois = dernierJourDuMois(a, m);
    const absParMission = new Map<number, number>();
    for (const abs of listeAbsences) {
      absParMission.set(abs.missionId, (absParMission.get(abs.missionId) ?? 0) + Number(abs.jours));
    }

    const lignes = missionsRows
      // Missions qui chevauchent le mois.
      .filter((mi) => mi.dateDebut <= finMois && (mi.dateFin === null || mi.dateFin >= debutMois))
      .map((mi) => {
        const res = calculMissionMois(
          {
            dateDebut: mi.dateDebut,
            dateFin: mi.dateFin,
            joursParSemaine: Number(mi.joursParSemaine),
            tarifs: tarifsParMission(mi.id),
            joursAbsence: absParMission.get(mi.id) ?? 0,
          },
          a,
          m
        );
        return { mission: mi, ...res };
      });

    const totalCa = lignes.reduce((s, l) => s + l.ca, 0);
    const totalCout = lignes.reduce((s, l) => s + l.cout, 0);
    const totalMarge = lignes.reduce((s, l) => s + l.marge, 0);
    const tauxMarge = totalCa > 0 ? totalMarge / totalCa : 0;
    return { lignes, totalCa, totalCout, totalMarge, tauxMarge };
  }

  const moisCourant = calculerMois(annee, mois, absencesMois);
  const moisProchain = calculerMois(suivant.annee, suivant.mois, absencesMoisSuivant);

  return (
    <div className="space-y-6">
      {/* En-tête + sélecteur de mois */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={
            <Link href={`/?annee=${precedent.annee}&mois=${precedent.mois}`}>Mois précédent</Link>
          } />
          <span className="min-w-40 text-center text-sm font-medium capitalize">
            {formatMois(annee, mois)}
          </span>
          <Button variant="outline" size="sm" render={
            <Link href={`/?annee=${suivant.annee}&mois=${suivant.mois}`}>Mois suivant</Link>
          } />
        </div>
      </div>

      {/* Indicateurs + carte mois suivant */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Indicateur titre="CA prévisionnel" valeur={formatEuro(moisCourant.totalCa)} />
        <Indicateur titre="Coût total" valeur={formatEuro(moisCourant.totalCout)} />
        <Indicateur titre="Marge totale" valeur={formatEuro(moisCourant.totalMarge)} />
        <Indicateur titre="Taux de marge" valeur={formatPourcent(moisCourant.tauxMarge)} />
        <Link
          href={`/?annee=${suivant.annee}&mois=${suivant.mois}`}
          className="block rounded-xl border bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <p className="text-xs text-muted-foreground capitalize">
            Mois suivant ({formatMois(suivant.annee, suivant.mois)})
          </p>
          <p className="mt-1 text-sm">CA : {formatEuro(moisProchain.totalCa)}</p>
          <p className="text-sm">Marge : {formatEuro(moisProchain.totalMarge)}</p>
        </Link>
      </div>

      {/* Détail par mission */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par freelance</CardTitle>
        </CardHeader>
        <CardContent>
          {moisCourant.lignes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune mission active sur ce mois.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Freelance</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">TJM achat</TableHead>
                  <TableHead className="text-right">TJM vente</TableHead>
                  <TableHead className="text-right">Marge/jour</TableHead>
                  <TableHead className="text-right">Jours fact.</TableHead>
                  <TableHead className="text-right">Marge du mois</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moisCourant.lignes.map((l) => (
                  <TableRow key={l.mission.id}>
                    <TableCell className="font-medium">
                      {l.mission.freelancePrenom} {l.mission.freelanceNom}
                    </TableCell>
                    <TableCell>{l.mission.clientNom}</TableCell>
                    <TableCell className="text-right">
                      {l.tjmAchat !== null ? formatEuro(l.tjmAchat) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.tjmVente !== null ? formatEuro(l.tjmVente) : "-"}
                    </TableCell>
                    <TableCell className="text-right">{formatEuro(l.margeParJour)}</TableCell>
                    <TableCell className="text-right">{formatJours(l.jours)}</TableCell>
                    <TableCell className="text-right">{formatEuro(l.marge)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatEuro(moisCourant.totalMarge)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Indicateur({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl">{valeur}</p>
      </CardContent>
    </Card>
  );
}
