import { cn } from "@/lib/utils";

export function couleurMarge(montant: number) {
  return cn(montant > 0 && "text-emerald-700", montant < 0 && "text-rose-600");
}

export function classeMarge(montant: number, className?: string) {
  return cn("text-right", className, couleurMarge(montant));
}
