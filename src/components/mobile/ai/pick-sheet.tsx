"use client";

// A06 Select on a phone, as the kit's SheetSelect, for lists whose rows say
// a little more (the AI tab's packs, chips, radios, projects): each option a
// label with a line under it, an option that can't be picked greyed with its
// reason, a heading between groups. A pick-one sheet applies on tap and has
// no button (Shared kit rule).

import * as React from "react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";

export type PickOption = { value: string; label: string; sub?: string; disabled?: boolean; group?: string };

export function PickList({
  value,
  options,
  onPick,
  label,
}: {
  value: string | null;
  options: readonly PickOption[];
  onPick: (value: string) => void;
  label: string;
}) {
  return (
    <ul role="listbox" aria-label={label} className="-mx-8 flex flex-col">
      {options.map((o, i) => {
        const head = o.group && (i === 0 || options[i - 1].group !== o.group) ? o.group : null;
        return (
          <React.Fragment key={o.value}>
            {head && (
              <li role="presentation" className="px-8 pb-2 pt-6 text-xs font-medium uppercase leading-xs text-text-tertiary">
                {head}
              </li>
            )}
            <li>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                onClick={() => !o.disabled && onPick(o.value)}
                className={cn(
                  "flex min-h-[44px] w-full items-center justify-between gap-4 rounded-md px-8 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  o.disabled ? "cursor-not-allowed" : "hover:bg-bg-subtle",
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className={cn("text-lg leading-lg", o.disabled ? "text-text-disabled" : o.value === value ? "text-text-brand" : "text-text-primary")}>
                    {o.label}
                  </span>
                  {o.sub && <span className="text-sm leading-sm text-text-secondary">{o.sub}</span>}
                </span>
                {o.value === value && (
                  <span className="shrink-0 text-[color:var(--color-icon-brand)]">
                    <Icon icon={Tick02Icon} size={16} />
                  </span>
                )}
              </button>
            </li>
          </React.Fragment>
        );
      })}
    </ul>
  );
}

/** The field and its sheet. */
export function PickField({
  value,
  options,
  onChange,
  title,
  placeholder,
  id,
  disabled,
}: {
  value: string | null;
  options: readonly PickOption[];
  onChange: (value: string) => void;
  title: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const picked = options.find((o) => o.value === value);
  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={picked ? `${title}: ${picked.label}` : title}
        onClick={() => setOpen(true)}
        className="flex h-[44px] w-full items-center justify-between gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-6 text-left outline-none transition-[border-color,box-shadow] duration-fast focus-visible:border-[var(--color-input-border-focus)] focus-visible:shadow-focus-brand disabled:cursor-not-allowed disabled:bg-[var(--color-input-bg-disabled)]"
      >
        <span className={cn("truncate text-lg leading-lg", picked ? "text-[color:var(--color-input-text)]" : "text-[color:var(--color-input-placeholder)]")}>
          {picked?.label ?? placeholder}
        </span>
        <span className="text-[color:var(--color-icon-default)]">
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <PickList
          value={value}
          options={options}
          label={title}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}
