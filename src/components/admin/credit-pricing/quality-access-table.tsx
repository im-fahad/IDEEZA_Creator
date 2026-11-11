// Per quality level: whether makers can pick it, and how many builds one maker
// can start at it a day (0 is no limit). A level that's off keeps its price for
// when it's back on. Beside the price table, not in it: that one already has
// nine columns. A section of its own, above Product build quality (owner,
// 2026-11-11: "move Availability and daily limits section top of Product build
// quality"): services-section.tsx `QualityAccessSection`.

import * as React from "react";
import { Toggle } from "@/components/ideeza/toggle";
import { ACCESS_COLUMN_HELP, LEVEL_HELP } from "@/lib/admin/credit-help";
import { formatDailyLimit, formatOnOff, type QualityDraft, type QualityLevel, type QualityRow } from "@/lib/admin/credit-pricing";
import { cn } from "@/lib/utils";
import { AmountField, TodayNext } from "./fields";
import { LabelTip } from "./info-tip";

const TH = "px-6 py-4 align-bottom text-left text-sm font-medium leading-sm text-text-secondary";
const TD = "px-6 py-4 align-top text-md leading-md text-text-primary";

const both = (enabled: boolean, limit: number) => `${formatOnOff(enabled)} · ${formatDailyLimit(limit)}`;

export function QualityAccessTable({
  rows,
  drafts,
  error,
  onChange,
}: {
  rows: QualityRow[];
  drafts: Record<QualityLevel, QualityDraft>;
  /** Every level off: shown under the table, and Publish waits. */
  error: string | null;
  onChange: (level: QualityLevel, patch: Partial<QualityDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* `relative`: see the price table — keeps the sr-only text in this box. */}
      <div className="relative overflow-x-auto rounded-xl border border-solid border-border">
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">Product build quality levels: availability and daily limits</caption>
          <thead className="bg-bg-subtle">
            <tr>
              <th scope="col" className={cn(TH, "min-w-[184px]")}>
                <LabelTip label="Quality level" text={ACCESS_COLUMN_HELP.level} />
              </th>
              <th scope="col" className={TH}>
                <LabelTip label="Offered to makers" text={ACCESS_COLUMN_HELP.offered} />
              </th>
              <th scope="col" className={TH}>
                <LabelTip label="Daily limit per maker" text={ACCESS_COLUMN_HELP.dailyLimit} />
              </th>
              <th scope="col" className={TH}>
                <LabelTip label="Change" text={ACCESS_COLUMN_HELP.change} />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.level];
              return (
                <tr key={row.level} className="border-t border-solid border-border">
                  <th scope="row" className={cn(TD, "text-left font-medium")}>
                    <LabelTip label={row.label} text={LEVEL_HELP[row.level]} />
                  </th>
                  <td className={TD}>
                    <span className="flex items-center gap-4">
                      <Toggle
                        size="sm"
                        checked={draft.enabled}
                        onChange={() => onChange(row.level, { enabled: !draft.enabled })}
                        aria-label={`${row.label} quality level`}
                      />
                      <span className={draft.enabled ? "text-text-primary" : "text-text-tertiary"}>
                        {draft.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </span>
                  </td>
                  <td className={TD}>
                    <AmountField
                      hideLabel
                      size="sm"
                      label={`${row.label}: builds one maker can start a day (0 is no limit)`}
                      placeholder="0"
                      value={draft.dailyLimit}
                      onValueChange={(dailyLimit) => onChange(row.level, { dailyLimit })}
                      error={row.dailyLimitError}
                      inputClassName="w-[140px]"
                    />
                  </td>
                  <td className={TD}>
                    <TodayNext
                      today={both(row.currentEnabled, row.currentDailyLimit)}
                      next={both(row.enabled, row.dailyLimit ?? row.currentDailyLimit)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm leading-sm text-text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
