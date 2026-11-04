"use client";

// Checkout on the phone (/m/plans/checkout; mobile Figma "02 · Upgrade &
// Checkout" Annual · Monthly · Crypto · Coupon · Card error, then "05 ·
// Success & Failed"). The web's checkout logic (components/credits/
// checkout-page.tsx): `?plan=builder&cycle=yearly`, `?pack=pro` or
// `?credits=80`; an upgrade from a paid plan takes the unused time off; the
// welcome offer halves a first plan payment; the plan's discount comes off
// credits. Card and PayPal aren't available yet (web), so the method is
// Crypto from the Demo wallet, USDT or IDZ, signed in the kit's wallet sheet
// (KIT-WS) — the plan or the credits land in the same commit as the debit.
// There are no coupon codes: the coupon row shows the welcome offer when it
// applies, and otherwise says no codes are on offer. Then the full-screen
// result: Upgrade completed / Payment successful, or Payment failed.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckmarkCircle02Icon, CreditCardIcon, InformationCircleIcon, PaypalIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { Toggle } from "@/components/ideeza/toggle";
import { creditsLine, orderOf } from "@/components/credits/buy-credits";
import { useWalletStatus, type PayCoin } from "@/components/credits/payment-picker";
import { useWelcomeOffer } from "@/components/credits/welcome-offer";
import { planSummaryOf } from "@/lib/account/money-phone";
import { useDefaultToken } from "@/lib/account/payment";
import { invoiceNumber } from "@/lib/account/invoices";
import { OFFER_OFF, countdown, offerPrice, spendOffer } from "@/lib/account/welcome-offer";
import { needsConfirm } from "@/lib/create/credit-limits";
import { VALIDITY_MONTHS, addMonths, coinAmount, usd } from "@/lib/create/credit-pricing";
import { checkoutOrderOf, type CheckoutOrder } from "@/lib/create/checkout-route";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { planOf, priceOf, quoteUpgrade, relationOf } from "@/lib/create/plans";
import { useSettings } from "@/lib/settings/use-settings";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { cn } from "@/lib/utils";
import { ConnectSheet } from "../earn-coin/parts";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ListBones } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { CARD, LINK, ResultView, Row, dateOf, invoicePath, n, newOrderId, pct } from "./parts";

export function CheckoutScreen() {
  const params = useSearchParams();
  const order = checkoutOrderOf((k) => params.get(k));
  return order ? <Checkout key={params.toString()} order={order} /> : <NothingToPay line="This link doesn’t name a plan or credits to buy. Choose one on Plan & pricing." />;
}

function NothingToPay({ line }: { line: string }) {
  const router = useRouter();
  return (
    <Screen top={<TopBar back title="Checkout" />} className="px-8 pt-8">
      <StateCard
        tone="empty"
        className="w-full"
        icon={<Icon icon={InformationCircleIcon} size={24} />}
        title="Nothing to pay for"
        body={line}
        action={
          <Button size="lg" onClick={() => router.push("/m/plans")}>
            See plans
          </Button>
        }
      />
    </Screen>
  );
}

type Phase = { kind: "form" } | { kind: "done"; id: string; at: number; paid: number; balance: number } | { kind: "failed"; message: string };

const NETWORK = "baseSepolia" as const;

