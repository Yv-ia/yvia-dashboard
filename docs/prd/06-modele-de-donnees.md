# 6. Modèle de données

[← Couche AI-Native](05-couche-ai-native.md) · [Sommaire](README.md) · [Chapitre suivant → Règles métier](07-regles-metier.md)

---

> Source de vérité : `src/db/schema.ts` (PostgreSQL via Drizzle ORM, abondamment commenté).
> Montants en **€ HT** (`numeric`), dates `'YYYY-MM-DD'`.

## 6.1 Vue d'ensemble (entités & relations)

```
clients ─┬─< opportunites >─┐ (conversion)
         │                  ├─> projets ──< jalons
         │                  └─> recurrents
         ├─< projets ──< decaissements >── freelances
         │        └──< encaissements (forfait)
         ├──< encaissements (direct: clientId, missionId?)
         ├──< missions >── freelances
         │        ├──< affectations (1 freelance / jour)
         │        └── recurrentId ─> recurrents
         └──< recurrents

users ──(invitations)        todos (autonome, non relié au métier)
```

## 6.2 Entités (rôle · champs clés · cycle de vie · relations)

| Entité | Rôle métier | Champs clés | Cycle de vie | Relations |
|---|---|---|---|---|
| **users** | Comptes connectés (cf. ch. 2 : Associé Yvia ; Freelance à venir) | email (unique), passwordHash, role, actif | créé à la main / par invitation | ←(invitations) |
| **invitations** | Lien d'invitation usage unique | token (unique), email, role, expireLe, utilisee | générée → utilisée / expirée | → users (à la création) |
| **freelances** | Intervenants | prenom, nom, actif, afficherPlanning | actif → archivé | ←missions, ←affectations, ←décaissements |
| **clients** | Comptes clients | nom, statut, fiabiliteDefaut, actif | lead → prospect → signe → inactif / archivé | ←opportunités, projets, récurrents, missions, encaissements |
| **missions** | Mission régie (freelance × client) | tjmAchat, tjmVente, actif, recurrentId? | active → désactivée | →freelance, →client, →récurrent?, ←affectations |
| **affectations** | Planning jour par jour | date, tjmAchat/tjmVente **figés** | posée (unique freelance/jour) | →mission (cascade), →freelance (cascade) |
| **projets** | Enveloppe forfait vendue | budget, actif, fiabiliteDefaut, statutCommercial (`gagne`) | actif → terminé | →client, ←encaissements, ←décaissements, ←jalons |
| **jalons** | Repères datés d'un projet (sans impact financier) | date, libelle | — | →projet (cascade) |
| **encaissements** | Échéancier de recette | montant, date, statut, fiabilite? | prévu → encaissé | →projet (cascade) **ou** (client + mission?) |
| **decaissements** | Échéancier de coût freelance | montant, date, statut | prévu → décaissé | →projet (cascade), →freelance |
| **opportunites** | Pipeline commercial | type, statut, montantEstime, dateGagne, ordre, projetId/recurrentId, actif | qualifier → … → gagné/perdu → converti → archivé (mensuel) | →client, →projet/récurrent |
| **recurrents** | Revenu récurrent / MRR | categorie, montantRecurrent, coutRecurrent?, frequence, dateDebut/Fin, actif | en cours (sans dateFin) → terminé | →client, ←missions (régie) |
| **todos** | Chantiers de pilotage | titre, description, statut, epic, ordre | a_faire → en_cours → fait | autonome |

## 6.3 Énumérations métier (valeurs exactes & source)

| Domaine | Valeurs | Défaut | Source |
|---|---|---|---|
| Statut client | `lead` · `prospect` · `signe` · `inactif` | `lead` | `lib/clients/statut.ts` |
| Statut commercial (opp./projet) | `a_qualifier` · `en_discussion` · `proposition_envoyee` · `gagne` · `perdu` | `a_qualifier` | `lib/projets/statut-commercial.ts` |
| Type d'opportunité | `forfait` · `recurrent` | `forfait` | `lib/opportunites/type.ts` |
| Catégorie récurrent | `regie` · `run` · `licence` | `regie` | `lib/recurrents/categorie.ts` |
| Fréquence récurrent | `mensuel` (enum **extensible**) | `mensuel` | `db/schema.ts` |
| Fiabilité (encaissement prévu) | `securise` (0,95) · `probable` (0,75) · `incertain` (0,50) · `arisque` (0,25) | `probable` | `lib/calculs/previsionnel.ts` |
| Statut encaissement | `encaisse` · `prevu` | `encaisse` | `db/schema.ts` |
| Statut décaissement | `decaisse` · `prevu` | `decaisse` | `db/schema.ts` |
| Statut to-do | `a_faire` · `en_cours` · `fait` | `a_faire` | `lib/todos/statut.ts` |
| Rôle utilisateur | `admin` · `user` · `commercial` _(socle technique ; le produit positionne Associé Yvia + Freelance à venir, cf. ch. 2)_ | `admin` | `lib/auth/session.ts` |

## 6.4 Contraintes & intégrité

- **Unicité** `users.email`, `invitations.token`, et **`(freelance, date)`** sur `affectations` (un freelance = une mission/jour, §7.8).
- **Cascades `onDelete`** : suppression d'une mission/freelance ⇒ affectations supprimées ; suppression d'un projet ⇒ jalons, encaissements (forfait) et décaissements supprimés.
- **Nullable signifiant** : `encaissements.projetId` nul ⇒ encaissement **direct** (client/mission) (§7.10) ; `opportunites.projetId`/`recurrentId` nuls tant que non converti ; `recurrents.dateFin` nul ⇒ « en cours ».
- **Champ transitoire** : `projets.statutCommercial` (toujours `gagne`) — vestige de migration, à retirer une fois les vues 100 % sur `opportunites` (cf. roadmap).

## 6.5 Conventions transverses

- **Archivage logique** : champ `actif` (true = visible, false = archivé). Pas de suppression des entités structurantes (clients, projets, récurrents). Les opportunités sont supprimables (élément jetable).
- **Montants** : `numeric` en **€ HT**, précision 12/2 (10/2 pour les TJM).
- **Dates** : type `date` `'YYYY-MM-DD'` ; le **mois** sert d'unité de booking (`date.slice(0,7)` → `'YYYY-MM'`).
- **Statuts financiers** : dualité `prévu` / `réalisé` systématique (encaissements, décaissements).
- **Booking** : le CA forfait est attaché au **mois de `dateGagne`** ; le réalisé naît des affectations posées et des flux `encaissé`/`décaissé`.

## 6.6 Historique du modèle (migrations Drizzle)

11 migrations versionnées (`drizzle/`), de `0000_projets_crm_simple` à `0010_todos`. Jalons notables : `0003` statut client · `0004` table opportunités · `0005` récurrents + liaisons missions/opp · `0006` gel du projet gagné · `0008` `dateGagne` · `0009` encaissements directs · `0010` to-dos. → voir [annexe 12.5](12-annexes.md).

> **Dimension IA :** ce modèle est conçu pour être **directement interrogeable par l'IA**.
> Les commentaires de schéma, les énumérations explicites et la dualité prévu/réalisé
> forment un contexte structuré qui réduit l'ambiguïté et le besoin de RAG.
