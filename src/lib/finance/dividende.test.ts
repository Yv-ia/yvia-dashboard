import { describe, it, expect } from "vitest";
import { calculerIS, calculerDividende, IS_SEUIL_REDUIT } from "./dividende";

describe("IS au barème (15 % / 25 %)", () => {
  it("taux réduit seul sous le seuil", () => {
    const is = calculerIS(40_000);
    expect(is.partReduite).toBe(6_000); // 40 000 × 15 %
    expect(is.partNormale).toBe(0);
    expect(is.total).toBe(6_000);
  });

  it("barème mixte au-delà du seuil", () => {
    const is = calculerIS(100_000);
    expect(is.partReduite).toBe(IS_SEUIL_REDUIT * 0.15); // 6 375
    expect(is.partNormale).toBe((100_000 - IS_SEUIL_REDUIT) * 0.25); // 14 375
    expect(is.total).toBe(6_375 + 14_375);
  });

  it("nul ou négatif → 0", () => {
    expect(calculerIS(0).total).toBe(0);
    expect(calculerIS(-5_000).total).toBe(0);
  });
});

describe("dividende remontable (post-IS + mère-fille)", () => {
  it("résultat négatif → aucun dividende", () => {
    const d = calculerDividende({ margeBrute: 30_000, fraisStructure: 50_000 });
    expect(d.resultatAvantIS).toBe(-20_000);
    expect(d.isSociete).toBe(0);
    expect(d.dividendeNet).toBe(0);
  });

  it("cas nominal : marge 200k, frais 50k", () => {
    const d = calculerDividende({ margeBrute: 200_000, fraisStructure: 50_000 });
    expect(d.resultatAvantIS).toBe(150_000);
    // IS : 42 500 × 15 % + 107 500 × 25 % = 6 375 + 26 875 = 33 250
    expect(d.isSociete).toBe(33_250);
    expect(d.resultatApresIS).toBe(116_750);
    // mère-fille : quote-part 5 % = 5 837,5 ; IS holding (15 %) = 875,625 → 875,63
    expect(d.quotePartMereFille).toBe(5_837.5);
    expect(d.isHolding).toBe(875.63);
    expect(d.dividendeNet).toBe(116_750 - 875.63);
  });

  it("la quote-part mère-fille réduit bien le dividende net", () => {
    const d = calculerDividende({ margeBrute: 100_000, fraisStructure: 0 });
    expect(d.resultatApresIS).toBeGreaterThan(d.dividendeNet);
    expect(d.dividendeNet).toBeLessThan(d.resultatApresIS);
  });
});
