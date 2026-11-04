"use client";

// Plan & pricing › Credits (mobile Figma "v2 · AI Credits / Purchase"):
// Purchase AI credits with the current balance (→ Current credit), the
// web's three packs at the plan's discount (Purchase now → the checkout),
// "Save up to 35% with an IDEEZA plan · Compare plans" (→ Compare credit
// discounts) and a custom amount at the flat rate, which offers the
// cheaper pack first when one gives more for no more (Better deal available).

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { CREDIT_PACKS, CUSTOM_MIN, CUSTOM_RATE, MAX_DISCOUNT, VALIDITY_MONTHS, betterDeal, customAmountError, customPrice, packPrice, usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { BetterDealSheet, DiscountsSheet, UpgradeUnlockSheet } from "./credit-sheets";
import { CARD, LINK, dollars, n, pct } from "./parts";

export function CreditsTab() {
  const router = useRouter();
  const { hydrated, balance } = useCredits();
  const { plan } = useCreatePlan();
  const discount = useCreditDiscount();
  const [compare, setCompare] = React.useState(false);
  const [unlock, setUnlock] = React.useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-xl font-medium leading-xl text-text-primary">Purchase AI credits</h2>
          <p className="text-md leading-md text-text-secondary">Power your creativity with {VALIDITY_MONTHS}-month validity.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm leading-sm text-text-secondary">Current balance</span>
          <button
            type="button"
            onClick={() => router.push("/m/plans/credits")}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-bg-brand-subtle px-4 text-md font-medium leading-md tabular-nums text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {hydrated ? `${n(balance)} credits` : "…"}
            <Icon icon={ArrowRight01Icon} size={14} />
          </button>
        </div>
      </div>
      {discount > 0 ? (
        <p className="flex items-center justify-between rounded-xl bg-bg-success-subtle px-8 py-5 text-md leading-md text-text-success">
          Your {plan.name} discount <span className="text-lg font-semibold leading-lg">{pct(discount)} OFF</span>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setUnlock(true)}
          className="flex items-center justify-between rounded-xl bg-bg-subtle px-8 py-5 text-left text-md leading-md text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          No credit discount on {plan.name}
          <span className="font-medium text-text-brand">Unlock up to {pct(MAX_DISCOUNT)} off</span>
        </button>
      )}

      <ul className="flex flex-col gap-8">
        {CREDIT_PACKS.map((p, i) => {
          const cost = packPrice(p, discount);
          return (
            <li
              key={p.id}
              aria-label={`${p.name} pack`}
              className={cn(
                "flex flex-col gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-8",
                p.popular ? "border-border-brand bg-bg-brand-subtle" : "border-border-subtle bg-bg-surface",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-2xl font-medium leading-2xl text-text-primary">{p.name}</h3>
                {p.popular && <Badge tone="brand-solid">Most popular</Badge>}
              </div>
              <p className="flex flex-wrap items-baseline gap-4">
                <span className="text-5xl font-semibold leading-5xl tabular-nums text-text-primary">{dollars(cost.final)}</span>
                {cost.saved > 0 && <s className="text-lg leading-lg tabular-nums text-text-tertiary">{usd(cost.base)}</s>}
                {i === 0 && <TestnetDemoBadge />}
              </p>
              <dl className="flex flex-col gap-4 text-md leading-md">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Base credits</dt>
                  <dd className="tabular-nums text-text-primary">{n(p.base)}</dd>
                </div>
                {p.bonus > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">Bonus credits</dt>
                    <dd className="tabular-nums text-text-success">+{n(p.bonus)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Total credit</dt>
                  <dd className="font-medium tabular-nums text-text-primary">{n(p.base + p.bonus)}</dd>
                </div>
              </dl>
              <Button
                hierarchy={p.popular ? "primary" : "secondary"}
                size="xl"
                className="w-full"
                aria-label={`Purchase the ${p.name} pack, ${n(p.base + p.bonus)} credits for ${usd(cost.final)}`}
                onClick={() => router.push(`/m/plans/checkout?pack=${p.id}`)}
              >
                Purchase now
              </Button>
              <div className="flex flex-col gap-1 border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-6">
                <span className="text-sm leading-sm text-text-tertiary">
                  {discount > 0 ? `You’re saving ${pct(discount)} with your ${plan.name} plan` : `Save up to ${pct(MAX_DISCOUNT)} with an IDEEZA plan`}
                </span>
                <button type="button" onClick={() => setCompare(true)} className={cn(LINK, "self-start")}>
                  Compare plans
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <CustomAmount discount={discount} />

      <DiscountsSheet open={compare} onClose={() => setCompare(false)} />
      <UpgradeUnlockSheet open={unlock} onClose={() => setUnlock(false)} />
    </div>
  );
}

function CustomAmount({ discount }: { discount: number }) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [offer, setOffer] = React.useState(false);
  const credits = Number(text);
  const error = text === "" ? null : customAmountError(credits);
  const valid = text !== "" && !error;
  const cost = customPrice(valid ? credits : 0, discount);
  const deal = valid ? betterDeal(credits, discount) : null;
  const id = React.useId();
  const go = () => valid && router.push(`/m/plans/checkout?credits=${credits}`);
  return (
    <section aria-labelledby={`${id}-label`} className={cn(CARD, "flex flex-col gap-6 p-8")}>
      <label id={`${id}-label`} htmlFor={id} className="text-xl font-medium leading-xl text-text-primary">
        Custom amount
      </label>
      <TextInput
        id={id}
        size="xl"
        inputMode="numeric"
        value={text}
        onValueChange={(v) => {
          setText(v.replace(/[^\d]/g, ""));
          setTouched(false);
        }}
        onBlur={() => setTouched(true)}
        placeholder={`Enter amount… (min ${CUSTOM_MIN})`}
        invalid={!!error && touched}
        aria-describedby={error && touched ? `${id}-error` : undefined}
      />
      {error && touched && (
        <p id={`${id}-error`} className="text-sm leading-sm text-text-error">
          {error}
        </p>
      )}
      <div className="flex items-end justify-between gap-6">
        <span className="flex flex-col gap-1">
          <span className="text-4xl font-semibold leading-4xl tabular-nums text-text-primary">{usd(cost.final)}</span>
          <span className="text-sm leading-sm text-text-secondary">Rate: {usd(CUSTOM_RATE)} / credit</span>
        </span>
        {discount > 0 && valid && (
          <span className="flex flex-col items-end gap-1">
            <span className="text-2xl font-medium leading-2xl tabular-nums text-text-success">−{usd(cost.saved)}</span>
            <span className="text-sm leading-sm text-text-secondary">Your discount</span>
          </span>
        )}
      </div>
      <Button
        hierarchy="secondary"
        size="xl"
        className="w-full"
        disabled={!valid}
        onClick={() => {
          setTouched(true);
          if (deal) setOffer(true);
          else go();
        }}
      >
        Purchase credits
      </Button>
      {!valid && <p className="text-sm leading-sm text-text-tertiary">Enter at least {CUSTOM_MIN} credits to buy a custom amount.</p>}
      {deal && <BetterDealSheet open={offer} onClose={() => setOffer(false)} deal={deal} credits={credits} customPrice={cost.final} discount={discount} onCustom={go} />}
    </section>
  );
}
