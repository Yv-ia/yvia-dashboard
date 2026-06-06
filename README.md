# Suivi de marge freelances

Application interne de pilotage de la marge des freelances en mission.
Cahier des charges complet : voir [SPEC.md](./SPEC.md).

## Lancer le projet

Depuis ce dossier, dans un terminal :

```bash
npm install   # à faire une seule fois (télécharge les briques de code)
npm run dev   # démarre l'application
```

Puis ouvrir le navigateur sur **http://localhost:5173**

Pour arrêter : `Ctrl + C` dans le terminal.

## Structure

- `client/` : le frontend (React + Vite), ce que l'utilisateur voit.
- `server/` : le backend (Hono), les calculs et l'accès aux données.
- L'adresse `http://localhost:5173` sert la salle ; les appels `/api/...` sont
  transmis automatiquement au serveur sur `http://localhost:3000`.

## Stack technique

- Frontend : React + shadcn/ui
- Backend : Hono
- Base de données : PostgreSQL (Neon) via Drizzle (ORM)
- Tests : Vitest
