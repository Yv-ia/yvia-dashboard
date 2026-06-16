import { db } from "@/db";
import {
  affectations,
  projets,
  decaissements,
  recurrents,
  opportunites,
} from "@/db/schema";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculerPrevisionnel12Mois } from "./statistiques/previsionnel-calculs";
import {
  projeterRecurrent,
  totaliserProjection,
  type PlanningMensuel,
} from "@/lib/recurrents/previsionnel";
import { formatEuro, formatPourcent } from "@/lib/format";
import { NavigationMois } from "./navigation-mois";
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

  const [affsAnnee, forfaitsGagnes, recsRegie, recsNonRegie, decAnnee] = await Promise.all([
    // --- Sources annuelles du prévisionnel (mêmes requêtes que /statistiques/previsionnel) ---
    // Régie réel : tous les jours posés de l'année (date + TJM vente + TJM achat
    // pour le coût prévisionnel régie).
    db
      .select({
        date: affectations.date,
        tjmVente: affectations.tjmVente,
        tjmAchat: affectations.tjmAchat,
      })
      .from(affectations)
      .where(and(gte(affectations.date, debutAnnee), lte(affectations.date, finAnnee))),
    // Forfait : booking des deals forfait GAGNÉS, par mois de signature (date_gagne).
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
    // Régie macro : hypothèses (récurrents catégorie régie) -> relais des mois non planifiés.
    db
      .select(champsRecurrent)
      .from(recurrents)
      .where(and(eq(recurrents.actif, true), eq(recurrents.categorie, "regie"))),
    // Récurrence : contrats RUN / licence (la régie est portée par sa propre ligne).
    db
      .select(champsRecurrent)
      .from(recurrents)
      .where(and(eq(recurrents.actif, true), ne(recurrents.categorie, "regie"))),
    // Coût forfait : décaissements de l'année (réalisés + prévus = prévisionnel plein).
    db
      .select({ montant: decaissements.montant })
      .from(decaissements)
      .innerJoin(projets, eq(decaissements.projetId, projets.id))
      .where(
        and(
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(decaissements.date, debutAnnee),
          lte(decaissements.date, finAnnee)
        )
      ),
  ]);

  const arrondi = (n: number) => Math.round(n * 100) / 100;

  // CA prévisionnel de l'année, ventilé par source — calcul partagé avec la page
  // /statistiques/previsionnel pour garantir des chiffres cohérents (régie =
  // planning réel + hypothèse macro, forfait = booking des deals gagnés,
  // récurrence = RUN/licence).
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

  // Coût prévisionnel de l'année, même maille que le CA (pour comparer l'annuel à
  // l'annuel) : régie = TJM achat du planning réel ; MCO = coût projeté des
  // récurrents RUN/licence ; forfait = décaissements de l'année.
  const horizonAnnee = Array.from(
    { length: 12 },
    (_, i) => `${annee}-${String(i + 1).padStart(2, "0")}`
  );
  const planningVide: PlanningMensuel = new Map();
  const coutRegieAnnee = arrondi(affsAnnee.reduce((s, a) => s + Number(a.tjmAchat), 0));
  const coutMcoAnnee = arrondi(
    recsNonRegie.reduce((s, r) => {
      const points = projeterRecurrent(versRecurrentPrevisionnel(r), planningVide, horizonAnnee);
      return s + totaliserProjection(points).cout;
    }, 0)
  );
  const coutForfaitAnnee = arrondi(decAnnee.reduce((s, d) => s + Number(d.montant), 0));
  const coutAnnuelTotal = arrondi(coutRegieAnnee + coutMcoAnnee + coutForfaitAnnee);
  const margePrevAnnee = arrondi(caAnnuelTotal - coutAnnuelTotal);
  const tauxMargePrevAnnee = caAnnuelTotal > 0 ? margePrevAnnee / caAnnuelTotal : 0;

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

      {/* Coût prévisionnel de l'année — même maille que le CA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Coût prévisionnel {annee}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col justify-center rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Total {annee}</p>
              <p className="font-display text-3xl tabular-nums sm:text-4xl">
                {formatEuro(coutAnnuelTotal)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <LigneCaAnnuel titre="Régie" valeur={coutRegieAnnee} />
              <LigneCaAnnuel titre="Forfait" valeur={coutForfaitAnnee} />
              <LigneCaAnnuel titre="Maintenance MCO" valeur={coutMcoAnnee} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marge prévisionnelle annuelle */}
      <div className="grid grid-cols-2 gap-4">
        <Indicateur titre={`Marge prévisionnelle ${annee}`} valeur={formatEuro(margePrevAnnee)} />
        <Indicateur titre="Taux de marge prévisionnel" valeur={formatPourcent(tauxMargePrevAnnee)} />
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
