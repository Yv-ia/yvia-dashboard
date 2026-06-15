"use client";
// Fenêtre de création / édition d'une opportunité (modèle ClientFormDialog).

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
import { Select } from "@/components/ui/select";
import { STATUTS_COMMERCIAUX } from "@/lib/projets/statut-commercial";
import { TYPES_OPPORTUNITE, TYPE_OPPORTUNITE_DEFAUT } from "@/lib/opportunites/type";
import type { Resultat } from "./actions";

type Opportunite = {
  id: number;
  clientId: number;
  nom: string;
  type: string;
  statut: string;
  montantEstime: string | null;
};

export function OpportuniteFormDialog({
  action,
  opportunite,
  clientsListe,
  statutInitial,
  titre,
  trigger,
}: {
  action: (formData: FormData) => Promise<Resultat>;
  opportunite?: Opportunite; // fourni = édition, sinon = création
  clientsListe: { id: number; nom: string }[];
  statutInitial?: string; // statut pré-sélectionné à la création
  titre: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>

        <form
          key={opportunite ? `${opportunite.id}` : "new"}
          action={async (formData) => {
            const res = await action(formData);
            if (res.ok) {
              toast.success("Opportunité enregistrée.");
              setOpen(false);
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
          className="space-y-4"
        >
          {opportunite ? <input type="hidden" name="id" value={opportunite.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" name="nom" defaultValue={opportunite?.nom ?? ""} required />
          </div>

          {opportunite ? (
            // En édition, le client n'est pas modifiable (cohérent avec les projets).
            <input type="hidden" name="clientId" value={opportunite.clientId} />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select
                id="clientId"
                name="clientId"
                placeholder="Choisir un client"
                options={clientsListe.map((c) => ({ value: c.id, label: c.nom }))}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                id="type"
                name="type"
                defaultValue={opportunite?.type ?? TYPE_OPPORTUNITE_DEFAUT}
                options={TYPES_OPPORTUNITE.map((t) => ({ value: t.key, label: t.label }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select
                id="statut"
                name="statut"
                defaultValue={opportunite?.statut ?? statutInitial ?? STATUTS_COMMERCIAUX[0].key}
                options={STATUTS_COMMERCIAUX.map((s) => ({ value: s.key, label: s.label }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="montantEstime">Montant estimé (€ HT)</Label>
            <Input
              id="montantEstime"
              name="montantEstime"
              type="number"
              min="0"
              defaultValue={opportunite?.montantEstime ?? ""}
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
