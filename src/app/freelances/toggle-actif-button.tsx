"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { basculerActif } from "./actions";

export function ToggleActifButton({ id, actif }: { id: number; actif: boolean }) {
  async function basculer() {
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("actif", String(actif));
    const res = await basculerActif(formData);
    if (res.ok) toast.success(actif ? "Freelance archivé." : "Freelance réactivé.");
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

  // Archiver : on confirme.
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Archiver
        </Button>
      }
      titre="Archiver ce freelance ?"
      description="Il n'apparaîtra plus dans les listes actives ni au planning. Vous pourrez le réactiver depuis l'onglet Archives."
      confirmLabel="Archiver"
      destructif
      onConfirm={basculer}
    />
  );
}
