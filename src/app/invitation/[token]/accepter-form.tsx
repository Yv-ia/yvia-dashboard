"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accepterInvitation } from "./actions";

export function AccepterForm({
  token,
  email,
  prenom,
  nom,
}: {
  token: string;
  email: string;
  prenom: string;
  nom: string;
}) {
  const [enCours, setEnCours] = useState(false);

  return (
    <form
      action={async (formData) => {
        setEnCours(true);
        const res = await accepterInvitation(formData);
        setEnCours(false);
        if (res.ok) window.location.assign("/");
        else toast.error(res.message ?? "Une erreur est survenue.");
      }}
      className="space-y-4"
    >
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" name="prenom" defaultValue={prenom} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" defaultValue={nom} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="motDePasse">Mot de passe (8 caractères min.)</Label>
        <Input id="motDePasse" name="motDePasse" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmation">Confirmer le mot de passe</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={enCours}>
        {enCours ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
