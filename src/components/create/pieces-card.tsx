"use client";

// What to build, on a concept card (owner, 2026-10-22): under the Spec, the
// five pieces as chips — the ones this product's build makes ticked, the
// rest dashed (owner picked chips over a list, 2026-10-25) — and the
// product's total, with its Quality beside the title.
//
// Quality took Edit's place (owner, 2026-11-01): Low, Medium or High, each
// at its own price, starting at the level picked on Home. Edit opened the
// What to build panel (pieces-sheet.tsx), where pieces were ticked one by
// one with a Quality and Optimize each; the owner hid those choices for now,
// so Edit is kept below as a comment, not deleted.

import * as React from "react";
import { CheckmarkCircle02Icon /* , PencilEdit02Icon */ } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Tag } from "@/components/ideeza/tag";
import {
  PICKABLE_KINDS,
  PIECES,
  aboutTime,
  creditsLabel,
  pickCost,
  pickSeconds,
  pickSummary,
  qualityOf,
  withQuality,
  type PiecePick,
  type PieceQuality,
} from "@/lib/create/pieces";
// import { OUTLINE_BUTTON_SM } from "./buttons";
import { QualityMenu } from "./quality-menu";
import { CreditBadge } from "@/components/credits/credit-badge";

/** There is one What to build panel on the page, whichever card opened it. */
export const PIECES_SHEET_ID = "pieces-sheet";
/** The card's Edit — where closing the panel hands the keyboard back. */
export const piecesButtonId = (productId: string) => `pieces-${productId}-open`;

/** "3D model · enclosure · optimized" — the name, what it is where the name
 *  alone is unclear, and what was chosen beyond the plain piece. The Quality
 *  is not said here: the product has one, and its card shows it (owner,
 *  2026-11-01: no "High" written through the chat). */
export function pieceLine(kind: keyof typeof PIECES, c: { quality: string; optimize: boolean }): {
  name: string;
  note: string;
} {
  const p = PIECES[kind];
  return { name: p.name, note: (p.note ? ` · ${p.note}` : "") + pieceExtras(kind, c) };
}

/** " · optimized" — only what was chosen beyond the plain piece. */
function pieceExtras(kind: keyof typeof PIECES, c: { quality: string; optimize: boolean }): string {
  return PIECES[kind].optimize && c.optimize ? " · optimized" : "";
}

export type PiecesCard = {
  productId: string;
  productName: string;
  pick: PiecePick;
  /** Sets the product's Quality — every piece that has one. */
  onQuality: (q: PieceQuality) => void;
  // Hidden with the What to build panel (owner, 2026-11-01):
  // /** The panel is open on this product. */
  // open: boolean;
  // /** The panel docks beside the canvas rather than over it. */
  // docked: boolean;
  // onEdit: () => void;
};

export function PiecesBlock({ card }: { card: PiecesCard }) {
  const { pick } = card;
  // The five a maker picks, always all five: ticked ones solid, left-out ones
  // dashed, so what is in and what is out reads at a glance. The card keeps
  // the total, which follows the Quality.
  const any = PICKABLE_KINDS.some((k) => pick[k].on);
  return (
    <section data-tour="chat-pick" className="flex flex-col gap-[8px] border-t border-solid border-border pt-[12px]">
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
        <h4 className="min-w-0 flex-1 text-sm font-semibold text-text-secondary">What to build</h4>
        {any && (
          <span className="inline-flex items-center gap-[6px] text-sm tabular-nums text-text-secondary">
            <CreditBadge credits={pickCost(pick)} />
            {aboutTime(pickSeconds(pick))}
          </span>
        )}
        <QualityMenu
          variant="card"
          name={card.productName}
          value={qualityOf(pick)}
          onChange={card.onQuality}
          price={(q) => creditsLabel(pickCost(withQuality(pick, q)))}
        />
        {/* Edit → the What to build panel, hidden for now (owner, 2026-11-01).
        <button
          id={piecesButtonId(card.productId)}
          type="button"
          onClick={card.onEdit}
          aria-haspopup={card.docked ? undefined : "dialog"}
          aria-expanded={card.open}
          aria-controls={card.open ? PIECES_SHEET_ID : undefined}
          aria-label={`Edit what to build for ${card.productName}`}
          className={OUTLINE_BUTTON_SM}
        >
          <Icon icon={PencilEdit02Icon} size={14} />
          Edit
        </button>
        */}
      </div>
      <ul role="list" aria-label="Pieces" className="flex flex-wrap gap-[6px]">
        {PICKABLE_KINDS.map((k) => {
          const on = pick[k].on;
          const extra = on ? pieceExtras(k, pick[k]) : "";
          return (
            <li key={k} className="flex">
              {on ? (
                <Tag
                  icon={
                    <span className="inline-flex text-text-success">
                      <Icon icon={CheckmarkCircle02Icon} size={16} />
                    </span>
                  }
                >
                  <span>
                    {PIECES[k].name}
                    {extra && <span className="text-text-tertiary">{extra}</span>}
                  </span>
                </Tag>
              ) : (
                <Tag className="bg-transparent text-text-tertiary ring-0 outline-dashed outline-1 -outline-offset-1 outline-border-strong">
                  <span>
                    {PIECES[k].name}
                    <span className="sr-only">, left out</span>
                  </span>
                </Tag>
              )}
            </li>
          );
        })}
      </ul>
      {any ? (
        <p className="text-xs text-text-tertiary">{pickSummary(pick)} · Parts list included</p>
      ) : (
        <p className="text-sm text-text-warning">Nothing picked — pick at least one piece to build it.</p>
      )}
    </section>
  );
}
