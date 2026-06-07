"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supprimerMission } from "./actions";

export function DeleteMissionButton({ id, libelle }: { id: number; libelle: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!confirm(`Supprimer la mission ${libelle} ?`)) return;
        const formData = new FormData();
        formData.set("id", String(id));
        const res = await supprimerMission(formData);
        if (res.ok) toast.success("Mission supprimée.");
        else toast.error(res.message ?? "Suppression impossible.");
      }}
    >
      Supprimer
    </Button>
  );
}
