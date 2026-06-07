"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatEuro, formatDate } from "@/lib/format";
import {
  ajouterEncaissement,
  supprimerEncaissement,
  ajouterDecaissement,
  supprimerDecaissement,
  type Resultat,
} from "./actions";

type Encaissement = { id: number; date: string; montant: string; libelle: string | null };
type Decaissement = Encaissement & { freelanceNom: string };
type OptionFreelance = { id: number; prenom: string; nom: string };

export function ProjetDetailDialog({
  projet,
  encaissements,
  decaissements,
  freelancesActifs,
}: {
  projet: { id: number; nom: string; clientNom: string; budget: string };
  encaissements: Encaissement[];
  decaissements: Decaissement[];
  freelancesActifs: OptionFreelance[];
}) {
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const totalEnc = encaissements.reduce((s, e) => s + Number(e.montant), 0);
  const totalDec = decaissements.reduce((s, d) => s + Number(d.montant), 0);
  const marge = totalEnc - totalDec;
  const reste = Number(projet.budget) - totalEnc;

  async function gerer(res: Resultat, succes: string) {
    if (res.ok) toast.success(succes);
    else toast.error(res.message ?? "Une erreur est survenue.");
  }

  const triParDate = <T extends { date: string }>(arr: T[]) =>
    [...arr].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Gérer
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {projet.nom} <span className="text-muted-foreground">· {projet.clientNom}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Récap */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Recap titre="Budget" valeur={formatEuro(Number(projet.budget))} />
          <Recap titre="Encaissé" valeur={formatEuro(totalEnc)} />
          <Recap titre="Décaissé" valeur={formatEuro(totalDec)} />
          <Recap titre="Marge" valeur={formatEuro(marge)} accent={marge < 0} />
          <Recap titre="Reste à facturer" valeur={formatEuro(reste)} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Encaissements */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-600">Encaissements (client)</p>
            <div className="space-y-1">
              {triParDate(encaissements).length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun encaissement.</p>
              ) : (
                triParDate(encaissements).map((e) => (
                  <Ligne
                    key={e.id}
                    gauche={formatDate(e.date)}
                    milieu={e.libelle ?? ""}
                    droite={formatEuro(Number(e.montant))}
                    onSupprimer={async () => {
                      const fd = new FormData();
                      fd.set("id", String(e.id));
                      gerer(await supprimerEncaissement(fd), "Encaissement supprimé.");
                    }}
                  />
                ))
              )}
            </div>
            <form
              action={async (fd) => gerer(await ajouterEncaissement(fd), "Encaissement ajouté.")}
              className="space-y-2 border-t border-border pt-3"
            >
              <input type="hidden" name="projetId" value={projet.id} />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`enc-date-${projet.id}`}>Date *</Label>
                  <Input id={`enc-date-${projet.id}`} name="date" type="date" defaultValue={aujourdhui} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`enc-montant-${projet.id}`}>Montant (€) *</Label>
                  <Input id={`enc-montant-${projet.id}`} name="montant" type="number" min="0" step="1" required />
                </div>
              </div>
              <Input name="libelle" placeholder="Libellé (optionnel)" />
              <Button type="submit" size="sm" variant="outline">
                Ajouter un encaissement
              </Button>
            </form>
          </div>

          {/* Décaissements */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-rose-600">Décaissements (freelances)</p>
            <div className="space-y-1">
              {triParDate(decaissements).length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun décaissement.</p>
              ) : (
                triParDate(decaissements).map((d) => (
                  <Ligne
                    key={d.id}
                    gauche={`${formatDate(d.date)} · ${d.freelanceNom}`}
                    milieu={d.libelle ?? ""}
                    droite={formatEuro(Number(d.montant))}
                    onSupprimer={async () => {
                      const fd = new FormData();
                      fd.set("id", String(d.id));
                      gerer(await supprimerDecaissement(fd), "Décaissement supprimé.");
                    }}
                  />
                ))
              )}
            </div>
            <form
              action={async (fd) => gerer(await ajouterDecaissement(fd), "Décaissement ajouté.")}
              className="space-y-2 border-t border-border pt-3"
            >
              <input type="hidden" name="projetId" value={projet.id} />
              <div className="space-y-1">
                <Label htmlFor={`dec-freelance-${projet.id}`}>Freelance *</Label>
                <Select
                  id={`dec-freelance-${projet.id}`}
                  name="freelanceId"
                  required
                  defaultValue=""
                  placeholder="Choisir un freelance"
                  options={freelancesActifs.map((f) => ({
                    value: f.id,
                    label: `${f.prenom} ${f.nom}`,
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`dec-date-${projet.id}`}>Date *</Label>
                  <Input id={`dec-date-${projet.id}`} name="date" type="date" defaultValue={aujourdhui} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`dec-montant-${projet.id}`}>Montant (€) *</Label>
                  <Input id={`dec-montant-${projet.id}`} name="montant" type="number" min="0" step="1" required />
                </div>
              </div>
              <Input name="libelle" placeholder="Libellé (optionnel)" />
              <Button type="submit" size="sm" variant="outline">
                Ajouter un décaissement
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Recap({ titre, valeur, accent }: { titre: string; valeur: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className={`text-lg font-medium ${accent ? "text-rose-600" : ""}`}>{valeur}</p>
    </div>
  );
}

function Ligne({
  gauche,
  milieu,
  droite,
  onSupprimer,
}: {
  gauche: string;
  milieu: string;
  droite: string;
  onSupprimer: () => void | Promise<void>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
      <span className="shrink-0 font-medium">{gauche}</span>
      <span className="flex-1 truncate text-muted-foreground">{milieu}</span>
      <span className="shrink-0 tabular-nums">{droite}</span>
      <button
        onClick={onSupprimer}
        className="shrink-0 text-muted-foreground hover:text-rose-600"
        aria-label="Supprimer"
        title="Supprimer"
      >
        ×
      </button>
    </div>
  );
}
