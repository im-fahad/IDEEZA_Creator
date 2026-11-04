"use client";

// The welcome offer's surfaces (lib/account/welcome-offer.ts; owner 2026-11-04):
//   WelcomeOfferHost — on Home, as soon as the Welcome closes (after the tour,
//     when Look around first started one) and no other dialog is open, the pop-up: half off any plan's first
//     payment for 12 hours, the clock running, a plan to pick, Get it. Closed,
//     it never pops up again — the offer moves to the sidebar's Upgrade card.
//   OfferBanner — the same offer at the top of Plan & pricing.
//   useWelcomeOffer — the signed-in account's offer, ticking.

import * as React from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GiftIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { tourPlaying } from "@/components/research/signals";
import { Badge, Button, ModalFrame, Segmented } from "@/components/ideeza";
import { linkVariants } from "@/components/ideeza/link";
import { useAuth } from "@/lib/account/auth";
import {
  OFFER_HOURS,
  OFFER_OFF,
  closeOffer,
  countdown,
  countdownParts,
  msLeft,
  offerPhase,
  offerPrice,
  startOffer,
  useOfferEntry,
  type OfferEntry,
  type OfferPhase,
} from "@/lib/account/welcome-offer";
import { checkoutHref } from "@/lib/create/checkout-route";
import { usd, type BillingCycle } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { PLANS, priceOf, type PlanTier } from "@/lib/create/plans";
import { cn } from "@/lib/utils";

/** Home waits this long for the Welcome to open first, and for the page to settle. */
const SETTLE_MS = 1500;
/** Then how often it looks again for the other dialog to have closed. */
const RETRY_MS = 1000;
const OFF = `${Math.round(OFFER_OFF * 100)}%`;

function useNow(every: number): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!every) return;
    const id = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(id);
  }, [every]);
  return now;
}

export type WelcomeOffer = {
  ready: boolean;
  email: string | null;
  entry: OfferEntry | null;
  phase: OfferPhase;
  /** The offer is on and can be used now: open, and the account still on Free. */
  live: boolean;
  /** It may start: a signed-in account that has never paid for a plan. */
  eligible: boolean;
  left: number;
};

export function useWelcomeOffer(): WelcomeOffer {
  const { hydrated: authReady, account } = useAuth();
  const { hydrated: planReady, sub } = useCreatePlan();
  const email = account?.email ?? null;
  const { hydrated, entry } = useOfferEntry(email);
  const ticking = !!entry && entry.usedAt === null;
  const now = useNow(ticking ? 1000 : 0);
  const phase = offerPhase(entry, now);
  const onFree = sub.tier === "free";
  return {
    ready: authReady && planReady && hydrated,
    email,
    entry,
    phase,
    live: phase === "open" && onFree,
    eligible: !!account && onFree && sub.orders.length === 0,
    left: msLeft(entry, now),
  };
}

/** The three paid plans, as the offer prices their first payment. */
const PAID = PLANS.filter((p) => p.monthly > 0);

function firstPayment(tier: PlanTier, cycle: BillingCycle) {
  const { period } = priceOf(tier, cycle);
  return { period, ...offerPrice(period) };
}

