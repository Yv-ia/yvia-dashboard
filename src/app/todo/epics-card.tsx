// Bloc « epics » du dashboard Rentabilité : les grosses to-do (epic = true), à
// faire en tête. Case à cocher pour les terminer ; lien vers la page To-do
// complète. Composant serveur qui héberge des enfants clients (checkbox, dialog).

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labelStatutTodo, estTodoFaite } from "@/lib/todos/statut";
import { TodoCheckbox } from "./todo-checkbox";
import { TodoFormDialog } from "./todo-form-dialog";
import { creerTodo } from "./actions";

export type EpicDashboard = {
  id: number;
  titre: string;
  description: string | null;
  statut: string;
};

export function EpicsCard({ epics }: { epics: EpicDashboard[] }) {
  const aTraiter = epics.filter((e) => !estTodoFaite(e.statut));
  const faites = epics.filter((e) => estTodoFaite(e.statut));
  const ordonnees = [...aTraiter, ...faites];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">To-do (epics)</CardTitle>
        <CardAction>
          <TodoFormDialog
            action={creerTodo}
            titre="Nouvelle epic"
            epicParDefaut
            trigger={
              <Button variant="ghost" size="sm">
                <Plus className="size-4" />
                Ajouter
              </Button>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {ordonnees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune epic. Ajoutez vos gros chantiers : ils s&apos;afficheront ici.
          </p>
        ) : (
          <ul className="space-y-1">
            {ordonnees.map((epic) => {
              const fait = estTodoFaite(epic.statut);
              return (
                <li
                  key={epic.id}
                  className="flex items-start gap-3 rounded-md px-1 py-2 hover:bg-muted/50"
                >
                  <span className="pt-0.5">
                    <TodoCheckbox id={epic.id} fait={fait} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm ${
                        fait ? "text-muted-foreground line-through" : "font-medium"
                      }`}
                    >
                      {epic.titre}
                    </span>
                    {epic.description ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {epic.description}
                      </span>
                    ) : null}
                  </span>
                  {!fait ? (
                    <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                      {labelStatutTodo(epic.statut)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-auto pt-4">
          <Link
            href="/todo"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Voir toutes les to-do
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
