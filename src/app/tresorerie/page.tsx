import Link from "next/link";
import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { projets, clients, freelances, encaissements, decaissements, jalons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import { ProjetFormDialog } from "@/app/projets/projet-form-dialog";
import { creerProjet } from "@/app/projets/actions";
import {
  TresorerieEcheances,
  type EcheanceTresorerie,
  type ProjetComplet,
} from "./tresorerie-echeances";

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
  const [projetsRows, encRows, decRows, jalRows, clientsListe, freelancesActifs] =
    await Promise.all([
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
        .select({ id: clients.id, nom: clients.nom })
        .from(clients)
        .where(eq(clients.actif, true))
        .orderBy(clients.nom),
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

  // Échéances de l'onglet affiché (projets actifs uniquement), triées par date.
  const echeances: EcheanceTresorerie[] = (
    type === "encaissement"
      ? encRows.map((e) => ({
          id: e.id,
          projetId: e.projetId,
          date: e.date,
          montant: e.montant,
          libelle: e.libelle,
          statut: e.statut,
          freelanceNom: null as string | null,
        }))
      : decRows.map((d) => ({
          id: d.id,
          projetId: d.projetId,
          date: d.date,
          montant: d.montant,
          libelle: d.libelle,
          statut: d.statut,
          freelanceNom: `${d.prenom} ${d.nom}`,
        }))
  )
    .filter((e) => projetsActifs.has(e.projetId))
    .map((e) => {
      const p = projetsActifs.get(e.projetId)!;
      return { ...e, projetNom: p.nom, clientId: p.clientId, clientNom: p.clientNom };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <ListViewToolbar
        action={
          <ProjetFormDialog
            action={creerProjet}
            titre="Nouveau projet forfait"
            clientsListe={clientsListe}
            trigger={<Button>Nouveau projet forfait</Button>}
          />
        }
      >
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
          <TresorerieEcheances
            type={type}
            echeances={echeances}
            projetsParId={projetsParId}
            freelancesActifs={freelancesActifs}
            aujourdhui={aujourdhui}
          />
        </CardContent>
      </Card>
    </div>
  );
}
