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
import type { Resultat } from "./actions";

type OptionClient = { id: number; nom: string };

type Projet = {
  id: number;
  clientId: number;
  nom: string;
  budget: string;
};

const selectClass =
  "h-9 w-full rounded-xl border border-transparent bg-secondary px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function ProjetFormDialog({
  action,
  titre,
  trigger,
  clientsListe,
  projet,
}: {
  action: (formData: FormData) => Promise<Resultat>;
  titre: string;
  trigger: React.ReactElement;
  clientsListe: OptionClient[];
  projet?: Projet;
}) {
  const [open, setOpen] = useState(false);
  const cle = projet ? `${projet.id}:${projet.nom}:${projet.budget}:${projet.clientId}` : "new";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>

        <form
          key={cle}
          action={async (formData) => {
            const res = await action(formData);
            if (res.ok) {
              toast.success("Projet enregistré.");
              setOpen(false);
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
          className="space-y-4"
        >
          {projet ? <input type="hidden" name="id" value={projet.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="nom">Nom du projet *</Label>
            <Input id="nom" name="nom" defaultValue={projet?.nom ?? ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client *</Label>
            <select
              id="clientId"
              name="clientId"
              defaultValue={projet?.clientId ?? ""}
              required
              className={selectClass}
            >
              <option value="" disabled>
                Choisir un client
              </option>
              {clientsListe.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (enveloppe, € HT) *</Label>
            <Input
              id="budget"
              name="budget"
              type="number"
              min="0"
              step="1"
              defaultValue={projet?.budget ?? ""}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
