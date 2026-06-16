import { db } from "@/db";
import {
  affectations,
  missions,
  clients,
  freelances,
  projets,
  encaissements,
  decaissements,
} from "@/db/schema";
import { and, eq, gte, lte, ne } from "drizzle-orm";
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
import { formatEuro, formatPourcent, formatMois } from "@/lib/format";
import { premierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { exigerSession } from "@/lib/auth/server";
import { cn } from "@/lib/utils";
import {
  calculerPilotageMensuel,
  type LignePrevisionnel,
  type LigneRealise,
} from "./pilotage-calculs";
import { classeMarge, couleurMarge } from "./montants";
import { TableauPrevisionnel } from "./tableau-previsionnel";

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoJour = (d: Date) => d.toISOString().slice(0, 10);

// Fenêtre fixe de 365 jours : réalisé sur l'année glissante, prévisionnel du
// début du mois courant jusqu'à +365 jours.
function bornesPilotage(maintenant: Date) {
  const annee = maintenant.getUTCFullYear();
  const mois = maintenant.getUTCMonth() + 1;
  const debutMoisCourant = premierJourDuMois(annee, mois);

  const debutRealise = new Date(maintenant);
  debutRealise.setUTCDate(debutRealise.getUTCDate() - 364);
  const finPrevisionnel = new Date(maintenant);
  finPrevisionnel.setUTCDate(finPrevisionnel.getUTCDate() + 365);

  return {
    debutRealise: isoJour(debutRealise),
    finRealise: isoJour(maintenant),
    debutPrevisionnel: debutMoisCourant,
    finPrevisionnel: isoJour(finPrevisionnel),
  };
}

export default async function PageStatistiques() {
  await exigerSession();

  const maintenant = new Date();
  const moisCourant = `${maintenant.getUTCFullYear()}-${pad2(maintenant.getUTCMonth() + 1)}`;

  const { debutRealise, finRealise, debutPrevisionnel, finPrevisionnel } =
    bornesPilotage(maintenant);

  const affsPromise = db
    .select({
      date: affectations.date,
      tjmAchat: affectations.tjmAchat,
      tjmVente: affectations.tjmVente,
      freelancePrenom: freelances.prenom,
      freelanceNomDb: freelances.nom,
      missionNom: missions.nom,
      clientNom: clients.nom,
    })
    .from(affectations)
    .innerJoin(missions, eq(affectations.missionId, missions.id))
    .innerJoin(freelances, eq(affectations.freelanceId, freelances.id))
    .innerJoin(clients, eq(missions.clientId, clients.id))
    .where(
      and(gte(affectations.date, debutPrevisionnel), lte(affectations.date, finPrevisionnel))
    );

  const encaissementsRealisesPromise = db
    .select({
      date: encaissements.date,
      montant: encaissements.montant,
      statut: encaissements.statut,
      fiabilite: encaissements.fiabilite,
    })
    .from(encaissements)
    .innerJoin(projets, eq(encaissements.projetId, projets.id))
    .where(
      and(
        eq(encaissements.statut, "encaisse"),
        eq(projets.actif, true),
        ne(projets.statutCommercial, "perdu"),
        gte(encaissements.date, debutRealise),
        lte(encaissements.date, finRealise)
      )
    );

  const encaissementsPrevusPromise = db
    .select({
      date: encaissements.date,
      montant: encaissements.montant,
      statut: encaissements.statut,
      fiabilite: encaissements.fiabilite,
      projetNom: projets.nom,
      clientNom: clients.nom,
      libelle: encaissements.libelle,
    })
    .from(encaissements)
    .innerJoin(projets, eq(encaissements.projetId, projets.id))
    .innerJoin(clients, eq(projets.clientId, clients.id))
    .where(
      and(
        eq(encaissements.statut, "prevu"),
        eq(projets.actif, true),
        ne(projets.statutCommercial, "perdu"),
        gte(encaissements.date, debutPrevisionnel),
        lte(encaissements.date, finPrevisionnel)
      )
    );

  const decaissementsRealisesPromise = db
    .select({
      date: decaissements.date,
      montant: decaissements.montant,
      statut: decaissements.statut,
    })
    .from(decaissements)
    .innerJoin(projets, eq(decaissements.projetId, projets.id))
    .where(
      and(
        eq(decaissements.statut, "decaisse"),
        eq(projets.actif, true),
        ne(projets.statutCommercial, "perdu"),
        gte(decaissements.date, debutRealise),
        lte(decaissements.date, finRealise)
      )
    );

  const decaissementsPrevusPromise = db
    .select({
      date: decaissements.date,
      montant: decaissements.montant,
      statut: decaissements.statut,
      projetNom: projets.nom,
      clientNom: clients.nom,
      freelancePrenom: freelances.prenom,
      freelanceNomDb: freelances.nom,
      libelle: decaissements.libelle,
    })
    .from(decaissements)
    .innerJoin(projets, eq(decaissements.projetId, projets.id))
    .innerJoin(clients, eq(projets.clientId, clients.id))
    .innerJoin(freelances, eq(decaissements.freelanceId, freelances.id))
    .where(
      and(
        eq(decaissements.statut, "prevu"),
        eq(projets.actif, true),
        ne(projets.statutCommercial, "perdu"),
        gte(decaissements.date, debutPrevisionnel),
        lte(decaissements.date, finPrevisionnel)
      )
    );

  const [
    affs,
    encaissementsRealises,
    encaissementsPrevus,
    decaissementsRealises,
    decaissementsPrevus,
  ] = await Promise.all([
    affsPromise,
    encaissementsRealisesPromise,
    encaissementsPrevusPromise,
    decaissementsRealisesPromise,
    decaissementsPrevusPromise,
  ]);

  const pilotage = calculerPilotageMensuel({
    debutPrevisionnel,
    finPrevisionnel,
    affectations: affs.map((a) => ({
      date: a.date,
      tjmAchat: a.tjmAchat,
      tjmVente: a.tjmVente,
      freelanceNom: `${a.freelancePrenom} ${a.freelanceNomDb}`,
      missionNom: a.missionNom,
      clientNom: a.clientNom,
    })),
    encaissements: [...encaissementsRealises, ...encaissementsPrevus],
    decaissements: [
      ...decaissementsRealises,
      ...decaissementsPrevus.map((d) => ({
        date: d.date,
        montant: d.montant,
        statut: d.statut,
        projetNom: d.projetNom,
        clientNom: d.clientNom,
        freelanceNom: `${d.freelancePrenom} ${d.freelanceNomDb}`,
        libelle: d.libelle,
      })),
    ],
  });

  const totalRealise = totaliserRealise(pilotage.realise);
  const totalPrevisionnel = totaliserPrevisionnel(pilotage.previsionnel);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur titre="CA encaissé" valeur={formatEuro(totalRealise.ca)} />
        <Indicateur
          titre="Marge réalisée"
          valeur={formatEuro(totalRealise.marge)}
          className={couleurMarge(totalRealise.marge)}
        />
        <Indicateur titre="CA probable" valeur={formatEuro(totalPrevisionnel.caProb)} />
        <Indicateur
          titre="Marge probable cumulée"
          valeur={formatEuro(totalPrevisionnel.cumulProb)}
          className={couleurMarge(totalPrevisionnel.cumulProb)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cockpit mensuel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Réalisé</h2>
                <p className="text-xs text-muted-foreground">Mois passés et mois courant</p>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mois courant inclus :{" "}
                {formatMois(Number(moisCourant.slice(0, 4)), Number(moisCourant.slice(5, 7)))}
              </p>
            </div>
            {pilotage.realise.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Aucun encaissement ou décaissement réalisé sur cette fenêtre.
              </p>
            ) : (
              <TableauRealise lignes={pilotage.realise} />
            )}
          </section>

          <div className="border-t border-border" />

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Prévisionnel</h2>
                <p className="text-xs text-muted-foreground">Mois courant et mois futurs</p>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Freelances inclus
              </p>
            </div>
            {pilotage.previsionnel.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Aucune donnée prévisionnelle sur cette fenêtre.
              </p>
            ) : (
              <TableauPrevisionnel lignes={pilotage.previsionnel} />
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function totaliserRealise(lignes: LigneRealise[]) {
  const total = lignes.reduce(
    (s, l) => ({ ca: s.ca + l.ca, cout: s.cout + l.cout, marge: s.marge + l.marge }),
    { ca: 0, cout: 0, marge: 0 }
  );
  return {
    ca: total.ca,
    cout: total.cout,
    marge: total.marge,
    taux: total.ca > 0 ? total.marge / total.ca : 0,
  };
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

function TableauRealise({ lignes }: { lignes: LigneRealise[] }) {
  const total = totaliserRealise(lignes);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mois</TableHead>
          <TableHead className="text-right">CA encaissé</TableHead>
          <TableHead className="text-right">Coûts décaissés</TableHead>
          <TableHead className="text-right">Marge réalisée</TableHead>
          <TableHead className="text-right">Taux</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((l) => (
          <TableRow key={l.cle}>
            <TableCell className="font-medium capitalize">{formatMois(l.annee, l.mois)}</TableCell>
            <TableCell className="text-right">{formatEuro(l.ca)}</TableCell>
            <TableCell className="text-right">{formatEuro(l.cout)}</TableCell>
            <TableCell className={classeMarge(l.marge)}>
              {formatEuro(l.marge)}
            </TableCell>
            <TableCell className="text-right">{formatPourcent(l.taux)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right">{formatEuro(total.ca)}</TableCell>
          <TableCell className="text-right">{formatEuro(total.cout)}</TableCell>
          <TableCell className={classeMarge(total.marge)}>
            {formatEuro(total.marge)}
          </TableCell>
          <TableCell className="text-right">{formatPourcent(total.taux)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function Indicateur({
  titre,
  valeur,
  className,
}: {
  titre: string;
  valeur: string;
  className?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("font-display text-2xl", className)}>{valeur}</p>
      </CardContent>
    </Card>
  );
}
