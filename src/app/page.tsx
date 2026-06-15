import Link from "next/link";
import { Briefcase, Users, Wallet, Flag, ArrowRight, type LucideIcon } from "lucide-react";
import { db } from "@/db";
import {
  missions,
  freelances,
  clients,
  affectations,
  projets,
  encaissements,
  decaissements,
  jalons,
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
import { premierJourDuMois, dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { formatEuro, formatPourcent, formatJours, formatDate } from "@/lib/format";
import { NavigationMois } from "./navigation-mois";
import { EntityLink } from "./_drawer/drawer-stack";
import type { TypeEntite } from "./_drawer/types";
import { exigerSession } from "@/lib/auth/server";

export default async function PageDashboard({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  await exigerSession();

  const params = await searchParams;
  const maintenant = new Date();
  const annee = Number(params.annee) || maintenant.getUTCFullYear();
  const moisParam = Number(params.mois);
  const mois = moisParam >= 1 && moisParam <= 12 ? moisParam : maintenant.getUTCMonth() + 1;

  const debutMois = premierJourDuMois(annee, mois);
  const finMois = dernierJourDuMois(annee, mois);

  // Données du mois affiché.
  const [affs, encMois, decMois, freelancesActifs, missionsActives, encPrevus, jalMois] =
    await Promise.all([
      db
        .select({
          freelanceId: affectations.freelanceId,
          missionId: affectations.missionId,
          missionNom: missions.nom,
          tjmAchat: affectations.tjmAchat,
          tjmVente: affectations.tjmVente,
          clientNom: clients.nom,
          prenom: freelances.prenom,
          nom: freelances.nom,
        })
        .from(affectations)
        .innerJoin(missions, eq(affectations.missionId, missions.id))
        .innerJoin(clients, eq(missions.clientId, clients.id))
        .innerJoin(freelances, eq(affectations.freelanceId, freelances.id))
        .where(and(gte(affectations.date, debutMois), lte(affectations.date, finMois))),
      db
        .select({
          projetId: encaissements.projetId,
          projetNom: projets.nom,
          clientNom: clients.nom,
          montant: encaissements.montant,
        })
        .from(encaissements)
        .innerJoin(projets, eq(encaissements.projetId, projets.id))
        .innerJoin(clients, eq(projets.clientId, clients.id))
        .where(
          and(
            eq(encaissements.statut, "encaisse"), // réalisé uniquement (le prévu ne compte pas comme CA)
            eq(projets.actif, true),
            ne(projets.statutCommercial, "perdu"),
            gte(encaissements.date, debutMois),
            lte(encaissements.date, finMois)
          )
        ),
      db
        .select({
          projetId: decaissements.projetId,
          projetNom: projets.nom,
          clientNom: clients.nom,
          montant: decaissements.montant,
        })
        .from(decaissements)
        .innerJoin(projets, eq(decaissements.projetId, projets.id))
        .innerJoin(clients, eq(projets.clientId, clients.id))
        .where(
          and(
            eq(decaissements.statut, "decaisse"), // coût réalisé uniquement
            eq(projets.actif, true),
            ne(projets.statutCommercial, "perdu"),
            gte(decaissements.date, debutMois),
            lte(decaissements.date, finMois)
          )
        ),
      // --- Données des encarts d'alerte ---
      db
        .select({ id: freelances.id, prenom: freelances.prenom, nom: freelances.nom })
        .from(freelances)
        .where(eq(freelances.actif, true))
        .orderBy(freelances.nom),
      db
        .select({
          id: missions.id,
          nom: missions.nom,
          freelancePrenom: freelances.prenom,
          freelanceNom: freelances.nom,
          clientNom: clients.nom,
        })
        .from(missions)
        .innerJoin(clients, eq(missions.clientId, clients.id))
        .innerJoin(freelances, eq(missions.freelanceId, freelances.id))
        .where(eq(missions.actif, true))
        .orderBy(missions.nom),
      db
        .select({
          id: encaissements.id,
          projetId: encaissements.projetId,
          projetNom: projets.nom,
          clientNom: clients.nom,
          date: encaissements.date,
          montant: encaissements.montant,
          libelle: encaissements.libelle,
        })
        .from(encaissements)
        .innerJoin(projets, eq(encaissements.projetId, projets.id))
        .innerJoin(clients, eq(projets.clientId, clients.id))
        .where(
          and(
            eq(encaissements.statut, "prevu"), // attendu, pas encore reçu : à suivre
            eq(projets.actif, true),
            ne(projets.statutCommercial, "perdu"),
            gte(encaissements.date, debutMois),
            lte(encaissements.date, finMois)
          )
        )
        .orderBy(encaissements.date),
      db
        .select({
          id: jalons.id,
          projetId: jalons.projetId,
          projetNom: projets.nom,
          date: jalons.date,
          libelle: jalons.libelle,
        })
        .from(jalons)
        .innerJoin(projets, eq(jalons.projetId, projets.id))
        .where(
          and(
            eq(projets.actif, true),
            ne(projets.statutCommercial, "perdu"),
            gte(jalons.date, debutMois),
            lte(jalons.date, finMois)
          )
        )
        .orderBy(jalons.date),
    ]);

  // CA / coût du mois apportés par les forfaits (encaissements / décaissements réalisés).
  const caForfait = encMois.reduce((s, e) => s + Number(e.montant), 0);
  const coutForfait = decMois.reduce((s, d) => s + Number(d.montant), 0);

  // Indicateurs régie : chaque jour affecté porte son propre TJM (figé à la pose).
  const parMission = new Map<
    number,
    {
      missionId: number;
      missionNom: string;
      clientNom: string;
      freelanceNom: string;
      jours: number;
      ca: number;
      cout: number;
    }
  >();
  for (const a of affs) {
    const e =
      parMission.get(a.missionId) ?? {
        missionId: a.missionId,
        missionNom: a.missionNom,
        clientNom: a.clientNom,
        freelanceNom: `${a.prenom} ${a.nom}`,
        jours: 0,
        ca: 0,
        cout: 0,
      };
    e.jours += 1;
    e.ca += Number(a.tjmVente);
    e.cout += Number(a.tjmAchat);
    parMission.set(a.missionId, e);
  }

  const arrondi = (n: number) => Math.round(n * 100) / 100;
  const detail = Array.from(parMission.values()).map((e) => ({
    ...e,
    ca: arrondi(e.ca),
    cout: arrondi(e.cout),
    marge: arrondi(e.ca - e.cout),
  }));

  // Totaux du mois = régie (jours posés) + forfait (encaissements / décaissements).
  const totalCa = arrondi(detail.reduce((s, l) => s + l.ca, 0) + caForfait);
  const totalCout = arrondi(detail.reduce((s, l) => s + l.cout, 0) + coutForfait);
  const totalMarge = arrondi(totalCa - totalCout);
  const tauxMarge = totalCa > 0 ? totalMarge / totalCa : 0;

  // --- Détail du mois : missions (régie) ET projets (forfait) réunis ---
  // Colonnes communes : encaissements (argent entrant) / décaissements (argent
  // sortant). Les colonnes Jours et Freelance n'ont de sens que pour les missions.
  type LigneDetail = {
    cle: string;
    libelle: string;
    freelanceNom: string | null;
    clientNom: string;
    encaissements: number;
    decaissements: number;
    jours: number | null;
    marge: number;
  };
  const detailMissions: LigneDetail[] = detail.map((l) => ({
    cle: `m${l.missionId}`,
    libelle: l.missionNom,
    freelanceNom: l.freelanceNom,
    clientNom: l.clientNom,
    encaissements: l.ca, // ce que paie le client (TJM vente × jours)
    decaissements: l.cout, // ce qu'on verse au freelance (TJM achat × jours)
    jours: l.jours,
    marge: l.marge,
  }));

  // Agrégation des flux forfait par projet sur le mois affiché.
  const projAgg = new Map<
    number,
    { nom: string; clientNom: string; enc: number; dec: number }
  >();
  for (const e of encMois) {
    const a =
      projAgg.get(e.projetId) ?? { nom: e.projetNom, clientNom: e.clientNom, enc: 0, dec: 0 };
    a.enc += Number(e.montant);
    projAgg.set(e.projetId, a);
  }
  for (const d of decMois) {
    const a =
      projAgg.get(d.projetId) ?? { nom: d.projetNom, clientNom: d.clientNom, enc: 0, dec: 0 };
    a.dec += Number(d.montant);
    projAgg.set(d.projetId, a);
  }
  const detailProjets: LigneDetail[] = Array.from(projAgg.entries()).map(([projetId, a]) => ({
    cle: `p${projetId}`,
    libelle: a.nom,
    freelanceNom: null, // pas de freelance unique sur un forfait
    clientNom: a.clientNom,
    encaissements: arrondi(a.enc),
    decaissements: arrondi(a.dec),
    jours: null, // notion propre à la régie
    marge: arrondi(a.enc - a.dec),
  }));
  const detailLignes = [...detailMissions, ...detailProjets];

  // --- Encarts d'alerte (tout est cadré sur le mois affiché) ---
  const missionsAvecJours = new Set(affs.map((a) => a.missionId));
  const freelancesAvecJours = new Set(affs.map((a) => a.freelanceId));
  const missionsAStaffer = missionsActives.filter((m) => !missionsAvecJours.has(m.id));
  const freelancesNonStaffes = freelancesActifs.filter((f) => !freelancesAvecJours.has(f.id));
  const totalEncPrevus = encPrevus.reduce((s, e) => s + Number(e.montant), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <NavigationMois basePath="/" annee={annee} mois={mois} />
      </div>

      {/* Indicateurs du mois affiché */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur titre="CA prévisionnel" valeur={formatEuro(totalCa)} />
        <Indicateur titre="Coût total" valeur={formatEuro(totalCout)} />
        <Indicateur titre="Marge totale" valeur={formatEuro(totalMarge)} />
        <Indicateur titre="Taux de marge" valeur={formatPourcent(tauxMarge)} />
      </div>

      {/* Points d'attention : ce qu'il reste à traiter sur le mois */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EncartAlerte
          icone={Briefcase}
          titre="Missions à staffer"
          sousTitre="aucun jour posé ce mois"
          compte={missionsAStaffer.length}
          lienHref="/planning"
          lienLabel="Ouvrir le planning"
          videLabel="Toutes les missions sont planifiées."
          items={missionsAStaffer.slice(0, 4).map((m) => ({
            cle: `m${m.id}`,
            type: "mission" as TypeEntite,
            id: m.id,
            principal: m.nom,
            secondaire: `${m.freelancePrenom} ${m.freelanceNom} · ${m.clientNom}`,
          }))}
          reste={missionsAStaffer.length - Math.min(missionsAStaffer.length, 4)}
        />
        <EncartAlerte
          icone={Users}
          titre="Freelances non staffés"
          sousTitre="aucune affectation ce mois"
          compte={freelancesNonStaffes.length}
          lienHref="/planning"
          lienLabel="Ouvrir le planning"
          videLabel="Tous les freelances actifs sont staffés."
          items={freelancesNonStaffes.slice(0, 4).map((f) => ({
            cle: `f${f.id}`,
            type: "freelance" as TypeEntite,
            id: f.id,
            principal: `${f.prenom} ${f.nom}`,
            secondaire: null,
          }))}
          reste={freelancesNonStaffes.length - Math.min(freelancesNonStaffes.length, 4)}
        />
        <EncartAlerte
          icone={Wallet}
          titre="Encaissements prévus"
          sousTitre={`${formatEuro(totalEncPrevus)} attendus ce mois`}
          compte={encPrevus.length}
          lienHref="/projets"
          lienLabel="Voir les projets"
          videLabel="Aucun encaissement prévu ce mois."
          items={encPrevus.slice(0, 4).map((e) => ({
            cle: `e${e.id}`,
            type: "projet" as TypeEntite,
            id: e.projetId,
            principal: e.libelle?.trim() || e.projetNom,
            secondaire: `${formatDate(e.date)} · ${formatEuro(Number(e.montant))}`,
          }))}
          reste={encPrevus.length - Math.min(encPrevus.length, 4)}
        />
        <EncartAlerte
          icone={Flag}
          titre="Jalons du mois"
          sousTitre="étapes clés des projets"
          compte={jalMois.length}
          lienHref="/planning"
          lienLabel="Ouvrir le planning"
          videLabel="Aucun jalon ce mois."
          items={jalMois.slice(0, 4).map((j) => ({
            cle: `j${j.id}`,
            type: "projet" as TypeEntite,
            id: j.projetId,
            principal: j.libelle,
            secondaire: `${formatDate(j.date)} · ${j.projetNom}`,
          }))}
          reste={jalMois.length - Math.min(jalMois.length, 4)}
        />
      </div>

      {/* Détail par mission / projet */}
      <Card>
        <CardHeader>
          <CardTitle>Détail du mois</CardTitle>
        </CardHeader>
        <CardContent>
          {detailLignes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune activité ce mois-ci. Le détail apparaîtra une fois le planning rempli ou des
              flux forfait enregistrés.
            </p>
          ) : (
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
                {detailLignes.map((l) => (
                  <TableRow key={l.cle}>
                    <TableCell>
                      <EntityLink
                        type={l.cle.startsWith("p") ? "projet" : "mission"}
                        id={Number(l.cle.slice(1))}
                      >
                        {l.libelle}
                      </EntityLink>
                    </TableCell>
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
        <p className="font-display text-2xl sm:text-3xl">{valeur}</p>
      </CardContent>
    </Card>
  );
}

type ItemEncart = {
  cle: string;
  type: TypeEntite;
  id: number;
  principal: string;
  secondaire: string | null;
};

// Carte d'alerte : un compteur, un court extrait cliquable (ouvre le drawer de
// l'entité) et un lien vers la page d'action. Vide = état positif rassurant.
function EncartAlerte({
  icone: Icone,
  titre,
  sousTitre,
  compte,
  items,
  reste,
  lienHref,
  lienLabel,
  videLabel,
}: {
  icone: LucideIcon;
  titre: string;
  sousTitre: string;
  compte: number;
  items: ItemEncart[];
  reste: number;
  lienHref: string;
  lienLabel: string;
  videLabel: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Icone className="size-4 shrink-0 text-muted-foreground" />
            {titre}
          </CardTitle>
          <span
            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold ${
              compte > 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {compte}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{sousTitre}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        {compte === 0 ? (
          <p className="text-sm text-muted-foreground">{videLabel}</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.cle} className="text-sm leading-tight">
                  <EntityLink type={item.type} id={item.id} className="text-left font-medium hover:text-primary hover:underline">
                    {item.principal}
                  </EntityLink>
                  {item.secondaire ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.secondaire}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {reste > 0 ? (
              <p className="text-xs text-muted-foreground">+{reste} autre{reste > 1 ? "s" : ""}</p>
            ) : null}
          </>
        )}
        <Link
          href={lienHref}
          className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary hover:underline"
        >
          {lienLabel}
          <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
