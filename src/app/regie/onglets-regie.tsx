import Link from "next/link";

// Onglets de la régie : « Régie » (hypothèses + synthèse mensuelle) et
// « Planning détaillé » (le board jour-par-jour, page /missions). L'onglet actif
// est passé par chaque page (composants serveur, pas de usePathname).
export function OngletsRegie({ actif }: { actif: "regie" | "planning" }) {
  const onglets = [
    { cle: "regie", href: "/regie", label: "Régie" },
    { cle: "planning", href: "/missions", label: "Planning détaillé" },
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
