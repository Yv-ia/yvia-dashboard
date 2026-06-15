"use client";
// Hypothèse de régie « en macro » : un montant mensuel sur une période (début → fin),
// sans saisir le planning jour par jour. Stockée comme un récurrent catégorie régie
// (cf. pont prévisionnel) ; elle alimente la ligne Régie du prévisionnel pour les mois
// non encore planifiés (le réel du planning prime quand il existe).

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
import { creerRecurrent } from "@/app/recurrents/actions";

type OptionClient = { id: number; nom: string };

export function HypotheseRegieDialog({
  clientsListe,
  trigger,
}: {
  clientsListe: OptionClient[];
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hypothèse de régie</DialogTitle>
        </DialogHeader>

        <form
          action={async (formData) => {
            const res = await creerRecurrent(formData);
            if (res.ok) {
              toast.success("Hypothèse de régie enregistrée.");
              setOpen(false);
              router.refresh();
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
          className="space-y-4"
        >
          {/* Stockée comme récurrent catégorie régie. */}
          <input type="hidden" name="categorie" value="regie" />

          <div className="space-y-2">
            <Label htmlFor="hr-client">Client *</Label>
            <Select
              id="hr-client"
              name="clientId"
              value={clientId}
              onValueChange={setClientId}
              required
              placeholder="Choisir un client"
              options={clientsListe.map((c) => ({ value: c.id, label: c.nom }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hr-nom">Libellé *</Label>
            <Input id="hr-nom" name="nom" placeholder="Régie prévisionnelle" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hr-montant">Montant mensuel (€ HT) *</Label>
            <Input id="hr-montant" name="montantRecurrent" type="number" min="0" step="1" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hr-debut">Début *</Label>
              <Input id="hr-debut" name="dateDebut" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-fin">Fin</Label>
              <Input id="hr-fin" name="dateFin" type="date" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Le réel du planning prime sur l’hypothèse pour les mois déjà saisis. Fin vide = en cours.
          </p>

          <DialogFooter>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
