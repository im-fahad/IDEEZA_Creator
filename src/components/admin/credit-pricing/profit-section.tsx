// The profit to make, and what it is counted against. A maker can buy a credit
// for less than its list price — a plan's discount, a pack's bonus credits —
// so by default the profit is counted at the lowest price one sells for, and
// holds for every buyer. Counted at the list price, credits are fewer, and the
// price table shows which services then earn less than the target.

import * as React from "react";
import { Segmented } from "@/components/ideeza/segmented";
import {
  creditsFor,
  formatCredits,
  formatPercent,
  formatUsd,
  ROUNDINGS,
  type MarginBasis,
  type PricingSettings,
  type Rates,
  type Rounding,
  type SettingsErrors,
} from "@/lib/admin/credit-pricing";
import { AmountField, Section } from "./fields";

const BASIS_OPTIONS: readonly { label: string; value: MarginBasis }[] = [
  { label: "Lowest effective credit price", value: "lowest" },
  { label: "List price", value: "list" },
];

const ROUNDING_OPTIONS = ROUNDINGS.map((r) => ({
  label: String(r),
  value: String(r) as `${Rounding}`,
}));

/** The worked example under the settings: one run at a round cost. */
const EXAMPLE_COST_USD = 0.1;

export function ProfitSection({
  settings,
  errors,
  rates,
  onChange,
}: {
  settings: PricingSettings;
  errors: SettingsErrors;
  rates: Rates | null;
  onChange: (patch: Partial<PricingSettings>) => void;
}) {
  return (
    <Section title="Markup" description="The markup on our cost for every service and build level. Each can set its own in the tables below.">
      <div className="grid grid-cols-1 gap-8 [@container(min-width:900px)]:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-8">
          <AmountField
            label="Markup on our cost"
            suffix="%"
            value={settings.profitPct}
            onValueChange={(profitPct) => onChange({ profitPct })}
            error={errors.profitPct}
            hint="50% makes a $1.00 run cost the maker $1.50."
            inputClassName="max-w-[220px]"
          />
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium leading-sm text-text-primary">Calculate markup at</span>
            <Segmented
              label="Calculate markup at"
              value={settings.basis}
              options={BASIS_OPTIONS}
              onChange={(basis) => onChange({ basis })}
              size="sm"
              className="self-start"
            />
            <p className="m-0 text-sm leading-sm text-text-tertiary">
              {settings.basis === "lowest"
                ? "Recommended: the markup holds even for a maker with the maximum discount and pack bonus."
                : "Fewer credits per run, but a discounted credit earns less than the target and can lose money."}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium leading-sm text-text-primary">Round credits up to steps of</span>
            <Segmented
              label="Round credits up to steps of"
              value={String(settings.rounding) as `${Rounding}`}
              options={ROUNDING_OPTIONS}
              onChange={(r) => onChange({ rounding: Number(r) as Rounding })}
              size="sm"
              className="self-start"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <div className="grid grid-cols-1 gap-8 [@container(min-width:600px)]:grid-cols-2">
            <AmountField
              label="Maximum credit discount"
              suffix="%"
              value={settings.maxDiscountPct}
              onValueChange={(maxDiscountPct) => onChange({ maxDiscountPct })}
              error={errors.maxDiscountPct}
              hint="The most any plan takes off a credit's price."
            />
            <AmountField
              label="Maximum pack bonus"
              suffix="%"
              value={settings.maxBonusPct}
              onValueChange={(maxBonusPct) => onChange({ maxBonusPct })}
              error={errors.maxBonusPct}
              hint="150 bonus credits on a 1,000 pack is 15%."
            />
          </div>
          <div className="flex flex-col gap-4 rounded-lg bg-bg-subtle p-8">
            {rates ? (
              <>
                <p className="m-0 text-md leading-md text-text-primary">
                  The lowest effective credit price is <span className="font-semibold">{formatUsd(rates.lowestCreditUsd)}</span>
                </p>
                <p className="m-0 text-sm leading-sm text-text-secondary">
                  {formatUsd(rates.creditUsd)} less the {settings.maxDiscountPct}% discount, with {settings.maxBonusPct}% bonus credits on
                  top. Credits are worked out at {formatUsd(rates.basisUsd)} a credit.
                </p>
                <p className="m-0 text-sm leading-sm text-text-secondary">
                  Example: a {formatUsd(EXAMPLE_COST_USD)} run at {formatPercent(rates.profitPct)} markup is{" "}
                  <span className="font-medium text-text-primary">
                    {formatCredits(creditsFor(EXAMPLE_COST_USD, rates.profitPct, rates.basisUsd, settings.rounding))}
                  </span>
                  .
                </p>
              </>
            ) : (
              <p className="m-0 text-md leading-md text-text-error">Fix the fields marked in red to see the prices.</p>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
