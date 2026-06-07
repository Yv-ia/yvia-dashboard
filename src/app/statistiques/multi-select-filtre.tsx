"use client";

import { useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type Option = { value: string; label: string };

export function MultiSelectFiltre({
  label,
  paramName,
  options,
  selected,
}: {
  label: string;
  paramName: string;
  options: Option[];
  selected: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choix, setChoix] = useState<string[]>(selected);

  const resume =
    selected.length === 0
      ? "Tous"
      : `${selected.length} sélectionné${selected.length > 1 ? "s" : ""}`;

  function appliquer(valeurs: string[]) {
    const p = new URLSearchParams(searchParams.toString());
    if (valeurs.length === 0) p.delete(paramName);
    else p.set(paramName, valeurs.join(","));
    router.push(`${pathname}?${p.toString()}`);
    setOpen(false);
  }

  function toggle(v: string) {
    setChoix((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setChoix(selected); // ré-aligne sur l'URL à l'ouverture
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {label} : {resume}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune option.</p>
          ) : (
            options.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={choix.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                <span>{o.label}</span>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => appliquer([])}>
            Tout afficher
          </Button>
          <Button onClick={() => appliquer(choix)}>Appliquer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
