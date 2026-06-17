import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chargerRentabiliteAnnuelle } from "@/lib/rentabilite/charger-rentabilite-annuelle";
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

  const r = await chargerRentabiliteAnnuelle(annee);

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
                {formatEuro(r.caAnnuelTotal)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <LigneCaAnnuel titre="Régie" valeur={r.caRegieAnnee} />
              <LigneCaAnnuel titre="Forfait" valeur={r.caForfaitAnnee} />
              <LigneCaAnnuel titre="Maintenance MCO" valeur={r.caMcoAnnee} />
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
                {formatEuro(r.coutAnnuelTotal)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <LigneCaAnnuel titre="Régie" valeur={r.coutRegieAnnee} />
              <LigneCaAnnuel titre="Forfait" valeur={r.coutForfaitAnnee} />
              <LigneCaAnnuel titre="Maintenance MCO" valeur={r.coutMcoAnnee} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marge prévisionnelle annuelle */}
      <div className="grid grid-cols-2 gap-4">
        <Indicateur titre={`Marge prévisionnelle ${annee}`} valeur={formatEuro(r.margePrevAnnee)} />
        <Indicateur
          titre="Taux de marge prévisionnel"
          valeur={formatPourcent(r.tauxMargePrevAnnee)}
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
