import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { getSession } from "@/lib/auth/server";
import { estAdmin } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  creerInvitation,
  modifierRoleUtilisateur,
  supprimerInvitation,
  supprimerUtilisateur,
} from "./actions";
import { InviteUserDialog } from "./invite-user-dialog";
import { PendingInvitations } from "./pending-invitations";
import { UserRow } from "./user-row";

export default async function PageUsers() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!estAdmin(session)) redirect("/");

  const [liste, enAttente] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        prenom: users.prenom,
        nom: users.nom,
        role: users.role,
      })
      .from(users)
      .orderBy(users.nom, users.prenom, users.email),
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        prenom: invitations.prenom,
        nom: invitations.nom,
        token: invitations.token,
      })
      .from(invitations)
      .where(and(eq(invitations.utilisee, false), gt(invitations.expireLe, new Date().toISOString())))
      .orderBy(invitations.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <InviteUserDialog action={creerInvitation} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {liste.length} utilisateur{liste.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liste.map((utilisateur) => (
                <UserRow
                  key={utilisateur.id}
                  utilisateur={utilisateur}
                  estUtilisateurCourant={utilisateur.id === session.userId}
                  modifierRole={modifierRoleUtilisateur}
                  supprimer={supprimerUtilisateur}
                />
              ))}
            </TableBody>
          </Table>

          <PendingInvitations invitations={enAttente} supprimer={supprimerInvitation} />
        </CardContent>
      </Card>
    </div>
  );
}
