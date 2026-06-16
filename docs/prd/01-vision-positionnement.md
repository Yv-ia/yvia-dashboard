# 1. Vision & positionnement

[← Sommaire](README.md) · [Chapitre suivant → Personas & rôles](02-personas-roles.md)

---

## 1.0 Énoncé de vision

> **Cortex est le cerveau de pilotage d'une boîte de service :** une source de vérité
> unique qui réconcilie régie, forfait et récurrent, transforme la donnée d'activité en
> décisions (rentabilité, charge, trésorerie), et place une couche d'intelligence
> au-dessus pour anticiper plutôt que constater.

## 1.1 Problème métier

Piloter une startup de **services** dont le chiffre d'affaires est hétérogène est structurellement difficile, car trois modèles cohabitent et n'obéissent pas aux mêmes logiques de reconnaissance du revenu, de coût et de trésorerie :

| Modèle | D'où vient le CA | D'où vient le coût | Quand c'est « réalisé » |
|---|---|---|---|
| **Régie** | Jours de freelances vendus (TJM vente), posés au planning | TJM achat des jours posés | À mesure que les jours sont posés |
| **Forfait** | Enveloppe à prix fixe, **bookée à la signature** | Décaissements freelances étalés | CA booké à `dateGagne` ; coût au fil des décaissements |
| **Récurrent / MCO** | MRR (RUN, licence, régie macro) | Coût saisi (run/licence) ou dérivé du planning (régie) | Projeté mois par mois sur l'horizon |

**Symptômes concrets sans outil unifié :**

- Le prévisionnel vit dans un tableur, déconnecté du réel ; les chiffres divergent d'une réunion à l'autre.
- La marge n'est connue qu'**a posteriori**, jamais en temps réel ni par source.
- La **charge** (capacité freelances vs vendu) et la **trésorerie** (échéances pondérées) ne sont pas reliées au pipeline.
- Chaque modèle est piloté dans un silo (CRM, planning, compta) → pas de vue consolidée **rentabilité × charge × trésorerie**.

## 1.2 La proposition de valeur

**Cortex** est l'**outil de pilotage unique** d'une boîte de service : une **source de vérité** qui réconcilie les trois modèles de revenu dans un même prévisionnel, expose la rentabilité réelle, et anticipe la charge et la trésorerie. Le nom évoque le **cerveau** de l'agence — la couche d'intelligence qui raisonne sur toute l'activité.

Trois promesses :

1. **Réconcilier** — un seul prévisionnel qui additionne régie (planning réel + hypothèse macro), forfait (deals gagnés) et récurrence (MRR).
2. **Révéler** — la marge par source et par mois, prévue et réalisée, sans retraitement manuel.
3. **Anticiper** — charge et trésorerie projetées, et (couche IA) alertes avant que le problème n'arrive.

## 1.3 La thèse AI-Native

> _Cette section sera approfondie ultérieurement (la couche IA détaillée est traitée
> au chapitre 5 et en 2ᵉ temps)._

« AI-Native » ne signifie pas « un chatbot greffé sur un CRM ». Cela signifie que :

1. **Le modèle de données est le moat.** Un domaine propre, typé, normalisé et explicite (cf. chapitres 6 et 7) est ce qui permet à une IA de **raisonner juste** sur l'activité — sans hallucination, avec des règles de calcul déterministes en dessous.
2. **L'IA fait le travail _avant_ et _à la place de_ l'utilisateur** : elle prépare le prévisionnel, détecte les dérives, suggère le staffing, rédige les relances, classe les opportunités — l'humain valide.
3. **Le calcul reste déterministe, l'IA reste interprétative.** Les chiffres (CA, marge, trésorerie) viennent de fonctions pures testées ; l'IA explique, alerte, projette des scénarios et agit sous garde-fous — elle ne « invente » jamais un montant.

> **Dimension IA — principe directeur :** chaque écran doit pouvoir répondre à
> « _et donc, qu'est-ce que je fais ?_ ». L'IA transforme une donnée affichée en
> **recommandation actionnable** contextualisée par le rôle de l'utilisateur.

## 1.4 ICP & non-cibles

- **Cible :** structure de service de 5 à ~50 personnes, mêlant équipe interne et freelances, avec un mix régie/forfait/récurrent. Pilotage assuré par 1 à 3 associés/dirigeants, qui portent **aussi** la fonction commerciale (pas de rôle commercial distinct à ce stade).
- **Déclencheurs d'adoption :** le tableur de prévisionnel devient ingérable ; besoin de fiabiliser la marge ; tension de trésorerie ; croissance du pool de freelances.
- **Non-cibles (pour l'instant) :** ESN > 200 personnes (besoins RH/paie/ERP lourds), produit SaaS pur (pas de régie), facturation/comptabilité légale complète (on s'interface, on ne remplace pas l'expert-comptable).

## 1.5 Alternatives & différenciation

| Alternative | Limite pour une boîte de service | Différenciation Cortex |
|---|---|---|
| **Tableurs** (Sheets/Excel) | Fragiles, non reliés au réel, pas de droits fins | Source de vérité reliée au planning et au pipeline |
| **CRM généraliste** | Gère le pipeline, ignore delivery/coût/marge | Pipeline **+** delivery **+** rentabilité réconciliés |
| **PSA / ERP** | Lourds, chers, pensés grandes ESN | Léger, focalisé pilotage, AI-native |
| **Outil de compta** | Constate le passé, pas de prévisionnel d'activité | Prévisionnel **prospectif** par source + scénarios |

## 1.6 Principes produit

- **Une seule source de vérité du prévisionnel** : le même calcul (fonctions pures partagées) alimente toutes les pages → cohérence garantie, pas de chiffres divergents.
- **Prévu vs réalisé explicite** partout (trésorerie, CA, charge).
- **La visibilité financière est gouvernée par le rôle** : aujourd'hui l'Associé Yvia voit tout ; les rôles à venir (ex. Freelance) sont cantonnés à leur propre périmètre (jamais les marges ni les autres clients).
- **Réversibilité** : on archive (logique), on ne détruit pas les entités structurantes.
- **Le passé est figé** : un tarif/jour posé ne change pas rétroactivement (cf. §7.7).
- **Sobriété d'interface** : la page active est mise en valeur ; pas de redite de titre ; l'information dense reste lisible.

## 1.7 Hypothèses & risques

- **Hypothèse :** la qualité du pilotage dépend de l'hygiène de saisie (planning à jour, deals datés, échéances qualifiées). → l'IA et les rappels visent justement à réduire ce coût de saisie.
- **Risque :** double-saisie vs outils existants (compta, banque) → stratégie d'interfaçage (cf. roadmap).
- **Risque :** confidentialité des marges → gouvernance par rôle stricte, côté serveur **et** IA.
