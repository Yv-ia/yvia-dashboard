"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro, formatDate } from "@/lib/format";
import { ajouterTarif } from "./actions";

type Tarif = { dateEffet: string; tjmAchat: string; tjmVente: string };

export function MissionTarifsDialog({
  missionId,
  libelle,
  tarifs,
}: {
  missionId: number;
  libelle: string;
  tarifs: Tarif[];
}) {
  const [open, setOpen] = useState(false);

  // Historique trié du plus récent au plus ancien.
  const historique = [...tarifs].sort((a, b) => (a.dateEffet < b.dateEffet ? 1 : -1));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            Tarifs
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarifs : {libelle}</DialogTitle>
        </DialogHeader>

        {/* Historique */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Historique :</p>
          {historique.map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="font-medium">À partir du {formatDate(t.dateEffet)}</span>
              <span className="text-muted-foreground">
                achat {formatEuro(Number(t.tjmAchat))} / vente {formatEuro(Number(t.tjmVente))}
              </span>
            </div>
          ))}
        </div>

        {/* Ajout d'un nouveau tarif */}
        <form
          action={async (formData) => {
            const res = await ajouterTarif(formData);
            if (res.ok) {
              toast.success("Tarif enregistré.");
              setOpen(false);
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
          className="space-y-4 border-t border-border pt-4"
        >
          <p className="text-sm font-medium">Nouveau tarif</p>
          <input type="hidden" name="missionId" value={missionId} />
          <div className="space-y-2">
            <Label htmlFor="dateEffet">À partir du *</Label>
            <Input id="dateEffet" name="dateEffet" type="date" required />
            <p className="text-xs text-muted-foreground">
              Les jours précédents gardent l’ancien tarif.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tjmAchat">TJM achat (€ HT) *</Label>
              <Input id="tjmAchat" name="tjmAchat" type="number" min="0" step="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tjmVente">TJM vente (€ HT) *</Label>
              <Input id="tjmVente" name="tjmVente" type="number" min="0" step="1" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Enregistrer le nouveau tarif</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
