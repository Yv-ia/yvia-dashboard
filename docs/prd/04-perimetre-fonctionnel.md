# 4. Périmètre fonctionnel par domaine

[← Parcours & JTBD](03-parcours-jtbd.md) · [Sommaire](README.md) · [Chapitre suivant → Couche AI-Native](05-couche-ai-native.md)

---

> Chaque module suit le sous-canevas : **Objectif · Personas · User stories · États &
> transitions · Règles métier (renvoi ch. 7) · Données (renvoi ch. 6) · Capacités IA ·
> Critères d'acceptation · Hors-scope.** _(Les « Capacités IA » seront détaillées en
> 2ᵉ temps — cf. chapitre 5.)_

## 4.1 Pipeline commercial — Opportunités

- **Objectif :** suivre les sujets commerciaux dans un Kanban, du lead au gagné/perdu, en distinguant forfait et récurrent, et alimenter le CA prévisionnel.
- **Personas :** Associé Yvia (qui porte la fonction commerciale).
- **User stories :**
  - En tant qu'associé, je déplace une opportunité par glisser-déposer entre les colonnes (`à qualifier → en discussion → proposition envoyée → gagné / perdu`).
  - Je vois les **sous-totaux par type** (forfait / récurrent /mois) en tête de colonne, et le nombre d'opportunités par statut.
  - À la signature, je **convertis** une opportunité gagnée en projet (forfait) ou en revenu récurrent.
  - Je vois, pour les gagnées, **le mois de signature** et si elles sont **gagnées ce mois-ci** ; au changement de mois, les gagnées révolues passent en **archives** (consultables via un bouton).
- **États & transitions :** `a_qualifier → en_discussion → proposition_envoyee → gagne | perdu`. Au passage en `gagne` : `dateGagne` = date saisie sinon aujourd'hui (non écrasée si déjà posée). `actif` (archivage logique) ; suppression définitive possible (élément jetable).
- **Règles métier :** booking à `dateGagne` (§7.1/§7.2), conversion (§7.5), cycle mensuel des gagnées (§7.6).
- **Données :** `opportunites` (type, statut, montantEstime, dateGagne, ordre, projetId/recurrentId, actif). Énumérations : type (`forfait`/`recurrent`), statut commercial (5 valeurs).
- **Capacités IA :** scoring/priorisation des deals, détection des deals qui stagnent, suggestion de la prochaine action, pré-remplissage (montant, type) à la création, résumé d'un deal.
- **Critères d'acceptation :** un deal gagné apparaît dans le CA forfait du mois de `dateGagne` ; la conversion crée l'entité cible et la relie ; les gagnées d'un mois passé quittent le tableau ; le drag&drop persiste l'ordre dans la colonne.
- **Hors-scope :** emailing/séquences sortantes, signature électronique, scoring d'intention externe.

## 4.2 Delivery & capacité — Régie, Missions, Planning, Affectations

- **Objectif :** staffer les freelances sur les clients et matérialiser le CA/coût régie à partir du planning réel.
- **Personas :** Associé Yvia (delivery/staffing).
- **User stories :**
  - Je crée une **mission** (freelance × client) avec son TJM achat et TJM vente.
  - Je **pose des jours** d'affectation dans le planning ; le TJM est **figé** au moment de la pose.
  - Un freelance ne peut être affecté qu'à **une mission par jour**.
  - Je relie une mission à un **revenu récurrent (régie)** pour réconcilier planning réel et MRR vendu.
  - Je désactive une mission terminée sans perdre son historique d'affectations.
