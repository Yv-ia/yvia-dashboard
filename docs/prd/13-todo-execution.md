# 13. Exécution & file d'actions — To-Do Yvia

[← Annexes](12-annexes.md) · [Sommaire](README.md)

---

> **Statut du chapitre :** v0.4 — aligné sur l'implémentation.
> Ce chapitre **remplace et approfondit** le module synthétique [§4.7](04-perimetre-fonctionnel.md)
> (qui n'en garde qu'un résumé pointant ici).
> **Convention de lecture :** chaque capacité est taguée **[Acquis]** (déjà dans le code),
> **[À brancher]** ou **[Cible]**.
> **Vocabulaire :** une **tâche** est une carte du Kanban (rangée dans un domaine, avec un
> owner et une priorité) ; elle peut contenir des **actions** (étapes). _(« tâche » remplace
> l'ancien terme « macro-tâche ».)_
> **Évolution :** v0.1 reposait sur un flag « epic ». v0.2 = catégorisation par domaine dans un
> Kanban. v0.3 = colonnes réorganisables, 4 domaines (fusion Finance & Admin, suppression de
> « Non classé »), « sous-tâches » → **actions**. v0.4 = owner **choisi parmi les utilisateurs
> de l'app**, préférence d'affichage du menu **persistée** (cookie).

## 13.1 Pourquoi un chapitre dédié

La To-do a été pensée à l'origine comme une simple liste de chantiers de pilotage,
indépendante du métier. Mais la vision produit lui assigne un rôle bien plus central :
**être le réceptacle de la boucle « décision → action »** du pilotage.

- Le fil rouge du produit ([§1.3](01-vision-positionnement.md)) est _« et donc, qu'est-ce
  que je fais ? »_. La réponse est, par nature, **une action** — c'est-à-dire une to-do.
- La couche AI-native prévoit des **« files d'actions suggérées »** alimentées par les
  alertes ([§5.3](05-couche-ai-native.md)) et, en phase IA 2, le passage
  _« insight → file d'actions/to-do »_ ([§11.2](11-roadmap-phasage.md)).
- Le principe **human-in-the-loop** ([§5.2](05-couche-ai-native.md)) suppose un endroit où
  l'IA **propose** et où l'humain **valide** : c'est précisément la file d'actions.

## 13.2 État des lieux (existant vs intention)

| Capacité | Réalité du code | Statut |
|---|---|---|
| CRUD to-do (titre, notes, statut, domaine, owner) | `src/app/todo/` + `actions.ts` | **[Acquis]** |
| Statut 3 valeurs `a_faire · en_cours · fait` | `lib/todos/statut.ts` (pur, testé) | **[Acquis]** |
| **Domaines** = catégories / colonnes du Kanban | `lib/todos/domaine.ts` (pur, testé) | **[Acquis]** |
| **Kanban** `/todo` (To-Do Yvia) : une colonne par domaine | `todo-kanban.tsx` (DnD HTML5 natif) | **[Acquis]** |
| **Priorité** = ordre intra-colonne (glisser-déposer de carte) | `ordre` réécrit par `ordonnerColonneTodos` | **[Acquis]** |
| **Changement de domaine** par glisser-déposer entre colonnes | idem (le drop fixe domaine + ordre) | **[Acquis]** |
| **Réorganisation des colonnes** (priorité des domaines) | `ordonnerColonnesKanban`, ordre persisté dans `parametres` | **[Acquis]** |
| **Tâches / actions** (1 niveau) | `parentId` auto-référencé, cascade à la suppression | **[Acquis]** |
| **Owner** choisi parmi les utilisateurs de l'app | colonne `owner`, sélecteur alimenté par `users` | **[Acquis]** |
| **Menu latéral masquable** (préférence persistée) | `sidebar.tsx` + cookie `sidebar-reduit` | **[Acquis]** |
| Remontée sur le dashboard, regroupée par domaine | `domaines-card.tsx` (tâches ouvertes + progression des actions) | **[Acquis]** |
| Provenance d'une to-do (entité ou insight source) | **aucun champ** : `todos` reste autonome | **[Cible]** |
| Génération de to-do par l'IA (insight → action) | inexistant | **[Cible]** |

## 13.3 Objectif & rôle dans le produit

- **Objectif :** offrir une **file d'exécution unique** où atterrissent les actions de
  pilotage — saisies à la main ou (à terme) **suggérées par l'IA** — et permettre de les
  **catégoriser**, les **prioriser**, les **assigner** et les **suivre**.
- **Rôle :** matérialiser la dernière étape du fil _« je comprends → et donc je fais »_ et
  servir de **destination des alertes** de la phase IA 2.
- **Deux mailles :**
  - **Tâche** : carte du Kanban, rangée dans un domaine, porteuse d'un owner et d'une priorité.
  - **Action** : étape rattachée à une tâche (héritée, sans domaine propre).

## 13.4 Domaines (catégories) & colonnes

Les domaines forment **les colonnes du Kanban**. **4 domaines**, lus de gauche à droite comme
un flux de pilotage. Source de vérité : `lib/todos/domaine.ts` (pur, testé).

1. **Stratégie / Pilotage**
2. **Sales**
3. **Delivery** _(ex-« Opérations »)_
4. **Finance & Admin** _(fusion des anciens « Finance » et « Administratif »)_

- **Plus de colonne « Non classé »** : une tâche est créée directement dans une colonne et a
  donc toujours un domaine.
- **Ordre des colonnes réorganisable** : on glisse l'**en-tête** d'une colonne pour réordonner
  les domaines selon les priorités du moment (qui évoluent d'une année à l'autre). L'ordre est
  **persisté** (table `parametres`, clé `kanban_ordre:<domaine>`) et **partagé avec le
  dashboard**. À défaut, ordre de déclaration de `DOMAINES_TODO`.
- Le champ `domaine` est un **`text` libre** (pas de contrainte enum en base) : ajouter ou
  fusionner un domaine = quelques lignes dans `DOMAINES_TODO` (+ migration de données).
- **Le domaine ne se change pas via le formulaire** : il est piloté par le **glisser-déposer**
  entre colonnes. Le formulaire conserve le domaine courant en champ caché.

## 13.5 Personas & capacités

- **Aujourd'hui :** outil **interne d'organisation**. Toute personne connectée peut gérer
  les to-do — elles ne portent **aucune marge ni donnée sensible** (cf. garde
  `exigerConnecte` dans `actions.ts`). **[Acquis]**
- **Owner :** **choisi parmi les membres ayant accès à l'application** — c'est-à-dire les
  comptes de la table `users` (les personnes de l'agence utilisant Cortex, cf.
  [§2.2](02-personas-roles.md) : Associé Yvia `admin`, et les rôles à venir). Le champ reste
  un `text` (on stocke le nom affiché de l'utilisateur), mais la saisie passe par un
  **sélecteur** alimenté par la liste des comptes **actifs** (`users.actif = true`, mêmes
  comptes que ceux gérés sous _Annuaire → Users_, `peutGererUtilisateurs`) — plus de texte
  libre. Quand un membre est ajouté/retiré côté comptes, le sélecteur d'owner suit
  automatiquement. **[Acquis]**
- **Demain (à arbitrer) :** si une to-do peut référencer une entité métier, sa **visibilité
  doit suivre celle de l'entité source** ([§7.11](07-regles-metier.md)). À trancher avec
  l'arrivée du rôle Freelance ([§2.2](02-personas-roles.md)). **[Cible]**

## 13.6 User stories

**Organisation [Acquis]**
- Je crée une tâche dans une colonne (domaine) via le bouton **« + Ajouter une tâche »** en
  bas de colonne ; je l'édite (titre, notes, statut, owner).
- Je **glisse** une carte d'une colonne à l'autre pour **changer son domaine**.
- Je **réordonne** les cartes d'une colonne pour fixer leur **priorité** (haut = prioritaire) ;
  l'ordre est **stable** et cohérent avec le dashboard.
- Je **réorganise l'ordre des colonnes** (priorité des domaines) en glissant leur en-tête.
- J'**assigne un owner** (parmi les utilisateurs de l'app) à une tâche ou une action.
- J'ajoute des **actions** sur une carte ; je vois leur **progression** (`faites / total`).
- Je **clique une action** pour ouvrir ses infos de base : **owner, statut, notes**
  (pas de date de début/fin à ce niveau).
- Je peux **masquer le menu latéral** pour voir les 4 colonnes sur un écran 13" ; ma
  préférence est **mémorisée** (cookie) et survit au rechargement.

**Assistées par l'IA [Cible]**
- L'IA me **propose** une to-do à partir d'une alerte ; je la **valide, l'ajuste ou la rejette**
  (human-in-the-loop, [§5.2](05-couche-ai-native.md)).
- Depuis une to-do issue d'un insight, je **rebondis vers l'écran source**.
- L'IA **regroupe** les actions similaires et **priorise** la file.

## 13.7 États & transitions

États : `a_faire → en_cours → fait` (source de vérité : `lib/todos/statut.ts`, défaut `a_faire`).

- **[Acquis]** La **case à cocher** est un raccourci binaire **`fait ↔ a_faire`**
  (`basculerStatutTodo`). L'état `en_cours` se règle via le **statut** du formulaire (tâche
  comme action).
