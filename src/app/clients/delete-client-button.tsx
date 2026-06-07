"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supprimerClient } from "./actions";

export function DeleteClientButton({ id, nom }: { id: number; nom: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        // Confirmation native du navigateur avant de supprimer.
        if (!confirm(`Supprimer le client « ${nom} » ?`)) return;
        const formData = new FormData();
        formData.set("id", String(id));
        const res = await supprimerClient(formData);
        if (res.ok) toast.success("Client supprimé.");
        else toast.error(res.message ?? "Suppression impossible.");
      }}
    >
      Supprimer
    </Button>
  );
}
