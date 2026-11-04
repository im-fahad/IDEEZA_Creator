"use client";

// Plan & pricing on the phone (/m/plans; mobile Figma "Monthly plan",
// "Yearly plan", "AI Credits", "Billing History"): the Plans · Credits ·
// Billing tabs (`?tab=`). The plans, prices, relations and words are the
// web's (lib/create/plans.ts, components/credits/plans-panel.tsx): Free,
// Tinkerer, Builder, Disruptor; an upgrade goes to the checkout, a smaller
// plan to Downgrade, Free to Cancel subscription; the compare table and the
// Pricing FAQs are the web's own rows. The Figma's partner logos and website
// footer are the landing page's, not the app's, and aren't drawn here.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Folder01Icon,
  FlashIcon,
  MinusSignIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { COMPARE, FAQ, FAQ_TABS, HELPFUL_KEY, type Cell, type FaqTab } from "@/components/credits/plans-panel";
import { OfferSticker, useWelcomeOffer } from "@/components/credits/welcome-offer";
import { countdown, offerPrice } from "@/lib/account/welcome-offer";
import { discountFor, type BillingCycle } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { HIGH_VIDEO_TIER, PLANS, YEARLY_OFF, planOf, priceOf, relationOf, type Plan, type PlanTier, type Subscription } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { BillingTab } from "./billing-tab";
import { CancelSheet } from "./cancel-sheet";
import { CreditsTab } from "./credits-tab";
import { CARD, PillSwitch, PlanTabs, checkoutPath, dateOf, dollars, downgradePath, n, pct, usePlanTab } from "./parts";

const PAID = PLANS.filter((p) => p.monthly > 0);
const FREE = planOf("free");

export function PlansScreen() {
  const tab = usePlanTab();
  return (
    <Screen top={<TopBar back title="Plan & pricing" />} className="px-8 pb-12">
      <div className="flex flex-col gap-12 pt-2">
        <PlanTabs tab={tab} />
        {tab === "plans" ? <PlansTab /> : tab === "credits" ? <CreditsTab /> : <BillingTab />}
      </div>
    </Screen>
  );
}

/** What a plan's button says and does, by how it stands to the subscription (the web's useCta). */
export function ctaOf(sub: Subscription, tier: PlanTier, cycle: BillingCycle, hydrated: boolean) {
  const rel = hydrated ? relationOf(sub, tier, cycle) : "current";
  const same = sub.tier === tier;
  const label =
    rel === "current"
      ? "Current plan"
      : rel === "scheduled"
        ? `Starts on ${sub.renewsAt ? dateOf(sub.renewsAt) : "renewal"}`
        : rel === "upgrade"
          ? same
            ? "Switch to annual"
            : "Upgrade"
          : same
            ? "Switch to monthly"
            : tier === "free"
              ? "Switch to Free"
              : "Downgrade";
  return { rel, label, enabled: hydrated && (rel === "upgrade" || rel === "downgrade") };
}

