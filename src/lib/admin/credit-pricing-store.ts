// The admin's AI credit pricing, kept in this browser (`ideeza:admin:credit-pricing`):
// the draft as typed, what was last published and the publish history. There is
// no backend; a fresh browser starts from the demo (`seedPricingDoc`): real
// costs, two publishes and a few changes waiting. Read live through
// `useStoredKey`, so a second tab follows.
//
// Relative imports, so node:test can load the modules above it.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { normalizePricingDoc, publishPricing, seedPricingDoc, type PricingDoc, type PricingDraft } from "./credit-pricing";

export const CREDIT_PRICING_KEY = "ideeza:admin:credit-pricing";

export function readPricingDoc(): PricingDoc {
  return normalizePricingDoc(parseStored(readStoredKey(CREDIT_PRICING_KEY)).value);
}

function save(doc: PricingDoc): WriteResult {
  return writeStoredKey(CREDIT_PRICING_KEY, doc);
}

/** The draft changed: what makers pay stays as published. */
export function saveDraft(change: (draft: PricingDraft) => PricingDraft): WriteResult {
  const doc = readPricingDoc();
  return save({ ...doc, draft: change(doc.draft) });
}

export function publishDraft(at: number, by: string): WriteResult {
  return save(publishPricing(readPricingDoc(), at, by));
}

/** Back to the demo: its costs, its two publishes and the changes waiting. */
export function resetPricing(): WriteResult {
  return save(seedPricingDoc());
}

/** The stored doc, live; `hydrated` is false until the browser's copy is read. */
export function usePricingDoc(): { hydrated: boolean; doc: PricingDoc } {
  const { hydrated, raw } = useStoredKey(CREDIT_PRICING_KEY);
  const doc = React.useMemo(() => normalizePricingDoc(parseStored(raw).value), [raw]);
  return { hydrated, doc };
}
