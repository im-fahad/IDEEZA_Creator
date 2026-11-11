"use client";

// Maker preview › Credit packs: the packs as a maker picks one in Buy credits
// (components/credits/buy-credits.tsx: the same choice cards, Popular badge
// and "8,640 credits (7,860 + 780 bonus)" line), with Custom amount beside
// them when it's on, and what the chosen one costs in each coin.

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { CHOICE, CHOICE_OFF, CHOICE_ON } from "@/components/credits/payment-picker";
import { formatCoin, formatCredits, formatUsd } from "@/lib/admin/credit-pricing";
import { packCoinPrice, type MakerPack, type MakerView } from "@/lib/admin/maker-view";
import { cn } from "@/lib/utils";
import { Section } from "../credit-pricing/fields";
import { AdminNote, PreviewFrame } from "./preview-frame";

const CUSTOM = "custom";

/** "8,640 credits (7,860 + 780 bonus)", as Buy credits words it. */
function creditsLine(p: MakerPack): string {
  return p.bonus > 0
    ? `${formatCredits(p.total)} (${p.base.toLocaleString("en-US")} + ${p.bonus.toLocaleString("en-US")} bonus)`
    : formatCredits(p.base);
}

export function PacksPreview({ view }: { view: MakerView }) {
  const options = [...view.packs.map((p) => p.id), ...(view.custom.enabled ? [CUSTOM] : [])];
  const [picked, setPicked] = React.useState<string | null>(null);
  // The popular pack first, as a maker's eye goes to it; a pick that's gone (hidden, removed) falls back.
  const chosen = picked && options.includes(picked) ? picked : (view.packs.find((p) => p.popular)?.id ?? options[0] ?? null);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const pack = view.packs.find((p) => p.id === chosen) ?? null;

  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + options.length) % options.length;
    setPicked(options[next] ?? null);
    refs.current[next]?.focus();
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      move(i, 1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      move(i, -1);
    }
  };

  return (
    <Section
      title="Credit packs"
      description="Makers buy credits in Buy credits, which opens when a build runs short of credits, and on the Credits page. Only the packs shown to makers are listed, cheapest first."
    >
      <PreviewFrame where="Buy credits: choose a pack">
        <h3 className="m-0 text-xl font-semibold leading-xl text-text-primary">Buy AI credits</h3>
        {options.length === 0 ? (
          <p className="m-0 text-md leading-md text-text-secondary">No packs to buy.</p>
        ) : (
          <div role="radiogroup" aria-label="Credit packs" className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-3">
            {view.packs.map((p, i) => {
              const on = p.id === chosen;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setPicked(p.id)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={cn(CHOICE, on ? CHOICE_ON : CHOICE_OFF, "relative flex-col items-start gap-[4px] py-[16px]")}
                >
                  {p.popular && (
                    <Badge tone="brand-solid" className="absolute right-[12px] top-[12px]">
                      Popular
                    </Badge>
                  )}
                  <span className="text-xl font-semibold leading-xl text-text-primary">{p.name}</span>
                  <span className="text-3xl font-bold leading-3xl tabular-nums text-text-primary">{formatUsd(p.priceUsd)}</span>
                  <span className="text-md leading-md text-text-secondary">{creditsLine(p)}</span>
                </button>
              );
            })}
            {view.custom.enabled && (
              <button
                ref={(el) => {
                  refs.current[view.packs.length] = el;
                }}
                type="button"
                role="radio"
                aria-checked={chosen === CUSTOM}
                tabIndex={chosen === CUSTOM ? 0 : -1}
                onClick={() => setPicked(CUSTOM)}
                onKeyDown={(e) => onKey(e, view.packs.length)}
                className={cn(CHOICE, chosen === CUSTOM ? CHOICE_ON : CHOICE_OFF, "flex-col items-start gap-[4px] py-[16px]")}
              >
                <span className="text-xl font-semibold leading-xl text-text-primary">Custom amount</span>
                <span className="flex items-baseline gap-[6px]">
                  <span className="text-3xl font-bold leading-3xl tabular-nums text-text-primary">{formatUsd(view.creditUsd)}</span>
                  <span className="text-md leading-md text-text-secondary">a credit</span>
                </span>
                <span className="text-md leading-md text-text-secondary">
                  {view.custom.max > 0
                    ? `${view.custom.min.toLocaleString("en-US")} to ${formatCredits(view.custom.max)}`
                    : `From ${formatCredits(view.custom.min)}`}
                </span>
              </button>
            )}
          </div>
        )}
        {pack ? (
          <p className="m-0 text-md leading-md text-text-secondary">
            {pack.name} pack: {formatCredits(pack.total)} for {formatUsd(pack.priceUsd)}. Pay {formatCoin(packCoinPrice(view, pack.priceUsd, "USDT"), "USDT")} or{" "}
            {formatCoin(packCoinPrice(view, pack.priceUsd, "IDZ"), "IDZ")}.
          </p>
        ) : chosen === CUSTOM ? (
          <p className="m-0 text-md leading-md text-text-secondary">
            Custom amount: makers type how many credits they want. 1 credit costs {formatUsd(view.creditUsd)},{" "}
            {formatCoin(view.usdtPerCredit, "USDT")} or {formatCoin(view.idzPerCredit, "IDZ")}.
          </p>
        ) : null}
      </PreviewFrame>
      {view.hiddenPacks.length > 0 && <AdminNote>Hidden from makers: {view.hiddenPacks.join(", ")}.</AdminNote>}
      {!view.custom.enabled && <AdminNote>Custom credit is off, so makers can buy packs only.</AdminNote>}
    </Section>
  );
}
