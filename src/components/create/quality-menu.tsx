"use client";

// Low · Medium · High — one menu, two places (owner, 2026-11-01): beside the
// mic on Home, where the idea starts at a Quality, and on each concept card
// under What to build, where that product's Quality can change before it is
// built. The DS menu in its single-choice form; each level has one plain
// line on what it trades and, where the caller knows it, what it costs.

import * as React from "react";
import { ArrowDown01Icon, DashboardSpeed02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Menu } from "@/components/ideeza/menu";
import { cn } from "@/lib/utils";
import { QUALITIES, QUALITY_INFO, type RenderQuality } from "@/lib/create/quality";
import { OUTLINE_BUTTON_SM } from "./buttons";

export function QualityMenu({
  value,
  onChange,
  variant,
  price,
  name,
}: {
  value: RenderQuality;
  onChange: (q: RenderQuality) => void;
  /** `toolbar`: the Home composer's quiet 40 px row. `card`: the 32 px
   *  outline a card's section heading uses. */
  variant: "toolbar" | "card";
  /** What a level costs, said after its line ("5 credits"). */
  price?: (q: RenderQuality) => string;
  /** Whose Quality this is, for a reader on a card with several beside it. */
  name?: string;
}) {
  const label = QUALITY_INFO[value].label;
  return (
    <Menu
      label={name ? `Quality for ${name}` : "Quality"}
      align={variant === "card" ? "end" : "start"}
      items={QUALITIES.map((q) => ({
        id: q,
        label: QUALITY_INFO[q].label,
        hint: price ? `${QUALITY_INFO[q].hint} · ${price(q)}` : QUALITY_INFO[q].hint,
        selected: q === value,
        onSelect: () => onChange(q),
      }))}
      trigger={(props, { open }) => (
        <button
          {...props}
          type="button"
          aria-label={name ? `Quality for ${name}: ${label}` : `Quality: ${label}`}
          className={
            variant === "card"
              ? cn(OUTLINE_BUTTON_SM, open && "border-border-strong text-text-primary")
              : cn(
                  "inline-flex h-[40px] items-center gap-[6px] rounded-lg px-[12px] text-md font-medium outline-none transition-colors duration-fast",
                  "focus-visible:ring-2 focus-visible:ring-border-focus",
                  open
                    ? "bg-bg-surface-raised text-text-primary"
                    : "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
                )
          }
        >
          <Icon icon={DashboardSpeed02Icon} size={variant === "card" ? 14 : undefined} />
          {label} quality
          <Icon icon={ArrowDown01Icon} size={variant === "card" ? 14 : 16} />
        </button>
      )}
    />
  );
}
