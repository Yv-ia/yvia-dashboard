"use server";
// Chargement à la demande du détail d'une entité pour les drawers en cascade,
// édition inline d'un champ, et bascule actif/inactif (bouton au bas du drawer).

import { and, count, eq, gte, lte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  freelances,
  clients,
  missions,
  projets,
  users,
  affectations,
  encaissements,
  decaissements,
} from "@/db/schema";
import { getSession } from "@/lib/auth/server";
import { estAdmin, type Session } from "@/lib/auth/session";
import { labelRole, peutSupprimerEntites, peutVoirMarges } from "@/lib/auth/permissions";
import { premierJourDuMois, dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { calculMissionRealisee } from "@/lib/calculs/marge";
import { formatEuro, formatJours } from "@/lib/format";
import { STATUTS_CLIENT, normaliserStatutClient } from "@/lib/clients/statut";
import type { DetailEntite, EntiteRef, SuppressionEntite } from "./types";

const arrondi = (n: number) => Math.round(n * 100) / 100;
// Montant sans décimales (les TJM/budgets sont saisis en euros entiers).
const entier = (v: string) => String(Math.round(Number(v)));

function moisCourant() {
  const maintenant = new Date();
  const annee = maintenant.getUTCFullYear();
  const mois = maintenant.getUTCMonth() + 1;
  return { debut: premierJourDuMois(annee, mois), fin: dernierJourDuMois(annee, mois) };
}

export async function chargerEntite(ref: EntiteRef): Promise<DetailEntite | null> {
  const session = await getSession();
  if (!session) return null;

  // Le commercial n'accède qu'au détail client : les autres entités exposent
  // des coûts/marges (TJM achat, décaissements, marge).
  if (!peutVoirMarges(session) && ref.type !== "client") return null;

  let detail: DetailEntite | null;
  switch (ref.type) {
    case "freelance":
      detail = await chargerFreelance(ref.id);
      break;
    case "client":
      detail = await chargerClient(ref.id);
      break;
    case "mission":
      detail = await chargerMission(ref.id);
      break;
    case "projet":
      detail = await chargerProjet(ref.id);
      break;
    case "user":
      if (!estAdmin(session)) return null;
      return chargerUser(ref.id);
    default:
      return null;
  }

  // Bouton « Supprimer définitivement » : admin uniquement, et seulement quand
  // l'entité n'a pas de dépendance bloquante (cf. descripteurSuppression).
  if (detail) detail.suppression = await descripteurSuppression(session, ref);
  return detail;
}

// Dépendance « dure » (FK sans cascade) qui interdit la suppression et impose
// l'archivage. Source UNIQUE de la règle, partagée par l'affichage du bouton
// (descripteurSuppression) et l'exécution (supprimerEntite) pour qu'ils ne
// puissent pas diverger. Renvoie le message d'impossibilité, ou null si OK.
async function blocageSuppression(ref: EntiteRef): Promise<string | null> {
  if (ref.type === "client") {
    const [nbMissions, nbProjets] = await Promise.all([
      compterMissionsClient(ref.id),
      compterProjetsClient(ref.id),
    ]);
    if (nbMissions > 0 || nbProjets > 0) {
      return "Suppression impossible : des missions ou des projets sont rattachés à ce client. Archivez-le plutôt.";
    }
  } else if (ref.type === "freelance") {
    const [nbMissions, nbDec] = await Promise.all([
      compterMissionsFreelance(ref.id),
      compterDecaissementsFreelance(ref.id),
    ]);
    if (nbMissions > 0 || nbDec > 0) {
      return "Suppression impossible : des missions ou des décaissements sont rattachés à ce freelance. Archivez-le plutôt.";
    }
  }
  return null;
}

// Décrit la suppression définitive proposée à l'admin, ou `undefined` si elle
// n'est pas permise (rôle insuffisant ou dépendances qui imposent l'archivage).
// Les cascades de la base (affectations, jalons, échéances) sont signalées dans
// l'avertissement pour que l'admin sache ce qui partira avec l'entité.
async function descripteurSuppression(
  session: Session,
  ref: EntiteRef
): Promise<SuppressionEntite | undefined> {
  if (!peutSupprimerEntites(session)) return undefined;
  if (await blocageSuppression(ref)) return undefined; // archivage obligatoire

  switch (ref.type) {
    case "client":
      return { avertissement: "Le client sera définitivement supprimé. Cette action est irréversible." };
    case "freelance": {
      const nbJours = await compterAffectationsFreelance(ref.id);
      const jours = nbJours > 0 ? ` ${nbJours} jour(s) de planning seront aussi supprimés.` : "";
      return {
        avertissement: `Le freelance sera définitivement supprimé.${jours} Cette action est irréversible.`,
      };
    }
    case "mission": {
      const nbJours = await compterAffectationsMission(ref.id);
      const jours = nbJours > 0 ? ` ${nbJours} jour(s) de planning rattachés seront aussi supprimés.` : "";
      return {
        avertissement: `La mission sera définitivement supprimée.${jours} Cette action est irréversible.`,
      };
    }
    case "projet":
      return {
        avertissement:
          "Le projet et toutes ses échéances (encaissements, décaissements, jalons) seront définitivement supprimés. Cette action est irréversible.",
      };
    default:
      return undefined;
  }
}

// Compteurs de dépendances (FK sans cascade) qui décident si une suppression
// est possible, et cascades signalées dans l'avertissement.
async function compterMissionsClient(id: number): Promise<number> {
  const [r] = await db.select({ n: count() }).from(missions).where(eq(missions.clientId, id));
  return Number(r?.n ?? 0);
}
async function compterProjetsClient(id: number): Promise<number> {
  const [r] = await db.select({ n: count() }).from(projets).where(eq(projets.clientId, id));
  return Number(r?.n ?? 0);
}
async function compterMissionsFreelance(id: number): Promise<number> {
  const [r] = await db.select({ n: count() }).from(missions).where(eq(missions.freelanceId, id));
  return Number(r?.n ?? 0);
}
async function compterDecaissementsFreelance(id: number): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(decaissements)
    .where(eq(decaissements.freelanceId, id));
  return Number(r?.n ?? 0);
}
async function compterAffectationsFreelance(id: number): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(affectations)
    .where(eq(affectations.freelanceId, id));
  return Number(r?.n ?? 0);
}
async function compterAffectationsMission(id: number): Promise<number> {
  const [r] = await db.select({ n: count() }).from(affectations).where(eq(affectations.missionId, id));
  return Number(r?.n ?? 0);
}

