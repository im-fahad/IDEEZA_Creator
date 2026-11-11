// Where the draft stands, above the settings: what Publish would change, and
// the rows that need a look — a loss first, then a profit under the markup,
// then services with no cost yet.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import type { HistoryEntry, PricingPlan } from "@/lib/admin/credit-pricing";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function formatWhen(at: number): string {
  return new Date(at).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-solid border-border bg-bg-surface p-8">
      <span className="text-sm leading-sm text-text-secondary">{label}</span>
      <span className="text-xl font-semibold leading-xl text-text-primary">{value}</span>
    </div>
  );
}

export function PricingSummary({ plan, last }: { plan: PricingPlan; last: HistoryEntry | undefined }) {
  const priced = plan.services.length + plan.quality.length - 1 - plan.missing;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 [@container(min-width:600px)]:grid-cols-3">
        <Stat label="Changes waiting to publish" value={plan.rates ? plan.changes.length : "—"} />
        <Stat label="Prices with a real cost" value={`${priced} of ${plan.services.length + plan.quality.length - 1}`} />
        <Stat
          label="Last published"
          value={
            last ? <span className="text-lg leading-lg">{formatWhen(last.at)}</span> : <span className="text-lg leading-lg">Never</span>
          }
        />
      </div>
      {!plan.rates ? (
        <Banner tone="error" title="Prices can't be worked out">
          Fix the fields marked in red in the credit value or markup settings.
        </Banner>
      ) : null}
      {plan.losses > 0 ? (
        <Banner tone="error" title={`${plural(plan.losses, "price loses", "prices lose")} money at the lowest price`}>
          {`A maker with the maximum discount and pack bonus pays less than the run costs us. Calculate markup at the lowest effective credit price, or raise those rows' markup.`}
        </Banner>
      ) : null}
      {plan.belowTarget > 0 ? (
        <Banner
          tone="attention"
          title={`${plural(plan.belowTarget, "price makes", "prices make")} less than the target at the lowest price`}
        >
          They still make money, but less than the markup set for them once a discount and pack bonus apply.
        </Banner>
      ) : null}
      {plan.missing > 0 ? (
        <Banner tone="info">
          {`${plural(plan.missing, "price has", "prices have")} no cost yet and keep their current credits when you publish.`}
        </Banner>
      ) : null}
    </div>
  );
}
