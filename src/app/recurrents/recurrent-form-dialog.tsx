"use client";
// Création / édition d'un revenu récurrent (delivery). Le coût récurrent n'est
// pertinent que pour RUN/licence (la régie le dérive du planning).

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
import { CATEGORIES_RECURRENT, coutDerivePlanning } from "@/lib/recurrents/categorie";
import type { Resultat } from "./actions";

// La régie n'est pas un contrat MCO : elle se gère via les hypothèses de régie
// (page /regie). Le formulaire MCO ne propose donc que RUN / licence.
const CATEGORIES_MCO = CATEGORIES_RECURRENT.filter((c) => c.key !== "regie");
const CATEGORIE_MCO_DEFAUT = CATEGORIES_MCO[0].key;

type Recurrent = {
  id: number;
  clientId: number;
  nom: string;
  categorie: string;
  montantRecurrent: string;
  coutRecurrent: string | null;
  dateDebut: string;
  dateFin: string | null;
};

export function RecurrentFormDialog({
  action,
  recurrent,
  clientsListe,
  titre,
  trigger,
}: {
  action: (formData: FormData) => Promise<Resultat>;
  recurrent?: Recurrent;
  clientsListe: { id: number; nom: string }[];
  titre: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [categorie, setCategorie] = useState(recurrent?.categorie ?? CATEGORIE_MCO_DEFAUT);
  const coutManuel = !coutDerivePlanning(categorie);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>

        <form
          key={recurrent ? `${recurrent.id}` : "new"}
          action={async (formData) => {
            const res = await action(formData);
            if (res.ok) {
              toast.success("Contrat MCO enregistré.");
              setOpen(false);
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
          className="space-y-4"
        >
          {recurrent ? <input type="hidden" name="id" value={recurrent.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" name="nom" defaultValue={recurrent?.nom ?? ""} required />
          </div>

          {recurrent ? (
            <input type="hidden" name="clientId" value={recurrent.clientId} />
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

          <div className="space-y-2">
            <Label htmlFor="categorie">Catégorie</Label>
            <Select
              id="categorie"
              name="categorie"
              value={categorie}
              onValueChange={setCategorie}
              options={CATEGORIES_MCO.map((c) => ({ value: c.key, label: c.label }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="montantRecurrent">Montant / mois (€ HT) *</Label>
              <Input
                id="montantRecurrent"
                name="montantRecurrent"
                type="number"
                min="0"
                defaultValue={recurrent?.montantRecurrent ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coutRecurrent">Coût / mois (€ HT)</Label>
              <Input
                id="coutRecurrent"
                name="coutRecurrent"
                type="number"
                min="0"
                defaultValue={recurrent?.coutRecurrent ?? ""}
                disabled={!coutManuel}
                placeholder={coutManuel ? undefined : "Dérivé du planning"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Début *</Label>
              <Input
                id="dateDebut"
                name="dateDebut"
                type="date"
                defaultValue={recurrent?.dateDebut ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Fin (vide = en cours)</Label>
              <Input id="dateFin" name="dateFin" type="date" defaultValue={recurrent?.dateFin ?? ""} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
