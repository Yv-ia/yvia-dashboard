// Page To-do : liste complète des actions de pilotage. Les to-do « epic »
// (étoile) remontent sur le dashboard Rentabilité.

import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { todos } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { estTodoFaite } from "@/lib/todos/statut";
import { TodoFormDialog } from "./todo-form-dialog";
import { TodoRow } from "./todo-row";
import { creerTodo } from "./actions";

export default async function PageTodo() {
  await exigerSession();

  const liste = await db
    .select({
      id: todos.id,
      titre: todos.titre,
      description: todos.description,
      statut: todos.statut,
      epic: todos.epic,
    })
    .from(todos)
    .orderBy(asc(todos.ordre), asc(todos.id));

  // En tête : à faire et en cours ; les to-do terminées descendent en bas.
  const aTraiter = liste.filter((t) => !estTodoFaite(t.statut));
  const faites = liste.filter((t) => estTodoFaite(t.statut));
  const ordonnees = [...aTraiter, ...faites];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <TodoFormDialog
          action={creerTodo}
          titre="Nouvelle to-do"
          trigger={<Button>Nouvelle to-do</Button>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {aTraiter.length} to-do{aTraiter.length > 1 ? "s" : ""} à traiter
            {faites.length > 0 ? ` · ${faites.length} terminée${faites.length > 1 ? "s" : ""}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordonnees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune to-do. Cliquez sur « Nouvelle to-do » pour en ajouter une. Marquez-la « epic »
              (étoile) pour la voir sur le dashboard Rentabilité.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"> </TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Epic · Suppr.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordonnees.map((todo) => (
                  <TodoRow key={todo.id} todo={todo} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
