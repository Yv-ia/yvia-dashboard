"use client";

import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Resultat } from "./actions";

type Invitation = {
  id: number;
  email: string;
  prenom: string | null;
  nom: string | null;
  token: string;
};

export function PendingInvitations({
  invitations,
  supprimer,
}: {
  invitations: Invitation[];
  supprimer: (formData: FormData) => Promise<Resultat>;
}) {
  async function copier(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invitation/${token}`);
      toast.success("Lien copié.");
    } catch {
      toast.error("Copie impossible, sélectionnez le lien manuellement.");
    }
  }

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Invitations en attente</p>
      <div className="divide-y rounded-md border">
        {invitations.map((invitation) => {
          const nomComplet = [invitation.prenom, invitation.nom].filter(Boolean).join(" ");
          return (
            <div
              key={invitation.id}
              className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
            >
              <div className="min-w-48 flex-1">
                <p className="font-medium">{invitation.email}</p>
                {nomComplet ? <p className="text-muted-foreground">{nomComplet}</p> : null}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => copier(invitation.token)}>
                <Copy />
                Copier le lien
              </Button>
              <form
                action={async (formData) => {
                  const res = await supprimer(formData);
                  if (res.ok) toast.success("Invitation supprimée.");
                  else toast.error(res.message ?? "Une erreur est survenue.");
                }}
              >
                <input type="hidden" name="id" value={invitation.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Trash2 />
                  Supprimer
                </Button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