- **États & transitions :** mission `actif` ↔ désactivée ; affectation = pose/retrait d'un jour (suppression en cascade si la mission/freelance est supprimé·e).
- **Règles métier :** TJM figé (§7.7), unicité `(freelance, date)` (§7.8), relais régie réel ↔ hypothèse macro (§7.1), jours ouvrés FR pour les projections (§7.3).
- **Données :** `missions` (tjmAchat, tjmVente, actif, recurrentId?), `affectations` (date, tjmAchat/tjmVente figés, contrainte d'unicité).
- **Capacités IA :** recommandation d'allocation (qui staffer, où), détection de sous/sur-staffing vs récurrent vendu, projection de capacité, alerte « trou de planning ».
- **Critères d'acceptation :** modifier le TJM d'une mission ne change pas le passé déjà posé ; le CA/coût régie d'un mois = somme des affectations du mois ; impossible de poser deux missions le même jour pour un freelance.
- **Hors-scope :** gestion RH/contrats freelances. _(Le pointage du temps par le freelance lui-même arrive avec le **Portail Freelance**, cf. §4.8 — il viendra alimenter/confronter le planning.)_

## 4.3 Revenus récurrents — Maintenance / MCO

- **Objectif :** modéliser le MRR (régie macro, RUN, licence) et le projeter dans le prévisionnel.
- **Personas :** Associé Yvia.
- **User stories :**
  - Je saisis un récurrent (catégorie, montant vendu/période, coût pour run/licence, dates début/fin).
  - Un récurrent **sans date de fin** est « en cours » et projeté jusqu'à l'horizon affiché.
  - Pour la **régie macro**, je laisse le coût se dériver du planning des missions reliées plutôt que de le saisir.
- **États & transitions :** `actif` ↔ archivé ; « en cours » (sans `dateFin`) → « terminé » (avec `dateFin`).
- **Règles métier :** coût régie dérivé du planning vs coût saisi pour run/licence (§7.1), projection sans échéances matérialisées (§7.3).
- **Données :** `recurrents` (categorie `regie`/`run`/`licence`, montantRecurrent, coutRecurrent?, frequence `mensuel` (défaut, enum extensible), dateDebut/Fin, actif).
- **Capacités IA :** détection de churn/risque sur récurrent, alerte fin de contrat imminente, suggestion de revalorisation.
- **Critères d'acceptation :** un récurrent actif « en cours » contribue au CA récurrence de chaque mois de l'horizon ; la régie macro ne fait que **relayer** les mois sans planning réel.
- **Hors-scope :** facturation récurrente automatique, gestion d'avenants/paliers tarifaires.

## 4.4 Annuaire — Clients, Freelances & Utilisateurs

- **Objectif :** référentiel unique sous un même chapeau « Annuaire », décliné en **trois vues séparées** : **Clients**, **Freelances** et **Utilisateurs de la plateforme** (comptes connectés).
- **Personas :** Associé Yvia (la vue Utilisateurs — gestion des comptes — lui est réservée).
- **User stories :**
  - _Clients :_ je gère le **statut commercial** d'un client (`lead → prospect → signe → inactif`) et sa **fiabilité de paiement par défaut**.
  - _Freelances :_ je masque un freelance du planning du dashboard (`afficherPlanning`) sans toucher à ses missions.
  - _Utilisateurs :_ depuis la **même section Annuaire** mais une **vue à part**, je gère les comptes — **inviter** (lien d'invitation usage unique, expirable), définir le **rôle**, **archiver/réactiver** un compte.
  - J'**archive** (logique) un client / freelance / utilisateur sans le supprimer ; je le retrouve dans les archives.
- **États & transitions :** client `lead → prospect → signe → inactif` + `actif` ↔ archivé ; freelance `actif` ↔ archivé ; utilisateur `actif` ↔ désactivé ; invitation `générée → utilisée | expirée`.
- **Règles métier :** archivage logique `actif` (§7.9), cascade de fiabilité (§7.4), gestion des comptes réservée à l'admin (§7.11).
- **Données :** `clients` (statut, fiabiliteDefaut, actif), `freelances` (afficherPlanning, actif), `users` (role, actif) & `invitations` (token, role, expireLe, utilisee).
- **Capacités IA :** enrichissement de fiche, détection de doublons, segmentation clients, suggestion de fiabilité à partir de l'historique de paiement ; (utilisateurs) suggestion de rôle à l'invitation.
- **Critères d'acceptation :** les trois vues vivent sous le même chapeau « Annuaire » ; la vue Utilisateurs n'est accessible qu'à l'Associé Yvia ; un élément archivé n'apparaît plus dans les listes actives mais ses données historiques restent ; une invitation est à **usage unique** et **expire**.
- **Hors-scope :** CRM marketing complet ; SSO / annuaire d'entreprise (à étudier).

## 4.5 Finance & trésorerie

- **Objectif :** suivre les flux entrants (encaissements) et sortants (décaissements), prévus et réalisés, et restituer la position de trésorerie.
- **Personas :** Associé Yvia.
- **User stories :**
  - Je saisis des **encaissements** rattachés à un projet (forfait) **ou directs** (client/mission hors projet).
  - Je distingue `prevu` (pondéré par **fiabilité**) de `encaisse` (certain), avec une fiabilité propre à l'échéance si besoin.
  - Je suis les **décaissements** freelances (`prevu` / `decaisse`), considérés **certains** (100 %).
  - Je lis la trésorerie sous **3 scénarios** : optimiste (100 %), pondéré (proba), sécurisé (seulement « sécurisé »).
- **États & transitions :** encaissement `prevu → encaisse` ; décaissement `prevu → decaisse`.
- **Règles métier :** statuts prévu/réalisé (§7.2), pondération par fiabilité et 3 scénarios (§7.4), encaissements directs ignorés des vues CA projet (§7.10).
- **Données :** `encaissements` (projetId | clientId + missionId?, date, montant, statut, fiabilite?), `decaissements` (projetId, freelanceId, date, montant, statut).
- **Capacités IA :** projection de position de trésorerie, alerte de tension, détection d'échéance en retard, suggestion de relance datée.
- **Critères d'acceptation :** un encaissement `prevu` n'entre pas dans le CA réalisé ; un encaissement direct n'apparaît pas dans le CA d'un projet ; les coûts ne sont jamais pondérés.
- **Hors-scope :** rapprochement bancaire, export comptable légal (interfaçage à prévoir).

## 4.6 Pilotage & rentabilité

- **Objectif :** restituer la performance (dashboard, rentabilité, cockpit mensuel, prévisionnel 12 mois) à partir d'un **calcul partagé** unique.
- **Personas :** Associé Yvia, dirigeant.
- **Sous-modules :**
  - **Dashboard** (page d'accueil) : to-do/epics + KPI clés du mois (clients actifs, CA moyen/client, marge brute), avec écart vs mois précédent ; sélecteur de mois.
  - **Rentabilité** : CA / coût / marge **prévisionnels annuels** ventilés par source (régie / forfait / MCO).
  - **Cockpit mensuel** : lecture mensuelle consolidée.
  - **Prévisionnel 12 mois** : projection par source sur l'horizon (12 lignes mensuelles + totaux).
- **Règles métier :** composition du CA prévisionnel (§7.1), coût/marge (§7.2), maille annuelle vs mensuelle, jours ouvrés (§7.3).
- **Données :** dérivées (affectations, opportunités gagnées, récurrents, décaissements) via des **fonctions pures partagées** (cf. chapitre 8) — pas de table de reporting matérialisée.
- **Capacités IA :** brief mensuel narratif, explication des écarts (« la marge baisse car… »), simulation de scénarios (« +1 freelance en régie »), détection d'anomalies.
- **Critères d'acceptation :** les chiffres affichés sur **toutes** les pages de pilotage proviennent du **même calcul** (pas de divergence) ; changer de mois recompose les KPI et les écarts.
- **Hors-scope :** reporting financier réglementaire, consolidation multi-entités.

## 4.7 Exécution opérationnelle — To-do / Epics

- **Objectif :** suivre les chantiers de pilotage, indépendamment du métier.
- **Personas :** Associé Yvia.
- **User stories :** je crée des to-do, j'en marque comme **epics** (remontées sur le dashboard) ; je les ordonne ; je les coche (`a_faire → en_cours → fait`).
- **Données :** `todos` (titre, description, statut, epic, ordre).
- **Capacités IA :** génération de to-do à partir des alertes (un insight → une action proposée), regroupement, priorisation.
- **Critères d'acceptation :** une epic apparaît sur le dashboard ; l'ordre manuel est stable.
- **Hors-scope :** gestion de projet type Jira (sous-tâches, sprints, dépendances).

## 4.8 Portail Freelance _(à venir)_

- **Objectif :** donner au freelance un accès self-service à **ses propres données**, sans jamais exposer marges ni autres clients.
- **Personas :** Freelance (rôle à venir, cf. [§2.2](02-personas-roles.md)).
- **User stories (par paliers) :**
  - **Palier 1 — Time-tracking :** je **pointe mon temps** (jours/temps travaillés) ; cette saisie vient alimenter et confronter le planning (affectations).
  - **Palier 2 — _à terme_ :** je **consulte les missions** sur lesquelles j'ai travaillé.
  - **Palier 3 — _à terme à terme_ :** je **suis mes paiements** (ce qui m'est dû / versé).
- **Règles métier :** périmètre strictement personnel et sans marges (§7.11), TJM achat masqué ; le time-tracking se réconcilie avec les affectations (§7.7/§7.8).
- **Données :** `affectations` (ses jours), `missions` (les siennes), `decaissements` (ses paiements), `freelances` (sa fiche), `users` (son compte, rôle `freelance`).
- **Capacités IA :** assistant de saisie (pré-remplissage du temps depuis le planning), rappels de pointage, récap d'activité personnel.
- **Critères d'acceptation :** un freelance n'accède **qu'à** ses données ; aucune marge, aucun TJM achat d'un tiers, aucun autre client n'est visible.
- **Hors-scope (à ce stade) :** facturation/édition de factures côté freelance, contractualisation.
