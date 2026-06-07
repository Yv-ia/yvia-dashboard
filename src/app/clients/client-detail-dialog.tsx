"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

type MissionResume = {
  freelanceNom: string;
  dateDebut: string;
  dateFin: string | null;
};

export function ClientDetailDialog({
  nom,
  missions,
}: {
  nom: string;
  missions: MissionResume[];
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button className="text-left font-medium hover:text-primary hover:underline">
            {nom}
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nom}</DialogTitle>
        </DialogHeader>

        {missions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun freelance placé chez ce client pour l’instant.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Freelances placés :</p>
            {missions.map((m, i) => (
              <div key={i} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium">{m.freelanceNom}</p>
                <p className="text-sm text-muted-foreground">
                  Du {formatDate(m.dateDebut)} au {formatDate(m.dateFin)}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
