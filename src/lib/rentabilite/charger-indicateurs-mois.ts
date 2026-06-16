import { db } from "@/db";
import { affectations, missions, projets, encaissements, decaissements } from "@/db/schema";
import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { premierJourDuMois, dernierJourDuMois } from "@/lib/calculs/jours-ouvres";
import { calculerIndicateursMois, type IndicateursMois } from "./indicateurs";

// Charge les indicateurs de rentabilité réalisés du mois affiché ET du mois
// précédent (pour les écarts des KPI). Une seule fenêtre de requêtes
// [mois précédent -> mois affiché] alimente les deux calculs.
export async function chargerIndicateursMois(
  annee: number,
  mois: number
): Promise<{ indic: IndicateursMois; indicPrec: IndicateursMois }> {
  const debutMois = premierJourDuMois(annee, mois);
  const finMois = dernierJourDuMois(annee, mois);
  const moisPrec = mois === 1 ? 12 : mois - 1;
  const anneePrec = mois === 1 ? annee - 1 : annee;
  const debutMoisPrec = premierJourDuMois(anneePrec, moisPrec);
  const finMoisPrec = dernierJourDuMois(anneePrec, moisPrec);

  const [regieFenetre, encForfaitsFenetre, encDirectsFenetre, decFenetre] = await Promise.all([
    // Régie réelle : jours posés (CA = TJM vente, coût = TJM achat), par client.
    db
      .select({
        clientId: missions.clientId,
        date: affectations.date,
        tjmVente: affectations.tjmVente,
        tjmAchat: affectations.tjmAchat,
      })
      .from(affectations)
      .innerJoin(missions, eq(affectations.missionId, missions.id))
      .where(and(gte(affectations.date, debutMoisPrec), lte(affectations.date, finMois))),
    // Forfait : encaissements réalisés (le prévu ne compte pas comme CA).
    db
      .select({
        clientId: projets.clientId,
        date: encaissements.date,
        montant: encaissements.montant,
      })
      .from(encaissements)
      .innerJoin(projets, eq(encaissements.projetId, projets.id))
      .where(
        and(
          eq(encaissements.statut, "encaisse"),
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(encaissements.date, debutMoisPrec),
          lte(encaissements.date, finMois)
        )
      ),
    // Encaissements directs réalisés (hors deal forfait), portés par client.
    db
      .select({
        clientId: encaissements.clientId,
        date: encaissements.date,
        montant: encaissements.montant,
      })
      .from(encaissements)
      .where(
        and(
          eq(encaissements.statut, "encaisse"),
          isNull(encaissements.projetId),
          gte(encaissements.date, debutMoisPrec),
          lte(encaissements.date, finMois)
        )
      ),
    // Forfait : décaissements réalisés (coût).
    db
      .select({
        clientId: projets.clientId,
        date: decaissements.date,
        montant: decaissements.montant,
      })
      .from(decaissements)
      .innerJoin(projets, eq(decaissements.projetId, projets.id))
      .where(
        and(
          eq(decaissements.statut, "decaisse"),
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(decaissements.date, debutMoisPrec),
          lte(decaissements.date, finMois)
        )
      ),
  ]);

  const encFenetre = [
    ...encForfaitsFenetre,
    ...encDirectsFenetre.flatMap((enc) =>
      enc.clientId == null
        ? []
        : [{ clientId: enc.clientId, date: enc.date, montant: enc.montant }]
    ),
  ];

  const indic = calculerIndicateursMois({
    regie: regieFenetre,
    encaissements: encFenetre,
    decaissements: decFenetre,
    debutMois,
    finMois,
  });
  const indicPrec = calculerIndicateursMois({
    regie: regieFenetre,
    encaissements: encFenetre,
    decaissements: decFenetre,
    debutMois: debutMoisPrec,
    finMois: finMoisPrec,
  });

  return { indic, indicPrec };
}
