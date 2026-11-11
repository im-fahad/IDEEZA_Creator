// Review and publish: every price that changes, from the current one to the new one,
// and the rows that need a look, before the new prices go live.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { ModalFrame } from "@/components/ideeza/dialog";
import { CHANGE_COLUMN_HELP } from "@/lib/admin/credit-help";
import type { PricingPlan } from "@/lib/admin/credit-pricing";
import { LabelTip } from "./info-tip";

// A heading cell, stuck to the top of the dialog's scrolling body, with its own background and the
// line under it (a collapsed border wouldn't move with a stuck cell).
const HEAD =
  "sticky top-0 z-sticky bg-bg-subtle px-6 py-4 text-left text-sm font-medium leading-sm text-text-secondary shadow-[inset_0_-1px_0_var(--color-border-default)]";

export function PublishDialog({
  open,
  plan,
  basis,
  onClose,
  onPublish,
}: {
  open: boolean;
  plan: PricingPlan;
  basis: string;
  onClose: () => void;
  onPublish: () => void;
}) {
  const n = plan.changes.length;
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="md"
      title="Publish new prices"
      description={`Makers are charged these from now on: ${basis}.`}
      footer={
        <>
          <Button hierarchy="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button hierarchy="primary" onClick={onPublish} disabled={!!plan.blocked}>
            {n === 1 ? "Publish 1 change" : `Publish ${n} changes`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {plan.losses > 0 ? (
          <Banner tone="error">
            {`${plan.losses === 1 ? "1 price loses" : `${plan.losses} prices lose`} money at the lowest effective credit price.`}
          </Banner>
        ) : null}
        {plan.belowTarget > 0 ? (
          <Banner tone="attention">
            {`${plan.belowTarget === 1 ? "1 price makes" : `${plan.belowTarget} prices make`} less than the target at the lowest price.`}
          </Banner>
        ) : null}
        {plan.missing > 0 ? (
          <Banner tone="info">
            {`${plan.missing === 1 ? "1 price has" : `${plan.missing} prices have`} no cost and keep their current credits.`}
          </Banner>
        ) : null}
        {/* The headings stay in view while the dialog's body scrolls (owner, 2026-11-11: "make table
            header sticky during scroll in publish modal"). The body is the scroll box, so the table's
            box clips (the rounded corners) rather than scrolls: a scroll box of its own would hold the
            sticky headings instead, and it never scrolls up and down. Without the sideways scroll,
            a long change (a pack's price and credits) wraps on a phone. */}
        <div className="relative overflow-clip rounded-xl border border-solid border-border">
          <table className="w-full border-collapse">
            <caption className="sr-only">Prices that change</caption>
            <thead>
              <tr>
                <th scope="col" className={HEAD}>
                  <LabelTip label="Price" text={CHANGE_COLUMN_HELP.price} />
                </th>
                <th scope="col" className={HEAD}>
                  <LabelTip label="Current" text={CHANGE_COLUMN_HELP.current} />
                </th>
                <th scope="col" className={HEAD}>
                  <LabelTip label="New" text={CHANGE_COLUMN_HELP.next} />
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.changes.map((c) => (
                // The first row's line is the headings' own, which stays with them while they're stuck.
                <tr key={c.label} className="border-t border-solid border-border first:border-t-0">
                  <th scope="row" className="px-6 py-4 text-left text-md font-medium leading-md text-text-primary">
                    {c.label}
                  </th>
                  <td className="px-6 py-4 text-md leading-md text-text-secondary">{c.from}</td>
                  <td className="px-6 py-4 text-md font-semibold leading-md text-text-brand">{c.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModalFrame>
  );
}
