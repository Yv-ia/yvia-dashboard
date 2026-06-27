"use client";
// Tableau Kanban des to-do de pilotage : une colonne par domaine. Glisser-déposer
// (HTML5 natif, même approche que le Kanban des opportunités) à deux niveaux :
//  - déplacer une CARTE entre colonnes (= changer son domaine) et fixer sa
//    priorité (ordre intra-colonne : plus haut = plus prioritaire) ;
//  - réorganiser l'ORDRE DES COLONNES en glissant leur en-tête (priorité des
//    sujets, qui évolue selon l'année).
// Chaque carte est une tâche qui peut contenir des « actions » (étapes).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { labelStatutTodo, estTodoFaite } from "@/lib/todos/statut";
import type { ColonneKanban } from "@/lib/todos/colonnes";
import { TodoCheckbox } from "./todo-checkbox";
import { TodoFormDialog } from "./todo-form-dialog";
import { AjouterAction } from "./ajouter-action";
import {
  modifierTodo,
  creerTodo,
  supprimerTodo,
  ordonnerColonneTodos,
  ordonnerColonnesKanban,
} from "./actions";

export type TodoCarte = {
  id: number;
  titre: string;
  description: string | null;
  statut: string;
  domaine: string | null;
  owner: string | null;
  ordre: number;
  parentId: number | null;
};

// Pastille « owner » réutilisée sur la carte et les actions.
function PastilleOwner({ owner }: { owner: string | null }) {
  if (!owner) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <User className="size-3" />
      {owner}
    </span>
  );
}

function triPriorite(a: TodoCarte, b: TodoCarte): number {
  return a.ordre - b.ordre || a.id - b.id;
}

