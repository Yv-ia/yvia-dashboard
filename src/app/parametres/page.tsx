import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, invitations } from "@/db/schema";
import { getSession } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordForm } from "./password-form";
import { InviteSection } from "./invite-section";

export default async function PageParametres() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [u] = await db
    .select({ email: users.email, nom: users.nom })
    .from(users)
    .where(eq(users.id, session.userId));

  const enAttente = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      nom: invitations.nom,
      token: invitations.token,
    })
    .from(invitations)
    .where(and(eq(invitations.utilisee, false), gt(invitations.expireLe, new Date().toISOString())))
    .orderBy(invitations.id);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Paramètres</h1>

      <Card>
        <CardHeader>
          <CardTitle>Mon compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Email : </span>
            {u?.email}
          </p>
          {u?.nom ? (
            <p>
              <span className="text-muted-foreground">Nom : </span>
              {u.nom}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer mon mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inviter un associé</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteSection invitations={enAttente} />
        </CardContent>
      </Card>
    </div>
  );
}
