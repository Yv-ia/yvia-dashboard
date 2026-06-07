"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { basculerActifMission } from "./actions";

export function ToggleActifMissionButton({
  id,
  actif,
}: {
  id: number;
  actif: boolean;
}) {
  async function basculer() {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("actif", String(actif));
    const res = await basculerActifMission(fd);
    if (res.ok) toast.success(actif ? "Mission désactivée." : "Mission réactivée.");
    else toast.error(res.message ?? "Action impossible.");
  }

  // Réactiver : action sans risque, un seul clic.
  if (!actif) {
    return (
      <Button variant="ghost" size="sm" onClick={basculer}>
        Réactiver
      </Button>
    );
  }

  // Désactiver : on confirme.
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Désactiver
        </Button>
      }
      titre="Désactiver cette mission ?"
      description="Elle ne sera plus proposée dans le planning. Vous pourrez la réactiver à tout moment."
      confirmLabel="Désactiver"
      destructif
      onConfirm={basculer}
    />
  );
}
