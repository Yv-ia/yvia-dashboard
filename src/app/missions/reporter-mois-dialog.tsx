"use client";
// Reprend les régies facturées le mois précédent sur le mois affiché (mêmes
// freelances et TJM). Sert à éviter de ressaisir, chaque mois, les freelances
// déjà facturés. N'écrase pas les régies déjà posées sur le mois.

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { reporterMoisPrecedent } from "./actions";

export function ReporterMoisDialog({
  annee,
  mois,
  libelleMois,
  libelleMoisPrecedent,
  trigger,
}: {
  annee: number;
  mois: number;
  libelleMois: string;
  libelleMoisPrecedent: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dupliquer le mois précédent</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Duplique sur <span className="font-medium text-foreground">{libelleMois}</span> les régies
          facturées en <span className="font-medium text-foreground">{libelleMoisPrecedent}</span>{" "}
          (mêmes freelances, même nombre de jours, TJM figés). Les régies déjà posées ce mois-ci ne
          sont pas modifiées.
        </p>

        <form
          action={async (formData) => {
            const res = await reporterMoisPrecedent(formData);
            if (res.ok) {
              toast.success("Mois précédent dupliqué.");
              setOpen(false);
              router.refresh();
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
        >
          <input type="hidden" name="annee" value={annee} />
          <input type="hidden" name="mois" value={mois} />
          <DialogFooter>
            <Button type="submit">Dupliquer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
