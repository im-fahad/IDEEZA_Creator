"use client";

// Feed · "NFT Sell" (states 2–6): what the clip's item is offered at, one card
// at a time across the clip's text column, with the dots under it. A card is
// the glass card (color/glass/shadow, radius/md, 12 padding, 8 apart): the NFT
// (Label/MD) and its use or price (Body/XS), a Caption/SM line (sold count or
// listing type), the Testnet demo pill on the first, and an A01 Primary SM
// button that opens the item's marketplace, where buying happens (one home).
// A project starts at its Main NFT; a product at its Physical NFT.

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { OFFER_NAME, offerActionLabel, type ClipOffer } from "@/lib/innovations/clips";
import { cn } from "@/lib/utils";

function line(o: ClipOffer): { aside: string | null; caption: string | null } {
  if (o.kind === "main") return { aside: `Price: ${o.price}`, caption: "Listing type: Buy now" };
  return { aside: o.use, caption: o.sold ? `NFT sold: ${o.sold.count}/${o.sold.of}` : null };
}

export function ClipOffers({ offers, onBuy }: { offers: readonly ClipOffer[]; onBuy: (o: ClipOffer) => void }) {
  const track = React.useRef<HTMLDivElement>(null);
  const [at, setAt] = React.useState(0);
  if (!offers.length) return null;

  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        ref={track}
        aria-label="On the marketplace"
        role="group"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {offers.map((o, i) => {
          const { aside, caption } = line(o);
          return (
            <div key={`${o.kind}-${i}`} className="w-full shrink-0 snap-start">
              <div className="flex flex-col gap-4 rounded-md bg-[var(--color-glass-shadow)] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex items-center gap-4 text-sm text-text-primary">
                      <span className="font-semibold leading-xs tracking-wide">{OFFER_NAME[o.kind]}</span>
                      {aside && <span className="truncate leading-sm">{aside}</span>}
                    </p>
                    {caption && <p className="text-xs leading-xs text-text-primary">{caption}</p>}
                  </div>
                  {i === 0 && <TestnetDemoBadge className="shrink-0" />}
                </div>
                <Button size="sm" className="w-full" onClick={() => onBuy(o)}>
                  {offerActionLabel(o)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {offers.length > 1 && (
        <div className="flex items-center gap-2">
          {offers.map((o, i) => (
            <button
              key={`${o.kind}-${i}`}
              type="button"
              aria-label={`${OFFER_NAME[o.kind]}, ${i + 1} of ${offers.length}`}
              aria-current={i === at ? "true" : undefined}
              onClick={() => go(i)}
              className="flex size-[16px] items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span
                className={cn(
                  "size-[8px] rounded-full",
                  i === at ? "bg-[var(--color-bg-inverse)]" : "bg-[var(--color-bg-surface-raised)] opacity-30",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