export function TodoKanban({
  todos,
  colonnes,
  utilisateurs,
}: {
  todos: TodoCarte[];
  colonnes: ColonneKanban[];
  utilisateurs: string[];
}) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [draggedColonne, setDraggedColonne] = useState<string | null>(null);

  // Macro-tâches = cartes des colonnes ; actions regroupées par parent.
  const macros = todos.filter((t) => t.parentId == null);
  const actionsParParent = new Map<number, TodoCarte[]>();
  for (const t of todos) {
    if (t.parentId == null) continue;
    const liste = actionsParParent.get(t.parentId) ?? [];
    liste.push(t);
    actionsParParent.set(t.parentId, liste);
  }

  function colonneMacros(cle: string): TodoCarte[] {
    return macros.filter((m) => m.domaine === cle).sort(triPriorite);
  }

  // Déplacement d'une CARTE : insère la carte à la position `index` de la colonne
  // cible (index < 0 = en fin), puis persiste domaine + priorités de la colonne.
  async function deposerCarte(cleCible: string, index: number) {
    const id = draggedId;
    setDraggedId(null);
    if (id == null) return;
    const ids = colonneMacros(cleCible)
      .map((m) => m.id)
      .filter((x) => x !== id);
    const position = index < 0 || index > ids.length ? ids.length : index;
    ids.splice(position, 0, id);

    const fd = new FormData();
    fd.set("domaine", cleCible);
    fd.set("ids", ids.join(","));
    const res = await ordonnerColonneTodos(fd);
    if (res.ok) router.refresh();
    else toast.error(res.message ?? "Déplacement impossible.");
  }

  // Réorganisation des COLONNES : insère la colonne déplacée avant la cible.
  async function deposerColonne(cleCible: string) {
    const source = draggedColonne;
    setDraggedColonne(null);
    if (!source || source === cleCible) return;
    const ordre = colonnes.map((c) => c.cle).filter((c) => c !== source);
    ordre.splice(ordre.indexOf(cleCible), 0, source);

    const fd = new FormData();
    fd.set("cles", ordre.join(","));
    const res = await ordonnerColonnesKanban(fd);
    if (res.ok) router.refresh();
    else toast.error(res.message ?? "Réorganisation impossible.");
  }

  // Un drop est soit un déplacement de colonne (si une colonne est saisie), soit
  // un déplacement de carte.
  function gererDrop(cle: string, index: number) {
    if (draggedColonne) deposerColonne(cle);
    else deposerCarte(cle, index);
  }

  function supprimer(id: number) {
    if (!confirm("Supprimer cet élément et ses actions ?")) return;
    const fd = new FormData();
    fd.set("id", String(id));
    supprimerTodo(fd).then((res) => {
      if (res.ok) router.refresh();
      else toast.error(res.message ?? "Suppression impossible.");
    });
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {colonnes.map((col) => {
        const cartes = colonneMacros(col.cle);
        return (
          <section
            key={col.cle}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => gererDrop(col.cle, -1)}
            className={cn(
              "flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2",
              draggedColonne === col.cle && "opacity-50"
            )}
          >
            <header
              draggable
              onDragStart={() => setDraggedColonne(col.cle)}
              onDragEnd={() => setDraggedColonne(null)}
              className="flex cursor-grab items-center gap-1.5 px-1 active:cursor-grabbing"
            >
              <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-sm font-medium">{col.label}</span>
              <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium leading-5 text-muted-foreground">
                {cartes.length}
              </span>
            </header>

            <div className="flex flex-col gap-2">
              {cartes.map((macro, index) => {
                const fait = estTodoFaite(macro.statut);
                const actions = (actionsParParent.get(macro.id) ?? []).slice().sort(triPriorite);
                const actionsFaites = actions.filter((e) => estTodoFaite(e.statut)).length;
                return (
                  <article
                    key={macro.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.stopPropagation();
                      gererDrop(col.cle, index);
                    }}
                    className={cn(
                      "rounded-md border border-border bg-background p-2 shadow-sm",
                      draggedId === macro.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {/* Poignée de drag dédiée : seule elle déclenche le déplacement,
                          pour que le reste de la carte (titre, champ d'ajout) reste éditable. */}
                      <span
                        draggable
                        onDragStart={() => setDraggedId(macro.id)}
                        onDragEnd={() => setDraggedId(null)}
                        aria-label="Déplacer la tâche"
                        className="cursor-grab pt-0.5 text-muted-foreground active:cursor-grabbing"
                      >
                        <GripVertical className="size-4" />
                      </span>
                      <span className="pt-0.5">
                        <TodoCheckbox id={macro.id} fait={fait} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <TodoFormDialog
                          action={modifierTodo}
                          todo={macro}
                          titre="Modifier la tâche"
                          utilisateurs={utilisateurs}
                          trigger={
                            <button
                              className={cn(
                                "text-left text-sm font-medium hover:text-primary hover:underline",
                                fait && "text-muted-foreground line-through"
                              )}
                            >
                              {macro.titre}
                            </button>
                          }
                        />
                        {macro.description ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{macro.description}</p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <PastilleOwner owner={macro.owner} />
                          {!fait ? (
                            <span className="text-[10px] text-muted-foreground">
                              {labelStatutTodo(macro.statut)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Supprimer"
                        title="Supprimer"
                        onClick={() => supprimer(macro.id)}
                        className="shrink-0"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>

                    {actions.length > 0 ? (
                      <div className="mt-2 space-y-1 border-l-2 border-muted pl-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Actions {actionsFaites}/{actions.length}
                        </p>
                        {actions.map((action) => {
                          const actionFaite = estTodoFaite(action.statut);
                          return (
                            <div key={action.id} className="flex items-center gap-2">
                              <TodoCheckbox id={action.id} fait={actionFaite} />
                              <TodoFormDialog
                                action={modifierTodo}
                                todo={action}
                                titre="Action"
                                utilisateurs={utilisateurs}
                                trigger={
                                  <button
                                    className={cn(
                                      "min-w-0 flex-1 truncate text-left text-xs hover:text-primary hover:underline",
                                      actionFaite && "text-muted-foreground line-through"
                                    )}
                                  >
                                    {action.titre}
                                  </button>
                                }
                              />
                              <PastilleOwner owner={action.owner} />
                              <button
                                aria-label="Supprimer l'action"
                                title="Supprimer"
                                onClick={() => supprimer(action.id)}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    <div className="mt-2 border-t pt-1">
                      <AjouterAction parentId={macro.id} />
                    </div>
                  </article>
                );
              })}
              {cartes.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                  Déposez une to-do ici
                </p>
              ) : null}

              {/* Ajout d'une tâche en bas de colonne. */}
              <TodoFormDialog
                action={creerTodo}
                titre="Nouvelle tâche"
                domaineParDefaut={col.cle}
                utilisateurs={utilisateurs}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 w-full justify-start text-muted-foreground"
                  >
                    <Plus className="size-4" />
                    Ajouter une tâche
                  </Button>
                }
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
