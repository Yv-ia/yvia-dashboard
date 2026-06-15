import { describe, expect, test } from "vitest";
import { calculerPrevisionnel12Mois } from "./previsionnel-calculs";

describe("calculerPrevisionnel12Mois", () => {
  test("ventile Régie / Récurrence / Forfait par mois sur 12 colonnes", () => {
    const { lignes, totaux } = calculerPrevisionnel12Mois({
      annee: 2026,
      affectations: [
        { date: "2026-01-05", tjmVente: "500" },
        { date: "2026-01-06", tjmVente: "500" }, // régie janvier = 1000
        { date: "2026-03-10", tjmVente: "700" }, // régie mars = 700
      ],
      encaissements: [
        { date: "2026-01-31", montant: "10000" }, // forfait janvier (encaissé + prévu confondus)
        { date: "2026-02-28", montant: "5000" }, // forfait février
      ],
      recurrents: [
        // RUN à 2000 €/mois, en cours toute l'année.
        {
          categorie: "run",
          montantRecurrent: 2000,
          coutRecurrent: null,
          dateDebut: "2026-01-01",
          dateFin: null,
        },
      ],
    });

    expect(lignes).toHaveLength(12);
    const janvier = lignes[0];
    expect(janvier.mois).toBe("2026-01");
    expect(janvier.regie).toBe(1000);
    expect(janvier.forfait).toBe(10000);
    expect(janvier.recurrence).toBe(2000);
    expect(janvier.total).toBe(13000);

    expect(lignes[2].regie).toBe(700); // mars

    expect(totaux.regie).toBe(1700);
    expect(totaux.forfait).toBe(15000);
    expect(totaux.recurrence).toBe(2000 * 12); // 24000
    expect(totaux.total).toBe(1700 + 15000 + 24000);
  });

  test("un récurrent démarré en cours d'année ne compte que ses mois actifs", () => {
    const { totaux } = calculerPrevisionnel12Mois({
      annee: 2026,
      affectations: [],
      encaissements: [],
      recurrents: [
        {
          categorie: "licence",
          montantRecurrent: 1000,
          coutRecurrent: null,
          dateDebut: "2026-10-01", // oct, nov, déc = 3 mois
          dateFin: null,
        },
      ],
    });
    expect(totaux.recurrence).toBe(3000);
  });
});
