import { describe, it, expect } from "vitest";
import {
  joursOuvres,
  joursOuvresDuMois,
  premierJourDuMois,
  dernierJourDuMois,
} from "./jours-ouvres";

describe("bornes d'un mois", () => {
  it("trouve le premier et le dernier jour", () => {
    expect(premierJourDuMois(2026, 7)).toBe("2026-07-01");
    expect(dernierJourDuMois(2026, 7)).toBe("2026-07-31");
    expect(dernierJourDuMois(2026, 2)).toBe("2026-02-28"); // 2026 n'est pas bissextile
  });
});

describe("jours ouvrés", () => {
  it("compte les jours ouvrés de juillet 2026 (le 14 juillet est un mardi férié)", () => {
    // 31 jours, 8 jours de week-end, 1 jour férié -> 22 jours ouvrés.
    expect(joursOuvresDuMois(2026, 7)).toBe(22);
  });

  it("compte sur un intervalle qui contient un jour férié", () => {
    // Du lundi 13 au vendredi 17 juillet : 5 jours en semaine, moins le 14 (férié) = 4.
    expect(joursOuvres("2026-07-13", "2026-07-17")).toBe(4);
  });

  it("renvoie 0 pour un week-end seul", () => {
    // Samedi 4 et dimanche 5 juillet 2026.
    expect(joursOuvres("2026-07-04", "2026-07-05")).toBe(0);
  });

  it("renvoie 0 pour un intervalle vide (début après fin)", () => {
    expect(joursOuvres("2026-07-20", "2026-07-10")).toBe(0);
  });
});
