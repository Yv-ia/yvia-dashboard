import { describe, it, expect } from "vitest";
import { joursFeries, estJourFerie } from "./jours-feries";

describe("jours fériés français", () => {
  it("donne les 11 jours fériés de 2026 (dont les jours mobiles liés à Pâques)", () => {
    expect(joursFeries(2026)).toEqual([
      "2026-01-01", // Jour de l'An
      "2026-04-06", // Lundi de Pâques
      "2026-05-01", // Fête du Travail
      "2026-05-08", // Victoire 1945
      "2026-05-14", // Ascension
      "2026-05-25", // Lundi de Pentecôte
      "2026-07-14", // Fête nationale
      "2026-08-15", // Assomption
      "2026-11-01", // Toussaint
      "2026-11-11", // Armistice
      "2026-12-25", // Noël
    ]);
  });

  it("calcule aussi une autre année (2025) avec son propre Pâques", () => {
    // En 2025, Pâques tombe le 20 avril -> lundi de Pâques le 21 avril.
    const feries2025 = joursFeries(2025);
    expect(feries2025).toContain("2025-04-21"); // Lundi de Pâques
    expect(feries2025).toContain("2025-05-29"); // Ascension
    expect(feries2025).toHaveLength(11);
  });

  it("reconnaît un jour férié et un jour normal", () => {
    expect(estJourFerie("2026-07-14")).toBe(true); // Fête nationale
    expect(estJourFerie("2026-07-15")).toBe(false); // lendemain, jour normal
  });
});
