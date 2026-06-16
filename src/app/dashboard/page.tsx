import { db } from "@/db";
import { todos } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chargerIndicateursMois } from "@/lib/rentabilite/charger-indicateurs-mois";
import { formatEuro } from "@/lib/format";
import { NavigationMois } from "../navigation-mois";
import { EpicsCard } from "../todo/epics-card";
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

  const [{ indic, indicPrec }, epics] = await Promise.all([
    chargerIndicateursMois(annee, mois),
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

  const margeBrute = indic.margeBrute;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <NavigationMois basePath="/dashboard" annee={annee} mois={mois} />
      </div>

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
            valeur={formatEuro(margeBrute)}
            diff={margeBrute - indicPrec.margeBrute}
            format={formatEuro}
          />
        </div>
      </div>
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
