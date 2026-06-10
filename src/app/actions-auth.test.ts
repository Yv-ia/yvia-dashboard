// Test de sécurité (contrôle d'accès).
//
// Le middleware ne protège PAS les Server Actions : une action est résolue par son
// identifiant (en-tête `Next-Action`), pas par l'URL, donc elle est invocable par un
// attaquant non authentifié via un POST sur une route publique (/login, /invitation/*).
// CHAQUE action de mutation doit donc vérifier la session elle-même.
//
// Propriété vérifiée : sans session, l'action refuse (ok:false) et n'accède JAMAIS à la
// base ; avec une session, elle s'exécute (accède à la base).

import { describe, test, expect, beforeEach, vi } from "vitest";

// Mocks partagés, hoistés pour être disponibles dans les usines `vi.mock`.
const { db, getSession, revalidatePath } = vi.hoisted(() => {
  // Chaîne de requête factice : `.from().where().values()...` renvoie elle-même,
  // et un `await` se résout en `[]` (aucune connexion réelle à PostgreSQL).
  const makeQuery = () => {
    const proxy: unknown = new Proxy(function () {}, {
      get(_cible, prop) {
        if (prop === "then") return (resoudre: (v: unknown) => void) => resoudre([]);
        return () => proxy;
      },
      apply: () => proxy,
    });
    return proxy;
  };
  return {
    db: {
      insert: vi.fn(() => makeQuery()),
      update: vi.fn(() => makeQuery()),
      delete: vi.fn(() => makeQuery()),
      select: vi.fn(() => makeQuery()),
      transaction: vi.fn(async (cb: (tx: unknown) => unknown) => {
        await cb(makeQuery());
      }),
    },
    getSession: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/db", () => ({ db }));
vi.mock("@/lib/auth/server", () => ({ getSession }));
vi.mock("next/cache", () => ({ revalidatePath }));

import * as clients from "@/app/clients/actions";
import * as freelances from "@/app/freelances/actions";
import * as missions from "@/app/missions/actions";
import * as projets from "@/app/projets/actions";
import * as planning from "@/app/planning-actions";

function fd(champs: Record<string, string | number>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, String(v));
  return f;
}

type Resultat = { ok: boolean; message?: string };

// Chaque appel utilise des ENTRÉES VALIDES : en l'absence de garde d'authentification,
// l'action atteindrait forcément la base (insert/update/delete/select/transaction).
const ACTIONS: { nom: string; appel: () => Promise<Resultat> }[] = [
  { nom: "clients.creerClient", appel: () => clients.creerClient(fd({ nom: "ACME" })) },
  { nom: "clients.modifierClient", appel: () => clients.modifierClient(fd({ id: 1, nom: "ACME" })) },
  { nom: "clients.basculerActifClient", appel: () => clients.basculerActifClient(fd({ id: 1, actif: "true" })) },

  { nom: "freelances.creerFreelance", appel: () => freelances.creerFreelance(fd({ prenom: "Jean", nom: "Dupont" })) },
  { nom: "freelances.modifierFreelance", appel: () => freelances.modifierFreelance(fd({ id: 1, prenom: "Jean", nom: "Dupont" })) },
  { nom: "freelances.basculerActif", appel: () => freelances.basculerActif(fd({ id: 1, actif: "true" })) },

  { nom: "missions.creerMission", appel: () => missions.creerMission(fd({ freelanceId: 1, clientId: 1, nom: "M", tjmAchat: "100", tjmVente: "200" })) },
  { nom: "missions.modifierMission", appel: () => missions.modifierMission(fd({ id: 1, freelanceId: 1, clientId: 1, nom: "M", tjmAchat: "100", tjmVente: "200" })) },
  { nom: "missions.basculerActifMission", appel: () => missions.basculerActifMission(fd({ id: 1, actif: "true" })) },

  { nom: "projets.creerProjet", appel: () => projets.creerProjet(fd({ clientId: 1, nom: "P", budget: "1000" })) },
  { nom: "projets.modifierProjet", appel: () => projets.modifierProjet(fd({ id: 1, clientId: 1, nom: "P", budget: "1000" })) },
  { nom: "projets.basculerActifProjet", appel: () => projets.basculerActifProjet(fd({ id: 1, actif: "true" })) },
  { nom: "projets.ajouterEncaissement", appel: () => projets.ajouterEncaissement(fd({ projetId: 1, date: "2026-01-05", montant: "100", statut: "encaisse" })) },
  { nom: "projets.supprimerEncaissement", appel: () => projets.supprimerEncaissement(fd({ id: 1 })) },
  { nom: "projets.ajouterDecaissement", appel: () => projets.ajouterDecaissement(fd({ projetId: 1, freelanceId: 1, date: "2026-01-05", montant: "100", statut: "decaisse" })) },
  { nom: "projets.supprimerDecaissement", appel: () => projets.supprimerDecaissement(fd({ id: 1 })) },
  { nom: "projets.marquerEncaissementRealise", appel: () => projets.marquerEncaissementRealise(fd({ id: 1 })) },
  { nom: "projets.marquerDecaissementRealise", appel: () => projets.marquerDecaissementRealise(fd({ id: 1 })) },
  { nom: "projets.definirFiabiliteClient", appel: () => projets.definirFiabiliteClient(fd({ clientId: 1 })) },
  { nom: "projets.definirFiabiliteProjet", appel: () => projets.definirFiabiliteProjet(fd({ projetId: 1 })) },
  { nom: "projets.ajouterJalon", appel: () => projets.ajouterJalon(fd({ projetId: 1, date: "2026-01-05", libelle: "Kickoff" })) },
  { nom: "projets.supprimerJalon", appel: () => projets.supprimerJalon(fd({ id: 1 })) },

  { nom: "planning.affecterJours", appel: () => planning.affecterJours(1, 1, ["2026-01-05"]) },
  { nom: "planning.etendreAuMoisSuivant", appel: () => planning.etendreAuMoisSuivant(2026, 1) },
  { nom: "planning.modifierTjmAffectation", appel: () => planning.modifierTjmAffectation(1, "2026-01-05", "100", "200") },
  { nom: "planning.libererJours", appel: () => planning.libererJours(1, ["2026-01-05"]) },
];

function nbAppelsBdd(): number {
  return (
    db.insert.mock.calls.length +
    db.update.mock.calls.length +
    db.delete.mock.calls.length +
    db.select.mock.calls.length +
    db.transaction.mock.calls.length
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Server Actions de mutation — contrôle d'accès", () => {
  describe("sans session : refus et aucun accès à la base", () => {
    beforeEach(() => {
      getSession.mockResolvedValue(null);
    });

    test.each(ACTIONS)("$nom refuse et ne touche pas la base", async ({ appel }) => {
      const res = await appel();
      expect(res.ok).toBe(false);
      expect(nbAppelsBdd()).toBe(0);
    });
  });

  describe("avec session : l'action s'exécute et accède à la base", () => {
    beforeEach(() => {
      getSession.mockResolvedValue({ userId: 1, email: "a@b.c", exp: Date.now() + 1_000_000 });
    });

    test.each(ACTIONS)("$nom accède à la base quand l'utilisateur est connecté", async ({ appel }) => {
      await appel();
      expect(nbAppelsBdd()).toBeGreaterThan(0);
    });
  });
});
