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

type OptionFreelance = { id: number; prenom: string; nom: string };
type OptionClient = { id: number; nom: string };

type Mission = {
  id: number;
  freelanceId: number;
  clientId: number;
  dateDebut: string;
  dateFin: string | null;
  joursParSemaine: string;
};

// Style commun aux menus déroulants natifs (proche du champ Input de shadcn).
const selectClass =
  "border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none";

export function MissionFormDialog({
  action,
  titre,
  trigger,
  freelancesActifs,
  clientsListe,
  mission,
  avecTarif,
}: {
  action: (formData: FormData) => Promise<Resultat>;
  titre: string;
  trigger: React.ReactElement;
  freelancesActifs: OptionFreelance[];
  clientsListe: OptionClient[];
  mission?: Mission;
  avecTarif: boolean; // true à la création (saisie du 1er tarif)
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
          action={async (formData) => {
            const res = await action(formData);
            if (res.ok) {
              toast.success("Mission enregistrée.");
              setOpen(false);
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
          className="space-y-4"
        >
          {mission ? <input type="hidden" name="id" value={mission.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="freelanceId">Freelance *</Label>
            <select
              id="freelanceId"
              name="freelanceId"
              defaultValue={mission?.freelanceId ?? ""}
              required
              className={selectClass}
            >
              <option value="" disabled>
                Choisir un freelance
              </option>
              {freelancesActifs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client *</Label>
            <select
              id="clientId"
              name="clientId"
              defaultValue={mission?.clientId ?? ""}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début *</Label>
              <Input
                id="dateDebut"
                name="dateDebut"
                type="date"
                defaultValue={mission?.dateDebut ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input
                id="dateFin"
                name="dateFin"
                type="date"
                defaultValue={mission?.dateFin ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="joursParSemaine">Jours par semaine *</Label>
            <Input
              id="joursParSemaine"
              name="joursParSemaine"
              type="number"
              step="0.5"
              min="0.5"
              max="7"
              defaultValue={mission?.joursParSemaine ?? "5"}
              required
            />
          </div>

          {avecTarif ? (
            <div className="space-y-4 rounded-md border p-4">
              <p className="text-sm font-medium">Premier tarif</p>
              <div className="space-y-2">
                <Label htmlFor="moisEffet">À partir du mois *</Label>
                <Input id="moisEffet" name="moisEffet" type="month" required />
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
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
