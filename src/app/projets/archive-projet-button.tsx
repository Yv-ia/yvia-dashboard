"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { basculerActifProjet } from "./actions";

export function ArchiveProjetButton({ id, actif }: { id: number; actif: boolean }) {
  async function basculer() {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("actif", String(actif));
    const res = await basculerActifProjet(fd);
    if (res.ok) toast.success(actif ? "Projet archivé." : "Projet réactivé.");
    else toast.error(res.message ?? "Action impossible.");
  }

  if (!actif) {
    return (
      <Button variant="outline" size="sm" onClick={basculer}>
        Réactiver
      </Button>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Archiver
        </Button>
      }
      titre="Archiver ce projet ?"
      description="Il n'apparaîtra plus dans les listes actives. Vous pourrez le réactiver depuis l'onglet Archives."
      confirmLabel="Archiver"
      destructif
      onConfirm={basculer}
    />
  );
}
