import { describe, it, expect } from "vitest";
import {
  moisDeDate,
  moisCourantDe,
  estGagneeDuMois,
  estGagneeArchivee,
  separerGagneesArchivees,
} from "./gagnees";

const gagnee = (dateGagne: string | null) => ({ statut: "gagne", dateGagne });

describe("opportunités gagnées — cycle de vie mensuel", () => {
  it("extrait le mois 'YYYY-MM' d'une date", () => {
    expect(moisDeDate("2026-05-12")).toBe("2026-05");
  });

  it("dérive le mois courant (UTC) d'un instant", () => {
    expect(moisCourantDe(new Date("2026-06-16T09:30:00Z"))).toBe("2026-06");
  });

  describe("estGagneeDuMois", () => {
    it("vrai pour une gagnée signée le mois courant", () => {
      expect(estGagneeDuMois(gagnee("2026-06-03"), "2026-06")).toBe(true);
    });
    it("faux pour une gagnée d'un mois révolu", () => {
      expect(estGagneeDuMois(gagnee("2026-05-30"), "2026-06")).toBe(false);
    });
    it("garde une gagnée sans date sur le tableau (du mois)", () => {
      expect(estGagneeDuMois(gagnee(null), "2026-06")).toBe(true);
    });
    it("faux si l'opportunité n'est pas gagnée", () => {
      expect(estGagneeDuMois({ statut: "en_discussion", dateGagne: "2026-06-03" }, "2026-06")).toBe(
        false
      );
    });
  });

  describe("estGagneeArchivee", () => {
    it("vrai uniquement pour une gagnée d'un mois strictement antérieur", () => {
      expect(estGagneeArchivee(gagnee("2026-05-30"), "2026-06")).toBe(true);
      expect(estGagneeArchivee(gagnee("2026-06-01"), "2026-06")).toBe(false);
    });
    it("faux pour une gagnée sans date (jamais archivée automatiquement)", () => {
      expect(estGagneeArchivee(gagnee(null), "2026-06")).toBe(false);
    });
    it("faux pour une non-gagnée, même ancienne", () => {
      expect(estGagneeArchivee({ statut: "perdu", dateGagne: "2025-01-01" }, "2026-06")).toBe(false);
    });
    it("ne dépend pas du jour, seulement du mois", () => {
      expect(estGagneeArchivee(gagnee("2026-06-30"), "2026-06")).toBe(false);
    });
  });

  describe("separerGagneesArchivees", () => {
    it("range les gagnées des mois révolus dans 'archivees', le reste dans 'tableau'", () => {
      const opps = [
        { id: 1, statut: "gagne", dateGagne: "2026-06-02" }, // ce mois → tableau
        { id: 2, statut: "gagne", dateGagne: "2026-04-15" }, // révolu → archivée
        { id: 3, statut: "a_qualifier", dateGagne: null }, // pipeline → tableau
        { id: 4, statut: "gagne", dateGagne: null }, // gagnée sans date → tableau
        { id: 5, statut: "gagne", dateGagne: "2026-05-31" }, // révolu → archivée
      ];
      const { tableau, archivees } = separerGagneesArchivees(opps, "2026-06");
      expect(tableau.map((o) => o.id)).toEqual([1, 3, 4]);
      expect(archivees.map((o) => o.id)).toEqual([2, 5]);
    });

    it("ne perd aucune opportunité (partition complète)", () => {
      const opps = [
        { id: 1, statut: "gagne", dateGagne: "2026-04-15" },
        { id: 2, statut: "gagne", dateGagne: "2026-06-02" },
      ];
      const { tableau, archivees } = separerGagneesArchivees(opps, "2026-06");
      expect(tableau.length + archivees.length).toBe(opps.length);
    });
  });
});
