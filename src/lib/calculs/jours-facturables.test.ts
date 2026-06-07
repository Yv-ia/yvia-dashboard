import { describe, it, expect } from "vitest";
import { joursFacturables } from "./jours-facturables";

// Rappel : juillet 2026 compte 22 jours ouvrés (le 14 juillet est un mardi férié).

describe("jours facturables", () => {
  it("plein temps, mois entier, sans absence = tous les jours ouvrés", () => {
    expect(
      joursFacturables({ annee: 2026, mois: 7, dateDebut: "2026-01-01", joursParSemaine: 5 })
    ).toBe(22);
  });

  it("temps partiel 3 j/semaine applique le ratio 3/5", () => {
    // 22 × 3/5 = 13,2
    expect(
      joursFacturables({ annee: 2026, mois: 7, dateDebut: "2026-01-01", joursParSemaine: 3 })
    ).toBe(13.2);
  });

  it("retire les jours d'absence (demi-journée comprise)", () => {
    // 22 − 2,5 = 19,5
    expect(
      joursFacturables({
        annee: 2026,
        mois: 7,
        dateDebut: "2026-01-01",
        joursParSemaine: 5,
        joursAbsence: 2.5,
      })
    ).toBe(19.5);
  });

  it("prorata réel quand la mission commence en cours de mois", () => {
    // Mission débutant le lundi 13 juillet : il reste 14 jours ouvrés en juillet.
    expect(
      joursFacturables({ annee: 2026, mois: 7, dateDebut: "2026-07-13", joursParSemaine: 5 })
    ).toBe(14);
  });

  it("renvoie 0 si la mission ne couvre pas le mois demandé", () => {
    // Mission terminée fin juin : rien à facturer en juillet.
    expect(
      joursFacturables({
        annee: 2026,
        mois: 7,
        dateDebut: "2026-01-01",
        dateFin: "2026-06-30",
        joursParSemaine: 5,
      })
    ).toBe(0);
  });

  it("ne descend jamais en dessous de 0, même avec beaucoup d'absences", () => {
    expect(
      joursFacturables({
        annee: 2026,
        mois: 7,
        dateDebut: "2026-01-01",
        joursParSemaine: 5,
        joursAbsence: 30,
      })
    ).toBe(0);
  });
});
