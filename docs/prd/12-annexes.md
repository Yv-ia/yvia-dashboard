# 12. Annexes

[← Roadmap & phasage](11-roadmap-phasage.md) · [Sommaire](README.md)

---

## 12.1 Glossaire métier

- **Régie :** vente de jours de freelances (TJM). **Forfait :** enveloppe à prix fixe. **Récurrent :** revenu mensuel régulier (RUN, licence, régie macro).
- **MCO (Maintien en Condition Opérationnelle) :** garantir que le logiciel **tourne** + maintenance **corrective** sur la stack technique & la sécurité. Facturé en récurrent.
- **TJM achat / vente :** tarif journalier payé au freelance / facturé au client.
- **Booking :** rattachement d'un CA à un mois (forfait : mois de signature `dateGagne`).
- **Régie macro / hypothèse macro :** estimation de régie (récurrent catégorie `regie`) qui **relaie** le planning réel sur les mois non planifiés.
- **Prévu / Réalisé :** attendu (pondéré) vs certain.
- **Fiabilité :** probabilité d'encaissement d'une échéance prévue (cascade échéance→projet→client→défaut ; 0,95 / 0,75 / 0,50 / 0,25).
- **Scénarios de trésorerie :** optimiste (100 %), pondéré (× proba), sécurisé (uniquement « sécurisé »).
- **Client actif :** client ayant généré du CA sur le mois (régie posée ou encaissement).
- **DSO :** délai moyen d'encaissement.
- **MRR :** revenu récurrent mensuel.
- **Epic :** grosse to-do de pilotage remontée sur le dashboard.

## 12.2 Dictionnaire de données

→ Tableau des entités en [§6.2](06-modele-de-donnees.md), énumérations exactes (valeurs + source) en [§6.3](06-modele-de-donnees.md), contraintes/intégrité en [§6.4](06-modele-de-donnees.md). Source de vérité : `src/db/schema.ts`.

## 12.3 Matrice droits × rôles

→ Matrice par domaine en [§2.3](02-personas-roles.md), définition des capacités en [§2.4](02-personas-roles.md). À matérialiser depuis `lib/auth/permissions.ts` (capacités, `peutAccederRoute`). À ce stade, un seul rôle applicatif effectif — **Associé Yvia** (`admin`) ; le rôle **Freelance** (accès self-service restreint) est à venir.

## 12.4 Hypothèses de calcul

- **Régie** : `CA(mois) = réel > 0 ? réel : macro` ; coût régie = Σ TJM achat posés (§7.1/§7.2).
- **Forfait** : booking à `dateGagne` ; coût = décaissements **réalisés + prévus** (prévisionnel plein) des projets actifs non perdus.
- **Récurrence** : projection à la volée, jours ouvrés FR (§7.3).
- **Fiabilité** : pondération côté **recette uniquement** ; coûts certains (§7.4).
- **Indicateurs mensuels** : définitions en [§7.12](07-regles-metier.md).

## 12.5 Historique des migrations (Drizzle)

`0000_projets_crm_simple` · `0001_supprimer_montant_envisage` · `0002_freelances_afficher_planning` · `0003_statut_client` · `0004_opportunites` · `0005_recurrents` · `0006_fige_projet_gagne` · `0007_backfill_projets_forfait_gagnes` · `0008_ajout_date_gagne` · `0009_encaissements_directs` · `0010_todos`.

---

_Brouillon v0.2 (passe approfondie hors-IA). Prochaine étape : passe IA approfondie
(chapitre 5 + encadrés « Capacités IA » par module) et validation d'ensemble._
