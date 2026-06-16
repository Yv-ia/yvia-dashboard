# 5. Couche AI-Native (transversale)

[← Périmètre fonctionnel](04-perimetre-fonctionnel.md) · [Sommaire](README.md) · [Chapitre suivant → Modèle de données](06-modele-de-donnees.md)

---

> _Chapitre cadre. La passe IA approfondie (2ᵉ temps) détaillera ici : prompts,
> sources de contexte, garde-fous, métriques d'évaluation, coûts/latence._

## 5.1 Architecture de la valeur IA (du plus simple au plus autonome)

1. **Copilot conversationnel** — poser une question en langage naturel ; l'IA traduit en requête sur le modèle, restitue chiffre + explication + lien vers l'écran.
2. **Insights & alertes proactifs** — surveillance continue : dérive de marge, sous-staffing vs récurrent vendu, trésorerie tendue, deal qui stagne, fin de contrat imminente.
3. **Prévisions assistées** — affiner CA / charge / trésorerie au-delà des règles déterministes (saisonnalité, probabilité de signature, scénarios).
4. **Automatisations & agents** — saisie assistée, archivage mensuel, préparation du prévisionnel, brouillons de relance, classement du pipeline.
5. **Recommandations** — staffing/allocation, priorisation commerciale, revalorisation récurrents.

## 5.2 Principes de conception

- **Déterministe dessous, interprétatif dessus** : l'IA ne recalcule pas un montant que produit une fonction pure ; elle l'explique, le compare, le projette.
- **Human-in-the-loop** par défaut pour toute action mutante (l'IA propose, l'humain valide).
- **Explicabilité** : toute affirmation IA est tracée à ses sources (entités, période, calcul).
- **Périmètre par rôle** : la mise en contexte respecte `peutVoirMarges` & `peutAccederRoute`.
- **Coût & latence maîtrisés** : on privilégie le contexte structuré (modèle de données) au RAG massif.

## 5.3 Surfaces IA dans le produit

- **Barre de commande / copilot** global accessible partout.
- **Encarts d'insight** contextuels par écran (« et donc ? »).
- **Brief mensuel** auto-généré pour le rituel de revue.
- **Files d'actions suggérées** (relances, to-do) alimentées par les alertes.

## 5.4 Garde-fous & gouvernance

- Journalisation des interactions IA (qui, quoi, quelle donnée vue).
- Refus explicite hors-périmètre (ex. marge ou donnée d'un tiers demandée par un freelance).
- Confiance affichée et possibilité de « voir le calcul » sous toute réponse chiffrée.
