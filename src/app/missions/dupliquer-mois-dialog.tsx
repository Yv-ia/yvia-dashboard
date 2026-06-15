"use client";
// Duplique sur le mois affiché les régies facturées le mois précédent, mais de
// façon ciblée : on choisit un client, puis on coche les freelances à reprendre
// et on ajuste le nombre de jours. La duplication ÉCRASE la prévision existante
// de ces régies sur le mois (le réel posé remplace le potentiel suivi).

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
import { dupliquerMoisPrecedent } from "./actions";

export type RegiePrecedente = { missionId: number; label: string; nbJours: number };
export type ClientPrecedent = { clientId: number; clientNom: string; regies: RegiePrecedente[] };

type EtatLigne = { coche: boolean; jours: string };

export function DupliquerMoisDialog({
  annee,
  mois,
  libelleMois,
  libelleMoisPrecedent,
  clientsPrecedent,
  trigger,
}: {
  annee: number;
  mois: number;
  libelleMois: string;
  libelleMoisPrecedent: string;
  clientsPrecedent: ClientPrecedent[];
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [lignes, setLignes] = useState<Record<number, EtatLigne>>({});
  const router = useRouter();

  const clientChoisi = clientsPrecedent.find((c) => String(c.clientId) === clientId);

  // À la sélection d'un client, on pré-coche toutes ses régies avec leur nb de jours.
  const choisirClient = (value: string) => {
    setClientId(value);
    const c = clientsPrecedent.find((x) => String(x.clientId) === value);
    const init: Record<number, EtatLigne> = {};
    for (const r of c?.regies ?? []) init[r.missionId] = { coche: true, jours: String(r.nbJours) };
    setLignes(init);
  };

  const majLigne = (missionId: number, patch: Partial<EtatLigne>) =>
    setLignes((prev) => ({ ...prev, [missionId]: { ...prev[missionId], ...patch } }));

  const selection = Object.entries(lignes)
    .filter(([, l]) => l.coche && Number(l.jours) > 0)
    .map(([missionId, l]) => ({ missionId: Number(missionId), nbJours: Number(l.jours) }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dupliquer le mois précédent</DialogTitle>
        </DialogHeader>

        {clientsPrecedent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune régie facturée en {libelleMoisPrecedent}.
          </p>
        ) : (
          <form
            action={async (formData) => {
              const res = await dupliquerMoisPrecedent(formData);
              if (res.ok) {
                toast.success("Régies dupliquées sur " + libelleMois + ".");
                setOpen(false);
                router.refresh();
              } else {
                toast.error(res.message ?? "Une erreur est survenue.");
              }
            }}
            className="space-y-4"
          >
            <input type="hidden" name="annee" value={annee} />
            <input type="hidden" name="mois" value={mois} />
            <input type="hidden" name="selection" value={JSON.stringify(selection)} />

            <p className="text-sm text-muted-foreground">
              Reprend sur <span className="font-medium text-foreground">{libelleMois}</span> les
              régies facturées en{" "}
              <span className="font-medium text-foreground">{libelleMoisPrecedent}</span>. Écrase la
              prévision déjà saisie pour ce client sur le mois.
            </p>

            <div className="space-y-2">
              <Label htmlFor="dup-client">Client *</Label>
              <Select
                id="dup-client"
                value={clientId}
                onValueChange={choisirClient}
                placeholder="Choisir un client"
                options={clientsPrecedent.map((c) => ({ value: c.clientId, label: c.clientNom }))}
              />
            </div>

            {clientChoisi ? (
              <div className="space-y-2">
                <Label>Freelances à reprendre</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {clientChoisi.regies.map((r) => {
                    const etat = lignes[r.missionId] ?? { coche: false, jours: String(r.nbJours) };
                    return (
                      <div key={r.missionId} className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={etat.coche}
                            onChange={(e) => majLigne(r.missionId, { coche: e.target.checked })}
                          />
                          {r.label}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={etat.jours}
                            onChange={(e) => majLigne(r.missionId, { jours: e.target.value })}
                            disabled={!etat.coche}
                            className="h-8 w-20 text-right"
                          />
                          <span className="text-xs text-muted-foreground">j</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={selection.length === 0}>
                Dupliquer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
