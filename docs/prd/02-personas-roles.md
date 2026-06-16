# 2. Personas & rôles

[← Vision & positionnement](01-vision-positionnement.md) · [Sommaire](README.md) · [Chapitre suivant → Parcours & JTBD](03-parcours-jtbd.md)

---

## 2.1 Personas métier

| Persona | Objectif principal | Contexte & frustrations | Questions qu'il pose à Cortex |
|---|---|---|---|
| **Associé Yvia** (dirigeant) | Piloter rentabilité, trésorerie, prévisionnel **et** le commercial | Jongle entre tableurs et outils ; perd du temps à consolider ; découvre les écarts trop tard | « Quelle marge ce mois ? Tient-on le cap annuel ? La trésorerie passe-t-elle ? Où en sont mes deals, quoi relancer ? » |
| **Staffing / delivery** _(porté par l'associé aujourd'hui)_ | Charge & allocation freelances | Visibilité partielle sur la capacité ; risque de trous de planning ou de sur-staffing vs vendu | « Qui est dispo ? Suis-je en sous/sur-staffing ? Le planning couvre-t-il le récurrent vendu ? » |
| **Freelance** _(rôle à venir)_ | Saisir son temps, puis suivre son activité | Aujourd'hui hors de l'outil ; pointage et suivi de paiement éclatés (mails, tableurs) | « Quels jours je pointe ? » puis (à terme) « Sur quelles missions ai-je bossé, et quels paiements pour moi ? » |

> Le **commercial** n'est pas un persona/rôle distinct à ce stade : la fonction
> commerciale est assurée par l'**Associé Yvia**.

## 2.2 Rôles & gouvernance des droits

Les droits sont raisonnés par **capacité** (et non par rôle en dur), ce qui permet d'ajouter un rôle plus tard sans réécrire la logique.

| Rôle | Statut | Capacités |
|---|---|---|
| **Associé Yvia** (`admin`) | Actif — **rôle principal** | Tout : pilotage, delivery, finance, **commercial**, et gestion des comptes (inviter, rôles, archivage). Voit les marges. |
| **Freelance** (`freelance`) | **À venir** | Self-service limité à **ses propres données** : d'abord le **time-tracking**, puis (à terme) la vue sur ses missions effectuées et ses paiements. **Ne voit jamais** les marges ni les autres clients. |

> **Note d'implémentation :** le socle technique de rôles supporte des granularités
> plus fines (`lib/auth/permissions.ts`, capacités `peutGererUtilisateurs`,
> `peutVoirMarges`, `peutEditerDelivery`, `peutSupprimerEntites`, `peutAccederRoute`).
> Le produit ne **positionne** toutefois, à ce stade, qu'un rôle applicatif
> (Associé Yvia) + un rôle Freelance à venir.

> **Dimension IA :** l'IA hérite **strictement** du périmètre de données du rôle de
> l'utilisateur courant. Un freelance qui interrogera le copilot n'obtiendra jamais une
> marge ni les données d'un autre intervenant. Le filtrage par rôle est appliqué
> **avant** la mise en contexte du modèle, pas après.

## 2.3 Matrice droits × domaines

| Domaine | Associé Yvia (`admin`) | Freelance (à venir) |
|---|---|---|
| Pipeline / Opportunités | ✅ | ❌ |
| Annuaire — Clients / Freelances / Utilisateurs | ✅ | 👁️ sa fiche (à terme) |
| Delivery (régie, missions, planning) | ✅ édition | 👁️ ses missions + ⏱️ time-tracking (à terme) |
| Finance / Trésorerie | ✅ | 💶 ses paiements (à terme) |
| Pilotage / Rentabilité | ✅ | ❌ |
| Utilisateurs (gestion des comptes) | ✅ | ❌ |

_(La matrice fine route × capacité est en annexe 12.3.)_

## 2.4 Définition des capacités

Les droits sont dérivés du rôle via des **capacités** pures (testables, utilisables côté proxy/edge, Server Components et IA) :

| Capacité | Question | Aujourd'hui |
|---|---|---|
| `peutGererUtilisateurs` | Inviter / changer un rôle / supprimer un compte ? | Associé Yvia (admin) |
| `peutVoirMarges` | Voir TJM achat, décaissements, marges ? | Associé Yvia ; **jamais** le Freelance |
| `peutEditerDelivery` | Créer/éditer missions, projets, planning ? | Associé Yvia |
| `peutSupprimerEntites` | Suppression **définitive** d'une entité métier ? | Associé Yvia (admin) — sinon archivage logique |
| `peutAccederRoute` | Accès à une route donnée ? | Associé Yvia : tout ; Freelance : liste blanche self-service (à venir) |

> Raisonner par **capacité** (et non par rôle en dur) permet d'introduire le rôle
> Freelance — ou un rôle plus fin plus tard — en ne touchant qu'à ce mapping.
