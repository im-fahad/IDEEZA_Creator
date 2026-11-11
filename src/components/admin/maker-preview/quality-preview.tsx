"use client";

// Maker preview › Build quality: the Quality menu a maker picks a level from
// (components/create/quality-menu.tsx: "Medium quality", each level's line
// and its price), the Build button with that level's price on it
// (components/create/confirm-build-dialog.tsx), and every level makers can
// pick with its daily limit. A level the admin turned off isn't in them.

import * as React from "react";
import { ArrowDown01Icon, DashboardSpeed02Icon, FlashIcon } from "@hugeicons/core-free-icons";
import { OUTLINE_BUTTON_SM } from "@/components/create/buttons";
import { CreditBadge } from "@/components/credits/credit-badge";
import { Icon } from "@/components/dashboard/icon";
import { Menu } from "@/components/ideeza/menu";
import { formatCredits, type QualityLevel } from "@/lib/admin/credit-pricing";
import type { MakerLevel, MakerView } from "@/lib/admin/maker-view";
import { cn } from "@/lib/utils";
import { Section } from "../credit-pricing/fields";
import { AdminNote, PreviewFrame } from "./preview-frame";

const price = (l: MakerLevel) => (l.credits > 0 ? formatCredits(l.credits) : "Free");

/** "Up to 3 Free builds a day", or none when there's no limit. */
function limitLine(l: MakerLevel): string | null {
  if (l.dailyLimit <= 0) return null;
  const builds = l.dailyLimit === 1 ? "build" : "builds";
  return `Up to ${l.dailyLimit} ${l.label} ${builds} a day`;
}

export function QualityPreview({ view }: { view: MakerView }) {
  const [picked, setPicked] = React.useState<QualityLevel | null>(null);
  // Medium first, as the maker's composer starts there.
  const level = view.levels.find((l) => l.id === picked) ?? view.levels.find((l) => l.id === "medium") ?? view.levels[0] ?? null;

  return (
    <Section
      title="Build quality"
      description="Makers pick a quality level for each product before it's built, and the Build button shows what that level costs. Only the levels offered to makers are listed."
    >
      <PreviewFrame where="The Quality menu and the Build button, on a product before it's built">
        {level ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <Menu
                label="Quality"
                align="start"
                items={view.levels.map((l) => ({
                  id: l.id,
                  label: l.label,
                  hint: `${l.hint} · ${price(l)}`,
                  selected: l.id === level.id,
                  onSelect: () => setPicked(l.id),
                }))}
                trigger={(props, { open }) => (
                  <button
                    {...props}
                    type="button"
                    aria-label={`Quality: ${level.label}`}
                    className={cn(OUTLINE_BUTTON_SM, open && "border-border-strong text-text-primary")}
                  >
                    <Icon icon={DashboardSpeed02Icon} size={14} />
                    {level.label} quality
                    <Icon icon={ArrowDown01Icon} size={14} />
                  </button>
                )}
              />
              {/* The maker's Build button, drawn and not pressable: nothing is built from here. */}
              <span className="inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand">
                <Icon icon={FlashIcon} size={16} />
                Build
                <CreditBadge credits={level.credits} onBrand />
              </span>
            </div>
            {limitLine(level) && <p className="m-0 text-sm leading-sm text-text-secondary">{limitLine(level)}.</p>}
          </div>
        ) : (
          <p className="m-0 text-md leading-md text-text-secondary">No quality level to pick.</p>
        )}
      </PreviewFrame>

      <PreviewFrame where="Every level makers can pick">
        <ul className="m-0 grid list-none grid-cols-1 gap-[12px] p-0 sm:grid-cols-2 xl:grid-cols-3">
          {view.levels.map((l) => (
            <li key={l.id} className="flex flex-col gap-[4px] rounded-xl bg-bg-subtle px-[16px] py-[12px]">
              <span className="flex items-center justify-between gap-4">
                <span className="text-lg font-semibold leading-lg text-text-primary">{l.label}</span>
                <CreditBadge credits={l.credits} />
              </span>
              <span className="text-md leading-md text-text-secondary">{l.hint}</span>
              <span className="text-sm leading-sm text-text-tertiary">{limitLine(l) ?? "No daily limit"}</span>
            </li>
          ))}
        </ul>
      </PreviewFrame>
      {view.hiddenLevels.length > 0 && (
        <AdminNote>
          Off, so makers can&apos;t pick {view.hiddenLevels.length === 1 ? "it" : "them"}: {view.hiddenLevels.join(", ")}. Turn a level on in Availability and daily
          limits.
        </AdminNote>
      )}
    </Section>
  );
}
