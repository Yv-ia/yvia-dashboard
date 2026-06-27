// Page To-Do Yvia : Kanban des tâches de pilotage, une colonne par domaine
// (stratégie · sales · delivery · finance & admin). L'ordre des colonnes est
// réorganisable et persisté. Chaque carte est une tâche pouvant contenir des
// « actions » ; l'ordre intra-colonne fait office de priorité. L'owner d'une
// tâche/action se choisit parmi les utilisateurs de l'application.

import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { todos, users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { lireColonnesKanban } from "@/lib/todos/colonnes";
import { TodoKanban } from "./todo-kanban";

export default async function PageTodo() {
  await exigerSession();

  const [liste, colonnes, utilisateursRows] = await Promise.all([
    db
      .select({
        id: todos.id,
        titre: todos.titre,
        description: todos.description,
        statut: todos.statut,
        domaine: todos.domaine,
        owner: todos.owner,
        ordre: todos.ordre,
        parentId: todos.parentId,
      })
      .from(todos)
      .orderBy(asc(todos.ordre), asc(todos.id)),
    lireColonnesKanban(),
    db
      .select({ prenom: users.prenom, nom: users.nom, email: users.email })
      .from(users)
      .where(eq(users.actif, true))
      .orderBy(asc(users.id)),
  ]);

  // Owners proposés = utilisateurs actifs de l'app (nom affiché, e-mail à défaut).
  const utilisateurs = utilisateursRows.map(
    (u) => [u.prenom, u.nom].filter(Boolean).join(" ") || u.email
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">To-Do Yvia</h1>
      <TodoKanban todos={liste} colonnes={colonnes} utilisateurs={utilisateurs} />
    </div>
  );
}
