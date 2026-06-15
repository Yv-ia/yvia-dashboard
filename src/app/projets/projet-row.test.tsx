import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/app/_drawer/drawer-stack", () => ({
  EntityLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("./projet-detail-dialog", () => ({
  ProjetDetailDialog: () => null,
}));

import { ProjetRow } from "./projet-row";

const projetBase = {
  id: 1,
  nom: "Refonte cockpit",
  clientId: 7,
  clientNom: "Yvia",
  budget: "45000",
  fiabiliteDefaut: null,
  clientFiabilite: null,
  actif: true,
};

function rendreStatut(statutCommercial: string) {
  return renderToStaticMarkup(
    <table>
      <tbody>
        <ProjetRow
          projet={{ ...projetBase, statutCommercial }}
          encaissements={[]}
          decaissements={[]}
          jalons={[]}
          freelancesActifs={[]}
        />
      </tbody>
    </table>
  );
}

describe("ProjetRow", () => {
  test.each([
    ["a_qualifier", "bg-yvia-ice"],
    ["en_discussion", "bg-amber-50"],
    ["proposition_envoyee", "bg-sky-50"],
    ["gagne", "bg-emerald-50"],
    ["perdu", "bg-rose-50"],
  ])("rend le statut %s avec un badge colore", (statut, classe) => {
    expect(rendreStatut(statut)).toContain(classe);
  });

  test("masque les colonnes Décaissé et Marge quand voirMarges=false", () => {
    const rendre = (voirMarges: boolean) =>
      renderToStaticMarkup(
        <table>
          <tbody>
            <ProjetRow
              projet={{ ...projetBase, statutCommercial: "gagne" }}
              encaissements={[
                { id: 1, date: "2026-01-01", montant: "10000", libelle: null, statut: "encaisse", fiabilite: null },
              ]}
              decaissements={[
                { id: 2, date: "2026-01-01", montant: "4000", libelle: null, statut: "decaisse", fiabilite: null, freelanceNom: "X" },
              ]}
              jalons={[]}
              freelancesActifs={[]}
              voirMarges={voirMarges}
            />
          </tbody>
        </table>
      );

    const avec = rendre(true).match(/<td(?:\s|>)/g)?.length ?? 0;
    const sans = rendre(false).match(/<td(?:\s|>)/g)?.length ?? 0;
    // Deux colonnes en moins : Décaissé et Marge.
    expect(sans).toBe(avec - 2);
  });
});
