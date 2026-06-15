# Suivi de marge freelances

Application interne de pilotage de la marge des freelances en mission.
Cahier des charges complet : voir [SPEC.md](./SPEC.md).

## Prérequis (à installer une seule fois)

- [Node.js](https://nodejs.org) (déjà installé)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (pour la base de données locale)

## Lancer le projet

```bash
# 1. Démarrer la base de données PostgreSQL (dans Docker)
docker compose up -d

# 2. Installer les briques de code (à faire une seule fois)
npm install

# 3. Créer / mettre à jour les tables dans la base
npm run db:push

# 4. Démarrer l'application
npm run dev
```

Puis ouvrir le navigateur sur **http://localhost:3000**

Pour arrêter : `Ctrl + C` dans le terminal. Pour arrêter la base : `docker compose down`.

## Déployer sur Vercel + Neon

### 1. Créer la base Neon

Dans Neon, créer un projet PostgreSQL puis récupérer deux URLs de connexion :

- l'URL **pooled** pour l'application Vercel. Elle contient `-pooler` dans l'hôte
  et `sslmode=require` dans les paramètres ;
- l'URL **directe** pour les opérations d'administration Drizzle
  (`npm run db:push`, création du premier utilisateur).

### 2. Configurer les variables Vercel

Dans le projet Vercel, ajouter ces variables pour `Production` et, si besoin,
`Preview` :

```text
DATABASE_URL=<URL Neon pooled>
SESSION_SECRET=<secret aleatoire long>
```

Générer le secret de session :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Optionnel mais recommandé pour les commandes d'administration :

```text
DATABASE_URL_UNPOOLED=<URL Neon directe>
```

Vercel détecte automatiquement Next.js pour ce repo. Les commandes par défaut
suffisent : installation `npm install`, build `npm run build`.

### 3. Créer ou migrer les tables dans Neon

Depuis votre machine, sans écrire le secret dans Git :

```bash
export DATABASE_URL_UNPOOLED="<URL Neon directe>"
npm run db:push
```

Si vous n'avez que l'URL poolée, utilisez `DATABASE_URL` à la place. L'URL
directe reste préférable pour les opérations de schéma.

Pour appliquer les migrations versionnées sur une base Neon déjà existante,
utiliser l'URL directe et non l'URL poolée :

```bash
export DATABASE_URL_UNPOOLED="<URL Neon directe>"
npm run db:migrate
```

`npm run db:push` reste utile pour créer une base vide depuis le schéma courant.
Sur une base de production existante, préférer `npm run db:migrate` afin
d'appliquer uniquement les changements versionnés.

### 3 bis. Migration automatique sur `main`

Le workflow GitHub Actions `Migrate production database` lance automatiquement
`npm run db:migrate` à chaque push sur `main`. Il faut configurer dans GitHub le
secret suivant :

```text
DATABASE_URL_UNPOOLED=<URL Neon directe>
```

Cette URL doit être l'URL Neon directe, sans `-pooler`, car les migrations de
schéma doivent éviter PgBouncer.

### 4. Créer le premier compte

```bash
export DATABASE_URL_UNPOOLED="<URL Neon directe>"
npm run creer-utilisateur -- associe@example.com "mot-de-passe-solide" "Nom"
```

Ne lancez `npm run seed` ou `npm run seed:simulation` en production que si vous
voulez volontairement charger des données de démonstration.

### 5. Déployer

Depuis l'interface Vercel, connecter le dépôt GitHub et déployer la branche
principale. En CLI, après connexion à Vercel :

```bash
npx vercel --prod
```

Après le déploiement, ouvrir `/login` sur l'URL Vercel et se connecter avec le
compte créé à l'étape précédente.

## Accès MCP (interroger les données depuis une IA)

L'application expose un serveur **MCP** (Model Context Protocol) en **lecture
seule** : on peut y connecter un client compatible (Claude, etc.) et poser des
questions sur les freelances, clients, missions (« prestas »), projets au
forfait, le planning et la marge.

- **Endpoint** (transport Streamable HTTP) : `https://<votre-domaine>/api/mcp`
- **Authentification** : une clé API en en-tête `Authorization: Bearer <clé>`.

### Générer une clé

Dans l'application : **Paramètres → Accès API (MCP) → Générer une clé**. La clé
n'est affichée qu'une seule fois (seule son empreinte est stockée). Une clé hérite
des droits du compte qui l'a créée : pour un compte **commercial**, les coûts et
les marges sont masqués dans les réponses, et les vues financières globales
(`planning_du_mois`, `statistiques`) renvoient un refus — conformément à la
gestion des rôles. Ne partagez pas votre clé ; révoquez-la si besoin depuis la
même page.

> La table `api_keys` est créée par la migration `0006_api_keys`. En production
> Neon, elle s'applique automatiquement via `npm run db:migrate` (workflow
> GitHub Actions sur `main`). En local : `npm run db:push`.

