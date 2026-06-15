import { describe, it, expect } from "vitest";
import { calculerIndicateursMois } from "./indicateurs";

const debutMois = "2026-06-01";
const finMois = "2026-06-30";

describe("indicateurs de rentabilité du mois", () => {
  it("agrège régie et forfait, et compte les clients actifs distincts", () => {
    const res = calculerIndicateursMois({
      regie: [
        { clientId: 1, date: "2026-06-02", tjmVente: 500, tjmAchat: 300 },
        { clientId: 1, date: "2026-06-03", tjmVente: 500, tjmAchat: 300 },
        { clientId: 2, date: "2026-06-04", tjmVente: 600, tjmAchat: 400 },
      ],
      encaissements: [{ clientId: 3, date: "2026-06-10", montant: 1000 }],
      decaissements: [{ clientId: 3, date: "2026-06-12", montant: 200 }],
      debutMois,
      finMois,
    });
    // CA = 500+500+600 + 1000 = 2600 ; coût = 300+300+400 + 200 = 1200
    expect(res.caTotal).toBe(2600);
    expect(res.coutTotal).toBe(1200);
    expect(res.margeBrute).toBe(1400);
    // clients actifs = {1, 2, 3}
    expect(res.clientsActifs).toBe(3);
    expect(res.caParClient).toBe(arrondi(2600 / 3));
  });

  it("ignore ce qui est hors du mois", () => {
    const res = calculerIndicateursMois({
      regie: [{ clientId: 1, date: "2026-05-31", tjmVente: 500, tjmAchat: 300 }],
      encaissements: [{ clientId: 2, date: "2026-07-01", montant: 1000 }],
      decaissements: [],
      debutMois,
      finMois,
    });
    expect(res.caTotal).toBe(0);
    expect(res.clientsActifs).toBe(0);
    expect(res.caParClient).toBe(0);
  });

  it("ne compte pas comme actif un client qui n'a qu'un coût", () => {
    const res = calculerIndicateursMois({
      regie: [],
      encaissements: [],
      decaissements: [{ clientId: 9, date: "2026-06-15", montant: 800 }],
      debutMois,
      finMois,
    });
    expect(res.clientsActifs).toBe(0);
    expect(res.coutTotal).toBe(800);
    expect(res.margeBrute).toBe(-800);
    expect(res.caParClient).toBe(0);
  });

  it("accepte les montants en chaîne (numeric Postgres)", () => {
    const res = calculerIndicateursMois({
      regie: [{ clientId: 1, date: "2026-06-02", tjmVente: "500", tjmAchat: "300" }],
      encaissements: [],
      decaissements: [],
      debutMois,
      finMois,
    });
    expect(res.caTotal).toBe(500);
    expect(res.coutTotal).toBe(300);
  });
});

const arrondi = (n: number) => Math.round(n * 100) / 100;
