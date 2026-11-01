"use client";

// A price, one look everywhere credits are spent (owner, 2026-11-01, option
// A): the coin and the number, in the DS badge (A17 Subtle · SM). It sits on
// the button that spends — Refine, Regenerate, Build, Start drawing — so the
// cost is read at the click, not in a sentence under it. Nothing to pay is
// the success tone, "Free". On a filled brand button the badge takes the
// brand tone, so it reads on the purple instead of sitting grey on it.

import * as React from "react";
import { Coins01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";

export function CreditBadge({
  credits,
  onBrand = false,
  className,
}: {
  credits: number;
  /** Inside a filled brand button. */
  onBrand?: boolean;
  className?: string;
}) {
  if (credits <= 0) {
    return (
      <Badge tone="success" className={className}>
        Free
      </Badge>
    );
  }
  return (
    <Badge
      tone={onBrand ? "brand" : "neutral"}
      icon={<Icon icon={Coins01Icon} size={12} />}
      className={className}
    >
      <span className="tabular-nums">{credits}</span>
      <span className="sr-only">{credits === 1 ? " credit" : " credits"}</span>
    </Badge>
  );
}
