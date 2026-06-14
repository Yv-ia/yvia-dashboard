import { describe, it, expect, vi, beforeEach } from "vitest";

// Régression sécurité (rôle commercial) : aucune Server Action de DELIVERY ne
// doit toucher la base quand l'utilisateur connecté est un commercial. On mocke
// getSession pour renvoyer une session commerciale, et la base pour qu'elle
// EXPLOSE si on l'atteint. Une action correctement gardée court-circuite avant.

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth/server", () => ({ getSession }));

vi.mock("@/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error("Un commercial ne doit pas pouvoir muter le delivery.");
      },
    }
  ),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import * as freelances from "./freelances/actions";
import * as missions from "./missions/actions";
import * as projets from "./projets/actions";
import * as planning from "./planning-actions";

beforeEach(() => {
  getSession.mockReset();
  // Session commerciale : connectée mais sans droit sur le delivery.
  getSession.mockResolvedValue({
    userId: 99,
    email: "commercial@yvia.io",
    exp: Date.now() + 60_000,
    pv: "x",
    role: "commercial",
    prenom: "Com",
    nom: "Mercial",
  });
});

const ROLE_INSUFFISANT = "Action non autorisée pour votre rôle.";

const actionsDelivery: Array<[string, (fd: FormData) => Promise<{ ok: boolean; message?: string }>]> = [
  ["freelances.creerFreelance", freelances.creerFreelance],
  ["freelances.modifierFreelance", freelances.modifierFreelance],
  ["freelances.basculerActif", freelances.basculerActif],
  ["freelances.basculerAfficherPlanning", freelances.basculerAfficherPlanning],
  ["missions.creerMission", missions.creerMission],
  ["missions.modifierMission", missions.modifierMission],
  ["missions.basculerActifMission", missions.basculerActifMission],
  ["projets.creerProjet", projets.creerProjet],
  ["projets.modifierProjet", projets.modifierProjet],
  ["projets.basculerActifProjet", projets.basculerActifProjet],
  ["projets.ajouterEncaissement", projets.ajouterEncaissement],
  ["projets.ajouterDecaissement", projets.ajouterDecaissement],
  ["projets.marquerEncaissementRealise", projets.marquerEncaissementRealise],
  ["projets.definirFiabiliteProjet", projets.definirFiabiliteProjet],
  ["projets.ajouterJalon", projets.ajouterJalon],
];

describe("Server Actions delivery : refus du rôle commercial", () => {
  it.each(actionsDelivery)("%s refuse et ne touche pas la base", async (_nom, action) => {
    const res = await action(new FormData());
    expect(res.ok).toBe(false);
    expect(res.message).toBe(ROLE_INSUFFISANT);
  });
});

describe("Server Actions planning : refus du rôle commercial", () => {
  it("affecterJours refuse et ne touche pas la base", async () => {
    const res = await planning.affecterJours(1, 1, ["2026-06-10"]);
    expect(res).toEqual({ ok: false, message: ROLE_INSUFFISANT });
  });

  it("libererJours refuse et ne touche pas la base", async () => {
    const res = await planning.libererJours(1, ["2026-06-10"]);
    expect(res).toEqual({ ok: false, message: ROLE_INSUFFISANT });
  });
});
