import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { chargerIndicateursMois } from "@/lib/rentabilite/charger-indicateurs-mois";
import { chargerRentabiliteAnnuelle } from "@/lib/rentabilite/charger-rentabilite-annuelle";
import { lireFraisStructure } from "@/lib/finance/frais-structure";
import { lireObjectifResultat } from "@/lib/finance/objectif";
import { formatEuro } from "@/lib/format";
import { DividendeCard } from "./dividende-card";
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

  const [{ indic, clientsActifsAnnee }, rent, fraisStructure, objectif] = await Promise.all([
    chargerIndicateursMois(annee, mois),
    chargerRentabiliteAnnuelle(annee),
    lireFraisStructure(annee),
    lireObjectifResultat(annee),
  ]);

  return (
    <div className="space-y-6">
      {/* Graphe principal : résultat à distribuer (post-IS) projeté, dynamique. */}
      <DividendeCard
        annee={annee}
        moisSelectionne={mois}
        margeMensuelle={rent.margeParMois.map((m) => ({ mois: m.mois, marge: m.marge }))}
        fraisStructureInitial={fraisStructure}
        objectif={objectif}
      />

      {/* 3 KPI en ligne, en valeur absolue, sous le graphe de rentabilité. */}
      <div className="grid gap-4 border-t pt-8 sm:grid-cols-3">
        <KpiCard
          titre={`Clients actifs ${annee}`}
          valeur={String(clientsActifsAnnee)}
          aide={`Clients ayant généré du CA en ${annee} (régie posée ou encaissement reçu).`}
        />
        <KpiCard titre="CA moyen / client" valeur={formatEuro(indic.caParClient)} />
        <KpiCard titre="Marge brute globale" valeur={formatEuro(indic.margeBrute)} />
      </div>
    </div>
  );
}

// KPI en valeur absolue : libellé + valeur. `aide` ajoute une info-bulle (icône i)
// qui apparaît au survol/focus pour préciser le critère.
function KpiCard({ titre, valeur, aide }: { titre: string; valeur: string; aide?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          {titre}
          {aide ? (
            <Tooltip content={aide}>
              <span
                tabIndex={0}
                aria-label="Voir le détail du critère"
                className="inline-flex cursor-help items-center text-muted-foreground/60 outline-none hover:text-muted-foreground focus-visible:text-foreground"
              >
                <Info className="size-3.5" />
              </span>
            </Tooltip>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl tabular-nums sm:text-3xl">{valeur}</p>
      </CardContent>
    </Card>
  );
}
