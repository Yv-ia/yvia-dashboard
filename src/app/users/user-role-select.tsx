"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { OPTIONS_ROLE_UTILISATEUR } from "./role-options";
import type { Resultat } from "./actions";

export function UserRoleSelect({
  id,
  role,
  disabled,
  action,
}: {
  id: number;
  role: string;
  disabled: boolean;
  action: (formData: FormData) => Promise<Resultat>;
}) {
  const selectId = useId();
  const [valeur, setValeur] = useState(role);
  const [enCours, startTransition] = useTransition();

  function modifierRole(nouveauRole: string) {
    if (nouveauRole === valeur) return;

    const precedent = valeur;
    setValeur(nouveauRole);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(id));
      formData.set("role", nouveauRole);

      const res = await action(formData);
      if (res.ok) {
        toast.success("Rôle mis à jour.");
      } else {
        setValeur(precedent);
        toast.error(res.message ?? "Modification impossible.");
      }
    });
  }

  return (
    <div className="w-64 max-w-full">
      <label htmlFor={selectId} className="sr-only">
        Rôle utilisateur
      </label>
      <Select
        id={selectId}
        value={valeur}
        options={OPTIONS_ROLE_UTILISATEUR}
        disabled={disabled || enCours}
        onValueChange={modifierRole}
      />
    </div>
  );
}
