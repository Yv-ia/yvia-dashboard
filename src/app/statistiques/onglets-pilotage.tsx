import Link from "next/link";

// Onglets du pilotage : « Pilotage mensuel » (réalisé + prévisionnel glissant) et
// « Prévisionnel 12 mois » (synthèse annuelle par source). L'onglet actif est passé
// par chaque page (composants serveur, pas de usePathname).
export function OngletsPilotage({ actif }: { actif: "pilotage" | "previsionnel" }) {
  const onglets = [
    { cle: "pilotage", href: "/statistiques", label: "Pilotage mensuel" },
    { cle: "previsionnel", href: "/statistiques/previsionnel", label: "Prévisionnel 12 mois" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-1">
      {onglets.map((o) => (
        <Link
          key={o.cle}
          href={o.href}
          className={`rounded-md px-3 py-1.5 text-sm ${
            actif === o.cle
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
