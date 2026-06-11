// Constantes partagées par la page (serveur) et les filtres (client).
// Volontairement dans un fichier neutre (pas "use client") pour pouvoir être
// importées côté serveur sans passer par la frontière client.

// Périodes glissantes exprimées en jours (fenêtre se terminant aujourd'hui),
// plus une plage personnalisée.
export const PERIODES = [
  { key: "30", label: "30 j" },
  { key: "90", label: "90 j" },
  { key: "180", label: "180 j" },
  { key: "365", label: "365 j" },
  { key: "perso", label: "Personnaliser" },
] as const;

export const GROUPES = [
  { key: "mois", label: "Mois" },
  { key: "freelance", label: "Freelance" },
  { key: "client", label: "Client" },
  { key: "mission", label: "Mission" },
] as const;