async function chargerUser(id: number): Promise<DetailEntite | null> {
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) return null;

  const nomComplet = [u.prenom, u.nom].filter(Boolean).join(" ");

  return {
    ref: { type: "user", id },
    titre: nomComplet || u.email,
    sousTitre: u.email,
    actif: true,
    actionLabel: "",
    champs: [
      { cle: "prenom", label: "Prénom", valeur: u.prenom ?? "", type: "text" },
      { cle: "nom", label: "Nom", valeur: u.nom ?? "", type: "text" },
    ],
    infos: [
      { label: "Email", valeur: u.email },
      { label: "Rôle", valeur: labelRole(u.role) },
    ],
    sections: [],
  };
}

async function chargerFreelance(id: number): Promise<DetailEntite | null> {
  const [f] = await db.select().from(freelances).where(eq(freelances.id, id));
  if (!f) return null;

  const missionsRows = await db
    .select({
      id: missions.id,
      nom: missions.nom,
      actif: missions.actif,
      clientNom: clients.nom,
      tjmAchat: missions.tjmAchat,
      tjmVente: missions.tjmVente,
    })
    .from(missions)
    .innerJoin(clients, eq(missions.clientId, clients.id))
    .where(eq(missions.freelanceId, id))
    .orderBy(missions.nom);

  const { debut, fin } = moisCourant();
  const affs = await db
    .select({ tjmAchat: affectations.tjmAchat, tjmVente: affectations.tjmVente })
    .from(affectations)
    .where(
      and(eq(affectations.freelanceId, id), gte(affectations.date, debut), lte(affectations.date, fin))
    );
  const jours = affs.length;
  const marge = arrondi(affs.reduce((s, a) => s + (Number(a.tjmVente) - Number(a.tjmAchat)), 0));

  return {
    ref: { type: "freelance", id },
    titre: `${f.prenom} ${f.nom}`,
    sousTitre: f.actif ? "Freelance actif" : "Freelance archivé",
    actif: f.actif,
    actionLabel: "Archiver",
    champs: [
      { cle: "prenom", label: "Prénom", valeur: f.prenom, type: "text" },
      { cle: "nom", label: "Nom", valeur: f.nom, type: "text" },
    ],
    infos: [
      { label: "Jours posés ce mois", valeur: formatJours(jours) },
      { label: "Marge ce mois", valeur: formatEuro(marge) },
    ],
    sections: [
      {
        titre: "Missions",
        vide: "Aucune mission (intercontrat).",
        liens: missionsRows.map((m) => ({
          ref: { type: "mission", id: m.id },
          label: m.actif ? m.nom : `${m.nom} (inactive)`,
          sous: `${m.clientNom} · ${formatEuro(Number(m.tjmVente) - Number(m.tjmAchat))}/j`,
        })),
      },
    ],
  };
}

