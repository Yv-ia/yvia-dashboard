import { describe, expect, test } from "vitest";
import { agregerRegieMensuelle, type AffectationRegie } from "./regie-mensuelle";

// Un jour d'affectation = un TJM. Deux clients, dont un avec deux missions.
const aff = (over: Partial<AffectationRegie>): AffectationRegie => ({
  clientId: 1,
  clientNom: "DeltaRM",
  missionId: 10,
  missionNom: "Mission A",
  freelanceId: 100,
  freelancePrenom: "Jules",
  freelanceNom: "Bertrand",
  tjmVente: "500",
  tjmAchat: "400",
  ...over,
});

describe("agregerRegieMensuelle", () => {
  test("somme le CA / coût / marge par client et par mission", () => {
    const synthese = agregerRegieMensuelle([
      aff({}), // DeltaRM / Mission A : 1 jour
      aff({}), // DeltaRM / Mission A : 1 jour (2 jours au total)
      aff({ missionId: 11, missionNom: "Mission B", freelanceId: 101, freelanceNom: "Zoe", freelancePrenom: "A" }),
      aff({ clientId: 2, clientNom: "Acme", missionId: 20, missionNom: "Mission C", tjmVente: "1000", tjmAchat: "600" }),
    ]);

    expect(synthese.totalCa).toBe(500 * 3 + 1000); // 2500
    expect(synthese.totalCout).toBe(400 * 3 + 600); // 1800
    expect(synthese.totalMarge).toBe(700);

    // Tri alphabétique des clients : Acme avant DeltaRM.
    expect(synthese.groupes.map((g) => g.clientNom)).toEqual(["Acme", "DeltaRM"]);

    const delta = synthese.groupes.find((g) => g.clientNom === "DeltaRM")!;
    expect(delta.jours).toBe(3);
    expect(delta.ca).toBe(1500);
    const missionA = delta.missions.find((m) => m.missionId === 10)!;
    expect(missionA.jours).toBe(2);
    expect(missionA.ca).toBe(1000);
  });

  test("coût et marge à 0 quand le TJM achat est absent (commercial)", () => {
    const synthese = agregerRegieMensuelle([
      aff({ tjmAchat: undefined }),
      aff({ tjmAchat: undefined }),
    ]);
    expect(synthese.totalCa).toBe(1000);
    expect(synthese.totalCout).toBe(0);
    expect(synthese.totalMarge).toBe(1000);
  });

  test("aucune affectation → synthèse vide", () => {
    const synthese = agregerRegieMensuelle([]);
    expect(synthese.groupes).toEqual([]);
    expect(synthese.totalCa).toBe(0);
  });
});
