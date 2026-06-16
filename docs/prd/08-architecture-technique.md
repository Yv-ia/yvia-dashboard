# 8. Architecture technique

[← Règles métier](07-regles-metier.md) · [Sommaire](README.md) · [Chapitre suivant → Exigences non-fonctionnelles](09-exigences-non-fonctionnelles.md)

---

## 8.1 Stack (versions actuelles)

| Couche | Techno | Version |
|---|---|---|
| Framework | **Next.js** (App Router, Turbopack) | 16.2.7 |
| UI | **React** / React DOM | 19.2.4 |
| Composants | @base-ui/react · shadcn · lucide-react · sonner · next-themes | — |
| Styles | **Tailwind CSS** | 4 |
| Langage | **TypeScript** | 5 |
| ORM | **Drizzle ORM** + drizzle-kit | 0.45.2 / 0.31.10 |
| Base | **PostgreSQL** (driver `postgres`) | 3.4.9 |
| Tests | **Vitest** | 4.1.8 |
| Lint | **ESLint** | 9 |

**Scripts npm :** `dev`, `build`, `start`, `lint`, `test`, **`verify:ci`** (= `lint && test --run && build`), `db:push`, `db:migrate`, `db:studio`, `seed`, `seed:simulation`, `creer-utilisateur`.

## 8.2 Découpage du code

- **`src/lib/**` — logique pure & testée** : calculs (prévisionnel, indicateurs, fiabilité, jours ouvrés), helpers (dates, format), règles (statuts, types, catégories, permissions). **Aucune dépendance** à la base ni à `next/headers` → testable et réutilisable côté edge / Server Components / mise en contexte IA.
- **`src/app/**` — UI + Server Actions** : pages (Server Components), composants clients ciblés (Kanban drag&drop, dialogs), Server Actions de mutation qui revalident les chemins.
- **`src/db/**` — schéma & accès** Drizzle ; migrations versionnées dans `drizzle/` (11 à ce jour, cf. [§6.6](06-modele-de-donnees.md)).

## 8.3 Patterns clés

- **Calcul partagé** : le prévisionnel 12 mois et les indicateurs mensuels sont des fonctions pures appelées par plusieurs pages (loader partagé, ex. `charger-indicateurs-mois`) ⇒ **chiffres cohérents** partout.
- **Server Components par défaut** ; composants clients seulement pour l'interaction (drag & drop, dialogs, toasts).
- **`revalidatePath`** après chaque mutation pour rafraîchir les vues.
- **Gardes serveur systématiques** sur chaque action (`exigerSession` / `exigerConnecte`) — le middleware ne protège **pas** les Server Actions.
- **Le passé est figé** par recopie de valeurs (TJM sur l'affectation) plutôt que par jointure dynamique.

## 8.4 Authentification & sécurité applicative

- **Session** : cookie **signé** `yvia_session`, **HMAC-SHA256** (Web Crypto), clé `SESSION_SECRET` (env). Payload : `{ userId, email, exp, pv, role }` où `pv` (password version) sert d'**ancre de révocation**. Durée **30 jours**.
- **Mots de passe** : **scrypt** natif (sel 16 octets aléatoires, hash 64 octets), format `scrypt$<sel hex>$<hash hex>`. Pas d'inscription publique (comptes créés à la main / par invitation).
- **Rate-limiting** : **5 tentatives / 10 min** sur `login` et `invitation-accept` ; clé `scope:ip:identifiant` (IP via `x-forwarded-for` / `x-real-ip`).
- **Autorisation** : capacités pures (`lib/auth/permissions.ts`), appliquées côté serveur **et** dans la mise en contexte IA.

## 8.5 Infra IA (cible — à détailler en 2ᵉ temps)

- **Mise en contexte** à partir du modèle structuré (préférée au RAG massif) ; accès données **filtré par rôle** avant l'appel modèle.
- **Outils/agents** : exposition des calculs déterministes comme outils (l'IA appelle le calcul, ne le ré-implémente pas).
- **Traçabilité** : journal des requêtes IA, sources citées, sorties auditables.
- **Choix de modèle** : modèles Claude récents (qualité de raisonnement sur données structurées) ; arbitrage coût/latence par cas d'usage.
- **Multi-tenant & extensibilité** : à arbitrer (mono-tenant actuel ; isolation par organisation si ouverture externe).

## 8.6 Qualité & CI

- **`verify:ci`** = lint + tests (`--run`) + build : porte d'entrée avant intégration.
- Large base de **tests unitaires** sur les fonctions pures (`lib/**`) — c'est là que vit la fiabilité des chiffres.
- Types stricts (TS 5) ; ESLint 9.
