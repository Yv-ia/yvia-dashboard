import { describe, it, expect } from "vitest";
import {
  peutGererUtilisateurs,
  peutVoirMarges,
  peutEditerDelivery,
  peutSupprimerEntites,
  peutAccederRoute,
  labelRole,
} from "./permissions";
import type { Role } from "./session";

const r = (role: Role) => ({ role });

describe("capacités par rôle", () => {
  it("gestion des utilisateurs : admin seul", () => {
    expect(peutGererUtilisateurs(r("admin"))).toBe(true);
    expect(peutGererUtilisateurs(r("user"))).toBe(false);
    expect(peutGererUtilisateurs(r("commercial"))).toBe(false);
    expect(peutGererUtilisateurs(null)).toBe(false);
  });

  it("voir les marges : tout le monde sauf le commercial", () => {
    expect(peutVoirMarges(r("admin"))).toBe(true);
    expect(peutVoirMarges(r("user"))).toBe(true);
    expect(peutVoirMarges(r("commercial"))).toBe(false);
  });

  it("éditer le delivery : tout le monde sauf le commercial", () => {
    expect(peutEditerDelivery(r("admin"))).toBe(true);
    expect(peutEditerDelivery(r("user"))).toBe(true);
    expect(peutEditerDelivery(r("commercial"))).toBe(false);
  });

  it("supprimer définitivement une entité : admin seul", () => {
    expect(peutSupprimerEntites(r("admin"))).toBe(true);
    expect(peutSupprimerEntites(r("user"))).toBe(false);
    expect(peutSupprimerEntites(r("commercial"))).toBe(false);
    expect(peutSupprimerEntites(null)).toBe(false);
  });
});

describe("accès aux routes", () => {
  it("admin et associé accèdent à tout", () => {
    for (const role of ["admin", "user"] as Role[]) {
      expect(peutAccederRoute(r(role), "/")).toBe(true);
      expect(peutAccederRoute(r(role), "/missions")).toBe(true);
      expect(peutAccederRoute(r(role), "/statistiques")).toBe(true);
    }
  });

  it("le commercial accède à ses pages et aux pages delivery (marges masquées)", () => {
    const c = r("commercial");
    expect(peutAccederRoute(c, "/clients")).toBe(true);
    expect(peutAccederRoute(c, "/clients/123")).toBe(true); // sous-route éventuelle
    expect(peutAccederRoute(c, "/parametres")).toBe(true);
    expect(peutAccederRoute(c, "/opportunites")).toBe(true); // pipeline commercial
    // Pages delivery : ouvertes (les marges y sont masquées côté affichage/requête).
    expect(peutAccederRoute(c, "/missions")).toBe(true);
    expect(peutAccederRoute(c, "/projets")).toBe(true);
    expect(peutAccederRoute(c, "/freelances")).toBe(true);
    // Pages intrinsèquement financières : toujours interdites.
    expect(peutAccederRoute(c, "/")).toBe(false);
    expect(peutAccederRoute(c, "/statistiques")).toBe(false);
    expect(peutAccederRoute(c, "/users")).toBe(false);
  });

  it("ne confond pas un préfixe partiel (/clientsXYZ)", () => {
    expect(peutAccederRoute(r("commercial"), "/clients-internes")).toBe(false);
  });
});

describe("labelRole", () => {
  it("traduit les rôles connus", () => {
    expect(labelRole("admin")).toBe("Administrateur");
    expect(labelRole("user")).toBe("Associé");
    expect(labelRole("commercial")).toBe("Commercial");
  });
});
