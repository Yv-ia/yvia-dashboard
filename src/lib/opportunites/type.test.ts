import { describe, it, expect } from "vitest";
import {
  normaliserTypeOpportunite,
  labelTypeOpportunite,
  TYPE_OPPORTUNITE_DEFAUT,
} from "./type";

describe("type d'opportunité", () => {
  it("normalise les types connus", () => {
    expect(normaliserTypeOpportunite("forfait")).toBe("forfait");
    expect(normaliserTypeOpportunite("recurrent")).toBe("recurrent");
  });

  it("retombe sur le défaut (forfait) pour une valeur inconnue ou vide", () => {
    expect(normaliserTypeOpportunite("autre")).toBe(TYPE_OPPORTUNITE_DEFAUT);
    expect(normaliserTypeOpportunite(null)).toBe("forfait");
    expect(normaliserTypeOpportunite(undefined)).toBe("forfait");
  });

  it("traduit en libellé français", () => {
    expect(labelTypeOpportunite("forfait")).toBe("Forfait");
    expect(labelTypeOpportunite("recurrent")).toBe("Récurrent");
  });
});
