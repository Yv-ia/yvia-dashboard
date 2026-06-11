"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Resultat } from "./actions";

export function DeleteUserForm({
  id,
  disabled,
  action,
}: {
  id: number;
  disabled: boolean;
  action: (formData: FormData) => Promise<Resultat>;
}) {
  return (
    <form
      action={async (formData) => {
        const res = await action(formData);
        if (res.ok) toast.success("Utilisateur supprimé.");
        else toast.error(res.message ?? "Une erreur est survenue.");
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm" disabled={disabled}>
        <Trash2 />
        Supprimer
      </Button>
    </form>
  );
}
