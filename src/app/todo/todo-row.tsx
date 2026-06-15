"use client";
// Ligne d'une to-do dans la liste /todo : case à cocher, titre (ouvre l'édition),
// statut, bascule « epic » (étoile) et suppression.

import { useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { labelStatutTodo, estTodoFaite } from "@/lib/todos/statut";
import { TodoCheckbox } from "./todo-checkbox";
import { TodoFormDialog } from "./todo-form-dialog";
import { modifierTodo, basculerEpic, supprimerTodo } from "./actions";

export type LigneTodo = {
  id: number;
  titre: string;
  description: string | null;
  statut: string;
  epic: boolean;
};

export function TodoRow({ todo }: { todo: LigneTodo }) {
  const [enCours, demarrer] = useTransition();
  const fait = estTodoFaite(todo.statut);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const action = (fn: (fd: FormData) => Promise<{ ok: boolean; message?: string }>, fd: FormData) =>
    demarrer(async () => {
      const res = await fn(fd);
      if (!res.ok) toast.error(res.message ?? "Une erreur est survenue.");
    });

  return (
    <TableRow className={fait ? "text-muted-foreground" : undefined}>
      <TableCell className="w-8" onClick={stop}>
        <TodoCheckbox id={todo.id} fait={fait} />
      </TableCell>
      <TableCell onClick={stop}>
        <TodoFormDialog
          action={modifierTodo}
          todo={todo}
          titre="Modifier la to-do"
          trigger={
            <button
              className={`text-left font-medium hover:text-primary hover:underline ${
                fait ? "line-through" : ""
              }`}
            >
              {todo.titre}
            </button>
          }
        />
        {todo.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{todo.description}</p>
        ) : null}
      </TableCell>
      <TableCell>
        <span className="text-sm">{labelStatutTodo(todo.statut)}</span>
      </TableCell>
      <TableCell className="text-right" onClick={stop}>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={enCours}
            aria-label={todo.epic ? "Retirer des epics" : "Marquer comme epic"}
            title={todo.epic ? "Epic (affichée sur le dashboard)" : "Marquer comme epic"}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", String(todo.id));
              fd.set("epic", String(todo.epic));
              action(basculerEpic, fd);
            }}
          >
            <Star
              className={`size-4 ${todo.epic ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={enCours}
            aria-label="Supprimer"
            title="Supprimer"
            onClick={() => {
              if (!confirm("Supprimer cette to-do ?")) return;
              const fd = new FormData();
              fd.set("id", String(todo.id));
              action(supprimerTodo, fd);
            }}
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
