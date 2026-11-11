// Custom credit: besides the packs, a maker can buy any number of credits
// between a fewest and a most — the live admin's "Custom Credit" (Base
// Settings: `manual_purchase_enabled`, `manual_purchase_min`,
// `manual_purchase_max`, 0 = no limit). Here it is part of the draft, so a
// change waits for Publish like every price. Two things the live admin lacks:
// the most can't be set under the fewest, and each limit shows what it costs.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Toggle } from "@/components/ideeza/toggle";
import {
  formatCredits,
  formatOnOff,
  formatPurchaseMax,
  formatUsd,
  type CustomCreditDraft,
  type CustomCreditPlan,
  type Rates,
} from "@/lib/admin/credit-pricing";
import { AmountField, Section, TodayNext } from "./fields";

/** "315 credits cost $1.00 at list price", once the credit's price reads. */
function costLine(credits: number | null, rates: Rates | null, none: string): string | null {
  if (credits === null || !rates) return null;
  if (credits === 0) return none;
  return `${formatCredits(credits)} cost ${formatUsd(credits * rates.creditUsd)} at list price.`;
}

function Limit({
  label,
  hint,
  value,
  error,
  cost,
  current,
  next,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  error: string | null;
  cost: string | null;
  current: string;
  next: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AmountField
        label={label}
        suffix="credits"
        value={value}
        onValueChange={onChange}
        error={error}
        hint={hint}
        inputClassName="max-w-[240px]"
      />
      {cost ? <p className="m-0 text-sm leading-sm text-text-secondary">{cost}</p> : null}
      <TodayNext today={current} next={next} />
    </div>
  );
}

export function CustomCreditSection({
  draft,
  plan,
  rates,
  onChange,
}: {
  draft: CustomCreditDraft;
  plan: CustomCreditPlan;
  rates: Rates | null;
  onChange: (patch: Partial<CustomCreditDraft>) => void;
}) {
  const { current } = plan;
  return (
    <Section
      title="Custom credit"
      description="Besides the packs, a maker can buy any number of credits between these limits."
      actions={
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <span className="text-md leading-md text-text-primary">{draft.enabled ? "Enabled" : "Disabled"}</span>
            <Toggle size="sm" checked={draft.enabled} onChange={() => onChange({ enabled: !draft.enabled })} aria-label="Custom credit" />
          </div>
          <TodayNext today={formatOnOff(current.enabled)} next={formatOnOff(draft.enabled)} />
        </div>
      }
    >
      {!draft.enabled ? (
        <Banner tone="info">
          {`Custom credit is off, so makers can buy packs only. The limits are kept for when it's back on.`}
        </Banner>
      ) : null}
      <div className="grid grid-cols-1 gap-8 [@container(min-width:700px)]:grid-cols-2">
        <Limit
          label="Minimum purchase limit"
          hint="Fewest credits a maker can buy at once."
          value={draft.min}
          error={plan.minError}
          cost={costLine(plan.min, rates, "")}
          current={formatCredits(current.min)}
          next={plan.min !== null ? formatCredits(plan.min) : null}
          onChange={(min) => onChange({ min })}
        />
        <Limit
          label="Maximum purchase limit"
          hint="Most credits a maker can buy at once. 0 is no limit."
          value={draft.max}
          error={plan.maxError}
          cost={costLine(plan.max, rates, "A maker can buy any number of credits above the minimum.")}
          current={formatPurchaseMax(current.max)}
          next={plan.max !== null ? formatPurchaseMax(plan.max) : null}
          onChange={(max) => onChange({ max })}
        />
      </div>
    </Section>
  );
}
