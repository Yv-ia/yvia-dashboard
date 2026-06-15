import { describe, expect, test } from "vitest";
import { calculerPrevisionnel12Mois } from "./previsionnel-calculs";

describe("calculerPrevisionnel12Mois", () => {
  test("Régie : réel du planning sinon hypothèse macro ; Forfait : booking par date de signature", () => {
    const { lignes, totaux } = calculerPrevisionnel12Mois({
      annee: 2026,
      affectations: [
        { date: "2026-01-05", tjmVente: "500" },
        { date: "2026-01-06", tjmVente: "500" }, // régie janvier réel = 1000
      ],
      // Hypothèse macro DeltaRM : 25k/mois de janvier à mars.
      recurrentsRegie: [
        {
          categorie: "regie",
          montantRecurrent: 25000,
          coutRecurrent: null,
          dateDebut: "2026-01-01",
          dateFin: "2026-03-31",
        },
      ],
      recurrentsNonRegie: [
        {
          categorie: "run",
          montantRecurrent: 2000,
          coutRecurrent: null,
          dateDebut: "2026-01-01",
          dateFin: null,
        },
      ],
      forfaitsGagnes: [
        { dateGagne: "2026-02-10", montant: "30000" }, // booké en février
        { dateGagne: null, montant: "9999" }, // pas signé → ignoré
      ],
    });

    expect(lignes).toHaveLength(12);
    // Janvier : planning réel (1000) prime sur le macro (25000).
    expect(lignes[0].regie).toBe(1000);
    // Février & mars : pas de planning → macro 25000.
    expect(lignes[1].regie).toBe(25000);
    expect(lignes[2].regie).toBe(25000);
    // Avril : hors période macro et sans planning → 0.
    expect(lignes[3].regie).toBe(0);

    expect(lignes[1].forfait).toBe(30000); // février
    expect(lignes[0].forfait).toBe(0);
    expect(totaux.forfait).toBe(30000);

    expect(lignes[0].recurrence).toBe(2000);
    expect(totaux.recurrence).toBe(2000 * 12);

    expect(lignes[1].total).toBe(25000 + 30000 + 2000);
  });

  test("aucune donnée → 12 lignes à zéro", () => {
    const { lignes, totaux } = calculerPrevisionnel12Mois({
      annee: 2026,
      affectations: [],
      recurrentsRegie: [],
      recurrentsNonRegie: [],
      forfaitsGagnes: [],
    });
    expect(lignes).toHaveLength(12);
    expect(totaux.total).toBe(0);
  });
});
