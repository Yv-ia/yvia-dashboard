import { describe, it, expect } from "vitest";
import {
  projeterRecurrent,
  totaliserProjection,
  type PlanningMensuel,
} from "./previsionnel";

const HORIZON = ["2026-01", "2026-02", "2026-03", "2026-04"];

describe("projeterRecurrent", () => {
  it("RUN/licence : estimation récurrente chaque mois (coût manuel)", () => {
    const points = projeterRecurrent(
      { categorie: "run", montantRecurrent: 1000, coutRecurrent: 300, dateDebut: "2026-01-01", dateFin: null },
      new Map(),
      HORIZON
    );
    expect(points).toHaveLength(4);
    expect(points.every((p) => p.source === "estimation")).toBe(true);
    expect(points[0]).toMatchObject({ revenu: 1000, cout: 300, marge: 700 });
  });

  it("régie : utilise le planning réel quand il existe, l'estimation sinon", () => {
    const planning: PlanningMensuel = new Map([
      ["2026-02", { vente: 2200, cout: 1500 }], // mois planifié
    ]);
    const points = projeterRecurrent(
      { categorie: "regie", montantRecurrent: 2000, coutRecurrent: null, dateDebut: "2026-01-01", dateFin: null },
      planning,
      HORIZON
    );
    const fev = points.find((p) => p.mois === "2026-02")!;
    expect(fev).toMatchObject({ revenu: 2200, cout: 1500, marge: 700, source: "planning" });
    // Mois sans planning → estimation (coût régie inconnu hors planning = 0).
    const jan = points.find((p) => p.mois === "2026-01")!;
    expect(jan).toMatchObject({ revenu: 2000, cout: 0, source: "estimation" });
  });

  it("ignore le planning pour un RUN (pas d'affectation attendue)", () => {
    const planning: PlanningMensuel = new Map([["2026-01", { vente: 9999, cout: 9999 }]]);
    const points = projeterRecurrent(
      { categorie: "run", montantRecurrent: 500, coutRecurrent: 100, dateDebut: "2026-01-01", dateFin: null },
      planning,
      HORIZON
    );
    expect(points[0]).toMatchObject({ revenu: 500, source: "estimation" });
  });

  it("respecte la fenêtre [dateDebut, dateFin]", () => {
    const points = projeterRecurrent(
      { categorie: "run", montantRecurrent: 100, coutRecurrent: 0, dateDebut: "2026-02-01", dateFin: "2026-03-31" },
      new Map(),
      HORIZON
    );
    expect(points.map((p) => p.mois)).toEqual(["2026-02", "2026-03"]);
  });

  it("dateFin null = projeté sur tout l'horizon", () => {
    const points = projeterRecurrent(
      { categorie: "licence", montantRecurrent: 100, coutRecurrent: 0, dateDebut: "2025-01-01", dateFin: null },
      new Map(),
      HORIZON
    );
    expect(points).toHaveLength(4);
  });
});

describe("totaliserProjection", () => {
  it("somme revenu, coût et marge", () => {
    const total = totaliserProjection([
      { mois: "2026-01", revenu: 1000, cout: 300, marge: 700, source: "estimation" },
      { mois: "2026-02", revenu: 1000, cout: 300, marge: 700, source: "estimation" },
    ]);
    expect(total).toEqual({ revenu: 2000, cout: 600, marge: 1400 });
  });
});