function PlansTab() {
  const router = useRouter();
  const { hydrated, sub } = useCreatePlan();
  const offer = useWelcomeOffer();
  const offerLive = offer.ready && offer.live;
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [synced, setSynced] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  // Open on the cycle you pay by, once the plan is read.
  if (hydrated && !synced) {
    setSynced(true);
    if (sub.tier !== "free") setCycle(sub.cycle);
  }

  const act = (p: Plan, c: BillingCycle) => {
    const rel = relationOf(sub, p.tier, c);
    if (rel === "upgrade") router.push(checkoutPath(p.tier, c));
    else if (rel === "downgrade") {
      if (p.tier === "free") setCancelling(true);
      else router.push(downgradePath(p.tier, c));
    }
  };

  return (
    <>
      <section aria-labelledby="choose-plan" className="flex flex-col gap-8">
        {offerLive && (
          <Banner tone="good" title="Welcome offer: 50% off">
            Your first payment on any plan is half price. It ends in <span className="tabular-nums">{countdown(offer.left)}</span>.
          </Banner>
        )}
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 id="choose-plan" className="text-5xl font-semibold leading-5xl text-text-primary">
            Choose a plan
          </h2>
          <p className="text-md leading-md text-text-secondary">Break creative boundaries with flexible plans made just for you.</p>
        </div>
        <PillSwitch
          label="Billing"
          value={cycle}
          onChange={setCycle}
          options={[
            { value: "monthly", label: "Monthly plan" },
            {
              value: "yearly",
              label: (
                <>
                  Annual plan · <span className="text-text-success">Save {pct(YEARLY_OFF)}</span>
                </>
              ),
            },
          ]}
        />
        <ul className="flex flex-col gap-8">
          {PAID.map((p, i) => (
            <PlanCard key={p.tier} plan={p} below={i === 0 ? FREE : PAID[i - 1]} cycle={cycle} offer={offerLive} first={i === 0} onAct={() => act(p, cycle)} />
          ))}
          <PlanCard plan={FREE} cycle="monthly" offer={false} onAct={() => act(FREE, "monthly")} />
        </ul>
      </section>
      <ComparePlans cycle={cycle} />
      <PricingFaqs />
      <CancelSheet open={cancelling} onClose={() => setCancelling(false)} />
    </>
  );
}

