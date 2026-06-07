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
import { affecterJours, libererJours } from "./planning-actions";

export type Jour = {
  date: string; // AAAA-MM-JJ
  num: number; // numéro du jour
  lettre: string; // L, M, M, J, V, S, D
  weekend: boolean;
  ferie: boolean;
};

export type MissionOption = { id: number; clientNom: string; couleur: Couleur };
export type Couleur = { bg: string; fg: string };

export type LigneFreelance = {
  id: number;
  nom: string;
  missions: MissionOption[]; // missions disponibles au planning pour ce freelance
  // affectations: date -> mission affectée
  cellules: Record<string, { clientNom: string; couleur: Couleur }>;
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
                className={`w-9 border-b border-l border-border px-0 py-1 text-center text-xs font-medium ${
                  j.weekend || j.ferie ? "bg-secondary text-muted-foreground" : "text-muted-foreground"
                }`}
                title={j.ferie ? "Jour férié" : undefined}
              >
                <div>{j.lettre}</div>
                <div className="text-foreground">{j.num}</div>
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
                    className={`h-9 w-9 cursor-pointer border-b border-l border-border p-0.5 text-center align-middle ${
                      j.weekend || j.ferie ? "bg-secondary/60" : ""
                    } ${selectionnee ? "ring-2 ring-inset ring-primary" : ""}`}
                  >
                    {cellule ? (
                      <div
                        className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm text-[10px] leading-none"
                        style={{ backgroundColor: cellule.couleur.bg, color: cellule.couleur.fg }}
                        title={cellule.clientNom}
                      >
                        {cellule.clientNom.slice(0, 3)}
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
                    className="size-4 rounded-sm"
                    style={{ backgroundColor: m.couleur.bg }}
                  />
                  {m.clientNom}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune mission disponible au planning pour ce freelance.
            </p>
          )}

          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={liberer}>
              Libérer ces jours
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
