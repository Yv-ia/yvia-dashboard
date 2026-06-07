"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { affecterJours, libererJours, modifierTjmAffectation } from "./planning-actions";

export type Jour = {
  date: string; // AAAA-MM-JJ
  num: number; // numéro du jour
  lettre: string; // L, M, M, J, V, S, D
  weekend: boolean;
  ferie: boolean;
  estAujourdhui: boolean;
};

export type MissionOption = {
  id: number;
  nom: string;
  clientNom: string;
  couleur: Couleur;
};
export type Couleur = { bg: string; fg: string };

export type LigneFreelance = {
  id: number;
  nom: string;
  missions: MissionOption[]; // missions disponibles au planning pour ce freelance
  // affectations: date -> mission affectée (avec le TJM figé du jour)
  cellules: Record<
    string,
    {
      missionNom: string;
      clientNom: string;
      couleur: Couleur;
      tjmAchat: string;
      tjmVente: string;
    }
  >;
};

export function PlanningCalendar({
  jours,
  lignes,
}: {
  jours: Jour[];
  lignes: LigneFreelance[];
}) {
  // Sélection en cours : un freelance + une plage d'indices de jours.
  const [selection, setSelection] = useState<{
    freelanceId: number;
    debut: number;
    fin: number;
  } | null>(null);
  const [glisse, setGlisse] = useState(false);
  const [popup, setPopup] = useState<{ freelanceId: number; dates: string[] } | null>(null);

  // Fin du glissé même si on relâche la souris hors de la grille.
  useEffect(() => {
    function onUp() {
      if (glisse && selection) {
        const [min, max] = [
          Math.min(selection.debut, selection.fin),
          Math.max(selection.debut, selection.fin),
        ];
        const dates = jours.slice(min, max + 1).map((j) => j.date);
        setPopup({ freelanceId: selection.freelanceId, dates });
      }
      setGlisse(false);
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [glisse, selection, jours]);

  function dansSelection(freelanceId: number, index: number) {
    if (!selection || selection.freelanceId !== freelanceId) return false;
    const [min, max] = [
      Math.min(selection.debut, selection.fin),
      Math.max(selection.debut, selection.fin),
    ];
    return index >= min && index <= max;
  }

  const ligneActive = popup ? lignes.find((l) => l.id === popup.freelanceId) : null;

  function fermerPopup() {
    setPopup(null);
    setSelection(null);
  }

  async function choisirMission(missionId: number) {
    if (!popup) return;
    const res = await affecterJours(missionId, popup.freelanceId, popup.dates);
    if (res.ok) toast.success("Planning mis à jour.");
    else toast.error(res.message ?? "Erreur.");
    fermerPopup();
  }

  async function liberer() {
    if (!popup) return;
    const res = await libererJours(popup.freelanceId, popup.dates);
    if (res.ok) toast.success("Jours libérés.");
    else toast.error(res.message ?? "Erreur.");
    fermerPopup();
  }

  async function enregistrerTarifJour(tjmAchat: string, tjmVente: string) {
    if (!popup) return;
    const res = await modifierTjmAffectation(
      popup.freelanceId,
      popup.dates[0],
      tjmAchat,
      tjmVente
    );
    if (res.ok) toast.success("Tarif du jour mis à jour.");
    else toast.error(res.message ?? "Erreur.");
    fermerPopup();
  }

  // Case unique déjà occupée : on peut éditer son TJM directement.
  const celluleUnique =
    popup && popup.dates.length === 1 && ligneActive
      ? ligneActive.cellules[popup.dates[0]] ?? null
      : null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="border-collapse select-none text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-44 border-b border-border bg-card px-3 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Freelance
            </th>
            {jours.map((j) => (
              <th
                key={j.date}
                className={`w-9 border-b border-l px-0 py-1 text-center text-xs font-medium ${
                  j.estAujourdhui
                    ? "border-primary bg-primary/10 text-primary"
                    : `border-border ${
                        j.weekend || j.ferie
                          ? "bg-secondary text-muted-foreground"
                          : "text-muted-foreground"
                      }`
                }`}
                title={
                  j.estAujourdhui ? "Aujourd'hui" : j.ferie ? "Jour férié" : undefined
                }
              >
                <div>{j.lettre}</div>
                <div className={j.estAujourdhui ? "text-primary" : "text-foreground"}>
                  {j.num}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr key={ligne.id}>
              <td className="sticky left-0 z-10 border-b border-border bg-card px-3 py-1 font-medium whitespace-nowrap">
                {ligne.nom}
              </td>
              {jours.map((j, index) => {
                const cellule = ligne.cellules[j.date];
                const selectionnee = dansSelection(ligne.id, index);
                return (
                  <td
                    key={j.date}
                    onMouseDown={() => {
                      setSelection({ freelanceId: ligne.id, debut: index, fin: index });
                      setGlisse(true);
                    }}
                    onMouseEnter={() => {
                      if (glisse && selection && selection.freelanceId === ligne.id) {
                        setSelection({ ...selection, fin: index });
                      }
                    }}
                    className={`h-9 w-9 cursor-pointer border-b border-l p-0.5 text-center align-middle ${
                      j.estAujourdhui ? "border-l-primary bg-primary/5" : "border-l-border"
                    } border-b-border ${
                      j.weekend || j.ferie ? "bg-secondary/60" : ""
                    } ${selectionnee ? "ring-2 ring-inset ring-primary" : ""}`}
                  >
                    {cellule ? (
                      <div
                        className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm text-[10px] leading-none"
                        style={{ backgroundColor: cellule.couleur.bg, color: cellule.couleur.fg }}
                        title={`${cellule.missionNom} (client : ${cellule.clientNom})`}
                      >
                        {cellule.missionNom.slice(0, 3)}
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pop-up de sélection de mission */}
      <Dialog open={popup !== null} onOpenChange={(o) => (!o ? fermerPopup() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {ligneActive?.nom}
              {popup && popup.dates.length > 0
                ? ` : ${popup.dates.length} jour${popup.dates.length > 1 ? "s" : ""}`
                : ""}
            </DialogTitle>
          </DialogHeader>

          {/* Édition du TJM d'un seul jour déjà posé */}
          {celluleUnique ? (
            <EditeurTarifJour
              key={popup?.dates[0]}
              tarif={celluleUnique}
              onSave={enregistrerTarifJour}
            />
          ) : null}

          {ligneActive && ligneActive.missions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Affecter à la mission :</p>
              {ligneActive.missions.map((m) => (
                <button
                  key={m.id}
                  onClick={() => choisirMission(m.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <span
                    className="size-4 shrink-0 rounded-sm"
                    style={{ backgroundColor: m.couleur.bg }}
                  />
                  <span className="flex flex-col leading-tight">
                    <span className="font-medium">{m.nom}</span>
                    <span className="text-xs text-muted-foreground">Client : {m.clientNom}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune mission disponible au planning pour ce freelance.
            </p>
          )}

          <div className="pt-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  Libérer ces jours
                </Button>
              }
              titre="Libérer ces jours ?"
              description="Les affectations sélectionnées seront retirées du planning."
              confirmLabel="Libérer"
              destructif
              onConfirm={liberer}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Petit formulaire d'édition du TJM d'un seul jour. Monté à neuf à chaque ouverture
// du pop-up (clé sur la date), donc l'état part toujours des bonnes valeurs.
function EditeurTarifJour({
  tarif,
  onSave,
}: {
  tarif: { tjmAchat: string; tjmVente: string };
  onSave: (tjmAchat: string, tjmVente: string) => void;
}) {
  const [tjmAchat, setTjmAchat] = useState(tarif.tjmAchat);
  const [tjmVente, setTjmVente] = useState(tarif.tjmVente);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(tjmAchat, tjmVente);
      }}
      className="space-y-3 rounded-lg border border-border p-3"
    >
      <p className="text-sm font-medium">Tarif de ce jour</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cell-achat">TJM achat (€ HT)</Label>
          <Input
            id="cell-achat"
            type="number"
            min="0"
            step="1"
            value={tjmAchat}
            onChange={(e) => setTjmAchat(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cell-vente">TJM vente (€ HT)</Label>
          <Input
            id="cell-vente"
            type="number"
            min="0"
            step="1"
            value={tjmVente}
            onChange={(e) => setTjmVente(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" size="sm">
        Enregistrer le tarif
      </Button>
    </form>
  );
}
