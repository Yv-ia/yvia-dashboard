"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

// Tooltip simple : on enveloppe l'enfant déclencheur et on passe le contenu.
// Pour aligner la flèche avec le déclencheur (icône d'aide…), garder l'enfant
// inline (un <span>/<button>).
export function Tooltip({
  children,
  content,
  side = "top",
  delay = 150,
  className,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delay?: number;
  className?: string;
}) {
  return (
    <TooltipPrimitive.Provider delay={delay}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          render={(props) => <span {...props}>{children}</span>}
        />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner sideOffset={6} side={side}>
            <TooltipPrimitive.Popup
              className={cn(
                "z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md outline-none",
                "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
                className
              )}
            >
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
