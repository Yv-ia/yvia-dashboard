"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { basculerActifMission } from "./actions";

export function ToggleActifMissionButton({
  id,
  actif,
}: {
  id: number;
  actif: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        const fd = new FormData();
        fd.set("id", String(id));
        fd.set("actif", String(actif));
        const res = await basculerActifMission(fd);
        if (res.ok) toast.success(actif ? "Mission désactivée." : "Mission réactivée.");
        else toast.error(res.message ?? "Action impossible.");
      }}
    >
      {actif ? "Désactiver" : "Réactiver"}
    </Button>
  );
}
