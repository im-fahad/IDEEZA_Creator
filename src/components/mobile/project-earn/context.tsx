"use client";

// What every Earn screen on the phone reads: the project page's one derivation
// (`useProjectPageData`, the owner's "project" context), the commercial state
// the header's pill says, and the screen's polite live region (`announce`).
// The same props the web's Earn tabs get (SlotProps), so the web's helpers take
// them as they are.

import * as React from "react";
import type { CommercialState } from "@/lib/commerce/state";
import type { Ready } from "../project/context";

export type EarnCtx = Ready & {
  commercial: CommercialState;
  /** Says a change in the screen's live region (a fix done in place, a listing written). */
  announce: (message: string) => void;
};

const Ctx = React.createContext<EarnCtx | null>(null);
export const EarnProvider = Ctx.Provider;

export function useEarn(): EarnCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useEarn outside an Earn screen");
  return v;
}
