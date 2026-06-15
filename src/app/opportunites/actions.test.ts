import { describe, it, expect, vi, beforeEach } from "vitest";

// Le pipeline commercial est AUTORISÉ au rôle commercial (contrairement au
// delivery). On mocke getSession (session commerciale) et une base fonctionnelle
// qui enregistre les insert/update, pour vérifier que les actions aboutissent et
// que la conversion forfait crée bien un projet.

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const enregistre: { insert: unknown[]; update: unknown[] } = { insert: [], update: [] };
let selectResult: unknown[] = [];

vi.mock("@/db", () => {
  const chaine = (kind: "insert" | "update" | "select") => {
    const obj: Record<string, unknown> = {
      from: () => obj,
      innerJoin: () => obj,
      where: () => (kind === "select" ? Promise.resolve(selectResult) : Promise.resolve(undefined)),
      orderBy: () => Promise.resolve(selectResult),
      set: (v: unknown) => {
        enregistre.update.push(v);
        return obj;
      },
      values: (v: unknown) => {
        enregistre.insert.push(v);
        return obj;
      },
      returning: () => Promise.resolve([{ id: 42 }]),
    };
    return obj;
  };
  return {
    db: {
      insert: () => chaine("insert"),
      update: () => chaine("update"),
      select: () => chaine("select"),
    },
  };
});

import {
  creerOpportunite,
  convertirOpportunite,
} from "./actions";

beforeEach(() => {
  enregistre.insert = [];
  enregistre.update = [];
  selectResult = [];
  getSession.mockReset();
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

describe("opportunités : actions autorisées au commercial", () => {
  it("creerOpportunite aboutit pour un commercial", async () => {
    const fd = new FormData();
    fd.set("clientId", "5");
    fd.set("nom", "Refonte site");
    fd.set("type", "forfait");
    fd.set("montantEstime", "12000");
    const res = await creerOpportunite(fd);
    expect(res.ok).toBe(true);
    expect(enregistre.insert).toHaveLength(1);
    expect(enregistre.insert[0]).toMatchObject({ clientId: 5, nom: "Refonte site", montantEstime: "12000" });
  });

  it("creerOpportunite refuse sans nom", async () => {
    const fd = new FormData();
    fd.set("clientId", "5");
    const res = await creerOpportunite(fd);
    expect(res.ok).toBe(false);
  });
});

describe("conversion d'une opportunité gagnée", () => {
  it("un forfait crée un projet (budget = montant estimé) et relie l'opportunité", async () => {
    selectResult = [
      { id: 1, clientId: 5, nom: "Refonte site", type: "forfait", montantEstime: "12000", projetId: null },
    ];
    const fd = new FormData();
    fd.set("id", "1");
    const res = await convertirOpportunite(fd);
    expect(res.ok).toBe(true);
    // Projet créé avec le budget repris du montant estimé.
    expect(enregistre.insert[0]).toMatchObject({ clientId: 5, nom: "Refonte site", budget: "12000" });
    // Opportunité reliée au projet et passée en "gagne".
    expect(enregistre.update[0]).toMatchObject({ statut: "gagne", projetId: 42 });
  });

  it("un récurrent crée un revenu récurrent (montant repris) et relie l'opportunité", async () => {
    selectResult = [
      { id: 2, clientId: 5, nom: "Maintenance", type: "recurrent", montantEstime: "800", projetId: null, recurrentId: null },
    ];
    const fd = new FormData();
    fd.set("id", "2");
    const res = await convertirOpportunite(fd);
    expect(res.ok).toBe(true);
    expect(enregistre.insert[0]).toMatchObject({ clientId: 5, nom: "Maintenance", montantRecurrent: "800" });
    expect(enregistre.update[0]).toMatchObject({ statut: "gagne", recurrentId: 42 });
  });
});
