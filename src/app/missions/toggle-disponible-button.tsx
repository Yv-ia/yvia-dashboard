"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { basculerDisponible } from "./actions";

export function ToggleDisponibleButton({
  id,
  disponible,
}: {
  id: number;
  disponible: boolean;
}) {
  return (
    <Button
      variant={disponible ? "secondary" : "ghost"}
      size="sm"
      onClick={async () => {
        const fd = new FormData();
        fd.set("id", String(id));
        fd.set("disponible", String(disponible));
        const res = await basculerDisponible(fd);
        if (res.ok) {
          toast.success(disponible ? "Retirée du planning." : "Disponible au planning.");
        } else {
          toast.error(res.message ?? "Action impossible.");
        }
      }}
    >
      {disponible ? "Oui" : "Non"}
    </Button>
  );
}
