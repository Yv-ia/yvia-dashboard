import { describe, it, expect } from "vitest";
import {
  normaliserStatutTodo,
  labelStatutTodo,
  estTodoFaite,
  basculerStatutTodo,
  STATUT_TODO_DEFAUT,
} from "./statut";

describe("statut to-do", () => {
  it("normalise une valeur connue", () => {
    expect(normaliserStatutTodo("en_cours")).toBe("en_cours");
    expect(normaliserStatutTodo("fait")).toBe("fait");
  });

  it("retombe sur le défaut pour une valeur inconnue ou vide", () => {
    expect(normaliserStatutTodo("n_importe_quoi")).toBe(STATUT_TODO_DEFAUT);
    expect(normaliserStatutTodo(null)).toBe(STATUT_TODO_DEFAUT);
    expect(normaliserStatutTodo(undefined)).toBe(STATUT_TODO_DEFAUT);
  });

  it("donne le libellé français", () => {
    expect(labelStatutTodo("a_faire")).toBe("À faire");
    expect(labelStatutTodo("fait")).toBe("Fait");
  });

  it("sait si une to-do est faite", () => {
    expect(estTodoFaite("fait")).toBe(true);
    expect(estTodoFaite("a_faire")).toBe(false);
    expect(estTodoFaite("en_cours")).toBe(false);
  });

  it("bascule entre fait et à faire", () => {
    expect(basculerStatutTodo("a_faire")).toBe("fait");
    expect(basculerStatutTodo("en_cours")).toBe("fait");
    expect(basculerStatutTodo("fait")).toBe("a_faire");
  });
});
