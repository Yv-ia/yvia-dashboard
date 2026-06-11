"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { useDrawer } from "@/app/_drawer/drawer-stack";
import { DeleteUserForm } from "./delete-user-form";
import type { Resultat } from "./actions";

type Utilisateur = {
  id: number;
  email: string;
  prenom: string | null;
  nom: string | null;
  role: string;
};

export function UserRow({
  utilisateur,
  estUtilisateurCourant,
  supprimer,
}: {
  utilisateur: Utilisateur;
  estUtilisateurCourant: boolean;
  supprimer: (formData: FormData) => Promise<Resultat>;
}) {
  const { ouvrir } = useDrawer();
  const nomComplet = [utilisateur.prenom, utilisateur.nom].filter(Boolean).join(" ");

  return (
    <TableRow onClick={() => ouvrir({ type: "user", id: utilisateur.id })} className="cursor-pointer">
      <TableCell className="font-medium">
        {nomComplet || utilisateur.nom || utilisateur.email}
      </TableCell>
      <TableCell className="text-muted-foreground">{utilisateur.email}</TableCell>
      <TableCell>{utilisateur.role === "user" ? "Utilisateur" : "Administrateur"}</TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <div className="flex justify-end">
          <DeleteUserForm
            id={utilisateur.id}
            disabled={estUtilisateurCourant}
            action={supprimer}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
