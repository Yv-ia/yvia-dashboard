import Link from "next/link";
import { db } from "@/db";
import { freelances, missions, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FreelanceFormDialog } from "./freelance-form-dialog";
import { FreelanceDetailDialog } from "./freelance-detail-dialog";
import { ToggleActifButton } from "./toggle-actif-button";
import { creerFreelance, modifierFreelance } from "./actions";

export default async function PageFreelances({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  const { vue } = await searchParams;
  const archives = vue === "archives";

  // Actifs par défaut ; archivés dans l'onglet Archives.
  const liste = await db
    .select()
    .from(freelances)
    .where(eq(freelances.actif, !archives))
    .orderBy(freelances.nom);

  // Missions par freelance (clients) pour la fiche détaillée.
  const missionsRows = await db
    .select({ freelanceId: missions.freelanceId, clientNom: clients.nom })
    .from(missions)
    .innerJoin(clients, eq(missions.clientId, clients.id));

  const missionsParFreelance = new Map<number, { clientNom: string }[]>();
  for (const m of missionsRows) {
    const arr = missionsParFreelance.get(m.freelanceId) ?? [];
    arr.push({ clientNom: m.clientNom });
    missionsParFreelance.set(m.freelanceId, arr);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Freelances</h1>
        <FreelanceFormDialog
          action={creerFreelance}
          titre="Nouveau freelance"
          trigger={<Button>Nouveau freelance</Button>}
        />
      </div>

      {/* Onglets Actifs / Archives */}
      <div className="flex gap-1">
        <Link
          href="/freelances"
          className={`rounded-md px-3 py-1.5 text-sm ${
            !archives ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Actifs
        </Link>
        <Link
          href="/freelances?vue=archives"
          className={`rounded-md px-3 py-1.5 text-sm ${
            archives ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Archives
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {liste.length} freelance{liste.length > 1 ? "s" : ""}
            {archives ? " archivé" + (liste.length > 1 ? "s" : "") : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liste.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {archives
                ? "Aucun freelance archivé."
                : "Aucun freelance pour l’instant. Cliquez sur « Nouveau freelance » pour en ajouter un."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste.map((freelance) => (
                  <TableRow key={freelance.id}>
                    <TableCell>
                      <FreelanceDetailDialog
                        nom={`${freelance.prenom} ${freelance.nom}`}
                        missions={missionsParFreelance.get(freelance.id) ?? []}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <FreelanceFormDialog
                        action={modifierFreelance}
                        freelance={freelance}
                        titre="Modifier le freelance"
                        trigger={
                          <Button variant="ghost" size="sm">
                            Modifier
                          </Button>
                        }
                      />
                      <ToggleActifButton id={freelance.id} actif={freelance.actif} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
