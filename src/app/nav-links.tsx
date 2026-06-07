"use client";
// Composant client : il a besoin de connaître la page active pour la mettre en valeur.

import Link from "next/link";
import { usePathname } from "next/navigation";

const liens = [
  { href: "/", label: "Dashboard" },
  { href: "/missions", label: "Missions" },
  { href: "/freelances", label: "Freelances" },
  { href: "/clients", label: "Clients" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {liens.map((lien) => {
        const actif =
          lien.href === "/" ? pathname === "/" : pathname.startsWith(lien.href);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              actif
                ? "bg-secondary font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {lien.label}
          </Link>
        );
      })}
    </>
  );
}
