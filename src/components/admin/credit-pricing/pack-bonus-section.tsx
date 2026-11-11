// How a pack's bonus is chosen: tiers by price ("packs from $25 get 10%"),
// none above the maximum pack bonus set under Markup, and the step a pack's
// credits round down to. Every pack's credits follow as they're typed.

import * as React from "react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Segmented } from "@/components/ideeza/segmented";
import { TIER_COLUMN_HELP } from "@/lib/admin/credit-help";
import { PACK_STEPS, TIER_MAX, type BonusTierDraft, type PackRulesDraft, type PackStep, type TierRow } from "@/lib/admin/credit-packs";
import { cn } from "@/lib/utils";
import { AmountField, Section } from "./fields";
import { LabelTip } from "./info-tip";

const TH = "px-6 py-4 align-bottom text-left text-sm font-medium leading-sm text-text-secondary";
const TD = "px-6 py-4 align-top text-md leading-md text-text-primary";

const STEP_OPTIONS = PACK_STEPS.map((s) => ({ label: String(s), value: String(s) as `${PackStep}` }));

export function PackBonusSection({
  rules,
  tiers,
  maxBonusPct,
  onChange,
}: {
  rules: PackRulesDraft;
  tiers: TierRow[];
  /** As typed under Markup; shown in the description. */
  maxBonusPct: string;
  onChange: (change: (rules: PackRulesDraft) => PackRulesDraft) => void;
}) {
  const setTier = (i: number, patch: Partial<BonusTierDraft>) =>
    onChange((r) => ({ ...r, tiers: r.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const addTier = () =>
    onChange((r) => {
      const last = r.tiers[r.tiers.length - 1];
      return { ...r, tiers: [...r.tiers, { from: "", pct: last?.pct ?? "0" }] };
    });
  const removeTier = (i: number) => onChange((r) => ({ ...r, tiers: r.tiers.filter((_, j) => j !== i) }));

  return (
    <Section
      title="Bonus by pack price"
      description={`A pack gets the bonus of the last tier its price reaches. No tier can be above the maximum pack bonus (${maxBonusPct || "?"}%, under Markup on the Prices tab), so every AI price keeps its markup on a pack's credits.`}
    >
      <div className="relative overflow-x-auto rounded-xl border border-solid border-border">
        <table className="w-full min-w-[520px] border-collapse">
          <caption className="sr-only">Bonus credits by pack price</caption>
          <thead className="bg-bg-subtle">
            <tr>
              <th scope="col" className={TH}>
                <LabelTip label="Packs from" text={TIER_COLUMN_HELP.from} />
              </th>
              <th scope="col" className={TH}>
                <LabelTip label="Bonus credits" text={TIER_COLUMN_HELP.bonus} />
              </th>
              <th scope="col" className={TH}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.tiers.map((t, i) => {
              const row = tiers[i];
              return (
                <tr key={i} className="border-t border-solid border-border">
                  <td className={TD}>
                    {i === 0 ? (
                      <span className="inline-flex h-[32px] items-center text-text-secondary">$0.00, the first tier</span>
                    ) : (
                      <AmountField
                        hideLabel
                        size="sm"
                        label={`Tier ${i + 1}: packs from, in US dollars`}
                        prefix="$"
                        placeholder="0.00"
                        value={t.from}
                        onValueChange={(from) => setTier(i, { from })}
                        error={row?.fromError}
                        inputClassName="w-[148px]"
                      />
                    )}
                  </td>
                  <td className={TD}>
                    <AmountField
                      hideLabel
                      size="sm"
                      label={`Tier ${i + 1}: bonus credits, in percent of the base`}
                      suffix="%"
                      placeholder="0"
                      value={t.pct}
                      onValueChange={(pct) => setTier(i, { pct })}
                      error={row?.pctError}
                      inputClassName="w-[112px]"
                    />
                  </td>
                  <td className={cn(TD, "text-right")}>
                    {i === 0 ? null : (
                      <button
                        type="button"
                        onClick={() => removeTier(i)}
                        aria-label={`Remove tier ${i + 1}`}
                        className="inline-flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-0 text-text-secondary outline-none hover:bg-bg-subtle hover:text-text-error focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <Icon icon={Delete02Icon} size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <Button hierarchy="secondary" size="sm" iconLeading={<Icon icon={Add01Icon} />} onClick={addTier} disabled={rules.tiers.length >= TIER_MAX}>
          Add tier
        </Button>
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium leading-sm text-text-primary">Round pack credits down to steps of</span>
          <Segmented
            label="Round pack credits down to steps of"
            value={String(rules.step) as `${PackStep}`}
            options={STEP_OPTIONS}
            onChange={(v) => onChange((r) => ({ ...r, step: Number(v) as PackStep }))}
          />
        </div>
      </div>
    </Section>
  );
}
