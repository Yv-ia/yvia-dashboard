import { describe, it, expect } from "vitest";
import {
  normaliserCategorieRecurrent,
  labelCategorieRecurrent,
  coutDerivePlanning,
  CATEGORIE_RECURRENT_DEFAUT,
} from "./categorie";

describe("catégorie de récurrent", () => {
  it("normalise les catégories connues", () => {
    expect(normaliserCategorieRecurrent("regie")).toBe("regie");
    expect(normaliserCategorieRecurrent("run")).toBe("run");
    expect(normaliserCategorieRecurrent("licence")).toBe("licence");
  });

  it("retombe sur le défaut (regie) pour une valeur inconnue", () => {
    expect(normaliserCategorieRecurrent("xxx")).toBe(CATEGORIE_RECURRENT_DEFAUT);
    expect(normaliserCategorieRecurrent(null)).toBe("regie");
  });

  it("traduit en libellé", () => {
    expect(labelCategorieRecurrent("run")).toBe("RUN / Maintenance");
  });

  it("coût dérivé du planning seulement pour la régie", () => {
    expect(coutDerivePlanning("regie")).toBe(true);
    expect(coutDerivePlanning("run")).toBe(false);
    expect(coutDerivePlanning("licence")).toBe(false);
  });
});