- Tâche et actions ont **chacune leur statut** : cocher une tâche **ne coche pas** ses
  actions (et inversement). Voir [§13.14](#1314-décisions--arbitrages).

## 13.8 Tâches & actions

- **Modèle :** une colonne `parentId` auto-référencée. `parentId = null` ⇒ **tâche**
  (carte du Kanban) ; renseigné ⇒ **action** rattachée. **Suppression en cascade** :
  supprimer une tâche supprime ses actions.
- **Action :** héritée de la tâche (pas de domaine propre, pas de position en colonne).
  Création par un **champ d'ajout rapide** sur la carte ; édition par **clic** (dialog :
  titre, owner, statut, notes).
- **Profondeur : 1 niveau** (pas de sous-action) — cf. hors-scope.

## 13.9 Kanban, priorité & remontée dashboard

- **Kanban `/todo` :** une colonne par domaine, **glisser-déposer HTML5 natif** (même approche
  que le Kanban des opportunités, sans dépendance), à deux niveaux :
  - **carte** entre colonnes → fixe le **domaine cible** et **réécrit l'ordre** de la colonne
    (action `ordonnerColonneTodos`). La carte se saisit par une **poignée dédiée (⋮⋮)** — le
    reste de la carte reste cliquable/éditable (titre, ajout d'action) ;
  - **en-tête de colonne** → réordonne les domaines (action `ordonnerColonnesKanban`).
- **Ajout** : bouton **« + Ajouter une tâche » en bas** de chaque colonne (crée dans le domaine
  de la colonne).
- **Priorité :** `ordre` (integer) = rang dans la colonne. Stable et identique `/todo` ↔ dashboard.
- **Dashboard :** la carte « To-do par domaine » regroupe les **tâches ouvertes** par domaine,
  **dans l'ordre des colonnes**, avec l'**owner** et la **progression des actions**.
  Invalidé à chaque mutation (`revalidatePath("/")` + `revalidatePath("/todo")`).

## 13.10 Modèle de données

Schéma actuel (`db/schema.ts`, table `todos`) :

```
todos {
  id, titre, description (notes),
  statut,                       // 'a_faire' | 'en_cours' | 'fait'
  domaine,                      // 'strategie' | 'sales' | 'delivery' | 'finance_admin' | null
  owner,                        // nom affiché d'un utilisateur, null si non assigné
  ordre,                        // priorité intra-colonne
  parentId                      // null = tâche ; sinon action (cascade delete)
}
```

L'**ordre des colonnes** vit hors de `todos`, dans la table key/value `parametres`
(clé `kanban_ordre:<domaine>`, valeur = rang).

**Évolution proposée pour la file d'actions IA [Cible]** — provenance souple (référence
polymorphe `sourceType` + `sourceId`, sans FK dure) et `statutSuggestion`
(`proposee → acceptee / rejetee`). On accepte qu'une to-do **survive** à la suppression de
sa source. Conséquence sur [§6.2](06-modele-de-donnees.md) : `todos` deviendra **reliée de
façon souple** au métier.

