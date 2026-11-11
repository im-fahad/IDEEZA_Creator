// The credit packs, cheapest first: the live admin's columns (Name, Popular,
// Pack Price, Credits, Bonus, Total, Visibility, ⋮), with the credits worked
// out rather than typed, what a credit costs in each pack, and what Publish
// would change. Scrolls sideways inside its card at phone width.

import * as React from "react";
import { MoreVerticalIcon, StarIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Menu } from "@/components/ideeza/menu";
import { Toggle } from "@/components/ideeza/toggle";
import { formatCredits, formatPercent, formatUsd } from "@/lib/admin/credit-format";
import { PACK_COLUMN_HELP as HELP } from "@/lib/admin/credit-help";
import type { PackRow, PacksPlan } from "@/lib/admin/credit-packs";
import { cn } from "@/lib/utils";
import { LabelTip } from "./info-tip";

const TH = "px-6 py-4 align-bottom text-left text-sm font-medium leading-sm text-text-secondary";
const TD = "px-6 py-4 align-top text-md leading-md text-text-primary";
const ICON_BUTTON =
  "inline-flex h-[36px] w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-0 outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";

const dash = <span className="text-text-tertiary">—</span>;
const num = (n: number | null) => (n === null ? dash : n.toLocaleString("en-US"));

function NameCell({ row, minBase }: { row: PackRow; minBase: number }) {
  const note = row.nameError ?? row.priceError ?? row.minError;
  return (
    <th scope="row" className={cn(TD, "text-left font-medium")}>
      <span className="flex flex-wrap items-center gap-3">
        <span className="break-words">{row.name || "Untitled pack"}</span>
        {row.status === "new" ? (
          <Badge tone="brand">New</Badge>
        ) : null}
      </span>
      {note ? (
        <span className="mt-1 block text-sm font-regular leading-sm text-text-error">{note}</span>
      ) : row.belowMin ? (
        <span className="mt-1 block text-sm font-regular leading-sm text-text-tertiary">{`Below the minimum purchase (${formatCredits(minBase)}); hidden, so not sold.`}</span>
      ) : null}
    </th>
  );
}

function TotalCell({ row }: { row: PackRow }) {
  if (row.total === null) return dash;
  const was = row.current ? row.current.base + row.current.bonus : null;
  const changed = was !== null && was !== row.total;
  return (
    <span className="flex flex-col items-end">
      <span className={cn("font-semibold", changed ? "text-text-brand" : "text-text-primary")}>{row.total.toLocaleString("en-US")}</span>
      {changed ? <span className="text-sm leading-sm text-text-tertiary">Current {was.toLocaleString("en-US")}</span> : null}
    </span>
  );
}

export function PackTable({
  plan,
  onPopular,
  onVisible,
  onEdit,
  onDelete,
}: {
  plan: PacksPlan;
  onPopular: (id: string | null) => void;
  onVisible: (id: string, visible: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    // `relative`: keeps the cells' sr-only text inside this scroll box (see price-table.tsx).
    <div className="relative overflow-x-auto rounded-xl border border-solid border-border">
      <table className="w-full min-w-[960px] border-collapse">
        <caption className="sr-only">Credit packs: price, base, bonus and total credits</caption>
        <thead className="bg-bg-subtle">
          <tr>
            <th scope="col" className={cn(TH, "min-w-[200px]")}>
              <LabelTip label="Pack name" text={HELP.name} />
            </th>
            <th scope="col" className={TH}>
              <LabelTip label="Most popular" text={HELP.popular} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Pack price" text={HELP.price} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Base credits" text={HELP.base} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Bonus" text={HELP.bonus} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Total credits" text={HELP.total} />
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              <LabelTip label="Price per credit" text={HELP.perCredit} />
            </th>
            <th scope="col" className={TH}>
              <LabelTip label="Shown to makers" text={HELP.shown} />
            </th>
            <th scope="col" className={TH}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {plan.rows.map((row) => {
            const label = row.name || "Untitled pack";
            return (
              <tr key={row.id} className="border-t border-solid border-border">
                <NameCell row={row} minBase={plan.minBase} />
                <td className={TD}>
                  <button
                    type="button"
                    className={cn(ICON_BUTTON, row.popular ? "text-text-brand [&_path]:fill-current" : "text-text-tertiary hover:text-text-primary")}
                    aria-pressed={row.popular}
                    aria-label={`Most popular: ${label}`}
                    onClick={() => onPopular(row.popular ? null : row.id)}
                  >
                    <Icon icon={StarIcon} size={20} />
                  </button>
                </td>
                <td className={cn(TD, "whitespace-nowrap text-right")}>{row.price === null ? dash : formatUsd(row.price)}</td>
                <td className={cn(TD, "whitespace-nowrap text-right")}>{num(row.base)}</td>
                <td className={cn(TD, "whitespace-nowrap text-right")}>
                  {row.bonus === null ? (
                    dash
                  ) : (
                    <span className="flex flex-col items-end">
                      <span>+{row.bonus.toLocaleString("en-US")}</span>
                      <span className="text-sm leading-sm text-text-tertiary">{formatPercent(row.bonusPct ?? 0)}</span>
                    </span>
                  )}
                </td>
                <td className={cn(TD, "whitespace-nowrap text-right")}>
                  <TotalCell row={row} />
                </td>
                <td className={cn(TD, "whitespace-nowrap text-right")}>
                  {row.perCreditUsd === null ? (
                    dash
                  ) : (
                    <span className="flex flex-col items-end">
                      <span>{formatUsd(row.perCreditUsd)}</span>
                      {row.offListPct !== null && row.offListPct >= 0.05 ? (
                        <span className="text-sm leading-sm text-text-success">{formatPercent(row.offListPct)} off list</span>
                      ) : (
                        <span className="text-sm leading-sm text-text-tertiary">List price</span>
                      )}
                    </span>
                  )}
                </td>
                <td className={TD}>
                  <span className="flex items-center gap-4">
                    <Toggle size="sm" checked={row.visible} onChange={() => onVisible(row.id, !row.visible)} aria-label={`Show ${label} to makers`} />
                    <span className={row.visible ? "text-text-primary" : "text-text-tertiary"}>{row.visible ? "Shown" : "Hidden"}</span>
                  </span>
                </td>
                <td className={cn(TD, "text-right")}>
                  <Menu
                    label={`Actions for ${label}`}
                    align="end"
                    items={[
                      { id: "edit", label: "Edit", onSelect: () => onEdit(row.id) },
                      { id: "delete", label: "Delete", danger: true, onSelect: () => onDelete(row.id) },
                    ]}
                    trigger={(props) => (
                      <button {...props} type="button" aria-label={`More for ${label}`} className={cn(ICON_BUTTON, "text-text-secondary hover:text-text-primary")}>
                        <Icon icon={MoreVerticalIcon} size={20} />
                      </button>
                    )}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
