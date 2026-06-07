import { describe, it, expect } from "vitest";
import { tarifDuMois, type PeriodeTarif } from "./tarif-du-mois";

// Une mission à 600 € de vente depuis mars, renégociée à 650 € à partir de juillet.
const tarifs: PeriodeTarif[] = [
  { moisEffet: "2026-03-01", tjmAchat: 500, tjmVente: 600 },
  { moisEffet: "2026-07-01", tjmAchat: 520, tjmVente: 650 },
];

describe("tarif applicable à un mois", () => {
  it("utilise l'ancien tarif avant le changement", () => {
    expect(tarifDuMois(tarifs, 2026, 5)?.tjmVente).toBe(600); // mai -> 600
  });

  it("utilise le nouveau tarif le mois du changement", () => {
    expect(tarifDuMois(tarifs, 2026, 7)?.tjmVente).toBe(650); // juillet -> 650
  });

  it("conserve le nouveau tarif les mois suivants", () => {
    expect(tarifDuMois(tarifs, 2026, 9)?.tjmVente).toBe(650); // septembre -> 650
  });

  it("renvoie null si aucun tarif n'est encore en vigueur", () => {
    expect(tarifDuMois(tarifs, 2026, 1)).toBeNull(); // janvier -> avant le 1er tarif
  });
});