## 13.11 Capacités IA [Cible]

_(Détail des prompts, sources de contexte et garde-fous : passe IA en 2ᵉ temps, cf. ch. 5.)_

- **Génération** : transformer un insight/alerte en to-do pré-remplie (titre, notes, domaine,
  owner suggéré), créée en `statutSuggestion = proposee`.
- **Priorisation** : ordonner une colonne selon l'impact (tréso, marge, risque de churn).
- **Regroupement / déduplication** : fusionner les actions équivalentes.
- **Garde-fous** ([§5.4](05-couche-ai-native.md)) : l'IA **ne valide jamais seule** une action.

## 13.12 Critères d'acceptation

- **[Acquis]** Une to-do se crée / s'édite / se coche / se supprime ; le statut respecte `lib/todos/statut.ts`.
- **[Acquis]** Glisser une carte entre colonnes **change son domaine** ; l'ordre intra-colonne (priorité) est **stable** et cohérent `/todo` ↔ dashboard.
- **[Acquis]** Glisser un **en-tête de colonne réordonne les domaines** ; l'ordre est **persisté**.
- **[Acquis]** L'**owner** se choisit parmi les utilisateurs de l'app et s'affiche sur la carte ; une tâche affiche la **progression** de ses actions.
- **[Acquis]** Cliquer une **action** ouvre ses **infos de base (owner, statut, notes)**, sans date de début/fin.
- **[Acquis]** Le domaine **ne se change pas** depuis le formulaire (seulement via le Kanban).
- **[Acquis]** Le **menu latéral est masquable** et la préférence **persiste** (cookie) pour afficher les 4 colonnes sur un écran 13".
- **[Cible]** Une to-do issue d'un insight **conserve sa provenance** et permet de **rebondir vers l'écran source**.
- **[Cible]** Une action proposée par l'IA est **explicitement validée** par l'humain avant d'entrer dans la file active.