async function chargerClient(id: number): Promise<DetailEntite | null> {
  const [c] = await db.select().from(clients).where(eq(clients.id, id));
  if (!c) return null;

  const missionsRows = await db
    .select({
      id: missions.id,
      nom: missions.nom,
      actif: missions.actif,
      freelancePrenom: freelances.prenom,
      freelanceNom: freelances.nom,
    })
    .from(missions)
    .innerJoin(freelances, eq(missions.freelanceId, freelances.id))
    .where(eq(missions.clientId, id))
    .orderBy(missions.nom);

  const projetsRows = await db
    .select({ id: projets.id, nom: projets.nom, actif: projets.actif, budget: projets.budget })
    .from(projets)
    .where(and(eq(projets.clientId, id), eq(projets.actif, true), ne(projets.statutCommercial, "perdu")))
    .orderBy(projets.nom);

  const { debut, fin } = moisCourant();
  const affs = await db
    .select({ tjmVente: affectations.tjmVente })
    .from(affectations)
    .innerJoin(missions, eq(affectations.missionId, missions.id))
    .where(and(eq(missions.clientId, id), gte(affectations.date, debut), lte(affectations.date, fin)));
  const jours = affs.length;
  const ca = arrondi(affs.reduce((s, a) => s + Number(a.tjmVente), 0));

  return {
    ref: { type: "client", id },
    titre: c.nom,
    sousTitre: c.actif ? "Client actif" : "Client archivé",
    actif: c.actif,
    actionLabel: "Archiver",
    champs: [
      { cle: "nom", label: "Nom de la société", valeur: c.nom, type: "text" },
      {
        cle: "statut",
        label: "Statut commercial",
        valeur: normaliserStatutClient(c.statut),
        type: "select",
        options: STATUTS_CLIENT.map((s) => ({ value: s.key, label: s.label })),
      },
    ],
    infos: [
      { label: "Jours facturés ce mois", valeur: formatJours(jours) },
      { label: "CA régie ce mois", valeur: formatEuro(ca) },
    ],
    sections: [
      {
        titre: "Missions",
        vide: "Aucune mission chez ce client.",
        liens: missionsRows.map((m) => ({
          ref: { type: "mission", id: m.id },
          label: m.nom,
          sous: `${m.freelancePrenom} ${m.freelanceNom}`,
          statut: { actif: m.actif, label: m.actif ? "Active" : "Inactive" },
        })),
      },
      {
        titre: "Projets",
        vide: "Aucun projet pour ce client.",
        liens: projetsRows.map((p) => ({
          ref: { type: "projet", id: p.id },
          label: p.actif ? p.nom : `${p.nom} (archivé)`,
          sous: formatEuro(Number(p.budget)),
        })),
      },
    ],
  };
}

async function chargerMission(id: number): Promise<DetailEntite | null> {
  const [m] = await db
    .select({
      id: missions.id,
      nom: missions.nom,
      actif: missions.actif,
      tjmAchat: missions.tjmAchat,
      tjmVente: missions.tjmVente,
      freelanceId: missions.freelanceId,
      freelancePrenom: freelances.prenom,
      freelanceNom: freelances.nom,
      clientId: missions.clientId,
      clientNom: clients.nom,
    })
    .from(missions)
    .innerJoin(freelances, eq(missions.freelanceId, freelances.id))
    .innerJoin(clients, eq(missions.clientId, clients.id))
    .where(eq(missions.id, id));
  if (!m) return null;

  const affectationsMission = await db
    .select({ tjmAchat: affectations.tjmAchat, tjmVente: affectations.tjmVente })
    .from(affectations)
    .where(eq(affectations.missionId, id));

  const margeJour = Number(m.tjmVente) - Number(m.tjmAchat);
  const realise = calculMissionRealisee(affectationsMission);

  return {
    ref: { type: "mission", id },
    titre: m.nom,
    sousTitre: m.actif ? "Mission active" : "Mission inactive",
    actif: m.actif,
    actionLabel: "Désactiver",
    champs: [
      { cle: "nom", label: "Nom de la mission", valeur: m.nom, type: "text" },
      { cle: "tjmAchat", label: "TJM achat (€)", valeur: entier(m.tjmAchat), type: "number" },
      { cle: "tjmVente", label: "TJM vente (€)", valeur: entier(m.tjmVente), type: "number" },
    ],
    infos: [
      { label: "Jours facturés", valeur: formatJours(realise.joursFactures) },
      { label: "CA généré", valeur: formatEuro(realise.ca) },
      { label: "Marge depuis le début", valeur: formatEuro(realise.marge) },
      { label: "Marge / jour", valeur: formatEuro(margeJour) },
      { label: "Statut", valeur: m.actif ? "Active" : "Inactive" },
    ],
    sections: [
      {
        titre: "Freelance",
        vide: "",
        liens: [
          {
            ref: { type: "freelance", id: m.freelanceId },
            label: `${m.freelancePrenom} ${m.freelanceNom}`,
          },
        ],
      },
      {
        titre: "Client",
        vide: "",
        liens: [{ ref: { type: "client", id: m.clientId }, label: m.clientNom }],
      },
    ],
  };
}

