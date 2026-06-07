"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Petite fenêtre de confirmation réutilisable.
// On lui passe le bouton déclencheur (trigger) et l'action à exécuter si on confirme.
export function ConfirmDialog({
  trigger,
  titre,
  description,
  confirmLabel = "Confirmer",
  destructif = false,
  onConfirm,
}: {
  trigger: React.ReactElement;
  titre: string;
  description?: string;
  confirmLabel?: string;
  destructif?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [enCours, setEnCours] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent showCloseButton={false} className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={enCours}>
            Annuler
          </Button>
          <Button
            variant={destructif ? "destructive" : "default"}
            disabled={enCours}
            onClick={async () => {
              setEnCours(true);
              await onConfirm();
              setEnCours(false);
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
