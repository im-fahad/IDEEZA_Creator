// Every AI service the backend charges credits for, grouped as the admin
// thinks of them; per product build quality level, whether makers can pick it
// and its daily limit (a section of its own, above the levels' prices); and the
// levels' prices in a table of their own — a build is priced by the level the
// maker picks.

import * as React from "react";
import { GROUP_HELP, LEVEL_HELP, SERVICE_HELP } from "@/lib/admin/credit-help";
import {
  AI_SERVICES,
  QUALITY_LEVELS,
  SERVICE_GROUPS,
  type PricingDraft,
  type PricingPlan,
  type QualityDraft,
  type QualityLevel,
} from "@/lib/admin/credit-pricing";
import { Section } from "./fields";
import { PriceTable, type PriceDraftField, type PriceTableGroup } from "./price-table";
import { QualityAccessTable } from "./quality-access-table";

export function ServicesSection({
  draft,
  plan,
  onChange,
}: {
  draft: PricingDraft;
  plan: PricingPlan;
  onChange: (key: string, field: PriceDraftField, value: string) => void;
}) {
  const groups: PriceTableGroup[] = SERVICE_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    hint: g.hint,
    help: GROUP_HELP[g.id],
    rows: plan.services.filter((r) => AI_SERVICES.find((s) => s.key === r.id)?.group === g.id),
  })).filter((g) => g.rows.length > 0);
  return (
    <Section
      title="AI services"
      description="Enter what one run really costs us, in dollars. A service with no cost keeps its current price. Leave Markup empty to use the markup above."
    >
      <PriceTable
        caption="AI services: cost, markup and credits"
        firstColumn="AI service"
        unit="run"
        groups={groups}
        drafts={draft.services}
        globalProfit={draft.settings.profitPct}
        ratesReady={plan.rates !== null}
        onDraftChange={onChange}
        rowHelp={(row) => SERVICE_HELP[row.id]}
      />
    </Section>
  );
}

export function QualityAccessSection({
  draft,
  plan,
  onChange,
}: {
  draft: PricingDraft;
  plan: PricingPlan;
  onChange: (level: QualityLevel, patch: Partial<QualityDraft>) => void;
}) {
  return (
    <Section
      title="Availability and daily limits"
      description="Turn a product build quality level off to hide it from makers; its price is kept for when it's back on. A daily limit is the builds one maker can start at that level a day. 0 is no limit."
    >
      <QualityAccessTable rows={plan.quality} drafts={draft.quality} error={plan.qualityError} onChange={onChange} />
    </Section>
  );
}

export function QualitySection({
  draft,
  plan,
  onChange,
}: {
  draft: PricingDraft;
  plan: PricingPlan;
  onChange: (level: QualityLevel, patch: Partial<QualityDraft>) => void;
}) {
  const hints = Object.fromEntries(QUALITY_LEVELS.map((l) => [l.id, l.hint]));
  const off = new Set(plan.quality.filter((q) => !q.enabled).map((q) => q.id));
  return (
    <Section
      title="Product build quality"
      description="A product build is priced by the quality level the maker picks. Enter what one build costs us at each level."
    >
      <PriceTable
        caption="Product build quality levels: cost, markup and credits"
        firstColumn="Quality level"
        unit="build"
        groups={[{ id: "levels", rows: plan.quality }]}
        drafts={draft.quality}
        globalProfit={draft.settings.profitPct}
        ratesReady={plan.rates !== null}
        onDraftChange={(id, field, value) => onChange(id as QualityLevel, { [field]: value })}
        fixedProfit={(row) => row.id === "free"}
        rowHint={(row) => (off.has(row.id) ? "Off: makers can't pick it" : hints[row.id])}
        rowHelp={(row) => LEVEL_HELP[row.id as QualityLevel]}
      />
    </Section>
  );
}
