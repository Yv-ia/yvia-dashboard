"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changerMotDePasse } from "./actions";

export function PasswordForm() {
  return (
    <form
      action={async (formData) => {
        const res = await changerMotDePasse(formData);
        if (res.ok) toast.success("Mot de passe modifié.");
        else toast.error(res.message ?? "Une erreur est survenue.");
      }}
      className="max-w-sm space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="actuel">Mot de passe actuel</Label>
        <Input id="actuel" name="actuel" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nouveau">Nouveau mot de passe</Label>
        <Input id="nouveau" name="nouveau" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmation">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit">Mettre à jour</Button>
    </form>
  );
}
