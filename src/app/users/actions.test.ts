import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, revalidatePath, update, set, where, returning } = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidatePath: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getSession }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/db", () => ({
  db: {
    update,
  },
}));

import { modifierRoleUtilisateur } from "./actions";

function sessionAdmin(userId = 1) {
  return {
    userId,
    email: "admin@yvia.io",
    exp: Date.now() + 60_000,
    pv: "pv-test",
    role: "admin",
  };
}

function formRole(id: number, role: string) {
  const formData = new FormData();
  formData.set("id", String(id));
  formData.set("role", role);
  return formData;
}

beforeEach(() => {
  getSession.mockReset();
  revalidatePath.mockReset();
  update.mockReset();
  set.mockReset();
  where.mockReset();
  returning.mockReset();

  update.mockReturnValue({ set });
  set.mockReturnValue({ where });
  where.mockReturnValue({ returning });
  returning.mockResolvedValue([{ id: 2 }]);
});

describe("modifierRoleUtilisateur", () => {
  it("met à jour le rôle d'un autre utilisateur quand l'appelant est admin", async () => {
    getSession.mockResolvedValue(sessionAdmin(1));

    const res = await modifierRoleUtilisateur(formRole(2, "commercial"));

    expect(res).toEqual({ ok: true });
    expect(update).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({ role: "commercial" });
    expect(revalidatePath).toHaveBeenCalledWith("/users");
  });

  it("refuse de modifier son propre rôle", async () => {
    getSession.mockResolvedValue(sessionAdmin(1));

    const res = await modifierRoleUtilisateur(formRole(1, "user"));

    expect(res).toEqual({
      ok: false,
      message: "Vous ne pouvez pas modifier votre propre rôle.",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuse un rôle inconnu", async () => {
    getSession.mockResolvedValue(sessionAdmin(1));

    const res = await modifierRoleUtilisateur(formRole(2, "superadmin"));

    expect(res).toEqual({ ok: false, message: "Rôle invalide." });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuse quand la cible n'existe pas", async () => {
    getSession.mockResolvedValue(sessionAdmin(1));
    returning.mockResolvedValue([]);

    const res = await modifierRoleUtilisateur(formRole(2, "user"));

    expect(res).toEqual({ ok: false, message: "Utilisateur introuvable." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
