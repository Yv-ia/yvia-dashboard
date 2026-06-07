"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type SelectOption = { value: string | number; label: string };

// Select entièrement custom (déclencheur + liste stylés), basé sur Base UI.
// Soumet sa valeur dans un formulaire via la prop `name` (champ caché géré par Base UI).
function Select({
  options,
  placeholder,
  name,
  id,
  defaultValue,
  value,
  required,
  disabled,
  className,
  onValueChange,
}: {
  options: SelectOption[];
  placeholder?: string;
  name?: string;
  id?: string;
  defaultValue?: string | number;
  value?: string | number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const items = options.map((o) => ({ value: String(o.value), label: o.label }));
  const dv =
    defaultValue === undefined || defaultValue === "" ? undefined : String(defaultValue);
  const controlled = value !== undefined ? { value: value === "" ? null : String(value) } : {};

  return (
    <SelectPrimitive.Root
      items={items}
      name={name}
      defaultValue={dv}
      required={required}
      disabled={disabled}
      onValueChange={onValueChange ? (v) => onValueChange(String(v ?? "")) : undefined}
      {...controlled}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-transparent bg-secondary px-3 py-1 text-sm outline-none transition-colors select-none hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:pointer-events-none data-disabled:opacity-50",
          className
        )}
      >
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="truncate text-left data-[placeholder]:text-muted-foreground"
        />
        <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-50">
          <SelectPrimitive.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={String(o.value)}
                value={String(o.value)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-muted data-[selected]:font-medium"
              >
                <span className="flex w-4 shrink-0 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
