"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { basculerActifClient } from "./actions";

export function ArchiveClientButton({ id, actif }: { id: number; actif: boolean }) {
  async function basculer() {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("actif", String(actif));
    const res = await basculerActifClient(fd);
    if (res.ok) toast.success(actif ? "Client archivé." : "Client réactivé.");
    else toast.error(res.message ?? "Action impossible.");
  }

  // Réactiver : action sans risque, un seul clic.
  if (!actif) {
    return (
      <Button variant="outline" size="sm" onClick={basculer}>
        Réactiver
      </Button>
    );
  }

  // Archiver : on confirme.
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Archiver
        </Button>
      }
      titre="Archiver ce client ?"
      description="Il n'apparaîtra plus dans les listes actives. Vous pourrez le réactiver depuis l'onglet Archives."
      confirmLabel="Archiver"
      destructif
      onConfirm={basculer}
    />
  );
}
