"use client";
// Ajout rapide d'une « action » (étape) sous une macro-tâche, depuis sa carte
// Kanban. Champ texte + Entrée ; l'action hérite simplement du parent (pas de
// domaine propre). S'appuie sur creerTodo avec parentId.

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { creerTodo } from "./actions";

export function AjouterAction({ parentId }: { parentId: number }) {
  const [titre, setTitre] = useState("");
  const [enCours, demarrer] = useTransition();

  function soumettre() {
    const valeur = titre.trim();
    if (!valeur) return;
    demarrer(async () => {
      const fd = new FormData();
      fd.set("titre", valeur);
      fd.set("parentId", String(parentId));
      const res = await creerTodo(fd);
      if (res.ok) setTitre("");
      else toast.error(res.message ?? "Ajout impossible.");
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        soumettre();
      }}
      className="mt-1 flex items-center gap-1"
    >
      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        disabled={enCours}
        placeholder="Ajouter une action"
        className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
    </form>
  );
}
