import { describe, it, expect } from "vitest";
import { normaliserDomaineTodo, labelDomaineTodo, DOMAINE_TODO_NON_CLASSE } from "./domaine";

describe("domaine to-do", () => {
  it("normalise une valeur connue", () => {
    expect(normaliserDomaineTodo("sales")).toBe("sales");
    expect(normaliserDomaineTodo("delivery")).toBe("delivery");
    expect(normaliserDomaineTodo("finance_admin")).toBe("finance_admin");
    expect(normaliserDomaineTodo("strategie")).toBe("strategie");
  });

  it("retombe sur null pour une valeur inconnue ou vide (anciens domaines compris)", () => {
    expect(normaliserDomaineTodo("finance")).toBeNull();
    expect(normaliserDomaineTodo("administratif")).toBeNull();
    expect(normaliserDomaineTodo("")).toBeNull();
    expect(normaliserDomaineTodo(null)).toBeNull();
    expect(normaliserDomaineTodo(undefined)).toBeNull();
  });

  it("donne le libellé français", () => {
    expect(labelDomaineTodo("finance_admin")).toBe("Finance & Admin");
    expect(labelDomaineTodo("delivery")).toBe("Delivery");
  });

  it("libelle « Non classé » en l'absence de domaine", () => {
    expect(labelDomaineTodo(null)).toBe(DOMAINE_TODO_NON_CLASSE);
    expect(labelDomaineTodo("inconnu")).toBe(DOMAINE_TODO_NON_CLASSE);
  });
});