function Checkout({ order }: { order: CheckoutOrder }) {
  const router = useRouter();
  const { hydrated: planReady, sub, plan: current, start, cancel } = useCreatePlan();
  const { hydrated: creditsReady, balance, purchase } = useCredits();
  const welcome = useWelcomeOffer();
  const discount = useCreditDiscount();
  const wallet = useWalletStatus();
  const defaultToken = useDefaultToken();
  const { request, sheet } = useWalletSheet();
  const { confirmAbove } = useSettings().credits;
  const [coin, setCoin] = React.useState<PayCoin>(defaultToken);
  const [autoRenew, setAutoRenew] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>({ kind: "form" });
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [asking, setAsking] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [orderId, setOrderId] = React.useState(() => newOrderId(order.kind === "plan" ? "plan" : "order"));
  const [now] = React.useState(() => Date.now());

  if (!planReady || !creditsReady)
    return (
      <Screen top={<TopBar back title="Checkout" />} className="px-8 pt-8">
        <ListBones rows={4} />
      </Screen>
    );

  const isPlan = order.kind === "plan";
  const target = isPlan ? planOf(order.tier) : null;
  const cycle = isPlan ? order.cycle : "monthly";
  const rel = isPlan ? relationOf(sub, order.tier, cycle) : null;
  const quote = isPlan ? quoteUpgrade(sub, order.tier, cycle, now) : null;
  const credits = !isPlan ? orderOf(order.kind === "pack" ? { kind: "pack", id: order.id } : { kind: "custom", credits: order.credits }, discount) : null;
  const offered = isPlan && welcome.ready && welcome.live && sub.tier === "free" ? offerPrice(quote!.due) : null;
  const due = isPlan ? (offered ? offered.final : quote!.due) : credits!.price.final;
  const what = isPlan ? `${target!.name} · ${cycle === "yearly" ? "Annual" : "Monthly"}` : credits!.pack ? `${credits!.pack} pack` : "Custom credits";

  if (phase.kind === "done") {
    const number = invoiceNumber(phase.id, phase.at);
    return (
      <Screen>
        {isPlan ? (
          <ResultView
            tone="success"
            title="Upgrade completed"
            line={`You’re all set on ${target!.name}. ${n(target!.credits)} AI credits are added for this month.`}
            rows={[
              { label: "Plan", value: what },
              { label: "Amount paid", value: usd(phase.paid) },
              { label: "Date", value: dateOf(phase.at) },
              { label: "Transaction", value: `#${number}` },
            ]}
            primary={{ label: "Start creating", href: "/m/ai" }}
            secondary={{ label: "View invoice", href: invoicePath(phase.id) }}
            onClose={() => router.replace("/m/plans?tab=billing")}
          />
        ) : (
          <ResultView
            tone="success"
            title="Credits added"
            line={`${n(credits!.base + credits!.bonus)} credits have been added to your balance.`}
            rows={[
              { label: "Pack", value: credits!.pack ?? "Custom credits" },
              { label: "Credits added", value: `+${n(credits!.base + credits!.bonus)}`, tone: "success" },
              { label: "New balance", value: `${n(phase.balance)} credits` },
              { label: "Amount paid", value: usd(phase.paid) },
            ]}
            primary={{ label: "Start creating", href: "/m/ai" }}
            secondary={{ label: "View receipt", href: invoicePath(phase.id) }}
            onClose={() => router.replace("/m/plans?tab=credits")}
          />
        )}
      </Screen>
    );
  }

  if (phase.kind === "failed") {
    return (
      <Screen>
        <ResultView
          tone="error"
          title="Payment failed"
          line={isPlan ? "We couldn’t process your payment. No charge was made to your account." : "Your credit purchase didn’t go through. Nothing was charged; please try again."}
          rows={[
            { label: "Reason", value: phase.message, tone: "error" },
            { label: isPlan ? "Plan" : "Pack", value: what },
            { label: "Amount", value: usd(due) },
          ]}
          primary={{
            label: "Try again",
            onClick: () => {
              setOrderId(newOrderId(isPlan ? "plan" : "order"));
              setPhase({ kind: "form" });
            },
          }}
          secondary={{ label: "Change payment method", href: "/m/settings/payments" }}
          onClose={() => router.replace("/m/plans")}
        />
      </Screen>
    );
  }

  if (isPlan && rel !== "upgrade") {
    const line =
      rel === "current"
        ? `You’re already on ${target!.name}${cycle === "yearly" ? ", billed yearly" : ""}.`
        : rel === "scheduled"
          ? `${target!.name} starts on ${sub.renewsAt ? dateOf(sub.renewsAt) : "your renewal"}. Nothing to pay now.`
          : `${target!.name} is a smaller plan. Switch to it from Plans: it starts when your period ends, and nothing is charged.`;
    return <NothingToPay line={line} />;
  }

  const finishPlan = (pay: { paidWith: string; txHash?: string; payer?: string }) => {
    start(order.kind === "plan" ? order.tier : "free", cycle, {
      orderId,
      amount: due,
      paidWith: pay.paidWith,
      price: quote!.price,
      credit: quote!.unused,
      ...(offered ? { offer: offered.saving } : {}),
      txHash: pay.txHash,
      payer: pay.payer,
    });
    if (offered && welcome.email) spendOffer(welcome.email, now);
    if (!autoRenew) cancel();
  };

  const pay = async (confirmed = false) => {
    if (paying) return;
    setNote(null);
    if (!confirmed && due > 0 && needsConfirm(due, confirmAbove)) {
      setAsking(true);
      return;
    }
    if (isPlan && due === 0) {
      finishPlan({ paidWith: "Covered by unused time" });
      setPhase({ kind: "done", id: orderId, at: now, paid: 0, balance });
      return;
    }
    setPaying(true);
    try {
      const result = await request(
        {
          kind: "transaction",
          purpose: isPlan ? "subscribe" : "buyCredits",
          identity: "maker",
          network: NETWORK,
          title: isPlan ? `Pay for ${target!.name}` : "Pay for AI credits",
          summary: isPlan
            ? [
                { label: "Plan", value: `${target!.name} · ${cycle === "yearly" ? "billed yearly" : "billed monthly"}` },
                { label: "Due today", value: usd(due) },
              ]
            : [
                { label: "Credits", value: `${credits!.pack ? `${credits!.pack} pack` : "Custom credits"} · ${creditsLine(credits!.base, credits!.bonus)}` },
                { label: "Price", value: usd(due) },
              ],
          note: "Testnet demo, no real money moves.",
          doneLine: isPlan ? `You’re on ${target!.name}.` : `${n(credits!.base + credits!.bonus)} credits added to your account.`,
          charge: { network: NETWORK, lines: [{ coin, amount: String(coinAmount(due, coin)) }] },
        },
        {
          commit: (proof) => {
            const paidWith = `${coin} · demo wallet`;
            if (isPlan) finishPlan({ paidWith, txHash: proof.txHash, payer: proof.address });
            else
              purchase({
                orderId,
                base: credits!.base,
                bonus: credits!.bonus,
                pack: credits!.pack,
                price: credits!.price.final,
                listPrice: credits!.price.base,
                paidWith,
                txHash: proof.txHash,
                payer: proof.address,
              });
            return { ok: true };
          },
        },
      );
      if (result.ok) {
        const added = credits ? credits.base + credits.bonus : 0;
        setPhase({ kind: "done", id: orderId, at: result.proof.at, paid: due, balance: balance + added });
      } else if (result.reason === "rejected") {
        setNote("Payment cancelled in the wallet. Nothing was charged.");
      } else {
        setPhase({ kind: "failed", message: result.message ?? "The wallet couldn’t take the payment." });
      }
    } finally {
      setPaying(false);
    }
  };

  const fromPaid = isPlan && sub.tier !== "free";
  const per = isPlan ? priceOf(order.tier, cycle) : null;
  const summary = isPlan ? planSummaryOf(target!.monthly, order.tier, cycle) : null;
  const ctaLabel = due === 0 ? "Confirm upgrade" : `Pay ${usd(due)}`;
  const blocked = due > 0 && !wallet.connected;

  return (
    <Screen
      top={<TopBar back title="Checkout" />}
      className="px-8 pb-8 pt-4"
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" loading={paying} disabled={blocked} onClick={() => pay()}>
            {blocked ? "Connect your wallet to pay" : ctaLabel}
          </Button>
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-8">
        <section aria-label="What you’re buying" className={cn(CARD, "flex flex-col gap-3 p-8")}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-medium leading-xl text-text-primary">{isPlan ? `${target!.name} plan` : credits!.pack ? `${credits!.pack} pack` : "Custom AI credits"}</h2>
            <Badge tone="brand">{isPlan ? (cycle === "yearly" ? "Annual" : "Monthly") : `${VALIDITY_MONTHS} months`}</Badge>
          </div>
          <p className="flex items-center justify-between gap-4 text-md leading-md">
            <span className="text-text-secondary">{isPlan ? (cycle === "yearly" ? "Billed annually" : "Billed monthly") : creditsLine(credits!.base, credits!.bonus)}</span>
            <span className="inline-flex items-center gap-3 tabular-nums text-text-primary">
              <TestnetDemoBadge />
              {isPlan ? `${usd(per!.period)} / ${cycle === "yearly" ? "yr" : "mo"}` : usd(credits!.price.base)}
            </span>
          </p>
          <button type="button" onClick={() => router.push(isPlan ? "/m/plans" : "/m/plans?tab=credits")} className={cn(LINK, "self-start")}>
            {isPlan ? "Change plan" : "Change pack"}
          </button>
        </section>

        {fromPaid && (
          <section aria-labelledby="confirm-upgrade" className="flex flex-col gap-4">
            <h2 id="confirm-upgrade" className="text-xl font-medium leading-xl text-text-primary">
              Confirm your upgrade
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <PlanTile label="From" name={current.name} line={`${usd(priceOf(sub.tier, sub.cycle).perMonth)} / month`} />
              <PlanTile label="Upgrading to" name={target!.name} line={`${usd(per!.perMonth)} / month`} brand />
            </div>
            <p className="rounded-xl bg-bg-subtle p-6 text-md leading-md text-text-secondary">
              Your plan becomes {target!.name} now. The unused time on {current.name} comes off today’s price, and the next billing is on {dateOf(quote!.renewsAt)}. Cancel any time.
            </p>
          </section>
        )}

        {isPlan &&
          (offered ? (
            <p role="status" className="flex items-start gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-success)] bg-bg-success-subtle p-6 text-md leading-md text-text-success">
              <Icon icon={CheckmarkCircle02Icon} size={18} />
              <span className="flex flex-col">
                <span className="font-medium">Welcome offer applied</span>
                <span>
                  You saved {usd(offered.saving)}. It ends in <span className="tabular-nums">{countdown(welcome.left)}</span>.
                </span>
              </span>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <TextInput size="xl" containerClassName="flex-1" placeholder="Have a coupon? Enter code" disabled aria-label="Coupon code" aria-describedby="coupon-why" />
                <Button hierarchy="secondary" size="xl" disabled>
                  Apply
                </Button>
              </div>
              <p id="coupon-why" className="text-sm leading-sm text-text-tertiary">
                No coupon codes are on offer yet.
              </p>
            </div>
          ))}

        {due > 0 && (
          <section aria-labelledby="pay-method" className="flex flex-col gap-6">
            <h2 id="pay-method" className="text-xl font-medium leading-xl text-text-primary">
              Payment method
            </h2>
            <div role="radiogroup" aria-label="Payment method" className="flex flex-wrap gap-4">
              <MethodChip icon={CreditCardIcon} label="Card" off />
              <MethodChip icon={PaypalIcon} label="PayPal" off />
              <MethodChip icon={Wallet01Icon} label="Crypto" />
            </div>
            <p className="text-sm leading-sm text-text-tertiary">Card and PayPal aren’t available yet.</p>
            <div className={cn(CARD, "flex flex-col gap-6 p-8")}>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium leading-lg text-text-primary">Pay with crypto</h3>
                <p className="text-md leading-md text-text-secondary">Choose a token and connect your wallet to pay.</p>
              </div>
              <div role="radiogroup" aria-label="Token" className="flex gap-4">
                {(["USDT", "IDZ"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={coin === c}
                    onClick={() => setCoin(c)}
                    className={cn(
                      "inline-flex min-h-[44px] flex-1 items-center justify-center gap-3 rounded-xl border-[length:var(--border-width-1-5)] border-solid text-md font-medium leading-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                      coin === c ? "border-border-brand bg-bg-brand-subtle text-text-brand" : "border-border-subtle text-text-primary",
                    )}
                  >
                    <span aria-hidden className={cn("size-[10px] rounded-full border-[length:var(--border-width-2)] border-solid", coin === c ? "border-border-brand bg-bg-brand" : "border-border")} />
                    {c}
                  </button>
                ))}
              </div>
              <dl className="flex flex-col">
                <Row label="Amount due">≈ {coinAmount(due, coin).toLocaleString("en-US")} {coin}</Row>
                <Row label="Network">{networkLabelOf(NETWORK)}</Row>
              </dl>
              {wallet.connected ? (
                <p className="flex items-center gap-3 text-md leading-md text-text-success">
                  <Icon icon={CheckmarkCircle02Icon} size={16} />
                  Wallet connected · {wallet.short}
                </p>
              ) : (
                <Button size="xl" className="w-full" onClick={() => setConnecting(true)}>
                  Connect wallet
                </Button>
              )}
            </div>
          </section>
        )}
        {due === 0 && isPlan && <p className="text-md leading-md text-text-secondary">The unused time on {current.name} covers this upgrade. Nothing to pay today.</p>}

        {isPlan && (
          <label className={cn(CARD, "flex cursor-pointer items-center justify-between gap-6 p-8")}>
            <span className="flex flex-col gap-1">
              <span className="text-md font-medium leading-md text-text-primary">Auto-renew subscription</span>
              <span className="text-sm leading-sm text-text-secondary">
                {autoRenew ? `Renews on ${dateOf(quote!.renewsAt)}. You can cancel any time.` : `Ends on ${dateOf(quote!.renewsAt)}, then you’re on Free.`}
              </span>
            </span>
            <Toggle checked={autoRenew} onChange={() => setAutoRenew((v) => !v)} aria-label="Auto-renew subscription" />
          </label>
        )}

        <section aria-labelledby="summary" className={cn(CARD, "flex flex-col p-8")}>
          <h2 id="summary" className="pb-2 text-xl font-medium leading-xl text-text-primary">
            Summary
          </h2>
          <dl className="flex flex-col">
            {isPlan ? (
              <>
                <Row label="Subtotal">{usd(summary!.subtotal)}</Row>
                {summary!.annualOff > 0 && (
                  <Row label="Annual discount (20%)" tone="success">
                    −{usd(summary!.annualOff)}
                  </Row>
                )}
                {quote!.unused > 0 && (
                  <Row label={`Unused time on ${current.name}`} tone="success">
                    −{usd(quote!.unused)}
                  </Row>
                )}
                {offered && (
                  <Row label={`Welcome offer (${pct(OFFER_OFF)} off)`} tone="success">
                    −{usd(offered.saving)}
                  </Row>
                )}
              </>
            ) : (
              <>
                <Row label="Subtotal">{usd(credits!.price.base)}</Row>
                {credits!.price.saved > 0 && (
                  <Row label={`${current.name} plan discount (${pct(discount)})`} tone="success">
                    −{usd(credits!.price.saved)}
                  </Row>
                )}
                <Row label="Credits last">Until {dateOf(addMonths(now, VALIDITY_MONTHS))}</Row>
              </>
            )}
            <Row label="Tax">{usd(0)}</Row>
          </dl>
          <p className="mt-3 flex items-center justify-between border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-6 text-2xl font-medium leading-2xl text-text-primary">
            Total <span className="tabular-nums">{usd(due)}</span>
          </p>
          {note && (
            <p role="status" className="pt-4 text-sm leading-sm text-text-secondary">
              {note}
            </p>
          )}
        </section>
      </div>
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} description="You pay from it. This is the testnet demo wallet — test funds only, nothing is written to a real blockchain." />
      {confirmAbove !== null && (
        <ConfirmSheet
          open={asking}
          onClose={() => setAsking(false)}
          title="Confirm this purchase"
          body={`${what} costs ${usd(due)}, more than the ${usd(confirmAbove)} you asked to confirm. You can change that amount in Credit alerts and limits.`}
          verb={`Pay ${usd(due)}`}
          onConfirm={() => {
            setAsking(false);
            void pay(true);
          }}
        />
      )}
      {sheet}
    </Screen>
  );
}

function MethodChip({ icon, label, off }: { icon: typeof Wallet01Icon; label: string; off?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!off}
      disabled={off}
      title={off ? "Not available yet" : undefined}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-3 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-6 text-md leading-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        off ? "cursor-not-allowed border-border-subtle text-text-disabled" : "border-border-brand bg-bg-brand-subtle font-medium text-text-brand",
      )}
    >
      <Icon icon={icon} size={16} />
      {label}
      {off && <span className="text-xs leading-xs">Soon</span>}
    </button>
  );
}

function PlanTile({ label, name, line, brand }: { label: string; name: string; line: string; brand?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl p-6", brand ? "bg-bg-brand-subtle" : "bg-bg-subtle")}>
      <span className="text-sm leading-sm text-text-secondary">{label}</span>
      <span className={cn("text-xl font-medium leading-xl", brand ? "text-text-brand" : "text-text-primary")}>{name}</span>
      <span className="text-sm leading-sm text-text-secondary">{line}</span>
    </div>
  );
}
