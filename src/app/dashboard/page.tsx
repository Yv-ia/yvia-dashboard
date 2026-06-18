import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chargerIndicateursMois } from "@/lib/rentabilite/charger-indicateurs-mois";
import { chargerRentabiliteAnnuelle } from "@/lib/rentabilite/charger-rentabilite-annuelle";
import { lireFraisStructure } from "@/lib/finance/frais-structure";
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

  const [{ indic }, rent, fraisStructure] = await Promise.all([
    chargerIndicateursMois(annee, mois),
    chargerRentabiliteAnnuelle(annee),
    lireFraisStructure(annee),
  ]);

  return (
    <div className="space-y-6">
      {/* Graphe principal : résultat à distribuer (post-IS) projeté, dynamique. */}
      <DividendeCard
        annee={annee}
        moisSelectionne={mois}
        margePrevAnnee={rent.margePrevAnnee}
        margeMensuelle={rent.margeParMois.map((m) => ({ mois: m.mois, marge: m.marge }))}
        fraisStructureInitial={fraisStructure}
      />

      {/* 3 KPI en ligne, en valeur absolue, sous le graphe de rentabilité. */}
      <div className="grid gap-4 border-t pt-8 sm:grid-cols-3">
        <KpiCard titre="Clients actifs" valeur={String(indic.clientsActifs)} />
        <KpiCard titre="CA moyen / client" valeur={formatEuro(indic.caParClient)} />
        <KpiCard titre="Marge brute globale" valeur={formatEuro(indic.margeBrute)} />
      </div>
    </div>
  );
}

// KPI en valeur absolue : libellé + valeur du mois.
function KpiCard({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl tabular-nums sm:text-3xl">{valeur}</p>
      </CardContent>
    </Card>
  );
}