function PlanCard({ plan: p, below, cycle, offer, first, onAct }: { plan: Plan; below?: Plan; cycle: BillingCycle; offer: boolean; first?: boolean; onAct: () => void }) {
  const { hydrated, sub } = useCreatePlan();
  const cta = ctaOf(sub, p.tier, cycle, hydrated);
  const per = priceOf(p.tier, cycle).perMonth;
  const offered = offer && p.monthly > 0;
  const discount = discountFor(p.tier, "monthly");
  const features = [
    { icon: FlashIcon, text: p.queue.replace(/, peak waits possible$/, " (peak waits possible)").replace(/, shortest waits$/, " (shortest waits)") },
    { icon: Folder01Icon, text: `${n(p.projects)} ${p.projects === 1 ? "project" : "projects"} • ${n(p.exports)} exports` },
    {
      icon: UserGroupIcon,
      text: `${p.contributors === 0 ? "No contributors" : `${n(p.contributors)} ${p.contributors === 1 ? "contributor" : "contributors"}`} • Mint, list and buy`,
    },
    ...(discount > 0 ? [{ icon: Tick02Icon, text: `${pct(discount)} off AI credits (${pct(discountFor(p.tier, "yearly"))} yearly)` }] : []),
    ...(p.tier === HIGH_VIDEO_TIER ? [{ icon: Tick02Icon, text: "720p AI video" }] : []),
  ];
  return (
    <li
      aria-label={`${p.name} plan`}
      className={cn(
        "flex flex-col gap-8 rounded-xl border-[length:var(--border-width-1)] border-solid p-8",
        p.popular ? "border-border-brand bg-[linear-gradient(180deg,var(--color-bg-brand-subtle),var(--color-bg-surface)_40%)]" : "border-border-subtle bg-bg-surface",
      )}
    >
      <div className="flex flex-col gap-3 border-b-[length:var(--border-width-1)] border-solid border-border-subtle pb-8">
        <div className="flex items-center justify-between gap-4">
          <h3 className={cn("text-2xl font-semibold leading-2xl", p.popular ? "text-text-brand" : "text-text-primary")}>{p.tier === "free" ? "Free plan" : p.name}</h3>
          {p.popular && <Badge tone="brand-solid">Most popular</Badge>}
        </div>
        <p className="text-lg leading-lg text-text-secondary">{p.tagline}</p>
      </div>
      <div className="flex flex-col gap-3 border-b-[length:var(--border-width-1)] border-solid border-border-subtle pb-8">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-4xl font-bold leading-4xl tabular-nums text-text-primary">{dollars(offered ? offerPrice(per).final : per)}/</span>
          <span className="text-lg leading-lg text-text-secondary">{p.monthly > 0 && cycle === "yearly" ? "mo, billed yearly" : "month"}</span>
          {first && <TestnetDemoBadge />}
        </p>
        {offered && (
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-md leading-md">
            <OfferSticker size="sm" />
            <span className="tabular-nums text-text-tertiary line-through">{dollars(per)}</span>
            <span className="font-medium text-text-success">your {cycle === "yearly" ? "first year" : "first month"}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-6">
        {below && <p className="text-lg leading-lg text-text-primary">Everything in {below.tier === "free" ? "Free plan" : below.name}</p>}
        <ul className="flex flex-col gap-6 text-md leading-md text-text-primary">
          <li className="flex items-center gap-5">
            <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
              <Icon icon={AiMagicIcon} size={16} />
            </span>
            <span>
              AI credits: <CreditChip value={p.credits} /> / month
            </span>
          </li>
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-5">
              <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                <Icon icon={f.icon} size={16} />
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>
      <Button hierarchy={cta.rel === "upgrade" && p.popular ? "primary" : "secondary"} size="xl" className="w-full" disabled={!cta.enabled} onClick={onAct}>
        {cta.label}
      </Button>
    </li>
  );
}

export function CreditChip({ value }: { value: number }) {
  return <span className="mx-2 inline-flex rounded-md bg-bg-brand-subtle px-4 py-1 font-medium tabular-nums text-text-brand">{n(value)}</span>;
}

// ── Compare plans ──────────────────────────────────────────────────────

function CellValue({ value, chip }: { value: Cell; chip?: boolean }) {
  if (value === true)
    return (
      <span role="img" aria-label="Included" className="inline-flex size-[24px] items-center justify-center rounded-full bg-bg-brand-subtle text-text-brand">
        <Icon icon={Tick02Icon} size={14} />
      </span>
    );
  if (value === false)
    return (
      <span role="img" aria-label="Not included" className="inline-flex size-[24px] items-center justify-center rounded-full bg-bg-subtle text-text-tertiary">
        <Icon icon={MinusSignIcon} size={14} />
      </span>
    );
  const text = typeof value === "number" ? n(value) : value;
  return chip ? <CreditChip value={value as number} /> : <span className="text-sm leading-sm text-text-primary">{text}</span>;
}

function ComparePlans({ cycle }: { cycle: BillingCycle }) {
  const [open, setOpen] = React.useState<Set<string>>(() => new Set([COMPARE[0].group]));
  const toggle = (g: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  return (
    <section aria-labelledby="compare-plans" className="flex flex-col gap-8">
      <h2 id="compare-plans" className="text-center text-4xl font-semibold leading-4xl text-text-primary">
        Compare plans
      </h2>
      <div className="sticky top-0 z-10 grid grid-cols-4 rounded-xl bg-bg-subtle p-2 text-center">
        {PLANS.map((p) => (
          <span key={p.tier} className="flex flex-col py-2">
            <span className="truncate text-md font-medium leading-md text-text-primary">{p.tier === "free" ? "Free" : p.name}</span>
            <span className="text-xs leading-xs tabular-nums text-text-secondary">
              {dollars(priceOf(p.tier, p.monthly > 0 ? cycle : "monthly").perMonth)}/mo
            </span>
          </span>
        ))}
      </div>
      {COMPARE.map((g) => {
        const on = open.has(g.group);
        const id = `cmp-${g.group.replace(/\W+/g, "-")}`;
        return (
          <div key={g.group} className={CARD}>
            <h3>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={id}
                onClick={() => toggle(g.group)}
                className="flex min-h-[56px] w-full items-center justify-between gap-4 px-8 text-left text-lg font-medium leading-lg text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {g.group.charAt(0).toUpperCase() + g.group.slice(1)}
                <span aria-hidden className="inline-flex size-[32px] items-center justify-center rounded-full bg-bg-subtle text-[color:var(--color-icon-default)]">
                  <Icon icon={on ? ArrowUp01Icon : ArrowDown01Icon} size={16} />
                </span>
              </button>
            </h3>
            {on && (
              <dl id={id} className="flex flex-col divide-y divide-border-subtle border-t-[length:var(--border-width-1)] border-solid border-border-subtle">
                {g.rows.map((r) => (
                  <div key={r.label} className="flex flex-col gap-4 px-8 py-6">
                    <dt className="text-md leading-md text-text-secondary">{r.label}</dt>
                    <dd className="grid grid-cols-4 items-center justify-items-center gap-2 text-center">
                      {r.values.map((v, i) => (
                        <span key={PLANS[i].tier} className="flex min-w-0 flex-col items-center">
                          <span className="sr-only">{PLANS[i].name}: </span>
                          <CellValue value={v} chip={r.chip} />
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ── Pricing FAQs ───────────────────────────────────────────────────────

function PricingFaqs() {
  const [tab, setTab] = React.useState<FaqTab>("general");
  const [open, setOpen] = React.useState<string | null>(FAQ.general[0].q);
  const [votes, setVotes] = React.useState<Record<string, "up" | "down">>({});

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HELPFUL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of localStorage after mount
      if (raw) setVotes(JSON.parse(raw) as Record<string, "up" | "down">);
    } catch {}
  }, []);

  const vote = (q: string, v: "up" | "down") =>
    setVotes((prev) => {
      const next = { ...prev, [q]: v };
      try {
        window.localStorage.setItem(HELPFUL_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  return (
    <section aria-labelledby="plans-faq" className="flex flex-col gap-8">
      <h2 id="plans-faq" className="text-center text-4xl font-semibold leading-4xl text-text-primary">
        Pricing FAQs
      </h2>
      <div role="tablist" aria-label="Questions about" className="flex flex-col items-center gap-2">
        {FAQ_TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setTab(t.id);
                setOpen(FAQ[t.id][0]?.q ?? null);
              }}
              className={cn(
                "min-h-[36px] rounded-lg px-8 text-md leading-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "bg-bg-subtle font-medium text-text-primary" : "text-text-secondary",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <ol role="tabpanel" aria-label={FAQ_TABS.find((t) => t.id === tab)?.label} className="flex flex-col gap-6">
        {FAQ[tab].map((f, i) => {
          const on = open === f.q;
          return (
            <li key={f.q} className={cn(CARD, "flex flex-col")}>
              <button
                type="button"
                aria-expanded={on}
                onClick={() => setOpen(on ? null : f.q)}
                className="flex min-h-[64px] w-full items-center gap-5 px-8 py-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span aria-hidden className="inline-flex h-[24px] min-w-[28px] items-center justify-center rounded-full bg-bg-subtle text-xs leading-xs tabular-nums text-text-secondary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-lg font-medium leading-lg text-text-primary">{f.q}</span>
                <span aria-hidden className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-full bg-bg-subtle text-[color:var(--color-icon-default)]">
                  <Icon icon={on ? ArrowUp01Icon : ArrowDown01Icon} size={16} />
                </span>
              </button>
              {on && (
                <div className="flex flex-col items-start gap-6 px-8 pb-8">
                  <p className="text-md leading-md text-text-secondary">{f.a}</p>
                  {votes[f.q] ? (
                    <p role="status" className="inline-flex items-center gap-2 rounded-full bg-bg-subtle px-6 py-2 text-sm leading-sm text-text-secondary">
                      <Icon icon={CheckmarkCircle02Icon} size={14} />
                      Thanks for telling us.
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 rounded-full bg-bg-subtle py-1 pl-6 pr-1">
                      <span className="text-sm leading-sm text-text-secondary">Was this helpful?</span>
                      {(["down", "up"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          aria-label={v === "up" ? "Yes, it helped" : "No, it didn't help"}
                          onClick={() => vote(f.q, v)}
                          className="inline-flex size-[44px] items-center justify-center rounded-full text-text-tertiary outline-none hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          <Icon icon={v === "up" ? ThumbsUpIcon : ThumbsDownIcon} size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
