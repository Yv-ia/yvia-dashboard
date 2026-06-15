"use client";
// Création / édition d'une to-do de pilotage. L'« epic » remonte sur le dashboard.

import { useState } from "react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { STATUTS_TODO, STATUT_TODO_DEFAUT } from "@/lib/todos/statut";
import type { Resultat } from "./actions";

type Todo = {
  id: number;
  titre: string;
  description: string | null;
  statut: string;
  epic: boolean;
};

export function TodoFormDialog({
  action,
  todo,
  titre,
  trigger,
  epicParDefaut = false,
}: {
  action: (formData: FormData) => Promise<Resultat>;
  todo?: Todo;
  titre: string;
  trigger: React.ReactElement;
  epicParDefaut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [epic, setEpic] = useState(todo?.epic ?? epicParDefaut);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>

        <form
          key={todo ? `${todo.id}` : "new"}
          action={async (formData) => {
            const res = await action(formData);
            if (res.ok) {
              toast.success("To-do enregistrée.");
              setOpen(false);
            } else {
              toast.error(res.message ?? "Une erreur est survenue.");
            }
          }}
          className="space-y-4"
        >
          {todo ? <input type="hidden" name="id" value={todo.id} /> : null}
          <input type="hidden" name="epic" value={String(epic)} />

          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input id="titre" name="titre" defaultValue={todo?.titre ?? ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={todo?.description ?? ""}
              rows={3}
              className="w-full min-w-0 rounded-xl border border-transparent bg-secondary px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select
                id="statut"
                name="statut"
                defaultValue={todo?.statut ?? STATUT_TODO_DEFAUT}
                options={STATUTS_TODO.map((s) => ({ value: s.key, label: s.label }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="epic">Epic (grosse to-do)</Label>
              <div className="flex h-9 items-center gap-2">
                <Switch id="epic" checked={epic} onCheckedChange={setEpic} />
                <span className="text-sm text-muted-foreground">
                  {epic ? "Affichée sur le dashboard" : "To-do classique"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
