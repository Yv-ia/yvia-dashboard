"use client";
// Champ éditable « au clic » : affiché comme du texte, il devient un champ de
// saisie uniquement quand on clique dessus. Validé sur Entrée ou perte de focus,
// annulé sur Échap.

import * as React from "react";

export function ChampInline({
  label,
  valeur,
  type = "text",
  onSave,
}: {
  label: string;
  valeur: string;
  type?: "text" | "number";
  onSave: (valeur: string) => void | Promise<void>;
}) {
  const [edition, setEdition] = React.useState(false);
  const [v, setV] = React.useState(valeur);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (edition) inputRef.current?.focus();
  }, [edition]);

  function ouvrirEdition() {
    setV(valeur); // initialise depuis la valeur courante
    setEdition(true);
  }
  function valider() {
    setEdition(false);
    if (v !== valeur) onSave(v);
  }
  function annuler() {
    setV(valeur);
    setEdition(false);
  }

  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {edition ? (
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
          className="-mx-1 w-full rounded-md px-1 py-1 text-left text-sm font-medium hover:bg-muted"
        >
          {valeur || <span className="text-muted-foreground">(vide)</span>}
        </button>
      )}
    </div>
  );
}
