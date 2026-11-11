// One table of prices: per row, what a run costs us and its own markup (typed),
// then the current credits, the credits Publish would set, what a maker pays at
// list price, the revenue at the lowest price and the profit left there. The
// table scrolls sideways inside its card at phone width; the page never does.

import * as React from "react";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { priceColumnHelp } from "@/lib/admin/credit-help";
import { formatCredits, formatPercent, formatUsd, type PriceRow, type RowStatus } from "@/lib/admin/credit-pricing";
import { cn } from "@/lib/utils";
import { AmountField } from "./fields";
import { LabelTip } from "./info-tip";

export type PriceTableGroup = {
  id: string;
  label?: string;
  hint?: string;
  /** What the group is, in its info tip. */
  help?: string;
  rows: PriceRow[];
};

export type PriceDraftField = "cost" | "profit";

const STATUS: Record<RowStatus, { tone: BadgeTone; label: string }> = {
  ok: { tone: "success", label: "On target" },
  "below-target": { tone: "warning", label: "Below target" },
  loss: { tone: "error", label: "Loses money" },
  missing: { tone: "neutral", label: "No cost yet" },
  invalid: { tone: "error", label: "Check the row" },
  free: { tone: "info", label: "Free to makers" },
};

// Headings wrap (two lines at most, read from the foot of the row) so the nine
// columns fit a laptop's width; the name column keeps room for a name.
const TH = "px-6 py-4 align-bottom text-left text-sm font-medium leading-sm text-text-secondary";
const TD = "px-6 py-4 align-top text-md leading-md text-text-primary";

function statusOf(row: PriceRow, ratesReady: boolean): { tone: BadgeTone; label: string } {
  if (row.status === "invalid" && !row.costError && !row.profitError && !ratesReady)
    return { tone: "neutral", label: "Waiting on settings" };
  return STATUS[row.status];
}

function Money({ value }: { value: number | null }) {
  return value === null ? <span className="text-text-tertiary">—</span> : <>{formatUsd(value)}</>;
}

function ProfitCell({ row }: { row: PriceRow }) {
  if (row.profitUsd === null) return <span className="text-text-tertiary">—</span>;
  const tone =
    row.status === "loss" || row.profitUsd < 0
      ? "text-text-error"
      : row.status === "below-target"
        ? "text-text-warning"
        : row.status === "free"
          ? "text-text-secondary"
          : "text-text-success";
  return (
    <span className={cn("flex flex-col", tone)}>
      <span>{formatUsd(row.profitUsd)}</span>
      {row.profitOnCostPct !== null ? <span className="text-sm leading-sm">{formatPercent(row.profitOnCostPct)} on cost</span> : null}
    </span>
  );
}

function NewCredits({ row }: { row: PriceRow }) {
  if (row.next === null) return <span className="text-text-tertiary">Keeps {row.current.toLocaleString("en-US")}</span>;
  const changed = row.next !== row.current;
  return (
    <span className={cn("font-semibold", changed ? "text-text-brand" : "text-text-primary")}>
      {row.next.toLocaleString("en-US")}
      {changed ? <span className="sr-only"> (changed from {formatCredits(row.current)})</span> : null}
    </span>
  );
}

