import { describe, it, expect } from "vitest";
import {
  normaliserStatutClient,
  labelStatutClient,
  estClientSigne,
  STATUT_CLIENT_DEFAUT,
} from "./statut";

describe("normaliserStatutClient", () => {
  it("conserve une valeur connue", () => {
    expect(normaliserStatutClient("signe")).toBe("signe");
    expect(normaliserStatutClient("lead")).toBe("lead");
  });

  it("retombe sur le défaut pour une valeur inconnue / vide", () => {
    expect(normaliserStatutClient("n_importe_quoi")).toBe(STATUT_CLIENT_DEFAUT);
    expect(normaliserStatutClient("")).toBe(STATUT_CLIENT_DEFAUT);
    expect(normaliserStatutClient(null)).toBe(STATUT_CLIENT_DEFAUT);
    expect(normaliserStatutClient(undefined)).toBe(STATUT_CLIENT_DEFAUT);
  });
});

describe("labelStatutClient", () => {
  it("traduit les statuts", () => {
    expect(labelStatutClient("lead")).toBe("Lead");
    expect(labelStatutClient("signe")).toBe("Signé");
  });
});

describe("estClientSigne", () => {
  it("vrai uniquement pour 'signe'", () => {
    expect(estClientSigne("signe")).toBe(true);
    expect(estClientSigne("lead")).toBe(false);
    expect(estClientSigne(null)).toBe(false);
  });
});
