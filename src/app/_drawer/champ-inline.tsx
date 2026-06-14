"use client";
// Champ éditable « au clic » : affiché comme du texte, il devient un champ de
// saisie uniquement quand on clique dessus. Validé sur Entrée ou perte de focus,
// annulé sur Échap.

import * as React from "react";
import { Pencil } from "lucide-react";
import type { OptionChamp } from "./types";

export function ChampInline({
  label,
  valeur,
  type = "text",
  options,
  onSave,
}: {
  label: string;
  valeur: string;
  type?: "text" | "number" | "select";
  options?: OptionChamp[];
  onSave: (valeur: string) => void | Promise<void>;
}) {
  const [edition, setEdition] = React.useState(false);
  const [v, setV] = React.useState(valeur);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selectRef = React.useRef<HTMLSelectElement>(null);

  React.useEffect(() => {
    if (edition) (type === "select" ? selectRef : inputRef).current?.focus();
  }, [edition, type]);

  function ouvrirEdition() {
    setV(valeur); // initialise depuis la valeur courante
    setEdition(true);
  }
  function valider() {
    setEdition(false);
    if (v !== valeur) onSave(v);
  }
  // Pour un select, on enregistre immédiatement le choix (pas de blur/Enter).
  function validerValeur(nouvelle: string) {
    setV(nouvelle);
    setEdition(false);
    if (nouvelle !== valeur) onSave(nouvelle);
  }
  function annuler() {
    setV(valeur);
    setEdition(false);
  }

  // Libellé affiché : pour un select, on montre le label de l'option courante.
  const affichage =
    type === "select" ? options?.find((o) => o.value === valeur)?.label ?? valeur : valeur;

  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {edition && type === "select" ? (
        <select
          ref={selectRef}
          value={v}
          onChange={(e) => validerValeur(e.target.value)}
          onBlur={() => setEdition(false)}
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : edition ? (
        <input
          ref={inputRef}
          type={type}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={valider}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              valider();
            } else if (e.key === "Escape") {
              annuler();
            }
          }}
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      ) : (
        <button
          type="button"
          onClick={ouvrirEdition}
          title="Cliquer pour modifier"
          className="group -mx-1 flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-sm font-medium hover:bg-muted"
        >
          <span className="truncate">
            {affichage || <span className="text-muted-foreground">(vide)</span>}
          </span>
          <Pencil
            aria-hidden
            className="size-3 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground"
          />
        </button>
      )}
    </div>
  );
}
