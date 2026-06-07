import { describe, it, expect } from "vitest";
import { statutMission } from "./statut-mission";

const aujourdhui = "2026-06-07";

describe("statut d'une mission", () => {
  it("est 'à venir' si elle commence après aujourd'hui", () => {
    expect(statutMission("2026-09-01", null, aujourdhui)).toBe("à venir");
  });

  it("est 'en cours' si elle a commencé et n'a pas de fin", () => {
    expect(statutMission("2026-01-01", null, aujourdhui)).toBe("en cours");
  });

  it("est 'en cours' si la date de fin n'est pas encore passée", () => {
    expect(statutMission("2026-01-01", "2026-12-31", aujourdhui)).toBe("en cours");
  });

  it("est 'terminée' si la date de fin est passée", () => {
    expect(statutMission("2026-01-01", "2026-05-31", aujourdhui)).toBe("terminée");
  });
});
