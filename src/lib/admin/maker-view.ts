// Admin › Maker preview (owner, 2026-11-11: "can we create a new menu in
// sidebar and add examples how user will see all of part? like packages,
// service and quality costs"): what makers would see of the admin's prices.
// The credit packs they can buy, the quality levels they can pick for a build
// and what each AI service costs, as they are now (`live`, the last publish)
// or as they will be once the draft is published (`next`).
//
// `next` is the real Publish run on a copy (`publishPricing`), so the preview
// can't disagree with what Publish does. While Publish is blocked by a wrong
// field it shows today's prices and says why (`held`).
//
// Pure, relative imports only, so node:test can load it.

import {
  AI_SERVICES,
  QUALITY_LEVELS,
  SERVICE_GROUPS,
  pricingPlan,
  publishPricing,
  type CustomCredit,
  type PricingDoc,
  type PublishedPrices,
  type QualityLevel,
  type ServiceGroup,
} from "./credit-pricing";

export type PreviewWhen = "live" | "next";

export type MakerPack = {
  id: string;
  name: string;
  priceUsd: number;
  base: number;
  bonus: number;
  total: number;
  popular: boolean;
};

export type MakerService = { key: string; label: string; credits: number };
export type MakerServiceGroup = { id: ServiceGroup; label: string; services: MakerService[] };

export type MakerLevel = {
  id: QualityLevel;
  label: string;
  /** One plain line on what the level trades, in the maker's words. */
  hint: string;
  /** 0 for Free. */
  credits: number;
  /** Builds one maker can start at this level a day; 0 is no limit. */
  dailyLimit: number;
};

export type MakerView = {
  creditUsd: number;
  usdtPerCredit: number;
  idzPerCredit: number;
  /** The packs makers can buy, cheapest first. */
  packs: MakerPack[];
  /** Packs the admin hid: makers don't see them. */
  hiddenPacks: string[];
  custom: CustomCredit;
  /** Every service group but product builds, which are priced by quality level. */
  groups: MakerServiceGroup[];
  /** The levels makers can pick, Free to Max. */
  levels: MakerLevel[];
  /** Levels the admin turned off: makers can't pick them. */
  hiddenLevels: string[];
};

/** Low, Medium and High say what the maker's own Quality menu says (lib/create/quality.ts). */
export const MAKER_LEVEL_HINT: Record<QualityLevel, string> = {
  free: "No credits needed",
  low: "Quickest build, less detail",
  medium: "Balanced detail and speed",
  high: "Most detail, takes longer",
  max: "The finest detail, takes longest",
};

export type PreviewPrices = {
  prices: PublishedPrices;
  /** Why `next` shows today's prices: Publish is blocked. Null otherwise. */
  held: string | null;
  /** Changes in the draft that Publish would make. */
  waiting: number;
};

export function previewPrices(doc: PricingDoc, when: PreviewWhen): PreviewPrices {
  const plan = pricingPlan(doc);
  const waiting = plan.changes.length;
  const held = waiting > 0 ? plan.blocked : null;
  if (when === "live" || held || waiting === 0) return { prices: doc.published, held: when === "next" ? held : null, waiting };
  return { prices: publishPricing(doc, 0, "").published, held: null, waiting };
}

export function makerView(p: PublishedPrices): MakerView {
  const shown = p.packs.filter((k) => k.visible).sort((a, b) => a.priceUsd - b.priceUsd);
  return {
    creditUsd: p.creditUsd,
    usdtPerCredit: p.usdtPerCredit,
    idzPerCredit: p.idzPerCredit,
    packs: shown.map((k) => ({
      id: k.id,
      name: k.name,
      priceUsd: k.priceUsd,
      base: k.base,
      bonus: k.bonus,
      total: k.base + k.bonus,
      popular: k.popular,
    })),
    hiddenPacks: p.packs.filter((k) => !k.visible).map((k) => k.name),
    custom: p.custom,
    groups: SERVICE_GROUPS.filter((g) => g.id !== "build")
      .map((g) => ({
        id: g.id,
        label: g.label,
        services: AI_SERVICES.filter((s) => s.group === g.id).map((s) => ({ key: s.key, label: s.label, credits: p.services[s.key] ?? 0 })),
      }))
      .filter((g) => g.services.length > 0),
    levels: QUALITY_LEVELS.filter((l) => p.available[l.id]).map((l) => ({
      id: l.id,
      label: l.label,
      hint: MAKER_LEVEL_HINT[l.id],
      credits: l.id === "free" ? 0 : p.quality[l.id],
      dailyLimit: p.dailyLimits[l.id],
    })),
    hiddenLevels: QUALITY_LEVELS.filter((l) => !p.available[l.id]).map((l) => l.label),
  };
}

/** What a pack costs in a coin: the pack's dollars at the rate a credit is sold in that coin. */
export function packCoinPrice(view: Pick<MakerView, "creditUsd" | "usdtPerCredit" | "idzPerCredit">, priceUsd: number, coin: "USDT" | "IDZ"): number {
  const perCredit = coin === "USDT" ? view.usdtPerCredit : view.idzPerCredit;
  return view.creditUsd > 0 ? (priceUsd / view.creditUsd) * perCredit : 0;
}
