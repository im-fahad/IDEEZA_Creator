"use client";

// Plan & pricing › Billing (mobile Figma "v2 · Billing History"): the
// current plan (price, renewal or end, AI credits, how it is paid; Downgrade
// plan and Cancel, or Keep when a change is waiting) and every payment as an
// invoice row (lib/account/invoices.ts: plan payments, renewals marked Not
// charged, credit purchases), each opening its invoice.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon, Invoice03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useWalletStatus } from "@/components/credits/payment-picker";
import { useDefaultToken } from "@/lib/account/payment";
import { invoicesOf } from "@/lib/account/invoices";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { PLANS, planOf, priceOf } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { CancelSheet } from "./cancel-sheet";
import { CARD, Row, SECTION_TITLE, dateOf, downgradePath, invoicePath, n } from "./parts";

const PER_PAGE = 10;

export function BillingTab() {
  const { hydrated: planReady, sub } = useCreatePlan();
  const { hydrated: creditsReady, ledger } = useCredits();
  const [count, setCount] = React.useState(PER_PAGE);
  const all = React.useMemo(() => invoicesOf(ledger, sub.orders), [ledger, sub.orders]);
  if (!planReady || !creditsReady) return <ListBones rows={4} />;
  return (
    <div className="flex flex-col gap-12">
      <CurrentPlan />
      <section aria-labelledby="invoices" className="flex flex-col gap-6">
        <h2 id="invoices" className={SECTION_TITLE}>
          Invoices
        </h2>
        {all.length === 0 ? (
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={Invoice03Icon} size={24} />}
            title="No payments yet"
            body="What you pay for a plan or for credits shows up here, each with its invoice."
            action={
              <Link href="/m/plans?tab=credits" className="text-md font-medium leading-md text-text-brand hover:underline">
                Buy credits
              </Link>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {all.slice(0, count).map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={invoicePath(inv.id)}
                    aria-label={`${inv.item}, ${dateOf(inv.ts)}, ${usd(inv.total)}, ${inv.status}. Open the invoice`}
                    className={cn(CARD, "flex items-center justify-between gap-6 px-7 py-6 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-md font-medium leading-md text-text-primary">{inv.item}</span>
                      <span className="text-sm leading-sm text-text-secondary">{dateOf(inv.ts)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-md font-medium leading-md tabular-nums text-text-primary">{usd(inv.total)}</span>
                      <span className="flex items-center gap-3">
                        <Badge tone={inv.status === "Paid" ? "success" : "neutral"}>{inv.status}</Badge>
                        <span className="text-sm font-medium leading-sm text-text-brand">PDF</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {all.length > count && (
              <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setCount((c) => c + PER_PAGE)}>
                Show more
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function CurrentPlan() {
  const router = useRouter();
  const { sub, plan, keep } = useCreatePlan();
  const wallet = useWalletStatus();
  const token = useDefaultToken();
  const toast = useToast();
  const [cancelling, setCancelling] = React.useState(false);
  const paid = sub.renewsAt !== null;
  const per = priceOf(sub.tier, sub.cycle);
  const when = sub.renewsAt ? dateOf(sub.renewsAt) : "";
  const pending = sub.pending;
  const status = !paid
    ? { tone: "success" as const, label: "Active" }
    : !pending
      ? { tone: "success" as const, label: "Active" }
      : pending.tier === "free"
        ? { tone: "warning" as const, label: `Ends ${when}` }
        : { tone: "warning" as const, label: `Changes ${when}` };
  const smaller = PLANS.filter((p) => p.monthly > 0 && p.monthly < plan.monthly);
  const down = smaller[smaller.length - 1] ?? null;
  return (
    <section aria-label="Current plan" className={cn(CARD, "flex flex-col gap-4 p-8")}>
      <div className="flex items-start justify-between gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-subtle pb-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm leading-sm text-text-secondary">Current plan</span>
          <span className="text-2xl font-medium leading-2xl text-text-primary">
            {plan.tier === "free" ? "Free" : `${plan.name} · ${sub.cycle === "yearly" ? "Annual" : "Monthly"}`}
          </span>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <dl className="flex flex-col">
        <Row label="Price">
          <span className="inline-flex items-center gap-3">
            <TestnetDemoBadge />
            {paid ? `${usd(per.period)} / ${sub.cycle === "yearly" ? "year" : "month"}` : "$0.00 · for lifetime"}
          </span>
        </Row>
        {paid && <Row label={pending ? (pending.tier === "free" ? "Ends on" : "Changes on") : "Renews on"}>{when}</Row>}
        {pending && pending.tier !== "free" && (
          <Row label="Then">
            {planOf(pending.tier).name} · {pending.cycle === "yearly" ? "Annual" : "Monthly"}
          </Row>
        )}
        <Row label="AI credits">{n(plan.credits)} / month</Row>
        <Row label="Payment">{wallet.connected ? `Demo wallet ${wallet.short} · ${token}` : "No wallet connected"}</Row>
      </dl>
      {!paid ? (
        <Button size="xl" className="w-full" onClick={() => router.push("/m/plans")}>
          Upgrade now
        </Button>
      ) : pending ? (
        <Button
          hierarchy="secondary"
          size="xl"
          className="w-full"
          onClick={() => {
            keep();
            toast({ title: `You’re keeping ${plan.name}` });
          }}
        >
          Keep {plan.name}
        </Button>
      ) : (
        <div className="flex items-center gap-4">
          {(down || sub.cycle === "yearly") && (
            <Button
              hierarchy="secondary"
              size="xl"
              className="flex-1"
              onClick={() => router.push(down ? downgradePath(down.tier, sub.cycle) : downgradePath(sub.tier, "monthly"))}
            >
              {down ? "Downgrade plan" : "Switch to monthly"}
            </Button>
          )}
          <Button hierarchy="ghost" size="xl" className="flex-1" onClick={() => setCancelling(true)}>
            Cancel
          </Button>
        </div>
      )}
      {paid && !pending && (
        <Link href="/m/settings/payments" className="inline-flex min-h-[44px] items-center justify-between text-md leading-md text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
          Payment method
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
      )}
      <CancelSheet open={cancelling} onClose={() => setCancelling(false)} />
    </section>
  );
}
