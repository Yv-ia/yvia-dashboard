import Link from "next/link";
import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { projets, clients, freelances, missions, encaissements, decaissements, jalons } from "@/db/schema";
import { eq, isNull, isNotNull } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListViewToolbar } from "@/components/list-view-toolbar";
import {
  TresorerieEcheances,
  type EcheanceTresorerie,
  type ProjetComplet,
} from "./tresorerie-echeances";
import { EncaissementsParDeal, type DealEncaissement } from "./encaissements-par-deal";
import { EncaissementsDirects, type EncaissementDirect } from "./encaissements-directs";

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
  const [projetsRows, encRows, decRows, jalRows, freelancesActifs, clientsActifs, missionsActives, encDirectsRows] =
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
        .from(encaissements)
        .where(isNotNull(encaissements.projetId)), // échéancier forfait uniquement
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
      // Clients actifs : options du formulaire d'encaissement direct.
      db
        .select({ id: clients.id, nom: clients.nom })
        .from(clients)
        .where(eq(clients.actif, true))
        .orderBy(clients.nom),
      // Missions actives : options (filtrées par client côté client).
      db
        .select({ id: missions.id, nom: missions.nom, clientId: missions.clientId })
        .from(missions)
        .where(eq(missions.actif, true))
        .orderBy(missions.nom),
      // Encaissements DIRECTS (hors deal forfait) : projet_id IS NULL.
      db
        .select({
          id: encaissements.id,
          date: encaissements.date,
          montant: encaissements.montant,
          libelle: encaissements.libelle,
          statut: encaissements.statut,
          clientId: encaissements.clientId,
          clientNom: clients.nom,
          missionId: encaissements.missionId,
          missionNom: missions.nom,
        })
        .from(encaissements)
        .innerJoin(clients, eq(encaissements.clientId, clients.id))
        .leftJoin(missions, eq(encaissements.missionId, missions.id))
        .where(isNull(encaissements.projetId)),
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
    if (e.projetId == null) continue; // sécurité : pas d'encaissement direct ici
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

  // Encaissements DIRECTS = événements de paiement client/mission (hors forfait).
  const encaissementsDirects: EncaissementDirect[] = encDirectsRows.map((e) => ({
    id: e.id,
    date: e.date,
    montant: e.montant,
    libelle: e.libelle,
    statut: e.statut,
    clientId: e.clientId!,
    clientNom: e.clientNom,
    missionId: e.missionId,
    missionNom: e.missionNom,
  }));

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
            <div className="space-y-6">
              <EncaissementsParDeal
                deals={deals}
                projetsParId={projetsParId}
                freelancesActifs={freelancesActifs}
              />
              <EncaissementsDirects
                encaissements={encaissementsDirects}
                clientsActifs={clientsActifs}
                missionsActives={missionsActives}
                aujourdhui={aujourdhui}
              />
            </div>
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
