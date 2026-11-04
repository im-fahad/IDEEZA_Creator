"use client";

// Current credit and Credit history (mobile Figma "v2 · AI Credits /
// Balance" and "/ History"), on the web's credits ledger
// (lib/create/credits.tsx) and its lots (credit-lots.ts): the balance and
// what it buys, Running low at your low mark (Settings' credit alerts), this
// monthly period's plan credits, the latest movements, and every lot —
// starting balance, plan credits, packs and custom credits — Active, Used
// up or Expired. Buy more credits is the AI tab's Buy credits sheet; with
// this month's plan credits spent it offers a bigger plan first.

import * as React from "react";
import Link from "next/link";
import { Alert02Icon, ArrowRight01Icon, Invoice03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { allowanceOf, lotStateOf, type LotState } from "@/lib/account/money-phone";
import { nextExpiring, runningLow } from "@/lib/create/credit-limits";
import { lotsOf } from "@/lib/create/credit-lots";
import { usd } from "@/lib/create/credit-pricing";
import { BUILD_COST, describeEntry, useCredits, type CreditEntry } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { BuyCreditsSheet } from "../ai/buy-credits-sheet";
import { ListBones } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { ComparePlansSheet, ReachedLimitSheet, UpgradeUnlockSheet, useNextPlan } from "./credit-sheets";
import { CARD, LINK, Row, dateOf, n, pct } from "./parts";

export function CurrentCreditScreen() {
  const { hydrated, balance, ledger } = useCredits();
  const { hydrated: planReady, sub, plan } = useCreatePlan();
  const discount = useCreditDiscount();
  const { lowAt } = useSettings().credits;
  const next = useNextPlan();
  const [now] = React.useState(() => Date.now());
  const [buying, setBuying] = React.useState(false);
  const [limit, setLimit] = React.useState(false);
  const [compare, setCompare] = React.useState(false);
  const [unlock, setUnlock] = React.useState(false);

  const lots = React.useMemo(() => lotsOf(ledger), [ledger]);
  const month = planReady ? allowanceOf(ledger, lots, sub, now) : null;
  const expiring = nextExpiring(ledger, now);
  const low = hydrated && runningLow(balance, lowAt);
  const recent = ledger.slice(-3).reverse();

  const buy = () => {
    if (month && month.remaining === 0 && next) setLimit(true);
    else setBuying(true);
  };

  return (
    <Screen top={<TopBar back title="Current credit" />} className="px-8 pb-12 pt-4">
      {!hydrated || !planReady ? (
        <ListBones rows={4} />
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-label="Current balance" className="flex flex-col items-center gap-2 rounded-xl border-[length:var(--border-width-1-5)] border-solid border-border-brand bg-bg-surface px-8 py-8 text-center">
            <span className="text-md leading-md text-text-secondary">Current balance</span>
            <span className="text-5xl font-semibold leading-5xl tabular-nums text-text-primary">{n(balance)} credits</span>
            <span className="text-sm leading-sm text-text-secondary">
              ≈ {n(balance)} concept drawings or {n(Math.floor(balance / BUILD_COST))} one-product builds
              {expiring ? ` · ${n(expiring.credits)} expire ${dateOf(expiring.expiresAt)}` : ""}
            </span>
          </section>
          {low && (
            <div role="status" className="flex items-start gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-error)] bg-bg-surface p-6">
              <span aria-hidden className="text-[color:var(--color-icon-warning)]">
                <Icon icon={Alert02Icon} size={20} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-md font-medium leading-md text-text-primary">Running low on credits</span>
                <span className="text-sm leading-sm text-text-secondary">You may run out soon. Top up to keep creating.</span>
              </span>
            </div>
          )}
          <Button size="xl" className="w-full" onClick={buy}>
            Buy more credits
          </Button>

          <section aria-labelledby="this-month" className={cn(CARD, "flex flex-col px-8 py-6")}>
            <h2 id="this-month" className="pb-2 text-xl font-medium leading-xl text-text-primary">
              This month
            </h2>
            <dl className="flex flex-col">
              <Row label={`${plan.name} plan allowance`}>{n(month?.allowance ?? plan.credits)}</Row>
              <Row label="Used" tone={month && month.used > 0 ? "error" : undefined}>
                {n(month?.used ?? 0)}
              </Row>
              <Row label="Remaining" tone="success">
                {n(month?.remaining ?? plan.credits)}
              </Row>
              {month && <Row label="Plan credits end">{dateOf(month.endsAt)}</Row>}
              <Row label="Credit discount">
                {discount > 0 ? (
                  `${pct(discount)} off`
                ) : (
                  <button type="button" onClick={() => setUnlock(true)} className={LINK}>
                    None · Unlock
                  </button>
                )}
              </Row>
            </dl>
            <button type="button" onClick={() => setCompare(true)} className={cn(LINK, "self-start pt-4")}>
              Compare plans
            </button>
          </section>

          <section aria-labelledby="recent" className={cn(CARD, "flex flex-col px-8 py-6")}>
            <h2 id="recent" className="pb-2 text-xl font-medium leading-xl text-text-primary">
              Recent activity
            </h2>
            {recent.length === 0 ? (
              <p className="py-4 text-md leading-md text-text-secondary">No credit has moved yet.</p>
            ) : (
              <ul className="flex flex-col">
                {recent.map((e) => (
                  <ActivityRow key={e.id} entry={e} />
                ))}
              </ul>
            )}
          </section>
          <Link
            href="/m/plans/credits/history"
            className="inline-flex h-[44px] items-center justify-center gap-3 rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-button-secondary-border)] bg-[var(--color-button-secondary-bg)] text-lg leading-lg text-[color:var(--color-button-secondary-text)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            View full credit history
            <Icon icon={ArrowRight01Icon} size={16} />
          </Link>
        </div>
      )}
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} />
      <ReachedLimitSheet open={limit} onClose={() => setLimit(false)} allowance={month?.allowance ?? plan.credits} onBuy={() => setBuying(true)} />
      <ComparePlansSheet open={compare} onClose={() => setCompare(false)} />
      <UpgradeUnlockSheet open={unlock} onClose={() => setUnlock(false)} />
    </Screen>
  );
}

