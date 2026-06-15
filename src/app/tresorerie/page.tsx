import Link from "next/link";
import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { projets, clients, freelances, encaissements, decaissements, jalons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import {
  TresorerieEcheances,
  type EcheanceTresorerie,
  type ProjetComplet,
} from "./tresorerie-echeances";
import { EncaissementsParDeal, type DealEncaissement } from "./encaissements-par-deal";

const ONGLETS = [
  { cle: "encaissements", label: "Encaissements" },
  { cle: "decaissements", label: "Décaissements" },
] as const;

export default async function PageTresorerie({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  await exigerSession();
  const { vue } = await searchParams;
  const type = vue === "decaissements" ? "decaissement" : "encaissement";
  const aujourdhui = new Date().toISOString().slice(0, 10);

  // Trésorerie = échéancier des projets ACTIFS (entrées client / sorties freelances).
  const [projetsRows, encRows, decRows, jalRows, freelancesActifs] = await Promise.all([
      db
        .select({
          id: projets.id,
          nom: projets.nom,
          budget: projets.budget,
          clientId: projets.clientId,
          clientNom: clients.nom,
          clientFiabilite: clients.fiabiliteDefaut,
          fiabiliteDefaut: projets.fiabiliteDefaut,
          actif: projets.actif,
        })
        .from(projets)
        .innerJoin(clients, eq(projets.clientId, clients.id))
        .where(eq(projets.actif, true))
        .orderBy(projets.nom),
      db
        .select({
          id: encaissements.id,
          projetId: encaissements.projetId,
          date: encaissements.date,
          montant: encaissements.montant,
          libelle: encaissements.libelle,
          statut: encaissements.statut,
          fiabilite: encaissements.fiabilite,
        })
        .from(encaissements),
      db
        .select({
          id: decaissements.id,
          projetId: decaissements.projetId,
          date: decaissements.date,
          montant: decaissements.montant,
          libelle: decaissements.libelle,
          statut: decaissements.statut,
          prenom: freelances.prenom,
          nom: freelances.nom,
        })
        .from(decaissements)
        .innerJoin(freelances, eq(decaissements.freelanceId, freelances.id)),
      db
        .select({ id: jalons.id, projetId: jalons.projetId, date: jalons.date, libelle: jalons.libelle })
        .from(jalons),
      db
        .select({ id: freelances.id, prenom: freelances.prenom, nom: freelances.nom })
        .from(freelances)
        .where(eq(freelances.actif, true))
        .orderBy(freelances.nom),
    ]);

  const projetsActifs = new Map(projetsRows.map((p) => [p.id, p]));

  // Échéances par projet, pour reconstruire le dialogue « Gérer ».
  const projetsParId: Record<number, ProjetComplet> = {};
  for (const p of projetsRows) {
    projetsParId[p.id] = {
      projet: {
        id: p.id,
        nom: p.nom,
        clientId: p.clientId,
        clientNom: p.clientNom,
        budget: p.budget,
        fiabiliteDefaut: p.fiabiliteDefaut,
        clientFiabilite: p.clientFiabilite,
        actif: p.actif,
      },
      encaissements: [],
      decaissements: [],
      jalons: [],
    };
  }
  for (const e of encRows) {
    projetsParId[e.projetId]?.encaissements.push({
      id: e.id,
      date: e.date,
      montant: e.montant,
      libelle: e.libelle,
      statut: e.statut,
      fiabilite: e.fiabilite,
    });
  }
  for (const d of decRows) {
    projetsParId[d.projetId]?.decaissements.push({
      id: d.id,
      date: d.date,
      montant: d.montant,
      libelle: d.libelle,
      statut: d.statut,
      fiabilite: null,
      freelanceNom: `${d.prenom} ${d.nom}`,
    });
  }
  for (const j of jalRows) {
    projetsParId[j.projetId]?.jalons.push({ id: j.id, date: j.date, libelle: j.libelle });
  }

  const arrondi = (n: number) => Math.round(n * 100) / 100;

  // Encaissements = vue PAR DEAL forfait gagné (un projet = un deal). Statut CALCULÉ
  // à partir de l'encaissé réel (Σ encaissements hors prévu) vs le CA (budget).
  const deals: DealEncaissement[] = projetsRows.map((p) => {
    const encaisse = arrondi(
      (projetsParId[p.id]?.encaissements ?? [])
        .filter((e) => e.statut !== "prevu")
        .reduce((s, e) => s + Number(e.montant), 0)
    );
    const ca = Number(p.budget);
    const statut: DealEncaissement["statut"] =
      encaisse <= 0 ? "non" : encaisse >= ca ? "total" : "partiel";
    return {
      projetId: p.id,
      projetNom: p.nom,
      clientId: p.clientId,
      clientNom: p.clientNom,
      ca,
      encaisse,
      reste: arrondi(Math.max(0, ca - encaisse)),
      statut,
    };
  });

  // Décaissements = échéancier (par échéance) des projets actifs, trié par date.
  const echeancesDec: EcheanceTresorerie[] = decRows
    .filter((d) => projetsActifs.has(d.projetId))
    .map((d) => {
      const p = projetsActifs.get(d.projetId)!;
      return {
        id: d.id,
        projetId: d.projetId,
        projetNom: p.nom,
        clientId: p.clientId,
        clientNom: p.clientNom,
        date: d.date,
        montant: d.montant,
        libelle: d.libelle,
        statut: d.statut,
        freelanceNom: `${d.prenom} ${d.nom}`,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <ListViewToolbar action={null}>
        {ONGLETS.map((o) => (
          <Link
            key={o.cle}
            href={`/tresorerie?vue=${o.cle}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              (type === "decaissement" ? "decaissements" : "encaissements") === o.cle
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </ListViewToolbar>

      <Card>
        <CardHeader>
          <CardTitle>{type === "encaissement" ? "Encaissements" : "Décaissements"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {type === "encaissement" ? (
            <EncaissementsParDeal
              deals={deals}
              projetsParId={projetsParId}
              freelancesActifs={freelancesActifs}
            />
          ) : (
            <TresorerieEcheances
              type="decaissement"
              echeances={echeancesDec}
              projetsParId={projetsParId}
              freelancesActifs={freelancesActifs}
              aujourdhui={aujourdhui}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
