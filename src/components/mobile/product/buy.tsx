"use client";

// Buying a copy of this product (Product Details 10h, 23a–23h; decision D1:
// the sticky bar is the one buy path). The web's edition offers and purchase
// (edition-offers.tsx, purchase-dialog.tsx `useEditionPurchase`), on the
// phone's sheets:
// - the bar: "Copies from {lowest}" and Buy a copy; once this demo buyer
//   owns one, "You own copy #n" and See your files (23d); a preview reads it
//   with Buy switched off (31a);
// - Buy a copy (23a): a card per copy on sale — "Virtual NFT · Personal use",
//   "n of N sold", This version / With future updates with each price (one
//   price when they are the same), the copies' activity line, Buy now · price
//   (sold out: "All N are sold.");
// - Confirm purchase is the demo wallet's own request, as a bottom sheet
//   (the Shared kit's wallet sheet: review, waiting, confirming; you
//   cancelled / didn't go through say "Nothing changed."), with the web's
//   rows and re-checks — sold out, taken off, the price changed, sold in
//   full (23e–23h);
// - Purchase successful (23c): what was minted to whose demo wallet, the
//   transaction and what was paid, See your files and Done.
// "Shop as someone else" switches the demo buyer (Mira, Leo, Sam), the web's
// "Shopping as".

import * as React from "react";
import { CheckmarkCircle02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TIER_WORD, useEditionPurchase, type EditionTier } from "@/components/marketplace/purchase-dialog";
import { estimateGas } from "@/lib/commerce/gas";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { copiesFromOf, copyOrder } from "@/lib/manual/phone-product";
import { editionChainOf, KIND_WORD, soldOf, TIER_HELP, trackCardOf } from "@/lib/market/editions";
import { purchaseQuote } from "@/lib/market/purchase";
import { USE_LABEL } from "@/lib/market/sell-flow";
import type { EditionTrack, Sale } from "@/lib/market/types";
import { historyOf, labelOf, ageOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { LIST_CARD } from "../project/parts";
import { useListedCopies } from "./overview";
import { useProduct } from "./use-product";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** The sticky bar on the buyer's side (10h, 23d, 31a); null when nothing of it is on sale. */
export function BuyBar({ onBuy, onFiles }: { onBuy: () => void; onFiles: () => void }) {
  const { view, viewer, copies } = useProduct();
  const tracks = useListedCopies();
  const from = copiesFromOf(tracks, (t) => trackCardOf(t, view.sales).soldOut);
  const latest = copies.length ? copies.reduce((a, s) => (s.at > a.at ? s : a), copies[0]) : null;
  if (latest && latest.item.nft !== "main") {
    return (
      <BottomBar className="flex-row items-center gap-6 pt-6">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-md font-semibold leading-md text-text-primary">You own copy #{latest.item.serial}</span>
          <span className="truncate text-sm leading-sm text-text-secondary">
            {USE_LABEL[latest.item.use]} · {TIER_WORD[latest.item.tier]}
          </span>
        </span>
        <Button size="xl" onClick={onFiles}>
          See your files
        </Button>
      </BottomBar>
    );
  }
  if (!from) return null;
  const canBuy = can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });
  return (
    <BottomBar className="gap-2 pt-6">
      <div className="flex items-center gap-6">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-sm text-text-secondary">Copies from</span>
          <span className="text-lg font-semibold leading-lg text-text-primary">{formatAmount(from.amount, from.token)}</span>
        </span>
        <Button size="xl" className="min-w-0 flex-1" disabled={!canBuy} onClick={onBuy}>
          Buy a copy
        </Button>
      </div>
      {!canBuy && <p className="text-sm leading-sm text-text-secondary">Buying is off in a preview — this is how buyers see it.</p>}
    </BottomBar>
  );
}

