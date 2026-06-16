# 3. Parcours & jobs-to-be-done

[← Personas & rôles](02-personas-roles.md) · [Sommaire](README.md) · [Chapitre suivant → Périmètre fonctionnel](04-perimetre-fonctionnel.md)

---

## 3.1 Parcours critiques (bout-en-bout)

### P1 — De l'opportunité (forfait) à la marge réalisée

1. Création d'une **opportunité** `type = forfait`, statut `a_qualifier`, montant estimé optionnel.
2. Avancement Kanban : `en_discussion → proposition_envoyee`.
3. Passage en **`gagne`** → `dateGagne` renseignée (saisie, sinon aujourd'hui). Le CA forfait est **booké au mois de `dateGagne`** (§7.1).
4. **Conversion** en **projet** (`budget = montantEstime`), liaison `opportunites.projetId` (§7.5).
5. Saisie des **décaissements** freelances (prévus puis décaissés) et **encaissements** client (prévus puis encaissés).
6. **Marge réalisée** = encaissements `encaissé` − décaissements `décaissé`.
- _Cas limites :_ deal gagné sans montant (CA = 0 jusqu'à saisie) ; opportunité supprimée après conversion → le projet **subsiste** (pas de cascade inverse) ; re-conversion interdite.

### P2 — De l'opportunité (récurrent) au MRR

1. Opportunité `type = recurrent` → `gagne`.
2. **Conversion** en **récurrent** (catégorie régie par défaut, début aujourd'hui), liaison `recurrentId`.
3. Le récurrent **sans `dateFin`** est projeté jusqu'à l'horizon dans le **prévisionnel 12 mois** (§7.3).
- _Cas limites :_ catégorie/coût à affiner ensuite côté delivery ; régie macro vs RUN/licence traités différemment dans le calcul (§7.1).

### P3 — Staffer la régie

1. Création d'une **mission** (freelance × client) avec **TJM achat** et **TJM vente**.
2. **Pose de jours** d'affectation au planning → TJM **figé** à la pose (§7.7).
3. Le CA/coût régie du mois = somme des affectations du mois.
4. (Optionnel) **rattachement** de la mission à un récurrent régie (`missions.recurrentId`) pour réconcilier planning réel et MRR vendu.
- _Cas limites :_ un freelance = **une mission/jour** max (§7.8) ; mois non planifié → relais par l'**hypothèse macro** régie (§7.1).

### P4 — Boucler le mois (rituel de revue)

1. **Dashboard** : to-do/epics + 3 KPI du mois (clients actifs, CA moyen/client, marge brute) avec **écart vs mois précédent**.
2. **Cockpit mensuel** : lecture consolidée.
3. **Opportunités** : archivage automatique des gagnées du mois révolu (§7.6).
4. Décisions → mise à jour des to-do/epics.

### P5 — Anticiper 12 mois

1. **Prévisionnel 12 mois** : CA par source (régie / forfait / récurrence), coût, marge prévisionnelle, mois par mois.
2. Relecture des **hypothèses macro** régie et des récurrents en cours.

### P6 — Sécuriser la trésorerie

1. Saisie/maj des **échéances** d'encaissement (`prevu` → pondéré par **fiabilité**, §7.4) et des **décaissements**.
2. Lecture de la **position de trésorerie** (3 scénarios : optimiste 100 %, pondéré, sécurisé).
3. Identification des échéances à risque / en retard → action de relance.
- _Cas limites :_ encaissement **direct** (hors projet) compté par client mais ignoré du CA projet (§7.10) ; coûts considérés certains (pas de pondération).

## 3.2 Rituels de pilotage (cadence)

| Cadence | Rituel | Pages concernées |
|---|---|---|
| Quotidien / hebdo | Mise à jour planning, avancement pipeline, to-do | Planning, Opportunités, To-do |
| Mensuel | Revue cockpit, archivage des gagnées, point trésorerie | Dashboard, Cockpit, Opportunités, Trésorerie |
| Trimestriel | Relecture prévisionnel 12 mois, hypothèses macro régie | Prévisionnel 12 mois, Récurrents |

> **Dimension IA :** chaque rituel a un **livrable IA** : un brief mensuel auto-généré
> (« ce qui a changé, ce qui dérive, ce qu'il faut décider »), une préparation
> automatique du prévisionnel, une short-list de relances commerciales. L'IA convertit
> un rituel manuel en **revue augmentée**.

## 3.3 Jobs-to-be-done (formulation utilisateur)

- _« Quand je termine un mois, je veux comprendre en 2 minutes où on en est, pour décider quoi prioriser. »_
- _« Quand je signe un deal, je veux qu'il se reflète immédiatement et correctement dans le CA et le prévisionnel. »_
- _« Quand je regarde la régie, je veux savoir si le planning couvre ce qu'on a vendu en récurrent. »_
- _« Quand la trésorerie se tend, je veux le savoir avant que ça arrive. »_
- _« Quand je modifie un tarif, je ne veux pas que ça réécrive mon historique. »_
