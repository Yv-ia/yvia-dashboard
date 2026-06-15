"use client";
// Déclencheur « facture » : on saisit un simple nombre de jours pour une régie sur
// le mois affiché, et le planning (affectations) est généré automatiquement — pas
// de saisie jour par jour.

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { genererJoursRegie } from "./actions";

type OptionRegie = { id: number; label: string };

export function SaisirJoursDialog({
  regies,
  annee,
  mois,
  libelleMois,
  trigger,
}: {
  regies: OptionRegie[];
  annee: number;
  mois: number;
  libelleMois: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [missionId, setMissionId] = useState("");
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saisir des jours de régie</DialogTitle>
        </DialogHeader>

        <form
          action={async (formData) => {
            const res = await genererJoursRegie(formData);
            if (res.ok) {
              toast.success("Jours de régie générés.");
              setOpen(false);
              router.refresh();
            } else {
              toast.error(res.message ?? "Génération impossible.");
            }
          }}
          className="space-y-4"
        >
          <input type="hidden" name="annee" value={annee} />
          <input type="hidden" name="mois" value={mois} />

          <p className="text-sm text-muted-foreground">
            Mois : <span className="font-medium capitalize text-foreground">{libelleMois}</span>. Les
            jours sont posés sur les premiers jours ouvrés libres ; relancer remplace les jours de
            cette régie sur le mois.
          </p>

          <div className="space-y-2">
            <Label htmlFor="missionId">Régie *</Label>
            <Select
              id="missionId"
              name="missionId"
              value={missionId}
              onValueChange={setMissionId}
              required
              placeholder="Choisir une régie"
              options={regies.map((r) => ({ value: r.id, label: r.label }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nbJours">Nombre de jours *</Label>
            <Input id="nbJours" name="nbJours" type="number" min="0" max="31" step="1" required />
          </div>

          <DialogFooter>
            <Button type="submit">Générer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