## 13.13 Hors-scope

- Gestion de projet type Jira : profondeur > 1 (sous-actions), sprints, dépendances, diagrammes.
- Dates de début/fin et rappels d'échéance (notamment au niveau action).
- Assignation multi-utilisateurs sur une même tâche et workflow d'approbation (tant que l'usage reste mono-associé).
- Notifications/rappels externes (e-mail, push) — à étudier avec la phase IA 2.

## 13.14 Décisions & arbitrages

**Décidé**
- **Réordonnancement des actions par drag : non implémenté** (ajout / coche / suppression suffisent à ce stade).
- **Cartes/actions terminées : restent en colonne** (barrées), pas masquées ni reléguées.
- **Owner : choisi parmi les utilisateurs de l'app** (plus de texte libre) ; à étendre si l'assignation devient un vrai workflow multi-utilisateurs.

**Ouvert**
1. **Statut tâche ↔ actions** : indépendants (actuel) **ou** la tâche passe « fait »
   automatiquement quand toutes ses actions le sont ? (cf. [§13.7](#137-états--transitions))
2. **Provenance & visibilité** : référence souple `sourceType`/`sourceId`, et visibilité
   héritée de la source à l'arrivée du rôle Freelance ([§7.11](07-regles-metier.md)).

---

[← Annexes](12-annexes.md) · [Sommaire](README.md)
