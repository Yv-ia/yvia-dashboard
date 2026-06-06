import { serve } from "@hono/node-server";
import { Hono } from "hono";

// `app` est notre cuisine : on y déclare les routes (les commandes auxquelles le serveur sait répondre).
const app = new Hono();

// Une première route de test : quand le frontend demande "/api/hello", on répond ce petit message.
app.get("/api/hello", (c) => {
  return c.json({ message: "Bonjour depuis le serveur Hono 👋" });
});

const port = 3000;
console.log(`Serveur démarré sur http://localhost:${port}`);

serve({ fetch: app.fetch, port });