function Countdown({ ms, size = "lg" }: { ms: number; size?: "lg" | "sm" }) {
  const p = countdownParts(ms);
  if (size === "sm") return <span className="tabular-nums">{countdown(ms)}</span>;
  return (
    <div role="timer" aria-label={`Offer ends in ${p.hours} hours ${p.minutes} minutes`} className="flex items-start justify-center gap-[8px]">
      {(
        [
          [p.hours, "hours"],
          [p.minutes, "minutes"],
          [p.seconds, "seconds"],
        ] as const
      ).map(([v, label], i) => (
        <React.Fragment key={label}>
          {i > 0 ? (
            <span aria-hidden className="pt-[10px] text-3xl font-bold leading-3xl text-text-tertiary">
              :
            </span>
          ) : null}
          <span className="flex flex-col items-center gap-[4px]">
            <span
              aria-hidden
              className="inline-flex h-[64px] w-[72px] items-center justify-center rounded-[var(--radius-xl)] bg-bg-subtle font-[family-name:var(--font-family-display)] text-4xl font-bold leading-4xl tabular-nums text-text-primary"
            >
              {v}
            </span>
            <span aria-hidden className="text-sm leading-sm text-text-tertiary">
              {label}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function OfferDialog({ offer, onClose }: { offer: WelcomeOffer; onClose: () => void }) {
  const router = useRouter();
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [tier, setTier] = React.useState<PlanTier>("builder");
  const ctaRef = React.useRef<HTMLButtonElement>(null);
  const picked = PAID.find((p) => p.tier === tier)!;
  const pay = firstPayment(tier, cycle);
  const span = cycle === "yearly" ? "first year" : "first month";

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      sheet
      initialFocus={ctaRef}
      icon={
        <span className="inline-flex size-[44px] items-center justify-center rounded-[var(--radius-xl)] bg-[image:var(--gradient-button-ai)] text-[color:var(--color-white)] shadow-depth">
          <Icon icon={GiftIcon} size={22} />
        </span>
      }
      title={`Welcome gift: ${OFF} off any plan`}
      description={`Half price on your ${cycle === "yearly" ? "first year" : "first month"}. Only for the next ${OFFER_HOURS} hours, and only for you.`}
    >
      <div className="flex flex-col gap-[20px]">
        <Countdown ms={offer.left} />
        <Segmented
          label="Billing"
          className="self-center"
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Annual" },
          ]}
        />
        <div role="radiogroup" aria-label="Plan" className="flex flex-col gap-[8px]">
          {PAID.map((p) => {
            const on = p.tier === tier;
            const f = firstPayment(p.tier, cycle);
            return (
              <button
                key={p.tier}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTier(p.tier)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-[12px] rounded-[var(--radius-xl)] border-[length:var(--border-width-1-5)] border-solid px-[14px] py-[12px] text-left outline-none transition-colors duration-[var(--motion-duration-normal)] focus-visible:shadow-focus-brand",
                  on ? "border-[var(--color-border-brand)] bg-[var(--color-bg-brand-subtle)]" : "border-[var(--color-border-default)] bg-bg-surface hover:bg-bg-subtle",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[length:var(--border-width-2)] border-solid",
                    on ? "border-[var(--color-bg-brand)]" : "border-[var(--color-input-border)]",
                  )}
                >
                  {on ? <span className="size-[8px] rounded-full bg-[var(--color-bg-brand)]" /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-[8px] text-md font-semibold leading-md text-text-primary">
                    {p.name}
                    {p.popular ? <Badge tone="brand">Most popular</Badge> : null}
                  </span>
                  <span className="text-sm leading-sm text-text-secondary">{p.credits.toLocaleString("en-US")} AI credits a month</span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="text-lg font-bold leading-lg tabular-nums text-text-primary">{usd(f.final)}</span>
                  <span className="text-sm leading-sm tabular-nums text-text-tertiary line-through">{usd(f.period)}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-[10px]">
          <Button
            ref={ctaRef}
            hierarchy="ai"
            size="xl"
            className="w-full"
            onClick={() => go(checkoutHref({ kind: "plan", tier, cycle }))}
          >
            Get {picked.name} for {usd(pay.final)}
          </Button>
          <p className="m-0 text-center text-sm leading-sm text-text-tertiary">
            Your {span} at half price, then {usd(pay.period)} {cycle === "yearly" ? "a year" : "a month"}. Cancel any time. Testnet demo: no real money
            moves.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-[16px] gap-y-[4px]">
            <NextLink href="/settings/plan" onClick={onClose} className={linkVariants({ size: "md" })}>
              Compare all plans
            </NextLink>
            <Button hierarchy="ghost" size="md" onClick={onClose}>
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}

/** A tour is playing (the Welcome's Look around first): the offer waits for it to end. */
function useTourPlaying(): boolean {
  return React.useSyncExternalStore(tourPlaying.subscribe, tourPlaying.get, () => true);
}

/** On Home, after the Welcome: starts the 12 hours and shows the pop-up, once. */
export function WelcomeOfferHost() {
  const pathname = usePathname();
  const offer = useWelcomeOffer();
  const covered = useTourPlaying();
  const [open, setOpen] = React.useState(false);

  // It pops up while it has never been closed: first after the Welcome, and again on Home
  // if the page was left with it still up. Never once closed.
  const due =
    pathname === "/" &&
    offer.ready &&
    !covered &&
    !open &&
    (offer.phase === "unstarted" ? offer.eligible : offer.live && offer.entry?.closedAt === null);

  // After the page settles, it looks every second until no other dialog (the Welcome) is up.
  React.useEffect(() => {
    if (!due || !offer.email) return;
    const email = offer.email;
    let poll = 0;
    const tryOpen = () => {
      if (document.querySelector('[aria-modal="true"]')) return;
      window.clearInterval(poll);
      if (startOffer(email, Date.now()).ok) setOpen(true);
    };
    const settle = window.setTimeout(() => {
      tryOpen();
      poll = window.setInterval(tryOpen, RETRY_MS);
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(settle);
      window.clearInterval(poll);
    };
  }, [due, offer.email]);

  if (!open || !offer.email || !offer.live) return null;
  return (
    <OfferDialog
      offer={offer}
      onClose={() => {
        closeOffer(offer.email!, Date.now());
        setOpen(false);
      }}
    />
  );
}

/** Plan & pricing's line about the offer, while it runs. */
export function OfferBanner() {
  const offer = useWelcomeOffer();
  if (!offer.ready || !offer.live) return null;
  return (
    <div className="flex w-full flex-wrap items-center gap-x-[16px] gap-y-[8px] rounded-2xl bg-[image:var(--gradient-button-ai)] px-[20px] py-[16px] text-[color:var(--color-white)]">
      <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-[color:color-mix(in_srgb,var(--color-white)_18%,transparent)]">
        <Icon icon={GiftIcon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-lg font-semibold leading-lg">Your welcome gift: {OFF} off your first payment</p>
        <p className="m-0 text-md leading-md text-[color:color-mix(in_srgb,var(--color-white)_82%,transparent)]">
          Any plan, monthly or annual. The prices below already include it.
        </p>
      </div>
      <p className="m-0 flex items-center gap-[8px] rounded-full bg-[color:color-mix(in_srgb,var(--color-white)_16%,transparent)] px-[14px] py-[6px] text-md font-semibold leading-md">
        Ends in <Countdown ms={offer.left} size="sm" />
      </p>
    </div>
  );
}

export { Countdown as OfferCountdown };
