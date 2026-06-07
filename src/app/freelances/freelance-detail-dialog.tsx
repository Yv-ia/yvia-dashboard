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
  clientNom: string;
  dateDebut: string;
  dateFin: string | null;
};

export function FreelanceDetailDialog({
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
            Ce freelance n’est sur aucune mission (intercontrat).
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Clients et missions :</p>
            {missions.map((m, i) => (
              <div key={i} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium">{m.clientNom}</p>
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
