import { db } from "@/db";
import {
  affectations,
  missions,
  projets,
  encaissements,
  decaissements,
  recurrents,
  opportunites,
  todos,
} from "@/db/schema";
import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { premierJourDuMois, dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { calculerPrevisionnel12Mois } from "./statistiques/previsionnel-calculs";
import { calculerIndicateursMois } from "@/lib/rentabilite/indicateurs";
import { formatEuro } from "@/lib/format";
import { NavigationMois } from "./navigation-mois";
import { EpicsCard } from "./todo/epics-card";
import { exigerSession } from "@/lib/auth/server";

export default async function PageRentabilite({
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
  // Mois précédent (pour les écarts des KPI).
  const moisPrec = mois === 1 ? 12 : mois - 1;
  const anneePrec = mois === 1 ? annee - 1 : annee;
  const debutMoisPrec = premierJourDuMois(anneePrec, moisPrec);
  const finMoisPrec = dernierJourDuMois(anneePrec, moisPrec);
  const debutAnnee = `${annee}-01-01`;
  const finAnnee = `${annee}-12-31`;

  // Sélection commune aux récurrents (régie macro + RUN/licence).
  const champsRecurrent = {
    categorie: recurrents.categorie,
    montantRecurrent: recurrents.montantRecurrent,
    coutRecurrent: recurrents.coutRecurrent,
    dateDebut: recurrents.dateDebut,
    dateFin: recurrents.dateFin,
  };

  const [
    affsAnnee,
    forfaitsGagnes,
    recsRegie,
    recsNonRegie,
    regieFenetre,
    encFenetre,
    decFenetre,
    epics,
  ] = await Promise.all([
    // --- Sources annuelles du prévisionnel (mêmes requêtes que /statistiques/previsionnel) ---
    db
      .select({ date: affectations.date, tjmVente: affectations.tjmVente })
      .from(affectations)
      .where(and(gte(affectations.date, debutAnnee), lte(affectations.date, finAnnee))),
    db
      .select({ dateGagne: opportunites.dateGagne, montant: opportunites.montantEstime })
      .from(opportunites)
      .where(
        and(
          eq(opportunites.type, "forfait"),
          eq(opportunites.statut, "gagne"),
          gte(opportunites.dateGagne, debutAnnee),
          lte(opportunites.dateGagne, finAnnee)
        )
      ),
    db
      .select(champsRecurrent)
      .from(recurrents)
      .where(and(eq(recurrents.actif, true), eq(recurrents.categorie, "regie"))),
    db
      .select(champsRecurrent)
      .from(recurrents)
      .where(and(eq(recurrents.actif, true), ne(recurrents.categorie, "regie"))),
    // --- Réalisé sur la fenêtre [mois précédent → mois affiché] pour les KPI ---
    // Régie réelle : jours posés (CA = TJM vente, coût = TJM achat), par client.
    db
      .select({
        clientId: missions.clientId,
        date: affectations.date,
        tjmVente: affectations.tjmVente,
        tjmAchat: affectations.tjmAchat,
      })
      .from(affectations)
      .innerJoin(missions, eq(affectations.missionId, missions.id))
      .where(and(gte(affectations.date, debutMoisPrec), lte(affectations.date, finMois))),
    // Forfait : encaissements réalisés (le prévu ne compte pas comme CA).
    db
      .select({
        clientId: projets.clientId,
        date: encaissements.date,
        montant: encaissements.montant,
      })
      .from(encaissements)
      .innerJoin(projets, eq(encaissements.projetId, projets.id))
      .where(
        and(
          eq(encaissements.statut, "encaisse"),
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(encaissements.date, debutMoisPrec),
          lte(encaissements.date, finMois)
        )
      ),
    // Forfait : décaissements réalisés (coût).
    db
      .select({
        clientId: projets.clientId,
        date: decaissements.date,
        montant: decaissements.montant,
      })
      .from(decaissements)
      .innerJoin(projets, eq(decaissements.projetId, projets.id))
      .where(
        and(
          eq(decaissements.statut, "decaisse"),
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(decaissements.date, debutMoisPrec),
          lte(decaissements.date, finMois)
        )
      ),
    // Epics (grosses to-do) pour le bloc de gauche.
    db
      .select({
        id: todos.id,
        titre: todos.titre,
        description: todos.description,
        statut: todos.statut,
      })
      .from(todos)
      .where(eq(todos.epic, true))
      .orderBy(asc(todos.ordre), asc(todos.id)),
  ]);

  // CA prévisionnel de l'année, ventilé par source — calcul partagé avec la page
  // /statistiques/previsionnel pour garantir des chiffres cohérents.
  const versRecurrentPrevisionnel = (r: (typeof recsRegie)[number]) => ({
    categorie: r.categorie,
    montantRecurrent: Number(r.montantRecurrent),
    coutRecurrent: r.coutRecurrent == null ? null : Number(r.coutRecurrent),
    dateDebut: r.dateDebut,
    dateFin: r.dateFin,
  });
  const { totaux: previsionnel } = calculerPrevisionnel12Mois({
    annee,
    affectations: affsAnnee,
    recurrentsRegie: recsRegie.map(versRecurrentPrevisionnel),
    recurrentsNonRegie: recsNonRegie.map(versRecurrentPrevisionnel),
    forfaitsGagnes,
  });
  const caRegieAnnee = previsionnel.regie;
  const caForfaitAnnee = previsionnel.forfait;
  const caMcoAnnee = previsionnel.recurrence;
  const caAnnuelTotal = previsionnel.total;

  // KPI du mois affiché, avec écart sur le mois précédent.
  const indic = calculerIndicateursMois({
    regie: regieFenetre,
    encaissements: encFenetre,
    decaissements: decFenetre,
    debutMois,
    finMois,
  });
  const indicPrec = calculerIndicateursMois({
    regie: regieFenetre,
    encaissements: encFenetre,
    decaissements: decFenetre,
    debutMois: debutMoisPrec,
    finMois: finMoisPrec,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <NavigationMois basePath="/" annee={annee} mois={mois} />
      </div>

      {/* CA prévisionnel de l'année — Total mis en avant, détail par source à droite */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">CA prévisionnel {annee}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col justify-center rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Total {annee}</p>
              <p className="font-display text-3xl tabular-nums text-primary sm:text-4xl">
                {formatEuro(caAnnuelTotal)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <LigneCaAnnuel titre="Régie" valeur={caRegieAnnee} />
              <LigneCaAnnuel titre="Forfait" valeur={caForfaitAnnee} />
              <LigneCaAnnuel titre="Maintenance MCO" valeur={caMcoAnnee} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Écran coupé en deux : to-do (epics) à gauche, KPI clés du mois à droite */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EpicsCard epics={epics} />

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <KpiCard
            titre="Clients actifs"
            valeur={String(indic.clientsActifs)}
            diff={indic.clientsActifs - indicPrec.clientsActifs}
            format={(n) => String(n)}
          />
          <KpiCard
            titre="CA moyen / client"
            valeur={formatEuro(indic.caParClient)}
            diff={indic.caParClient - indicPrec.caParClient}
            format={formatEuro}
          />
          <KpiCard
            titre="Marge brute globale"
            valeur={formatEuro(indic.margeBrute)}
            diff={indic.margeBrute - indicPrec.margeBrute}
            format={formatEuro}
          />
        </div>
      </div>
    </div>
  );
}

function LigneCaAnnuel({ titre, valeur }: { titre: string; valeur: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className="font-display text-xl tabular-nums">{formatEuro(valeur)}</p>
    </div>
  );
}

// Carte d'un KPI clé : valeur du mois + écart vs mois précédent (flèche + couleur).
function KpiCard({
  titre,
  valeur,
  diff,
  format,
}: {
  titre: string;
  valeur: string;
  diff: number;
  format: (n: number) => string;
}) {
  const positif = diff > 0;
  const negatif = diff < 0;
  const Icone = positif ? ArrowUp : negatif ? ArrowDown : Minus;
  const couleur = positif ? "text-emerald-600" : negatif ? "text-rose-600" : "text-muted-foreground";
  const signe = positif ? "+" : negatif ? "−" : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="font-display text-2xl sm:text-3xl">{valeur}</p>
        <p className={`flex items-center gap-1 text-xs ${couleur}`}>
          <Icone className="size-3.5" />
          <span className="tabular-nums">
            {signe}
            {format(Math.abs(diff))}
          </span>
          <span className="text-muted-foreground">vs mois précédent</span>
        </p>
      </CardContent>
    </Card>
  );
}
