# 11. Roadmap & phasage

[← Succès & mesure](10-succes-mesure.md) · [Sommaire](README.md) · [Chapitre suivant → Annexes](12-annexes.md)

---

> Indicatif — à arbitrer avec la direction. Les phases **IA** seront détaillées en 2ᵉ temps.

## 11.1 Socle (acquis / en cours)

Modèle de données unifié (13 tables, 11 migrations), pipeline opportunités (forfait/récurrent, Kanban, conversion), régie & planning (missions, affectations, TJM figé), récurrents/MCO, trésorerie (prévu/réalisé + fiabilité), pilotage (Dashboard, Rentabilité, Cockpit mensuel, Prévisionnel 12 mois), Annuaire (Clients, Freelances, **Utilisateurs**), RBAC par capacités (Associé Yvia aujourd'hui).

## 11.2 Phases IA _(cadre — détail en 2ᵉ temps)_

- **Phase 1 — IA « lecture » :** copilot conversationnel sur la donnée + brief mensuel auto-généré + explication des écarts.
- **Phase 2 — IA « alerte » :** insights proactifs (marge, staffing, trésorerie, deals qui stagnent) → file d'actions/to-do.
- **Phase 3 — IA « prévision » :** probabilité de signature, saisonnalité, scénarios de capacité/trésorerie.
- **Phase 4 — IA « action » (agents) :** préparation du prévisionnel, brouillons de relance, recommandations de staffing — sous human-in-the-loop.

## 11.3 Portail Freelance _(à venir, cf. [§4.8](04-perimetre-fonctionnel.md))_

D'abord le **time-tracking** (palier 1), puis — à terme — la vue self-service sur **ses missions** et **ses paiements** (paliers 2 et 3). Introduit le rôle applicatif `freelance` et son périmètre de données restreint (§7.11).

## 11.4 Transverse / dette

- Retrait de `projets.statutCommercial` une fois les vues 100 % migrées vers `opportunites` (§6.4).
- Interfaçage comptable / bancaire (réduire la double-saisie).
- Ouverture multi-tenant éventuelle (isolation par organisation) si produit externalisé.

## 11.5 Dépendances clés

- Le **Portail Freelance** dépend du time-tracking (réconciliation planning) et du rôle `freelance`.
- Les phases IA « alerte/prévision » dépendent de la **qualité de saisie** (hygiène de données, §10.1) et de l'**infra IA** (§8.5).
