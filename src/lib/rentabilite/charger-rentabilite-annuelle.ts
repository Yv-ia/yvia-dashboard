import { db } from "@/db";
import { affectations, projets, decaissements, recurrents, opportunites } from "@/db/schema";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { calculerPrevisionnel12Mois, moisDeLAnnee } from "@/app/statistiques/previsionnel-calculs";
import { projeterRecurrent, type PlanningMensuel } from "@/lib/recurrents/previsionnel";

const arrondi = (n: number) => Math.round(n * 100) / 100;
const versMois = (date: string) => date.slice(0, 7);

export type MargeMois = { mois: string; ca: number; cout: number; marge: number };

export type RentabiliteAnnuelle = {
  annee: number;
  caRegieAnnee: number;
  caForfaitAnnee: number;
  caMcoAnnee: number;
  caAnnuelTotal: number;
  coutRegieAnnee: number;
  coutForfaitAnnee: number;
  coutMcoAnnee: number;
  coutAnnuelTotal: number;
  margePrevAnnee: number;
  tauxMargePrevAnnee: number;
  margeParMois: MargeMois[]; // 12 entrées (CA prévisionnel − coût prévisionnel par mois)
};

// Charge la rentabilité prévisionnelle de l'année : CA / coût / marge par source
// (annuels) ET la marge brute prévisionnelle mois par mois. Calcul partagé avec la
// page Rentabilité et le Dashboard pour garantir des chiffres cohérents.
export async function chargerRentabiliteAnnuelle(annee: number): Promise<RentabiliteAnnuelle> {
  const debutAnnee = `${annee}-01-01`;
  const finAnnee = `${annee}-12-31`;

  const champsRecurrent = {
    categorie: recurrents.categorie,
    montantRecurrent: recurrents.montantRecurrent,
    coutRecurrent: recurrents.coutRecurrent,
    dateDebut: recurrents.dateDebut,
    dateFin: recurrents.dateFin,
  };

  const [affsAnnee, forfaitsGagnes, recsRegie, recsNonRegie, decAnnee] = await Promise.all([
    db
      .select({
        date: affectations.date,
        tjmVente: affectations.tjmVente,
        tjmAchat: affectations.tjmAchat,
      })
      .from(affectations)
      .where(and(gte(affectations.date, debutAnnee), lte(affectations.date, finAnnee))),
    db
      .select({ dateGagne: opportunites.dateGagne, montant: opportunites.montantEstime })
      .from(opportunites)
      .where(
        and(
          eq(opportunites.type, "forfait"),
          eq(opportunites.statut, "gagne"),
          gte(opportunites.dateGagne, debutAnnee),
          lte(opportunites.dateGagne, finAnnee)
        )
      ),
    db
      .select(champsRecurrent)
      .from(recurrents)
      .where(and(eq(recurrents.actif, true), eq(recurrents.categorie, "regie"))),
    db
      .select(champsRecurrent)
      .from(recurrents)
      .where(and(eq(recurrents.actif, true), ne(recurrents.categorie, "regie"))),
    // Coût forfait : décaissements de l'année (réalisés + prévus = prévisionnel plein), avec la date pour la ventilation mensuelle.
    db
      .select({ date: decaissements.date, montant: decaissements.montant })
      .from(decaissements)
      .innerJoin(projets, eq(decaissements.projetId, projets.id))
      .where(
        and(
          eq(projets.actif, true),
          ne(projets.statutCommercial, "perdu"),
          gte(decaissements.date, debutAnnee),
          lte(decaissements.date, finAnnee)
        )
      ),
  ]);

  const versRecurrentPrevisionnel = (r: (typeof recsRegie)[number]) => ({
    categorie: r.categorie,
    montantRecurrent: Number(r.montantRecurrent),
    coutRecurrent: r.coutRecurrent == null ? null : Number(r.coutRecurrent),
    dateDebut: r.dateDebut,
    dateFin: r.dateFin,
  });

  // CA prévisionnel par mois et par source (régie réel + macro, récurrence, forfait).
  const { lignes, totaux: previsionnel } = calculerPrevisionnel12Mois({
    annee,
    affectations: affsAnnee,
    recurrentsRegie: recsRegie.map(versRecurrentPrevisionnel),
    recurrentsNonRegie: recsNonRegie.map(versRecurrentPrevisionnel),
    forfaitsGagnes,
  });

  // --- Coûts prévisionnels ventilés par mois ---
  const horizon = moisDeLAnnee(annee);
  const planningVide: PlanningMensuel = new Map();

  // Régie : Σ TJM achat des affectations posées, par mois.
  const coutRegieMois = new Map<string, number>();
  for (const a of affsAnnee) {
    const m = versMois(a.date);
    coutRegieMois.set(m, (coutRegieMois.get(m) ?? 0) + Number(a.tjmAchat));
  }
  // MCO : coût projeté des récurrents RUN/licence, par mois.
  const coutMcoMois = new Map<string, number>();
  for (const r of recsNonRegie) {
    for (const p of projeterRecurrent(versRecurrentPrevisionnel(r), planningVide, horizon)) {
      coutMcoMois.set(p.mois, (coutMcoMois.get(p.mois) ?? 0) + p.cout);
    }
  }
  // Forfait : Σ décaissements, par mois.
  const coutForfaitMois = new Map<string, number>();
  for (const d of decAnnee) {
    const m = versMois(d.date);
    coutForfaitMois.set(m, (coutForfaitMois.get(m) ?? 0) + Number(d.montant));
  }

  const margeParMois: MargeMois[] = lignes.map((l) => {
    const cout = arrondi(
      (coutRegieMois.get(l.mois) ?? 0) +
        (coutMcoMois.get(l.mois) ?? 0) +
        (coutForfaitMois.get(l.mois) ?? 0)
    );
    return { mois: l.mois, ca: l.total, cout, marge: arrondi(l.total - cout) };
  });

  const coutRegieAnnee = arrondi([...coutRegieMois.values()].reduce((s, v) => s + v, 0));
  const coutMcoAnnee = arrondi([...coutMcoMois.values()].reduce((s, v) => s + v, 0));
  const coutForfaitAnnee = arrondi([...coutForfaitMois.values()].reduce((s, v) => s + v, 0));
  const coutAnnuelTotal = arrondi(coutRegieAnnee + coutMcoAnnee + coutForfaitAnnee);
  const margePrevAnnee = arrondi(previsionnel.total - coutAnnuelTotal);

  return {
    annee,
    caRegieAnnee: previsionnel.regie,
    caForfaitAnnee: previsionnel.forfait,
    caMcoAnnee: previsionnel.recurrence,
    caAnnuelTotal: previsionnel.total,
    coutRegieAnnee,
    coutForfaitAnnee,
    coutMcoAnnee,
    coutAnnuelTotal,
    margePrevAnnee,
    tauxMargePrevAnnee: previsionnel.total > 0 ? margePrevAnnee / previsionnel.total : 0,
    margeParMois,
  };
}
