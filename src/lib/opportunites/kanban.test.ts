import { describe, it, expect } from "vitest";
import { grouperParStatut } from "./kanban";

const opp = (id: number, statut: string, ordre: number) => ({ id, statut, ordre });

describe("grouperParStatut", () => {
  it("crée une colonne par statut, dans l'ordre du pipeline", () => {
    const cols = grouperParStatut([]);
    expect(cols.map((c) => c.statut)).toEqual([
      "a_qualifier",
      "en_discussion",
      "proposition_envoyee",
      "gagne",
      "perdu",
    ]);
  });

  it("range chaque opportunité dans sa colonne, triée par ordre", () => {
    const cols = grouperParStatut([
      opp(1, "en_discussion", 2),
      opp(2, "en_discussion", 1),
      opp(3, "gagne", 0),
    ]);
    const enDiscussion = cols.find((c) => c.statut === "en_discussion")!;
    expect(enDiscussion.items.map((o) => o.id)).toEqual([2, 1]); // trié par ordre
    expect(cols.find((c) => c.statut === "gagne")!.items.map((o) => o.id)).toEqual([3]);
    expect(cols.find((c) => c.statut === "a_qualifier")!.items).toEqual([]);
  });

  it("place un statut inconnu dans la colonne par défaut (a_qualifier)", () => {
    const cols = grouperParStatut([opp(9, "bidon", 0)]);
    expect(cols.find((c) => c.statut === "a_qualifier")!.items.map((o) => o.id)).toEqual([9]);
  });
});
