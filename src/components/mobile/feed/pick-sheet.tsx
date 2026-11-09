"use client";

// A pick-one sheet as the Feed draws it (Playback speed, Video quality, Post
// audience, the comments' sort): the M09 sheet with a row per choice — an
// optional 20 px icon, the label (Body/MD) and the A10 Radio on the right.
// It applies on tap and has no button (owner rule, Oct 31). A choice that
// can't be made stays off and says why: under its label, or once under the
// title when every such choice has the same reason.

import * as React from "react";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Radio } from "@/components/ideeza/checkbox";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";

export type PickOption<T> = { value: T; label: string; icon?: IconValue; reason?: string | null };

export function PickSheet<T extends string | number>({
  open,
  onClose,
  title,
  options,
  value,
  onPick,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: readonly PickOption<T>[];
  value: T;
  onPick: (v: T) => void;
  /** Rows after the choices (Video quality's Data saver). */
  children?: React.ReactNode;
}) {
  const reasons = [...new Set(options.map((o) => o.reason).filter((r): r is string => !!r))];
  const shared = reasons.length === 1 ? reasons[0] : null;
  return (
    <Sheet open={open} onClose={onClose} title={title} description={shared ?? undefined}>
      <div role="radiogroup" aria-label={title} className="-mx-4 flex flex-col">
        {options.map((o) => {
          const off = !!o.reason;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={o.value === value}
              aria-disabled={off || undefined}
              onClick={() => {
                if (off) return;
                onPick(o.value);
                onClose();
              }}
              className={cn(
                "flex min-h-[48px] w-full items-center gap-6 rounded-md px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                off ? "cursor-not-allowed" : "hover:bg-bg-subtle",
              )}
            >
              {o.icon && (
                <span className={off ? "text-[color:var(--color-icon-disabled)]" : "text-[color:var(--color-icon-default)]"}>
                  <Icon icon={o.icon} size={20} />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("text-lg leading-lg", off ? "text-text-disabled" : "text-text-primary")}>{o.label}</span>
                {o.reason && !shared && <span className="text-sm leading-sm text-text-tertiary">{o.reason}</span>}
              </span>
              <Radio checked={o.value === value} disabled={off} decorative />
            </button>
          );
        })}
      </div>
      {children}
    </Sheet>
  );
}
