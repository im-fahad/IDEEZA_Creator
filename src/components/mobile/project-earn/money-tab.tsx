"use client";

// Earn › Money on the phone (Figma 17–17j; the web's earn/money.tsx, owner
// 2026-10-11): three sections, each addressed by its id, each empty state one
// line and one action — Splits (`#splits`, money/splits.tsx), Sales
// (`#customers`, money/sales.tsx, with the Testnet demo badge and `?sale=`),
// Rights (`#rights`, money/rights.tsx, then the License). Every write asks
// `can(viewer, …, view.canCtx)`, so a project sold in full reads them all.

import { Rights } from "./money/rights";
import { Sales } from "./money/sales";
import { Splits } from "./money/splits";

export function EarnMoneyTab() {
  return (
    <div className="flex flex-col gap-12">
      <Splits />
      <Sales />
      <Rights />
    </div>
  );
}
