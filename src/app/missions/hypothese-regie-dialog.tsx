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
import { creerRecurrent, modifierRecurrent } from "@/app/recurrents/actions";

type OptionClient = { id: number; nom: string };

// Hypothèse de régie existante (mode édition).
type HypotheseRegie = {
  id: number;
  clientId: number;
  clientNom: string;
  nom: string;
  montantRecurrent: string;
  dateDebut: string;
  dateFin: string | null;
};

export function HypotheseRegieDialog({
  clientsListe,
  trigger,
  hypothese,
}: {
  clientsListe: OptionClient[];
  trigger: React.ReactElement;
  hypothese?: HypotheseRegie; // présent = édition ; absent = création
}) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const router = useRouter();
  const edition = hypothese != null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edition ? "Modifier l’hypothèse de régie" : "Hypothèse de régie"}</DialogTitle>
        </DialogHeader>

        <form
          key={edition ? `e${hypothese.id}` : "new"}
          action={async (formData) => {
            const res = await (edition ? modifierRecurrent(formData) : creerRecurrent(formData));
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
          {edition ? <input type="hidden" name="id" value={hypothese.id} /> : null}

          {edition ? (
            <>
              <input type="hidden" name="clientId" value={hypothese.clientId} />
              <div className="space-y-2">
                <Label>Client</Label>
                <p className="text-sm text-muted-foreground">{hypothese.clientNom}</p>
              </div>
            </>
          ) : (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="hr-nom">Libellé *</Label>
            <Input
              id="hr-nom"
              name="nom"
              placeholder="Régie prévisionnelle"
              defaultValue={hypothese?.nom ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hr-montant">Montant mensuel (€ HT) *</Label>
            <Input
              id="hr-montant"
              name="montantRecurrent"
              type="number"
              min="0"
              step="1"
              defaultValue={hypothese?.montantRecurrent ?? ""}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hr-debut">Début *</Label>
              <Input
                id="hr-debut"
                name="dateDebut"
                type="date"
                defaultValue={hypothese?.dateDebut ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-fin">Fin</Label>
              <Input
                id="hr-fin"
                name="dateFin"
                type="date"
                defaultValue={hypothese?.dateFin ?? ""}
              />
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