async function chargerProjet(id: number): Promise<DetailEntite | null> {
  const [p] = await db
    .select({
      id: projets.id,
      nom: projets.nom,
      actif: projets.actif,
      budget: projets.budget,
      clientId: projets.clientId,
      clientNom: clients.nom,
    })
    .from(projets)
    .innerJoin(clients, eq(projets.clientId, clients.id))
    .where(eq(projets.id, id));
  if (!p) return null;

  const encs = await db
    .select({ montant: encaissements.montant, statut: encaissements.statut })
    .from(encaissements)
    .where(eq(encaissements.projetId, id));
  const decs = await db
    .select({
      montant: decaissements.montant,
      statut: decaissements.statut,
      freelanceId: decaissements.freelanceId,
      freelancePrenom: freelances.prenom,
      freelanceNom: freelances.nom,
    })
    .from(decaissements)
    .innerJoin(freelances, eq(decaissements.freelanceId, freelances.id))
    .where(eq(decaissements.projetId, id));

  const totalEnc = arrondi(
    encs.filter((e) => e.statut !== "prevu").reduce((s, e) => s + Number(e.montant), 0)
  );
  const totalDec = arrondi(
    decs.filter((d) => d.statut !== "prevu").reduce((s, d) => s + Number(d.montant), 0)
  );

  const freelancesVus = new Map<number, string>();
  for (const d of decs) freelancesVus.set(d.freelanceId, `${d.freelancePrenom} ${d.freelanceNom}`);

  return {
    ref: { type: "projet", id },
    titre: p.nom,
    sousTitre: p.actif ? "Projet actif" : "Projet terminé",
    actif: p.actif,
    actionLabel: "Terminer",
    champs: [
      { cle: "nom", label: "Nom du projet", valeur: p.nom, type: "text" },
      { cle: "budget", label: "Budget (€)", valeur: entier(p.budget), type: "number" },
    ],
    infos: [
      { label: "Encaissé", valeur: formatEuro(totalEnc) },
      { label: "Décaissé", valeur: formatEuro(totalDec) },
      { label: "Marge", valeur: formatEuro(arrondi(totalEnc - totalDec)) },
      { label: "Reste à facturer", valeur: formatEuro(arrondi(Number(p.budget) - totalEnc)) },
    ],
    sections: [
      {
        titre: "Client",
        vide: "",
        liens: [{ ref: { type: "client", id: p.clientId }, label: p.clientNom }],
      },
      {
        titre: "Freelances impliqués",
        vide: "Aucun décaissement enregistré.",
        liens: Array.from(freelancesVus.entries()).map(([fid, nom]) => ({
          ref: { type: "freelance", id: fid },
          label: nom,
        })),
      },
    ],
  };
}

