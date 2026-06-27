// Bloc « To-do par domaine » du dashboard Rentabilité : les macro-tâches
// ouvertes (non terminées) regroupées par domaine, dans l'ordre des colonnes du
// Kanban, avec la progression de leurs actions. Lien vers le Kanban /todo.

import Link from "next/link";
import { ArrowUpRight, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { estTodoFaite } from "@/lib/todos/statut";
import { normaliserDomaineTodo } from "@/lib/todos/domaine";
import type { ColonneKanban } from "@/lib/todos/colonnes";
import { TodoCheckbox } from "./todo-checkbox";

export type TodoDashboard = {
  id: number;
  titre: string;
  statut: string;
  domaine: string | null;
  owner: string | null;
  parentId: number | null;
};

export function DomainesCard({
  todos,
  colonnes,
}: {
  todos: TodoDashboard[];
  colonnes: ColonneKanban[];
}) {
  // Progression des actions par macro-tâche (faites / total).
  const actions = new Map<number, { total: number; faites: number }>();
  for (const t of todos) {
    if (t.parentId == null) continue;
    const agg = actions.get(t.parentId) ?? { total: 0, faites: 0 };
    agg.total += 1;
    if (estTodoFaite(t.statut)) agg.faites += 1;
    actions.set(t.parentId, agg);
  }

  // Macro-tâches ouvertes regroupées par domaine (l'ordre vient de la requête).
  const macrosOuvertes = todos.filter((t) => t.parentId == null && !estTodoFaite(t.statut));
  const parDomaine = new Map<string | null, TodoDashboard[]>();
  for (const m of macrosOuvertes) {
    const cle = normaliserDomaineTodo(m.domaine);
    const liste = parDomaine.get(cle) ?? [];
    liste.push(m);
    parDomaine.set(cle, liste);
  }
  const groupes = colonnes
    .map((c) => ({ ...c, items: parDomaine.get(c.cle) ?? [] }))
    .filter((g) => g.items.length > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">To-do par domaine</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {groupes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune to-do ouverte. Ajoutez vos actions de pilotage sur le Kanban : elles
            s&apos;afficheront ici, regroupées par domaine.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupes.map((groupe) => (
              <div key={groupe.label} className="space-y-1">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {groupe.label}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {groupe.items.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {groupe.items.map((macro) => {
                    const progres = actions.get(macro.id);
                    return (
                      <li
                        key={macro.id}
                        className="flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
                      >
                        <span className="pt-0.5">
                          <TodoCheckbox id={macro.id} fait={false} />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium">{macro.titre}</span>
                        {macro.owner ? (
                          <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] text-muted-foreground">
                            <User className="size-3" />
                            {macro.owner}
                          </span>
                        ) : null}
                        {progres ? (
                          <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground">
                            {progres.faites}/{progres.total}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
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
