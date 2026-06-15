import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/app/_drawer/drawer-stack", () => ({
  EntityLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useDrawer: () => ({ ouvrir: () => undefined }),
}));

import { MissionRow, type LigneMission } from "./mission-row";

const mission: LigneMission = {
  id: 1,
  nom: "Delta Jules Perso",
  freelanceId: 1,
  clientId: 1,
  freelancePrenom: "Jules",
  freelanceNom: "Bertrand",
  clientNom: "DeltaRM",
  tjmAchat: "600",
  tjmVente: "500",
  actif: true,
};

// Vue groupée par client : la colonne Client est portée par l'en-tête du groupe,
// les lignes de détail la masquent (masquerClient).
function rendre(voirMarges: boolean) {
  return renderToStaticMarkup(
    <table>
      <tbody>
        <MissionRow l={mission} voirMarges={voirMarges} masquerClient />
      </tbody>
    </table>
  );
}

describe("missions table columns", () => {
  test("declares one header for each rendered mission cell (marges visibles)", () => {
    const composantPath = fileURLToPath(new URL("./missions-par-client.tsx", import.meta.url));
    const source = readFileSync(composantPath, "utf8");
    const headerCount = source.match(/<TableHead(?:\s|>)/g)?.length ?? 0;

    const cellCount = rendre(true).match(/<td(?:\s|>)/g)?.length ?? 0;

    expect(headerCount).toBe(cellCount);
  });

  test("masque TJM achat et marge quand l'utilisateur ne peut pas voir les marges", () => {
    const avec = rendre(true).match(/<td(?:\s|>)/g)?.length ?? 0;
    const sans = rendre(false).match(/<td(?:\s|>)/g)?.length ?? 0;

    // Deux colonnes en moins : TJM achat et Marge / jour.
    expect(sans).toBe(avec - 2);
    // TJM vente (500) reste, mais la marge (vente − achat = -100) n'apparaît pas.
    expect(rendre(false)).toContain("500");
    expect(rendre(false)).not.toContain("100");
  });
});
