import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMois } from "@/lib/format";

// Mois suivant / précédent en gérant le passage d'année.
export const moisSuivant = (annee: number, mois: number) =>
  mois === 12 ? { annee: annee + 1, mois: 1 } : { annee, mois: mois + 1 };
export const moisPrecedent = (annee: number, mois: number) =>
  mois === 1 ? { annee: annee - 1, mois: 12 } : { annee, mois: mois - 1 };

// Sélecteur de mois (◀ juin 2026 ▶). Partagé par le Dashboard et le Planning ;
// `basePath` renvoie les liens vers la bonne page tout en gardant ?annee&mois.
export function NavigationMois({
  basePath,
  annee,
  mois,
}: {
  basePath: string;
  annee: number;
  mois: number;
}) {
  const suivant = moisSuivant(annee, mois);
  const precedent = moisPrecedent(annee, mois);
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        nativeButton={false}
        render={
          <Link
            href={`${basePath}?annee=${precedent.annee}&mois=${precedent.mois}`}
            aria-label="Mois précédent"
          >
            <ChevronLeft />
          </Link>
        }
      />
      <span className="min-w-28 text-center text-sm font-medium capitalize">
        {formatMois(annee, mois)}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        nativeButton={false}
        render={
          <Link
            href={`${basePath}?annee=${suivant.annee}&mois=${suivant.mois}`}
            aria-label="Mois suivant"
          >
            <ChevronRight />
          </Link>
        }
      />
    </div>
  );
}
