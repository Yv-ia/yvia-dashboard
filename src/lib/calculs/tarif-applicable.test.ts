import { describe, it, expect } from "vitest";
import { tarifDuJour, type PeriodeTarif } from "./tarif-applicable";

// Mission à 600 € de vente, revalorisée à 650 € à partir du 15 juillet 2026.
const tarifs: PeriodeTarif[] = [
  { dateEffet: "2026-03-01", tjmAchat: 500, tjmVente: 600 },
  { dateEffet: "2026-07-15", tjmAchat: 520, tjmVente: 650 },
];

describe("tarif applicable à une date", () => {
  it("utilise l'ancien tarif avant la date de revalorisation", () => {
    expect(tarifDuJour(tarifs, "2026-07-14")?.tjmVente).toBe(600); // veille
  });

  it("utilise le nouveau tarif dès la date de revalorisation", () => {
    expect(tarifDuJour(tarifs, "2026-07-15")?.tjmVente).toBe(650); // jour J
  });

  it("conserve le nouveau tarif les jours suivants", () => {
    expect(tarifDuJour(tarifs, "2026-09-01")?.tjmVente).toBe(650);
  });

  it("renvoie null si aucun tarif n'est encore en vigueur", () => {
    expect(tarifDuJour(tarifs, "2026-01-01")).toBeNull();
  });
});
