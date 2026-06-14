import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { labelRole } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordForm } from "./password-form";

export default async function PageParametres() {
  const session = await getSession();
  if (!session) redirect("/login");

  const nomComplet = [session.prenom, session.nom].filter(Boolean).join(" ");

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
            {session.email}
          </p>
          {nomComplet ? (
            <p>
              <span className="text-muted-foreground">Nom : </span>
              {nomComplet}
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Rôle : </span>
            {labelRole(session.role)}
          </p>
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

    </div>
  );
}