function ActivityRow({ entry: e }: { entry: CreditEntry }) {
  const line = describeEntry(e);
  const amount = line.split(" ")[0];
  const what = line.slice(amount.length + 1);
  return (
    <li className="flex items-center justify-between gap-6 py-3">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-md leading-md text-text-primary">{what}</span>
        <span className="text-sm leading-sm text-text-secondary">{dateOf(e.ts)}</span>
      </span>
      <span className={cn("shrink-0 text-md font-medium leading-md tabular-nums", e.delta >= 0 ? "text-text-success" : "text-text-primary")}>{amount}</span>
    </li>
  );
}

/** "Pro pack", "Custom credit", "Starting balance", "Builder plan credits". */
function lotName(e: CreditEntry | undefined): string {
  if (!e) return "Credits";
  if (e.reason === "purchase") return e.pack ? `${e.pack} pack` : "Custom credit";
  if (e.reason === "seed") return "Starting balance";
  if (e.reason === "grant") return `${e.pack ?? "Plan"} plan credits`;
  return "Top up";
}

const STATE_BADGE: Record<LotState, { tone: "success" | "neutral"; label: string }> = {
  active: { tone: "success", label: "Active" },
  used: { tone: "neutral", label: "Used up" },
  expired: { tone: "neutral", label: "Expired" },
};

export function CreditHistoryScreen() {
  const { hydrated, balance, ledger } = useCredits();
  const [now] = React.useState(() => Date.now());
  const byId = React.useMemo(() => new Map(ledger.map((e) => [e.id, e])), [ledger]);
  const lots = React.useMemo(() => lotsOf(ledger).slice().reverse(), [ledger]);
  const active = lots.filter((l) => lotStateOf(l, now) === "active").length;
  return (
    <Screen top={<TopBar back title="Credit history" />} className="px-8 pb-12 pt-4">
      {!hydrated ? (
        <ListBones rows={4} />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-medium leading-2xl text-text-primary">Credit history</h2>
            <p className="text-md leading-md text-text-secondary">Track your purchases and credit usage.</p>
          </div>
          <div className="flex items-center justify-between gap-6 rounded-xl bg-bg-brand-subtle px-8 py-6">
            <span className="flex flex-col gap-1">
              <span className="text-sm leading-sm text-text-secondary">Total remaining credits</span>
              <span className="text-3xl font-semibold leading-3xl tabular-nums text-text-brand">{n(balance)} credits</span>
            </span>
            <Badge tone="brand-outline">
              {active} active {active === 1 ? "pack" : "packs"}
            </Badge>
          </div>
          {lots.length === 0 ? (
            <StateCard tone="empty" className="w-full" icon={<Icon icon={Invoice03Icon} size={24} />} title="No credits yet" body="Credits your plan adds and credits you buy show up here." />
          ) : (
            <ul className="flex flex-col gap-6">
              {lots.map((l, i) => {
                const e = byId.get(l.id);
                const state = STATE_BADGE[lotStateOf(l, now)];
                return (
                  <li key={l.id} className={cn(CARD, "flex flex-col p-8")}>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xl font-medium leading-xl text-text-primary">{lotName(e)}</h3>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </div>
                    <p className="flex items-center justify-between gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-subtle pb-4 pt-2 text-md leading-md">
                      <span className="inline-flex items-center gap-3 font-medium text-text-primary">
                        {e?.price !== undefined ? `Paid ${usd(e.price)}` : e?.reason === "grant" ? "With your plan" : "Free"}
                        {i === 0 && e?.price !== undefined && <TestnetDemoBadge />}
                      </span>
                      <span className="text-text-secondary">{dateOf(l.ts)}</span>
                    </p>
                    <dl className="flex flex-col pt-2">
                      <Row label="Credits">
                        {n(l.amount - l.bonus)}
                        {l.bonus > 0 && <span className="text-text-success"> +{n(l.bonus)} bonus</span>}
                      </Row>
                      <Row label="Remaining" tone={l.remaining > 0 ? "success" : undefined}>
                        {n(l.remaining)}
                      </Row>
                      <Row label="Expires">{l.expiresAt === null ? "Never" : dateOf(l.expiresAt)}</Row>
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Screen>
  );
}
