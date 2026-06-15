import Link from "next/link";
import { Users, Wallet, Banknote, ArrowRight, type LucideIcon } from "lucide-react";
import { db } from "@/db";
import {
  freelances,
  clients,
  affectations,
  projets,
  encaissements,
  decaissements,
  recurrents,
} from "@/db/schema";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { premierJourDuMois, dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import {
  projeterRecurrent,
  totaliserProjection,
  type PlanningMensuel,
} from "@/lib/recurrents/previsionnel";
import { formatEuro, formatPourcent, formatDate } from "@/lib/format";
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
  const debutAnnee = `${annee}-01-01`;
  const finAnnee = `${annee}-12-31`;

  // Données du mois affiché + agrégats annuels (CA prévisionnel par source).
  const [
    affs,
    encMois,
    decMois,
    freelancesActifs,
    encPrevus,
    decPrevus,
    affsAnnee,
    encAnnee,
    recurrentsAnnee,
  ] = await Promise.all([
    // Régie : chaque jour affecté porte son propre TJM (figé à la pose). On n'a
    // besoin que des TJM (KPI) et du freelance (encart « non staffés »).
    db
      .select({
        freelanceId: affectations.freelanceId,
        tjmAchat: affectations.tjmAchat,
        tjmVente: affectations.tjmVente,
      })
      .from(affectations)
      .where(and(gte(affectations.date, debutMois), lte(affectations.date, finMois))),
    db
      .select({ montant: encaissements.montant })
      .from(encaissements)
      .innerJoin(projets, eq(encaissements.projetId, projets.id))
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
      .select({ montant: decaissements.montant })
      .from(decaissements)
      .innerJoin(projets, eq(decaissements.projetId, projets.id))
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
        id: decaissements.id,
        projetId: decaissements.projetId,
        projetNom: projets.nom,
        clientNom: clients.nom,
        date: decaissements.date,
        montant: decaissements.montant,
        libelle: decaissements.libelle,
      })
      .from(decaissements)
      .innerJoin(projets, eq(decaissements.projetId, projets.id))
      .innerJoin(clients, eq(projets.clientId, clients.id))
      .where(
        and(
          eq(decaissements.statut, "prevu"), // coût attendu, pas encore versé : à suivre
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(decaissements.date, debutMois),
          lte(decaissements.date, finMois)
        )
      )
      .orderBy(decaissements.date),
    // --- Agrégats annuels (CA prévisionnel par source) ---
    // Régie : Σ TJM vente des affectations de l'année.
    db
      .select({ tjmVente: affectations.tjmVente })
      .from(affectations)
      .where(and(gte(affectations.date, debutAnnee), lte(affectations.date, finAnnee))),
    // Forfait : Σ encaissements de l'année (réalisés + prévus = prévisionnel plein).
    db
      .select({ montant: encaissements.montant })
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
    // Maintenance MCO : récurrents RUN / licence (la régie est déjà comptée via les
    // affectations ci-dessus → on exclut la catégorie régie pour ne pas la doubler).
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

  const arrondi = (n: number) => Math.round(n * 100) / 100;

  // CA prévisionnel de l'année, ventilé par source. La régie vient du planning
  // (affectations) ; le MCO RUN/licence est projeté sur les 12 mois (planning vide
  // = estimation mensuelle, cf. projeterRecurrent).
  const horizonAnnee = Array.from(
    { length: 12 },
    (_, i) => `${annee}-${String(i + 1).padStart(2, "0")}`
  );
  const planningVide: PlanningMensuel = new Map();
  const caRegieAnnee = arrondi(affsAnnee.reduce((s, a) => s + Number(a.tjmVente), 0));
  const caForfaitAnnee = arrondi(encAnnee.reduce((s, e) => s + Number(e.montant), 0));
  const caMcoAnnee = arrondi(
    recurrentsAnnee.reduce((s, r) => {
      const points = projeterRecurrent(
        {
          categorie: r.categorie,
          montantRecurrent: Number(r.montantRecurrent),
          coutRecurrent: r.coutRecurrent == null ? null : Number(r.coutRecurrent),
          dateDebut: r.dateDebut,
          dateFin: r.dateFin,
        },
        planningVide,
        horizonAnnee
      );
      return s + totaliserProjection(points).revenu;
    }, 0)
  );
  const caAnnuelTotal = arrondi(caRegieAnnee + caForfaitAnnee + caMcoAnnee);

  // Totaux du mois = régie (jours posés × TJM) + forfait (encaissements / décaissements réalisés).
  const caForfait = encMois.reduce((s, e) => s + Number(e.montant), 0);
  const coutForfait = decMois.reduce((s, d) => s + Number(d.montant), 0);
  const caRegie = affs.reduce((s, a) => s + Number(a.tjmVente), 0);
  const coutRegie = affs.reduce((s, a) => s + Number(a.tjmAchat), 0);
  const totalCa = arrondi(caRegie + caForfait);
  const totalCout = arrondi(coutRegie + coutForfait);
  const totalMarge = arrondi(totalCa - totalCout);
  const tauxMarge = totalCa > 0 ? totalMarge / totalCa : 0;

  // --- Encarts d'alerte (tout est cadré sur le mois affiché) ---
  const freelancesAvecJours = new Set(affs.map((a) => a.freelanceId));
  const freelancesNonStaffes = freelancesActifs.filter((f) => !freelancesAvecJours.has(f.id));
  const totalEncPrevus = encPrevus.reduce((s, e) => s + Number(e.montant), 0);
  const totalDecPrevus = decPrevus.reduce((s, d) => s + Number(d.montant), 0);

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

      {/* CA prévisionnel de l'année, ventilé par source */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">CA prévisionnel {annee}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <LigneCaAnnuel titre="Régie" valeur={caRegieAnnee} />
            <LigneCaAnnuel titre="Forfait" valeur={caForfaitAnnee} />
            <LigneCaAnnuel titre="Maintenance MCO" valeur={caMcoAnnee} />
            <LigneCaAnnuel titre="Total" valeur={caAnnuelTotal} accent />
          </div>
        </CardContent>
      </Card>

      {/* Points d'attention : le prévisionnel de trésorerie + les freelances à staffer */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          icone={Banknote}
          titre="Décaissements prévus"
          sousTitre={`${formatEuro(totalDecPrevus)} à verser ce mois`}
          compte={decPrevus.length}
          lienHref="/projets"
          lienLabel="Voir les projets"
          videLabel="Aucun décaissement prévu ce mois."
          items={decPrevus.slice(0, 4).map((d) => ({
            cle: `d${d.id}`,
            type: "projet" as TypeEntite,
            id: d.projetId,
            principal: d.libelle?.trim() || d.projetNom,
            secondaire: `${formatDate(d.date)} · ${formatEuro(Number(d.montant))}`,
          }))}
          reste={decPrevus.length - Math.min(decPrevus.length, 4)}
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
      </div>
    </div>
  );
}

function LigneCaAnnuel({
  titre,
  valeur,
  accent = false,
}: {
  titre: string;
  valeur: number;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-primary/30 bg-primary/5" : ""}`}>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className={`font-display text-xl tabular-nums ${accent ? "text-primary" : ""}`}>
        {formatEuro(valeur)}
      </p>
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
