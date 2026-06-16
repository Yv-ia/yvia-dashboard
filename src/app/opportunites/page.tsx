import { db } from "@/db";
import { exigerSession } from "@/lib/auth/server";
import { opportunites, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { moisCourantDe, separerGagneesArchivees } from "@/lib/opportunites/gagnees";
import { OpportunitesVue } from "./opportunites-vue";

export default async function PageOpportunites() {
  await exigerSession();

  const [opps, clientsListe] = await Promise.all([
    db
      .select({
        id: opportunites.id,
        clientId: opportunites.clientId,
        clientNom: clients.nom,
        nom: opportunites.nom,
        type: opportunites.type,
        statut: opportunites.statut,
        montantEstime: opportunites.montantEstime,
        ordre: opportunites.ordre,
        projetId: opportunites.projetId,
        dateGagne: opportunites.dateGagne,
      })
      .from(opportunites)
      .innerJoin(clients, eq(opportunites.clientId, clients.id))
      .where(eq(opportunites.actif, true))
      .orderBy(opportunites.ordre),
    db
      .select({ id: clients.id, nom: clients.nom })
      .from(clients)
      .where(eq(clients.actif, true))
      .orderBy(clients.nom),
  ]);

  // Les gagnées des mois révolus quittent le tableau et passent dans les archives
  // (dérivé de dateGagne, sans écriture en base — le CA reste booké au mois de signature).
  const moisCourant = moisCourantDe(new Date());
  const { tableau, archivees } = separerGagneesArchivees(opps, moisCourant);

  return (
    <OpportunitesVue
      tableau={tableau}
      archivees={archivees}
      clientsListe={clientsListe}
      moisCourant={moisCourant}
    />
  );
}