### Configurer un client

Exemple de configuration (URL + en-tête d'authentification) :

```json
{
  "mcpServers": {
    "yvia-suivi-marge": {
      "url": "https://<votre-domaine>/api/mcp",
      "headers": { "Authorization": "Bearer <votre-clé>" }
    }
  }
}
```

Pour un client qui ne gère pas les en-têtes personnalisés, utiliser le pont
`npx mcp-remote https://<votre-domaine>/api/mcp --header "Authorization:Bearer <votre-clé>"`.

### Outils disponibles (lecture seule)

`lister_freelances`, `lister_clients`, `lister_missions` (prestas),
`lister_projets`, `detail_projet` (trésorerie + échéancier), `planning_du_mois`
(indicateurs CA / coût / marge du mois), `statistiques` (réalisé + prévisionnel
par mois), `rechercher` (recherche libre par nom).

## Structure

- `src/app/` : les pages (les écrans que l'utilisateur voit) et le code serveur (API).
- `src/db/` : la base de données (schéma des tables et connexion via Drizzle).
- `docker-compose.yml` : décrit la base PostgreSQL locale.
- `drizzle.config.ts` : configuration de l'outil qui crée les tables.

## Stack technique

- Next.js (React) : front + back dans un seul projet
- shadcn/ui : composants d'interface
- Drizzle : ORM (traducteur entre le code et la base)
- PostgreSQL via Docker : base de données locale
- Vitest : tests automatisés (calculs de marge)

## Utilisation avec plusieurs worktrees / Conductor

Le fichier `.conductor/settings.toml` branche deux scripts (dans `scripts/`) :

- `scripts/worktree-up.sh` (script Conductor « setup ») : démarre la base, écrit
  `.env`, installe les dépendances et crée les tables. Lancé à la création du workspace.
- `scripts/worktree-down.sh` (script Conductor « archive ») : arrête la base.
  Option `--purge` pour aussi effacer les données.

Pour permettre **plusieurs workspaces en parallèle**, chaque workspace utilise des
ports distincts fournis par Conductor : l'application sur `CONDUCTOR_PORT`, la base
sur `CONDUCTOR_PORT + 1`. Hors Conductor, les ports par défaut sont 3000 (app) et
5432 (base), puis le script essaie les ports suivants si le port demandé est déjà
pris. C'est pourquoi `run_mode` est `concurrent`.

Vous pouvez aussi lancer ces scripts à la main :

```bash
./scripts/worktree-up.sh     # tout démarrer
PORT=3001 npm run dev        # exemple pour lancer un autre worktree à la main
./scripts/worktree-down.sh   # tout arrêter (données conservées)
```

## Commandes utiles

- `npm run dev` : démarrer en développement
- `npm run db:push` : appliquer le schéma à la base
- `npm run db:migrate` : appliquer les migrations versionnées (à privilégier en production Neon existante)
- `npm run db:studio` : explorer la base dans le navigateur
- `npm run seed:simulation` : charger un jeu de données complet pour les previews (voir `docs/preview-seed.md`)
- `npm test` : lancer les tests
