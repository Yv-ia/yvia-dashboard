import { describe, it, expect } from "vitest";
import { calculMissionMois, type MissionPourCalcul } from "./calcul-mission-mois";

// Mission plein temps depuis janvier 2026, tarif 500/650 dès janvier.
const mission: MissionPourCalcul = {
  dateDebut: "2026-01-01",
  dateFin: null,
  joursParSemaine: 5,
  tarifs: [{ moisEffet: "2026-01-01", tjmAchat: 500, tjmVente: 650 }],
  joursAbsence: 0,
};

describe("calcul mission + mois (agrégation)", () => {
  it("calcule jours, marge/jour et montants pour juillet 2026 (22 jours ouvrés)", () => {
    const r = calculMissionMois(mission, 2026, 7);
    expect(r.jours).toBe(22);
    expect(r.margeParJour).toBe(150);
    expect(r.ca).toBe(14300); // 22 × 650
    expect(r.cout).toBe(11000); // 22 × 500
    expect(r.marge).toBe(3300); // 22 × 150
  });

  it("déduit les absences du mois", () => {
    const r = calculMissionMois({ ...mission, joursAbsence: 2 }, 2026, 7);
    expect(r.jours).toBe(20);
    expect(r.marge).toBe(3000); // 20 × 150
  });

  it("renvoie des montants nuls si aucun tarif n'est en vigueur ce mois-là", () => {
    // Tarif effectif seulement à partir d'août : en juillet, rien à facturer.
    const r = calculMissionMois(
      { ...mission, tarifs: [{ moisEffet: "2026-08-01", tjmAchat: 500, tjmVente: 650 }] },
      2026,
      7
    );
    expect(r.tjmVente).toBeNull();
    expect(r.ca).toBe(0);
    expect(r.marge).toBe(0);
  });
});
