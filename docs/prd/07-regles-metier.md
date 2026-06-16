# 7. Règles métier

[← Modèle de données](06-modele-de-donnees.md) · [Sommaire](README.md) · [Chapitre suivant → Architecture technique](08-architecture-technique.md)

---

> Section de référence : les modules du chapitre 4 y renvoient. Les calculs sont
> implémentés en **fonctions pures testées** (`src/lib/**`), partagées entre toutes
> les pages pour garantir la cohérence (une seule source de vérité).

## 7.1 Composition du CA prévisionnel (par source)

Le CA prévisionnel d'une période = **régie + forfait + récurrence**.

- **Régie** — pour chaque mois : `CA_régie(mois) = réel(mois) > 0 ? réel(mois) : macro(mois)`.
  - `réel(mois)` = Σ `tjmVente` des affectations posées ce mois (planning réel).
  - `macro(mois)` = hypothèse macro issue des récurrents catégorie `regie` (projection), qui **prend le relais uniquement sur les mois sans planning** posé.
- **Forfait** — **booking** des opportunités `type = forfait` au statut `gagne` : le `montantEstime` est attribué au **mois de `dateGagne`** (`dateGagne.slice(0,7)`). Une opportunité gagnée **sans `dateGagne`** n'est **pas** bookée.
- **Récurrence** — récurrents RUN/licence projetés mois par mois sur l'horizon (la régie macro est portée par la ligne régie ci-dessus, pour éviter le double-compte).

_Référence : `calculerPrevisionnel12Mois(...)` dans `app/statistiques/previsionnel-calculs.ts` ; le même calcul alimente Rentabilité, Cockpit et Prévisionnel 12 mois._

## 7.2 Coût, marge et réalisé

- **Coût régie** = Σ `tjmAchat` des affectations de la période.
- **Coût forfait** = décaissements (réalisés **+** prévus = **prévisionnel plein**) des projets `actif` non `perdu`.
- **Coût MCO** = `coutRecurrent` projeté des récurrents run/licence (régie : coût dérivé du planning).
- **Marge** = CA − coût ; **taux de marge** = marge / CA (**0** si CA nul).
- **CA réalisé du mois** = régie posée (Σ `tjmVente`) + encaissements **`encaisse`**.
- **Coût réalisé du mois** = TJM achat posé (Σ `tjmAchat`) + décaissements **`decaisse`**.
- Le statut **`prevu`** ne compte **jamais** comme réalisé.

## 7.3 Projection des récurrents & jours ouvrés

- Calcul **à la volée**, sans échéances matérialisées (`projeterRecurrent` / `totaliserProjection`, `lib/recurrents/previsionnel.ts`).
- Pour chaque mois de l'horizon, le récurrent est actif si `dateDebut ≤ mois ≤ (dateFin ?? +∞)`. `dateFin` vide ⇒ « en cours », projeté jusqu'à l'horizon.
- **Régie** : si un planning réel existe ce mois (missions reliées via `missions.recurrentId`), on prend le **réel** (source = `planning`) ; sinon l'**estimation macro** (source = `estimation`).
- **Jours ouvrés** : comptés en jours ouvrés **français** (W-E et jours fériés exclus) — `joursOuvres`, `joursOuvresDuMois`, `listeJoursOuvresDuMois` (`lib/calculs/jours-ouvres.ts`).

## 7.4 Cascade de fiabilité & scénarios de trésorerie

- Les encaissements `prevu` sont pondérés par une **fiabilité** résolue en **cascade** : **échéance → projet → client → défaut** (la première valeur valide l'emporte ; défaut = `probable`). Réf. `resoudreFiabilite(...)`.
- **Pondérations** : `securise` = **0,95** · `probable` = **0,75** · `incertain` = **0,50** · `arisque` = **0,25**.
- Un encaissement **`encaisse`** compte à **100 %** (certain).
- Le prévisionnel projet expose **3 scénarios** : **optimiste** (tout à 100 %), **pondéré** (× proba de fiabilité), **sécurisé** (ne retient que les `securise`).
- Les **coûts** (décaissements) sont considérés **certains** (100 %) — jamais pondérés.

## 7.5 Conversion d'une opportunité gagnée

- **Forfait** → crée un **projet** (`budget = montantEstime`), relie via `opportunites.projetId`, statut `gagne`, `dateGagne` conservée (sinon aujourd'hui).
- **Récurrent** → crée un **récurrent** (catégorie régie par défaut, début aujourd'hui), relie via `recurrentId`.
- Une opportunité **déjà convertie** ne peut l'être à nouveau. Le projet/récurrent lié **n'est pas supprimé** si l'opportunité est supprimée (pas de cascade inverse).

## 7.6 Cycle de vie mensuel des opportunités gagnées

- Une gagnée n'est « du mois » que le **mois de `dateGagne`**.
- Au changement de mois, les gagnées des **mois révolus** quittent la colonne « Gagné » et basculent en **archives** (dérivé de `dateGagne`, **sans écriture en base** : le CA, booké à `dateGagne`, reste intact). Un bouton donne accès aux archives.

## 7.7 TJM figé à la pose

Le TJM (achat/vente) est **recopié de la mission au moment où le jour est posé** (`affectations.tjmAchat/tjmVente`). Modifier le tarif d'une mission ensuite **ne modifie pas le passé** déjà planifié.

## 7.8 Unicité d'affectation

Contrainte d'unicité `(freelance, date)` : un freelance ne peut être affecté qu'à **une seule mission par jour**.

## 7.9 Archivage logique

`actif = false` retire l'entité des listes actives sans la détruire ; réversible. Les vues financières historiques ne sont pas impactées par l'archivage.

## 7.10 Encaissements directs vs projet

Un encaissement **direct** (`projetId` null, `clientId` renseigné, `missionId` optionnel) est saisi en trésorerie et **ignoré des vues CA/prévisionnel par projet** (qui joignent sur `projets`). Il compte néanmoins dans le **réalisé par client** (indicateurs mensuels, §7.12).

## 7.11 Visibilité financière par rôle

Aujourd'hui, seul l'**Associé Yvia** (`admin`) accède aux données financières (coûts d'achat, décaissements, marges) ; c'est aussi lui qui gère les comptes de la plateforme. Le futur rôle **Freelance** sera cantonné à **ses propres données** (ses missions, son temps, ses paiements) et **ne verra jamais** les marges, les TJM achat d'un tiers, ni les autres clients. La règle est centralisée (capacités, `peutVoirMarges` / `peutAccederRoute`) et appliquée côté serveur **et** dans la mise en contexte IA.

## 7.12 Indicateurs mensuels (KPI du mois)

Réf. `calculerIndicateursMois(...)` (`lib/rentabilite/indicateurs.ts`) :

- **Client actif** = client ayant **généré du CA** sur le mois (jour de régie posé **ou** encaissement). Un client qui n'a qu'un **coût** (décaissement) **ne compte pas**.
- **CA total** = Σ `tjmVente` (régie posée) + Σ encaissements (du mois).
- **Coût total** = Σ décaissements (du mois).
- **Marge brute** = CA total − coût total.
- **CA moyen / client** = CA total / clients actifs (**0** si aucun client actif).
- Le dashboard affiche ces KPI avec l'**écart vs mois précédent**.

> **Dimension IA :** ces règles constituent la « constitution » sur laquelle l'IA
> raisonne. Toute réponse chiffrée doit pouvoir citer la règle (§7.x) et les entités
> utilisées — c'est le socle de l'explicabilité.
