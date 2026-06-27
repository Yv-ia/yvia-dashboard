"use client";
// Case à cocher d'une to-do : bascule fait ↔ à faire (basculerTodo). Partagée
// par la liste /todo et le bloc « To-do par domaine » du dashboard.

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { basculerTodo } from "./actions";

export function TodoCheckbox({ id, fait }: { id: number; fait: boolean }) {
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      aria-label={fait ? "Marquer à faire" : "Marquer comme fait"}
      aria-pressed={fait}
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const fd = new FormData();
          fd.set("id", String(id));
          const res = await basculerTodo(fd);
          if (!res.ok) toast.error(res.message ?? "Une erreur est survenue.");
        })
      }
      className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
        fait
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary"
      }`}
    >
      {fait ? <Check className="size-3.5" /> : null}
    </button>
  );
}