// Édition inline d'un champ d'entité (nom, TJM, budget...).
export async function modifierChampEntite(
  ref: EntiteRef,
  cle: string,
  valeur: string
): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session) return { ok: false };

  // Le commercial ne peut éditer que le client (son périmètre) ; les autres
  // entités (delivery) lui sont fermées.
  if (!peutVoirMarges(session) && ref.type !== "client") {
    return { ok: false, message: "Accès refusé." };
  }

  const v = valeur.trim();

  if (ref.type === "user") {
    if (!estAdmin(session)) return { ok: false, message: "Accès refusé." };
    if (!["prenom", "nom"].includes(cle)) return { ok: false, message: "Champ inconnu." };
    await db.update(users).set({ [cle]: v || null }).where(eq(users.id, ref.id));
  } else if (ref.type === "freelance") {
    if (!["prenom", "nom"].includes(cle) || !v) return { ok: false, message: "Valeur invalide." };
    await db.update(freelances).set({ [cle]: v }).where(eq(freelances.id, ref.id));
  } else if (ref.type === "client") {
    if (cle === "nom") {
      if (!v) return { ok: false, message: "Valeur invalide." };
      await db.update(clients).set({ nom: v }).where(eq(clients.id, ref.id));
    } else if (cle === "statut") {
      await db
        .update(clients)
        .set({ statut: normaliserStatutClient(v) })
        .where(eq(clients.id, ref.id));
    } else return { ok: false, message: "Champ inconnu." };
  } else if (ref.type === "mission") {
    if (cle === "nom") {
      if (!v) return { ok: false, message: "Le nom est obligatoire." };
      await db.update(missions).set({ nom: v }).where(eq(missions.id, ref.id));
    } else if (cle === "tjmAchat" || cle === "tjmVente") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return { ok: false, message: "Montant invalide." };
      await db.update(missions).set({ [cle]: String(n) }).where(eq(missions.id, ref.id));
    } else return { ok: false, message: "Champ inconnu." };
  } else if (ref.type === "projet") {
    if (cle === "nom") {
      if (!v) return { ok: false, message: "Le nom est obligatoire." };
      await db.update(projets).set({ nom: v }).where(eq(projets.id, ref.id));
    } else if (cle === "budget") {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return { ok: false, message: "Budget invalide." };
      // Même règle que modifierProjet : le budget ne peut pas passer sous le
      // total des échéances de recettes déjà saisies (prévues + encaissées).
      const lignes = await db
        .select({ montant: encaissements.montant })
        .from(encaissements)
        .where(eq(encaissements.projetId, ref.id));
      const saisi = lignes.reduce((s, l) => s + Number(l.montant), 0);
      if (n < saisi) {
        return {
          ok: false,
          message: `Le budget ne peut pas être inférieur au total des échéances déjà saisies (${formatEuro(saisi)}).`,
        };
      }
      await db.update(projets).set({ budget: String(n) }).where(eq(projets.id, ref.id));
    } else return { ok: false, message: "Champ inconnu." };
  } else {
    return { ok: false, message: "Type inconnu." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// Bascule actif / inactif d'une entité (bouton « Archiver » / « Désactiver »).
export async function basculerActif(ref: EntiteRef): Promise<{ ok: boolean; actif?: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };

  // Commercial : seul l'archivage d'un client (son périmètre) est permis.
  if (!peutVoirMarges(session) && ref.type !== "client") return { ok: false };

  const table =
    ref.type === "freelance"
      ? freelances
      : ref.type === "client"
        ? clients
        : ref.type === "mission"
          ? missions
          : ref.type === "projet"
            ? projets
            : null;
  if (!table) return { ok: false };

  const [ligne] = await db.select({ actif: table.actif }).from(table).where(eq(table.id, ref.id));
  if (!ligne) return { ok: false };
  const nouveau = !ligne.actif;
  await db.update(table).set({ actif: nouveau }).where(eq(table.id, ref.id));

  revalidatePath("/", "layout");
  return { ok: true, actif: nouveau };
}

// Suppression DÉFINITIVE d'une entité (admin uniquement). Réversible côté métier
// uniquement par recréation : on refuse donc quand des dépendances « dures »
// (missions/projets pour un client, missions/décaissements pour un freelance)
// imposeraient sinon une perte de cohérence ; dans ce cas l'admin doit archiver.
// Les dépendances en cascade (affectations, jalons, échéances) partent avec
// l'entité via les contraintes ON DELETE CASCADE du schéma.
export async function supprimerEntite(
  ref: EntiteRef
): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Vous n'êtes pas connecté." };
  if (!peutSupprimerEntites(session)) {
    return { ok: false, message: "Seul un administrateur peut supprimer définitivement une entité." };
  }

  // Re-vérifie la règle de blocage à l'exécution (l'état a pu changer depuis
  // l'ouverture du drawer), avec le MÊME message que l'affichage.
  const blocage = await blocageSuppression(ref);
  if (blocage) return { ok: false, message: blocage };

  switch (ref.type) {
    case "client":
      await db.delete(clients).where(eq(clients.id, ref.id));
      break;
    case "freelance":
      // Les affectations (planning) partent en cascade.
      await db.delete(freelances).where(eq(freelances.id, ref.id));
      break;
    case "mission":
      // Les affectations rattachées partent en cascade.
      await db.delete(missions).where(eq(missions.id, ref.id));
      break;
    case "projet":
      // Jalons, encaissements et décaissements partent en cascade.
      await db.delete(projets).where(eq(projets.id, ref.id));
      break;
    default:
      return { ok: false, message: "Cette entité ne peut pas être supprimée." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