export function PriceTable({
  caption,
  firstColumn,
  unit,
  groups,
  drafts,
  globalProfit,
  ratesReady,
  onDraftChange,
  fixedProfit,
  rowHint,
  rowHelp,
}: {
  caption: string;
  firstColumn: string;
  /** What one row's cost pays for: a service's run or a level's build. */
  unit: "run" | "build";
  groups: PriceTableGroup[];
  drafts: Record<string, { cost: string; profit: string }>;
  /** The global markup, shown in a row's empty markup field. */
  globalProfit: string;
  ratesReady: boolean;
  onDraftChange: (id: string, field: PriceDraftField, value: string) => void;
  /** Rows whose price is fixed (the Free level): their markup can't be set. */
  fixedProfit?: (row: PriceRow) => boolean;
  /** A line under a row's name. */
  rowHint?: (row: PriceRow) => string | undefined;
  /** What a row is, in the info tip beside its name. */
  rowHelp?: (row: PriceRow) => string | undefined;
}) {
  const help = priceColumnHelp(unit);
  const name = (label: string, text: string | undefined) => (text ? <LabelTip label={label} text={text} /> : label);
  return (
    // `relative` keeps the cells' screen-reader text (sr-only, absolutely placed)
    // inside this scroll box; otherwise it lands against <main> and widens the page.
    <div className="relative overflow-x-auto rounded-xl border border-solid border-border">
      <table className="w-full min-w-[1040px] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-bg-subtle">
          <tr>
            <th scope="col" className={cn(TH, "min-w-[184px]")}>
              <LabelTip label={firstColumn} text={help.name} />
            </th>
            <th scope="col" className={TH}>
              <LabelTip label={`Our cost per ${unit}`} text={help.cost} />
            </th>
            <th scope="col" className={TH}>
              <LabelTip label="Markup" text={help.markup} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Current credits" text={help.current} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Calculated credits" text={help.calculated} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Maker pays" text={help.makerPays} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Revenue at lowest price" text={help.revenue} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Profit at lowest price" text={help.profit} />
            </th>
            <th scope="col" className={TH}>
              <LabelTip label="Pricing status" text={help.status} />
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.id}>
            {group.label ? (
              <tr className="border-t border-solid border-border">
                <th scope="colgroup" colSpan={9} className="bg-bg-page px-6 pb-3 pt-6 text-left">
                  <span className="block text-sm font-semibold leading-sm text-text-primary">{name(group.label, group.help)}</span>
                  {group.hint ? <span className="block text-sm font-regular leading-sm text-text-tertiary">{group.hint}</span> : null}
                </th>
              </tr>
            ) : null}
            {group.rows.map((row) => {
              const draft = drafts[row.id] ?? { cost: "", profit: "" };
              const status = statusOf(row, ratesReady);
              const fixed = fixedProfit?.(row) ?? false;
              return (
                <tr key={row.id} className="border-t border-solid border-border">
                  <th scope="row" className={cn(TD, "text-left font-medium")}>
                    <span className="block">{name(row.label, rowHelp?.(row))}</span>
                    {rowHint?.(row) ? (
                      <span className="block text-sm font-regular leading-sm text-text-tertiary">{rowHint(row)}</span>
                    ) : null}
                  </th>
                  <td className={TD}>
                    <AmountField
                      hideLabel
                      size="sm"
                      label={`${row.label}: our cost per ${unit}, in US dollars`}
                      prefix="$"
                      placeholder="0.00"
                      value={draft.cost}
                      onValueChange={(v) => onDraftChange(row.id, "cost", v)}
                      error={row.costError}
                      inputClassName="w-[132px]"
                    />
                  </td>
                  <td className={TD}>
                    {fixed ? (
                      <span className="text-text-tertiary">—</span>
                    ) : (
                      <AmountField
                        hideLabel
                        size="sm"
                        label={`${row.label}: its own markup, in percent (empty uses ${globalProfit}%)`}
                        suffix="%"
                        placeholder={globalProfit}
                        value={draft.profit}
                        onValueChange={(v) => onDraftChange(row.id, "profit", v)}
                        error={row.profitError}
                        inputClassName="w-[112px]"
                      />
                    )}
                  </td>
                  <td className={cn(TD, "whitespace-nowrap text-right text-text-secondary")}>{row.current.toLocaleString("en-US")}</td>
                  <td className={cn(TD, "whitespace-nowrap text-right")}>
                    <NewCredits row={row} />
                  </td>
                  <td className={cn(TD, "whitespace-nowrap text-right")}>
                    <Money value={row.listUsd} />
                  </td>
                  <td className={cn(TD, "whitespace-nowrap text-right")}>
                    <Money value={row.lowestUsd} />
                  </td>
                  <td className={cn(TD, "whitespace-nowrap text-right")}>
                    <ProfitCell row={row} />
                  </td>
                  <td className={TD}>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