/** 23a–23c: Buy a copy, the wallet's confirm and Purchase successful. */
export function BuyCopy({ open, onClose, onFiles }: { open: boolean; onClose: () => void; onFiles: () => void }) {
  const { project, view, viewer, product, name, buyerId } = useProduct();
  const tracks = useListedCopies();
  const wallet = useWalletSheet();
  const toast = useToast();
  const purchase = useEditionPurchase({ project, view, buyerId: buyerId ?? "buyer-mira", request: wallet.request });
  const [tiers, setTiers] = React.useState<Record<string, EditionTier>>({});
  const [done, setDone] = React.useState<{ track: Listed; tier: EditionTier; line: string } | null>(null);
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  const sorted = [...tracks].sort(copyOrder);
  const canBuy = buyerId !== null && can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });

  // A refusal is the wallet sheet's to say (cancelled, didn't go through); this sheet stays for another try.
  const buy = async (t: Listed, tier: EditionTier) => {
    const line = await purchase.buy(t, tier);
    if (line) setDone({ track: t, tier, line: line.replace(/^Purchase successful\.\s*/, "") });
  };

  const sale: Sale | null = done
    ? (view.sales
        .filter((s) => s.buyerId === buyerId && s.item.nft !== "main" && s.item.trackId === done.track.id)
        .reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null) ?? null)
    : null;
  const quote = done && chain ? purchaseQuote(done.track, "buyNow", done.tier, chain.network) : null;
  const gas = chain ? estimateGas(chain.network) : null;

  return (
    <>
      <Sheet
        open={open && !wallet.busy && done === null}
        onClose={onClose}
        title="Buy a copy"
        description={`${name} · each copy is its own NFT, not the project.`}
      >
        <div className="flex flex-col gap-6 pb-8">
          <p className="text-md leading-md text-text-secondary">
            Choose a copy. This version is the files as they are today; With future updates adds every new version.
          </p>
          <div className="flex">
            <TestnetDemoBadge />
          </div>
          {sorted.map((t) => (
            <CopyCard
              key={t.id}
              track={t}
              tier={tiers[t.id] ?? "regular"}
              onTier={(tier) => setTiers((m) => ({ ...m, [t.id]: tier }))}
              busy={purchase.busyId === t.id}
              canBuy={canBuy}
              onBuy={(tier) => void buy(t, tier)}
            />
          ))}
          {!sorted.length && <p className="text-md leading-md text-text-secondary">{`No copies of ${product.name} are on sale right now.`}</p>}
        </div>
      </Sheet>
      {wallet.sheet}
      <Sheet
        open={done !== null}
        onClose={() => {
          setDone(null);
          onClose();
        }}
        title="Purchase successful"
        actions={
          <>
            <Button
              size="xl"
              className="w-full"
              onClick={() => {
                setDone(null);
                onClose();
                onFiles();
              }}
            >
              See your files
            </Button>
            <Button
              hierarchy="secondary"
              size="xl"
              className="w-full"
              onClick={() => {
                setDone(null);
                onClose();
                toast({ title: "Purchase successful" });
              }}
            >
              Done
            </Button>
          </>
        }
      >
        {done && (
          <div className="flex flex-col gap-6 pb-4">
            <p className="flex items-start gap-4 text-md leading-md text-text-primary">
              <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-success)]">
                <Icon icon={CheckmarkCircle02Icon} size={20} />
              </span>
              {done.line}
            </p>
            <dl className={cn(LIST_CARD)}>
              {sale && (
                <div className="flex items-center justify-between gap-6 border-b-[length:var(--border-width-1)] border-solid border-border-subtle p-6">
                  <dt className="text-md leading-md text-text-secondary">Transaction</dt>
                  <dd className="text-md leading-md text-text-primary">{shortAddress(sale.txHash)} · Demo</dd>
                </div>
              )}
              {quote && gas && (
                <div className="flex items-center justify-between gap-6 p-6">
                  <dt className="text-md leading-md text-text-secondary">Paid</dt>
                  <dd className="text-right text-md leading-md text-text-primary">
                    {formatAmount(quote.price, done.track.listing.token)} (+ {formatAmount(quote.networkFee, gas.native)} network fee)
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </Sheet>
    </>
  );
}

function CopyCard({
  track,
  tier,
  onTier,
  busy,
  canBuy,
  onBuy,
}: {
  track: Listed;
  tier: EditionTier;
  onTier: (t: EditionTier) => void;
  busy: boolean;
  canBuy: boolean;
  onBuy: (t: EditionTier) => void;
}) {
  const { project, view, product } = useProduct();
  const card = trackCardOf(track, view.sales);
  const oneTier = track.listing.extended === track.listing.regular;
  const shown: EditionTier = oneTier ? "extended" : tier;
  const price = shown === "regular" ? track.listing.regular : track.listing.extended;
  const title = `${KIND_WORD[track.kind]} NFT · ${USE_LABEL[track.use]}`;
  return (
    <section aria-label={title} className={cn(LIST_CARD, "gap-4 p-6")}>
      <div className="flex flex-col gap-1">
        <span className="text-md font-semibold leading-md text-text-primary">{title}</span>
        <span className="text-sm leading-sm text-text-secondary">{card.soldOut ? "Sold out" : `${card.sold} of ${card.total} sold`}</span>
      </div>
      {oneTier ? (
        <p className="text-md leading-md text-text-secondary">{TIER_HELP.extended}</p>
      ) : (
        <div role="radiogroup" aria-label={`${title}: choose`} className="flex flex-col gap-3">
          {(["regular", "extended"] as const).map((t) => {
            const on = tier === t;
            return (
              <label
                key={t}
                className={cn(
                  "relative flex min-h-[44px] cursor-pointer items-start gap-4 rounded-md border-[length:var(--border-width-1)] border-solid px-6 py-4",
                  on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
                )}
              >
                <input type="radio" name={`tier-${track.id}`} className="sr-only" checked={on} onChange={() => onTier(t)} />
                <Radio checked={on} decorative size="sm" className="mt-1" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-md font-medium leading-md text-text-primary">{TIER_WORD[t]}</span>
                  {t === "extended" && <span className="text-sm leading-sm text-text-secondary">{TIER_HELP.extended}</span>}
                </span>
                <span className="text-md font-semibold leading-md text-text-primary">
                  {formatAmount(t === "regular" ? track.listing.regular : track.listing.extended, track.listing.token)}
                </span>
              </label>
            );
          })}
        </div>
      )}
      <CopiesLine projectId={project.id} track={track} productId={product.id} />
      {card.soldOut ? (
        <p className="text-md leading-md text-text-secondary">All {card.total} are sold.</p>
      ) : (
        <Button
          size="xl"
          className="w-full"
          loading={busy}
          disabled={!canBuy || soldOf(track.id, view.sales) >= track.supply.total}
          onClick={() => onBuy(shown)}
        >
          {`Buy now · ${formatAmount(price, track.listing.token)}`}
        </Button>
      )}
    </section>
  );
}

/** "No activity yet · listed Oct 28, 2026", or the copies' newest entry: their kind's journey. */
function CopiesLine({ projectId, track, productId }: { projectId: string; track: Listed; productId: string }) {
  const { record } = useJourney(projectId);
  const now = useMinuteClock();
  const latest = historyOf(record, projectId, { kind: track.kind, scope: productId })[0] ?? null;
  return (
    <p className="text-sm leading-sm text-text-secondary">
      {latest ? `Activity · ${labelOf(latest)} · ${ageOf(latest.createdAt, now)}` : `No activity yet · listed ${formatDate(track.listing.listedAt)}`}
    </p>
  );
}

/** The marketplace's Testnet demo banner and its "Shopping as" switch (the web's DemoBuyerBanner). */
export function DemoBuyerBanner() {
  const { buyer, setActiveBuyer } = useActiveBuyer();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Banner
        tone="attention"
        title={`Testnet demo · shopping as ${buyer.name}`}
        action={
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            className="-my-6 inline-flex min-h-[44px] items-center text-md font-medium leading-md outline-none hover:underline focus-visible:underline"
          >
            Shop as someone else
          </button>
        }
      >
        Every listing here is yours, so a demo creator does the buying — test tokens in a test wallet. Nothing is sent to a blockchain.
      </Banner>
      <Sheet open={open} onClose={() => setOpen(false)} title="Shopping as">
        <ul role="listbox" aria-label="Shopping as" className="-mx-8 flex flex-col pb-8">
          {DEMO_BUYERS.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                role="option"
                aria-selected={b.id === buyer.id}
                onClick={() => {
                  setActiveBuyer(b.id);
                  setOpen(false);
                }}
                className="flex h-[44px] w-full items-center justify-between gap-4 rounded-md px-8 text-left text-lg leading-lg text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {b.name} · demo creator
                {b.id === buyer.id && (
                  <span className="text-[color:var(--color-icon-brand)]">
                    <Icon icon={Tick02Icon} size={20} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
