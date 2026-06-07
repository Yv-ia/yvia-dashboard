"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { etendreAuMoisSuivant } from "./planning-actions";

export function EtendreMoisButton({
  annee,
  mois,
  libelleMoisSuivant,
}: {
  annee: number;
  mois: number;
  libelleMoisSuivant: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Étendre au mois suivant
        </Button>
      }
      titre={`Étendre le planning sur ${libelleMoisSuivant} ?`}
      description="Les affectations de ce mois seront recopiées sur les jours ouvrés du mois suivant (même schéma, mêmes tarifs). Les jours déjà posés le mois suivant seront remplacés."
      confirmLabel="Étendre"
      onConfirm={async () => {
        const res = await etendreAuMoisSuivant(annee, mois);
        if (res.ok) toast.success("Planning étendu au mois suivant.");
        else toast.error(res.message ?? "Action impossible.");
      }}
    />
  );
}
