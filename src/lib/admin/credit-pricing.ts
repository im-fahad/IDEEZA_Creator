// AI credit pricing, the admin's side (owner, 2026-11-10). The admin enters
// what each AI service really costs us per run and the profit to make, and
// every service's price in credits follows from them:
//
//   lowest credit price = credit value × (1 − biggest discount) ÷ (1 + biggest pack bonus)
//   credits             = round up( cost × (1 + profit) ÷ the price a credit is counted at )
//
// The price a credit is counted at is the lowest price a maker can pay for one
// ("lowest", the default, so the profit holds for every buyer) or its list
// price ("list"). USDT follows the dollar one for one and IDZ follows the IDZ
// price, unless the admin sets either by hand.
//
// The services and today's prices are the backend's (ideeza2021/ideeza, dev,
// 2026-11-10): `AIServiceCost` service keys, every one seeded at 10 credits as
// a test value, and the `AIQualityCost` levels a product build is priced by.
// Nothing here reaches the app: the admin's draft and what was published live
// in this browser (`credit-pricing-store.ts`).
//
// Pure, relative imports only, so node:test can load it.

import { CREDIT_PACKS, MAX_DISCOUNT } from "../create/credit-pricing";
import { IDZ_USD_PRICE } from "../wallet/idz-price";
import {
  checkNumber,
  formatCoin,
  formatCredits,
  formatDailyLimit,
  formatOnOff,
  formatPercent,
  formatPurchaseMax,
  formatUsd,
  MAX_CREDITS,
  type Check,
} from "./credit-format";
import {
  packChanges,
  planPacks,
  publishedPacks,
  readPackDrafts,
  readPackRules,
  readPacks,
  type Pack,
  type PackDraft,
  type PackRulesDraft,
  type PacksPlan,
} from "./credit-packs";

export {
  creditsPerUnit,
  formatCoin,
  formatCredits,
  formatDailyLimit,
  formatOnOff,
  formatPercent,
  formatPurchaseMax,
  formatUsd,
  MAX_CREDITS,
  parseAmount,
} from "./credit-format";

export type ServiceGroup = "images" | "3d" | "pcb" | "parts" | "edits" | "media" | "documents" | "build";

export type AiService = { key: string; label: string; group: ServiceGroup };

export const SERVICE_GROUPS: readonly {
  id: ServiceGroup;
  label: string;
  hint?: string;
}[] = [
  { id: "images", label: "Images" },
  { id: "3d", label: "3D" },
  { id: "pcb", label: "PCB" },
  { id: "parts", label: "Parts" },
  { id: "edits", label: "Edits to a finished design" },
  { id: "media", label: "Video and audio" },
  { id: "documents", label: "Documents" },
  {
    id: "build",
    label: "Product builds, fallback price",
    hint: "A build is priced by its quality level. This price applies only to a level with no price.",
  },
];

/** Every service the backend charges credits for, by its `service_key`. */
export const AI_SERVICES: readonly AiService[] = [
  { key: "ai_image_generation", label: "AI image generation", group: "images" },
  {
    key: "product_image_generation",
    label: "Product image generation",
    group: "images",
  },
  { key: "ai_threed_generation", label: "3D generation", group: "3d" },
  { key: "ai_freerouting", label: "PCB auto-routing", group: "pcb" },
  { key: "placement_v2", label: "PCB auto-placement", group: "pcb" },
  {
    key: "ai_part_creation",
    label: "Part creation from an MPN",
    group: "parts",
  },
  { key: "ai_schematic_edit", label: "Schematic edit", group: "edits" },
  { key: "ai_pcb_edit", label: "PCB edit", group: "edits" },
  { key: "ai_3d_edit", label: "3D edit", group: "edits" },
  { key: "ai_full_edit", label: "Full edit", group: "edits" },
  { key: "ai_video", label: "Product video", group: "media" },
  { key: "ai_audio_merge", label: "Audio merge", group: "media" },
  { key: "ai_apk_config_generation", label: "APK config", group: "documents" },
  { key: "ai_patent", label: "Patent", group: "documents" },
  { key: "ai_business_plan", label: "Business plan", group: "documents" },
  { key: "ai_product_creation", label: "AI product build", group: "build" },
  {
    key: "ai_agentic_product_creation",
    label: "Agentic product build",
    group: "build",
  },
];

export type QualityLevel = "free" | "low" | "medium" | "high" | "max";

export const QUALITY_LEVELS: readonly {
  id: QualityLevel;
  label: string;
  hint: string;
}[] = [
  { id: "free", label: "Free", hint: "Makers pay nothing; we pay the cost" },
  { id: "low", label: "Low", hint: "Quickest build, less detail" },
  { id: "medium", label: "Medium", hint: "Balanced detail and speed" },
  { id: "high", label: "High", hint: "Most detail, takes longer" },
  { id: "max", label: "Max", hint: "Not offered on any plan yet" },
];

/** History keeps this many publishes, newest first. */
export const HISTORY_MAX = 50;

export type MarginBasis = "lowest" | "list";
export type Rounding = 1 | 5 | 10;
export const ROUNDINGS: readonly Rounding[] = [1, 5, 10];

/** The admin's settings, as typed: a half-typed number stays as it was typed. */
export type PricingSettings = {
  /** What one credit is worth in US dollars: "1 credit = $X". */
  creditUsd: string;
  /** USDT follows the dollar one for one; off, `usdtPerCredit` is used. */
  usdtAuto: boolean;
  usdtPerCredit: string;
  /** IDZ follows `idzUsd` (the IDZ price in dollars); off, `idzPerCredit` is used. */
  idzAuto: boolean;
  idzUsd: string;
  idzPerCredit: string;
  /** Markup on our cost, in percent: 50 makes a $1 run $1.50. */
  profitPct: string;
  basis: MarginBasis;
  /** The biggest discount a maker can get on credits (a plan's), in percent. */
  maxDiscountPct: string;
  /** The biggest bonus a pack adds (150 on 1000 is 15), in percent. */
  maxBonusPct: string;
  rounding: Rounding;
};

export type ServiceDraft = { cost: string; profit: string };
/** A level as typed: its cost and markup, the builds one maker can start at it
 *  a day (0 is no limit), and whether makers can pick it at all. */
export type QualityDraft = { cost: string; profit: string; dailyLimit: string; enabled: boolean };

/** Custom credit, as typed: whether a maker can buy any number of credits
 *  besides the packs, and the fewest and most at once. */
export type CustomCreditDraft = { enabled: boolean; min: string; max: string };
/** Custom credit as makers have it. A `max` of 0 is no limit, as the backend
 *  reads `manual_purchase_max`. */
export type CustomCredit = { enabled: boolean; min: number; max: number };

export type PricingDraft = {
  settings: PricingSettings;
  services: Record<string, ServiceDraft>;
  quality: Record<QualityLevel, QualityDraft>;
  custom: CustomCreditDraft;
  /** Credit packs as typed: a name and a price each; their credits follow (credit-packs.ts). */
  packs: PackDraft[];
  /** How a pack's credits are worked out: the bonus by price, and the step they round down to. */
  packRules: PackRulesDraft;
};

/** What makers are charged now: the last publish. */
export type PublishedPrices = {
  creditUsd: number;
  usdtPerCredit: number;
  idzPerCredit: number;
  services: Record<string, number>;
  quality: Record<QualityLevel, number>;
  dailyLimits: Record<QualityLevel, number>;
  /** Whether makers can pick each level. A level that's off keeps its price. */
  available: Record<QualityLevel, boolean>;
  custom: CustomCredit;
  packs: Pack[];
};

export type PriceChange = { label: string; from: string; to: string };
export type HistoryEntry = {
  at: number;
  by: string;
  basis: string;
  changes: PriceChange[];
};

/** 2 since the demo (10 Nov 2026). A doc stored before it (1) held the backend's
 *  empty draft and reads as the demo. */
export const PRICING_DOC_VERSION = 2;

export type PricingDoc = {
  v: typeof PRICING_DOC_VERSION;
  draft: PricingDraft;
  published: PublishedPrices;
  history: HistoryEntry[];
};

// ── Today, as the backend has it ────────────────────────────────────────────

/** The live Base Settings (2026-11-10): $1 = 314.47 credits, USDT 1 = 312.5, IDZ 1 = 0.2. */
const TODAY = {
  creditUsd: 0.00318,
  usdtPerCredit: 0.0032,
  idzPerCredit: 5,
} as const;
const TODAY_SERVICE_CREDITS = 10;
const TODAY_QUALITY: Record<QualityLevel, { credits: number; dailyLimit: number }> = {
  free: { credits: 0, dailyLimit: 0 },
  low: { credits: 250, dailyLimit: 0 },
  medium: { credits: 600, dailyLimit: 0 },
  high: { credits: 1500, dailyLimit: 0 },
  max: { credits: 4000, dailyLimit: 0 },
};

/** The live admin's Custom Credit (owner's screenshot, 2026-11-11): on, at
 *  least 315 credits a purchase ($1.00 at $0.00318), and no most (0). */
const TODAY_CUSTOM: CustomCredit = { enabled: true, min: 315, max: 0 };

/** No bonus under $10, then 5%, 10% from $25 and 15% (the maximum pack bonus)
 *  from $50; credits rounded down to tens, so a pack reads 3,290, not 3,294. */
const PACK_RULES: PackRulesDraft = {
  tiers: [
    { from: "0", pct: "0" },
    { from: "10", pct: "5" },
    { from: "25", pct: "10" },
    { from: "50", pct: "15" },
  ],
  step: 10,
};

/** The biggest pack bonus the app sells, in percent of the pack's credits. */
export function biggestPackBonusPct(): number {
  return Math.max(0, ...CREDIT_PACKS.map((p) => (p.base > 0 ? (p.bonus / p.base) * 100 : 0)));
}

const levelRecord = <T>(fn: (level: QualityLevel) => T): Record<QualityLevel, T> =>
  Object.fromEntries(QUALITY_LEVELS.map((l) => [l.id, fn(l.id)])) as Record<QualityLevel, T>;

/** Today's backend: its test prices published, no costs typed, no history. The demo starts here. */
export function backendPricingDoc(): PricingDoc {
  return {
    v: PRICING_DOC_VERSION,
    draft: {
      settings: {
        creditUsd: String(TODAY.creditUsd),
        usdtAuto: true,
        usdtPerCredit: String(TODAY.usdtPerCredit),
        idzAuto: true,
        idzUsd: IDZ_USD_PRICE,
        idzPerCredit: String(TODAY.idzPerCredit),
        profitPct: "50",
        basis: "lowest",
        maxDiscountPct: String(Math.round(MAX_DISCOUNT * 100)),
        maxBonusPct: String(Math.round(biggestPackBonusPct() * 100) / 100),
        rounding: 1,
      },
      services: Object.fromEntries(AI_SERVICES.map((s) => [s.key, { cost: "", profit: "" }])),
      quality: levelRecord((l) => ({
        cost: "",
        profit: "",
        dailyLimit: String(TODAY_QUALITY[l].dailyLimit),
        enabled: true,
      })),
      custom: { enabled: TODAY_CUSTOM.enabled, min: String(TODAY_CUSTOM.min), max: String(TODAY_CUSTOM.max) },
      // The live packs (stg: "Stg Low", $1.00 for 400 + 1, …) are test data typed
      // by hand, so the backend's doc starts with none; the demo adds real ones.
      packs: [],
      packRules: PACK_RULES,
    },
    published: {
      ...TODAY,
      services: Object.fromEntries(AI_SERVICES.map((s) => [s.key, TODAY_SERVICE_CREDITS])),
      quality: levelRecord((l) => TODAY_QUALITY[l].credits),
      dailyLimits: levelRecord((l) => TODAY_QUALITY[l].dailyLimit),
      // The live admin has no switch: every level is on, and a plan's
      // ai_quality_levels picks among them.
      available: levelRecord(() => true),
      custom: { ...TODAY_CUSTOM },
      packs: [],
    },
    history: [],
  };
}

// ── The demo ────────────────────────────────────────────────────────────────
// What a fresh browser and Reset demo data show: the backend's test prices
// replaced by real ones (21 Oct), a second publish when vendors' prices moved
// (3 Nov), and a few costs typed since that aren't live yet. Each cost is a
// run's real price as vendors charged it in late 2026: an image ~$0.04, an
// image-to-3D model ~$0.30, a short product clip ~$0.60–0.75, an LLM edit a few
// cents, routing and placement a few CPU-minutes. Each has its own profit: more
// on cheap, high-volume runs and the documents, less on the costly ones, so a
// maker isn't priced out of a video or a build. Built by publishing, so the
// history and the prices always agree with the formula.

const run = (cost: string, profit: string): ServiceDraft => ({ cost, profit });

/** The costs and profits typed for the first publish. */
const DEMO_SERVICES: Record<string, ServiceDraft> = {
  ai_image_generation: run("0.04", "60"),
  product_image_generation: run("0.08", "55"),
  ai_threed_generation: run("0.30", "45"),
  ai_freerouting: run("0.012", "100"),
  placement_v2: run("0.02", "70"),
  ai_part_creation: run("0.06", "60"),
  ai_schematic_edit: run("0.03", "65"),
  ai_pcb_edit: run("0.04", "65"),
  ai_3d_edit: run("0.12", "50"),
  ai_full_edit: run("0.20", "45"),
  ai_video: run("0.60", "40"),
  ai_audio_merge: run("0.025", "75"),
  ai_apk_config_generation: run("0.03", "70"),
  ai_patent: run("0.55", "80"),
  ai_business_plan: run("0.40", "80"),
  ai_product_creation: run("1.80", "50"),
  ai_agentic_product_creation: run("3.20", "40"),
};

/** Free is capped at 3 a day (we pay for it), High at 10 (a long, costly build),
 *  and Max is off until a plan offers it; its price is set for when it's on. */
const DEMO_QUALITY: Record<QualityLevel, QualityDraft> = {
  free: { cost: "0.28", profit: "", dailyLimit: "3", enabled: true },
  low: { cost: "0.50", profit: "60", dailyLimit: "0", enabled: true },
  medium: { cost: "1.20", profit: "50", dailyLimit: "0", enabled: true },
  high: { cost: "3.10", profit: "45", dailyLimit: "10", enabled: true },
  max: { cost: "8.00", profit: "35", dailyLimit: "2", enabled: false },
};

/** A later edit: new costs a run; every profit stays as typed. */
type DemoStep = {
  idzUsd: string;
  costs?: Record<string, string>;
  quality?: Partial<Record<QualityLevel, string>>;
  /** Packs added. */
  packs?: PackDraft[];
};

const pack = (id: string, name: string, price: string, popular = false): PackDraft => ({ id, name, price, visible: true, popular });

const DEMO_PUBLISHES: readonly (DemoStep & { at: number; by: string })[] = [
  {
    at: Date.UTC(2026, 9, 21, 4, 42),
    by: "Maya Chen",
    idzUsd: "0.0231",
    packs: [
      pack("pack-starter", "Starter", "5.00"),
      pack("pack-basic", "Basic", "10.00"),
      pack("pack-pro", "Pro", "25.00", true),
      pack("pack-studio", "Studio", "50.00"),
    ],
  },
  {
    at: Date.UTC(2026, 10, 3, 10, 15),
    by: "Daniel Okafor",
    idzUsd: "0.0244",
    costs: { ai_threed_generation: "0.34", ai_part_creation: "0.065", ai_video: "0.75" },
    quality: { high: "3.40" },
    packs: [pack("pack-team", "Team", "100.00")],
  },
];

/** Typed since the last publish: not live yet. */
const DEMO_UNPUBLISHED: DemoStep = {
  idzUsd: IDZ_USD_PRICE,
  costs: { ai_image_generation: "0.035", ai_pcb_edit: "0.045" },
  quality: { medium: "1.30" },
};

function applyStep(draft: PricingDraft, step: DemoStep): PricingDraft {
  return {
    ...draft,
    settings: { ...draft.settings, idzUsd: step.idzUsd },
    services: Object.fromEntries(
      Object.entries(draft.services).map(([key, row]) => [key, { ...row, cost: step.costs?.[key] ?? row.cost }]),
    ),
    quality: levelRecord((l) => ({ ...draft.quality[l], cost: step.quality?.[l] ?? draft.quality[l].cost })),
    packs: step.packs ? [...draft.packs, ...step.packs] : draft.packs,
  };
}

export function seedPricingDoc(): PricingDoc {
  const start = backendPricingDoc();
  let doc: PricingDoc = { ...start, draft: { ...start.draft, services: { ...DEMO_SERVICES }, quality: { ...DEMO_QUALITY } } };
  for (const step of DEMO_PUBLISHES) doc = publishPricing({ ...doc, draft: applyStep(doc.draft, step) }, step.at, step.by);
  return { ...doc, draft: applyStep(doc.draft, DEMO_UNPUBLISHED) };
}

// ── Reading what was stored ─────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, fallback: string): string => (typeof v === "string" ? v.slice(0, 32) : fallback);
const count = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_CREDITS ? v : fallback;
const positive = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback);

/** What was stored, shape-checked part by part: a part that doesn't read is
 *  the demo's, so one bad field never loses the rest. Nothing stored, or a doc
 *  from before the demo, is the demo. */
export function normalizePricingDoc(raw: unknown): PricingDoc {
  const seed = seedPricingDoc();
  if (!isObj(raw) || raw.v !== PRICING_DOC_VERSION) return seed;
  const draft = isObj(raw.draft) ? raw.draft : {};
  const s = isObj(draft.settings) ? draft.settings : {};
  const d = seed.draft.settings;
  const settings: PricingSettings = {
    creditUsd: text(s.creditUsd, d.creditUsd),
    usdtAuto: typeof s.usdtAuto === "boolean" ? s.usdtAuto : d.usdtAuto,
    usdtPerCredit: text(s.usdtPerCredit, d.usdtPerCredit),
    idzAuto: typeof s.idzAuto === "boolean" ? s.idzAuto : d.idzAuto,
    idzUsd: text(s.idzUsd, d.idzUsd),
    idzPerCredit: text(s.idzPerCredit, d.idzPerCredit),
    profitPct: text(s.profitPct, d.profitPct),
    basis: s.basis === "list" || s.basis === "lowest" ? s.basis : d.basis,
    maxDiscountPct: text(s.maxDiscountPct, d.maxDiscountPct),
    maxBonusPct: text(s.maxBonusPct, d.maxBonusPct),
    rounding: ROUNDINGS.includes(s.rounding as Rounding) ? (s.rounding as Rounding) : d.rounding,
  };
  const services = isObj(draft.services) ? draft.services : {};
  const quality = isObj(draft.quality) ? draft.quality : {};
  const c = isObj(draft.custom) ? draft.custom : {};
  const pub = isObj(raw.published) ? raw.published : {};
  const pubServices = isObj(pub.services) ? pub.services : {};
  const pubQuality = isObj(pub.quality) ? pub.quality : {};
  const pubLimits = isObj(pub.dailyLimits) ? pub.dailyLimits : {};
  const pubCustom = isObj(pub.custom) ? pub.custom : {};
  const p = seed.published;
  const storedMin = count(pubCustom.min, p.custom.min);
  const pubAvailable = isObj(pub.available) ? pub.available : {};
  // Missing is on: before the switch every level was.
  const available = levelRecord((l) => (typeof pubAvailable[l] === "boolean" ? (pubAvailable[l] as boolean) : true));
  return {
    v: PRICING_DOC_VERSION,
    draft: {
      settings,
      services: Object.fromEntries(
        AI_SERVICES.map((svc) => {
          const row = isObj(services[svc.key]) ? (services[svc.key] as Record<string, unknown>) : {};
          return [svc.key, { cost: text(row.cost, ""), profit: text(row.profit, "") }];
        }),
      ),
      quality: levelRecord((l) => {
        const row = isObj(quality[l]) ? (quality[l] as Record<string, unknown>) : {};
        return {
          cost: text(row.cost, ""),
          profit: text(row.profit, ""),
          dailyLimit: text(row.dailyLimit, seed.draft.quality[l].dailyLimit),
          // A doc from before the switch: as published, so nothing waits.
          enabled: typeof row.enabled === "boolean" ? row.enabled : available[l],
        };
      }),
      custom: {
        enabled: typeof c.enabled === "boolean" ? c.enabled : seed.draft.custom.enabled,
        min: text(c.min, seed.draft.custom.min),
        max: text(c.max, seed.draft.custom.max),
      },
      packs: readPackDrafts(draft.packs, seed.draft.packs),
      packRules: readPackRules(draft.packRules, seed.draft.packRules),
    },
    published: {
      creditUsd: positive(pub.creditUsd, p.creditUsd),
      usdtPerCredit: positive(pub.usdtPerCredit, p.usdtPerCredit),
      idzPerCredit: positive(pub.idzPerCredit, p.idzPerCredit),
      services: Object.fromEntries(AI_SERVICES.map((svc) => [svc.key, count(pubServices[svc.key], p.services[svc.key])])),
      quality: levelRecord((l) => (l === "free" ? 0 : count(pubQuality[l], p.quality[l]))),
      dailyLimits: levelRecord((l) => count(pubLimits[l], p.dailyLimits[l])),
      available,
      custom: {
        enabled: typeof pubCustom.enabled === "boolean" ? pubCustom.enabled : p.custom.enabled,
        min: storedMin >= 1 ? storedMin : p.custom.min,
        max: count(pubCustom.max, p.custom.max),
      },
      packs: readPacks(pub.packs, p.packs),
    },
    history: Array.isArray(raw.history) ? raw.history.flatMap(readHistoryEntry).slice(0, HISTORY_MAX) : [],
  };
}

function readHistoryEntry(raw: unknown): HistoryEntry[] {
  if (!isObj(raw) || typeof raw.at !== "number" || !Array.isArray(raw.changes)) return [];
  const changes = raw.changes.flatMap((c): PriceChange[] =>
    isObj(c) && typeof c.label === "string" && typeof c.from === "string" && typeof c.to === "string"
      ? [{ label: c.label, from: c.from, to: c.to }]
      : [],
  );
  return [
    {
      at: raw.at,
      by: typeof raw.by === "string" ? raw.by : "",
      basis: typeof raw.basis === "string" ? raw.basis : "",
      changes,
    },
  ];
}

const PERCENT_REQUIRED = "Enter a percent";

/** A markup has no top (David, 2026-11-11: "remove the limit of 1000%"). A
 *  price too big to store is still caught, on its row, as "More credits than a
 *  price can hold". A typed number is never negative, so `range` can't show. */
const MARKUP = {
  min: 0,
  max: Number.POSITIVE_INFINITY,
  required: PERCENT_REQUIRED,
  range: "Enter 0 or more",
};

// ── The rates ───────────────────────────────────────────────────────────────

export type Rates = {
  creditUsd: number;
  usdtPerCredit: number;
  idzPerCredit: number;
  /** The least one credit can sell for: after the biggest discount and pack bonus. */
  lowestCreditUsd: number;
  /** The price a credit is counted at when credits are worked out. */
  basisUsd: number;
  profitPct: number;
  /** The biggest bonus a pack may give, in percent: the cap on the packs' bonus tiers. */
  maxBonusPct: number;
};

export type SettingsErrors = Partial<Record<keyof PricingSettings, string>>;

/** The settings checked; `rates` is null while any of them is wrong. */
export function checkSettings(s: PricingSettings): {
  rates: Rates | null;
  errors: SettingsErrors;
} {
  const errors: SettingsErrors = {};
  const pick = (field: keyof PricingSettings, c: Check): number => {
    if (c.error) errors[field] = c.error;
    return c.value ?? NaN;
  };
  const usd = {
    min: 0,
    max: 100,
    minExclusive: true,
    required: "Enter an amount",
    range: "Enter more than 0, up to 100",
  };
  const creditUsd = pick("creditUsd", checkNumber(s.creditUsd, usd));
  const usdtPerCredit = s.usdtAuto ? creditUsd : pick("usdtPerCredit", checkNumber(s.usdtPerCredit, usd));
  const idzPerCredit = s.idzAuto
    ? creditUsd / pick("idzUsd", checkNumber(s.idzUsd, usd))
    : pick(
        "idzPerCredit",
        checkNumber(s.idzPerCredit, {
          ...usd,
          max: 1_000_000,
          range: "Enter more than 0",
        }),
      );
  const profitPct = pick("profitPct", checkNumber(s.profitPct, MARKUP));
  const discount = pick(
    "maxDiscountPct",
    checkNumber(s.maxDiscountPct, {
      min: 0,
      required: PERCENT_REQUIRED,
      max: 90,
      range: "Enter 0 to 90",
    }),
  );
  const bonus = pick(
    "maxBonusPct",
    checkNumber(s.maxBonusPct, {
      min: 0,
      required: PERCENT_REQUIRED,
      max: 500,
      range: "Enter 0 to 500",
    }),
  );
  if (Object.keys(errors).length) return { rates: null, errors };
  const lowestCreditUsd = (creditUsd * (1 - discount / 100)) / (1 + bonus / 100);
  return {
    rates: {
      creditUsd,
      usdtPerCredit,
      idzPerCredit,
      lowestCreditUsd,
      basisUsd: s.basis === "lowest" ? lowestCreditUsd : creditUsd,
      profitPct,
      maxBonusPct: bonus,
    },
    errors,
  };
}

/** Credits for a run: its price counted at `basisUsd` a credit, rounded up to
 *  `rounding`, never less than one step. A float a hair over a whole step
 *  (10.000000000002) is that step, not the next one. */
export function creditsFor(costUsd: number, profitPct: number, basisUsd: number, rounding: Rounding): number {
  const units = (costUsd * (1 + profitPct / 100)) / basisUsd / rounding;
  const near = Math.round(units);
  const whole = Math.abs(units - near) <= 1e-9 * Math.max(1, units) ? near : Math.ceil(units);
  return Math.max(1, whole) * rounding;
}

// ── One row ─────────────────────────────────────────────────────────────────

export type RowStatus = "missing" | "invalid" | "ok" | "below-target" | "loss" | "free";

export type PriceRow = {
  id: string;
  label: string;
  costUsd: number | null;
  costError: string | null;
  profitError: string | null;
  /** The profit this row is priced at: its own, or the global one. */
  profitPct: number | null;
  ownProfit: boolean;
  current: number;
  /** Credits once published; null keeps `current` (no cost yet, or a field is wrong). */
  next: number | null;
  /** What a maker pays at list price. */
  listUsd: number | null;
  /** What we get at the lowest price. */
  lowestUsd: number | null;
  /** `lowestUsd` less the cost, in dollars and as profit on the cost. */
  profitUsd: number | null;
  profitOnCostPct: number | null;
  status: RowStatus;
};

function priceRow(
  id: string,
  label: string,
  draft: ServiceDraft,
  current: number,
  rates: Rates | null,
  rounding: Rounding,
  free: boolean,
): PriceRow {
  const empty = draft.cost.trim() === "";
  const cost = empty
    ? { value: null, error: null }
    : checkNumber(draft.cost, {
        min: 0,
        max: 10_000,
        required: "",
        range: "Enter 0 to 10,000",
      });
  const own = draft.profit.trim() !== "";
  const profit = own ? checkNumber(draft.profit, MARKUP) : { value: rates?.profitPct ?? null, error: null };
  const base: PriceRow = {
    id,
    label,
    costUsd: cost.value,
    costError: cost.error,
    profitError: profit.error,
    profitPct: profit.value,
    ownProfit: own,
    current,
    next: null,
    listUsd: null,
    lowestUsd: null,
    profitUsd: null,
    profitOnCostPct: null,
    status: empty ? "missing" : "invalid",
  };
  if (empty || cost.value === null || profit.value === null || !rates) return base;
  const next = free ? 0 : creditsFor(cost.value, profit.value, rates.basisUsd, rounding);
  if (next > MAX_CREDITS) return { ...base, costError: "More credits than a price can hold" };
  const lowestUsd = next * rates.lowestCreditUsd;
  const profitUsd = lowestUsd - cost.value;
  const profitOnCostPct = cost.value > 0 ? (profitUsd / cost.value) * 100 : null;
  const below = profitOnCostPct !== null && profitOnCostPct < profit.value - 1e-9;
  return {
    ...base,
    next,
    listUsd: next * rates.creditUsd,
    lowestUsd,
    profitUsd,
    profitOnCostPct,
    status: free ? "free" : profitUsd < 0 ? "loss" : below ? "below-target" : "ok",
  };
}

// ── The whole plan ──────────────────────────────────────────────────────────

export type QualityRow = PriceRow & {
  level: QualityLevel;
  dailyLimit: number | null;
  dailyLimitError: string | null;
  currentDailyLimit: number;
  enabled: boolean;
  currentEnabled: boolean;
};

/** Custom credit worked out: the limits as numbers, or why a field doesn't read. */
export type CustomCreditPlan = {
  enabled: boolean;
  min: number | null;
  max: number | null;
  minError: string | null;
  maxError: string | null;
  current: CustomCredit;
};

/** The fewest credits a purchase may be (1 or more), and the most (0 for no
 *  limit, else at least the fewest). Whole credits. */
export function checkCustomCredit(draft: CustomCreditDraft, current: CustomCredit): CustomCreditPlan {
  const upTo = MAX_CREDITS.toLocaleString("en-US");
  const min = checkNumber(draft.min, { min: 1, max: MAX_CREDITS, whole: true, required: "Enter 1 or more", range: `Enter 1 to ${upTo}` });
  let max = checkNumber(draft.max, { min: 0, max: MAX_CREDITS, whole: true, required: "Enter 0 for no limit", range: `Enter 0 to ${upTo}` });
  if (max.value !== null && max.value > 0 && min.value !== null && max.value < min.value) {
    max = { value: null, error: `Enter 0 for no limit, or ${min.value.toLocaleString("en-US")} or more` };
  }
  return { enabled: draft.enabled, min: min.value, max: max.value, minError: min.error, maxError: max.error, current };
}

export type PricingPlan = {
  rates: Rates | null;
  errors: SettingsErrors;
  services: PriceRow[];
  quality: QualityRow[];
  custom: CustomCreditPlan;
  packs: PacksPlan;
  /** Why the levels' switches can't be published: every level off. */
  qualityError: string | null;
  changes: PriceChange[];
  /** Rows with no cost yet: they keep today's price. */
  missing: number;
  /** Rows that make less than the profit asked for, or lose money, at the lowest price. */
  belowTarget: number;
  losses: number;
  /** Why Publish can't go ahead; null when it can. */
  blocked: string | null;
};

export function pricingPlan(doc: PricingDoc): PricingPlan {
  const { draft, published } = doc;
  const { rates, errors } = checkSettings(draft.settings);
  const rounding = draft.settings.rounding;
  const services = AI_SERVICES.map((s) =>
    priceRow(s.key, s.label, draft.services[s.key] ?? { cost: "", profit: "" }, published.services[s.key] ?? 0, rates, rounding, false),
  );
  const quality: QualityRow[] = QUALITY_LEVELS.map((l) => {
    const d = draft.quality[l.id];
    const row = priceRow(l.id, l.label, d, published.quality[l.id], rates, rounding, l.id === "free");
    const limit = checkNumber(d.dailyLimit, {
      min: 0,
      max: 1000,
      whole: true,
      required: "Enter 0 for no limit",
      range: "Enter 0 to 1000",
    });
    return {
      ...row,
      level: l.id,
      dailyLimit: limit.value,
      dailyLimitError: limit.error,
      currentDailyLimit: published.dailyLimits[l.id],
      enabled: d.enabled,
      currentEnabled: published.available[l.id],
    };
  });
  const qualityError = quality.some((q) => q.enabled) ? null : "Keep at least one level on, or makers can't start a build.";

  const custom = checkCustomCredit(draft.custom, published.custom);
  const packs = planPacks({
    draft: draft.packs,
    rules: draft.packRules,
    published: published.packs,
    creditUsd: rates?.creditUsd ?? null,
    maxBonusPct: rates?.maxBonusPct ?? null,
    minPurchase: custom.min,
    customOn: custom.enabled,
  });
  const rowErrors =
    [...services, ...quality].some((r) => r.costError || r.profitError) ||
    quality.some((q) => q.dailyLimitError) ||
    !!qualityError ||
    !!custom.minError ||
    !!custom.maxError;
  const changes: PriceChange[] = [];
  if (rates) {
    const money = (label: string, from: number, to: number, fmt: (n: number) => string) => {
      if (fmt(from) !== fmt(to)) changes.push({ label, from: fmt(from), to: fmt(to) });
    };
    money("1 credit in USD", published.creditUsd, rates.creditUsd, formatUsd);
    money("1 credit in USDT", published.usdtPerCredit, rates.usdtPerCredit, (n) => formatCoin(n, "USDT"));
    money("1 credit in IDZ", published.idzPerCredit, rates.idzPerCredit, (n) => formatCoin(n, "IDZ"));
    for (const r of services) {
      if (r.next !== null && r.next !== r.current)
        changes.push({
          label: r.label,
          from: formatCredits(r.current),
          to: formatCredits(r.next),
        });
    }
    for (const q of quality) {
      if (q.enabled !== q.currentEnabled)
        changes.push({ label: `${q.label} quality level`, from: formatOnOff(q.currentEnabled), to: formatOnOff(q.enabled) });
      if (q.level !== "free" && q.next !== null && q.next !== q.current) {
        changes.push({
          label: `${q.label} quality build`,
          from: formatCredits(q.current),
          to: formatCredits(q.next),
        });
      }
      if (q.dailyLimit !== null && q.dailyLimit !== q.currentDailyLimit) {
        changes.push({
          label: `${q.label} builds a day`,
          from: formatDailyLimit(q.currentDailyLimit),
          to: formatDailyLimit(q.dailyLimit),
        });
      }
    }
    const was = published.custom;
    if (custom.enabled !== was.enabled) changes.push({ label: "Custom credit", from: formatOnOff(was.enabled), to: formatOnOff(custom.enabled) });
    if (custom.min !== null && custom.min !== was.min)
      changes.push({ label: "Minimum purchase limit", from: formatCredits(was.min), to: formatCredits(custom.min) });
    if (custom.max !== null && custom.max !== was.max)
      changes.push({ label: "Maximum purchase limit", from: formatPurchaseMax(was.max), to: formatPurchaseMax(custom.max) });
    changes.push(...packChanges(packs, published.packs));
  }
  const all = [...services, ...quality.filter((q) => q.level !== "free")];
  return {
    rates,
    errors,
    services,
    quality,
    custom,
    packs,
    qualityError,
    changes,
    missing: all.filter((r) => r.status === "missing").length,
    belowTarget: all.filter((r) => r.status === "below-target").length,
    losses: all.filter((r) => r.status === "loss").length,
    blocked: !rates
      ? "Fix the credit value and markup settings first."
      : rowErrors
        ? "Fix the fields marked in red first."
        : packs.blocked
          ? "Fix the credit packs first."
          : changes.length === 0
          ? "Nothing has changed since the last publish."
          : null,
  };
}

/** What a publish was worked out on, in one line for the history. */
export function basisLine(settings: PricingSettings, rates: Rates): string {
  const at =
    settings.basis === "lowest"
      ? `the lowest effective credit price, ${formatUsd(rates.lowestCreditUsd)} a credit`
      : `the list price, ${formatUsd(rates.creditUsd)} a credit`;
  const step = settings.rounding === 1 ? "whole credits" : `steps of ${settings.rounding}`;
  return `${formatPercent(rates.profitPct)} markup at ${at}, rounded up to ${step}`;
}

/** The draft made live: today's prices become the plan's, and the publish
 *  heads the history. A plan that is blocked leaves the doc as it was. */
export function publishPricing(doc: PricingDoc, at: number, by: string): PricingDoc {
  const plan = pricingPlan(doc);
  if (plan.blocked || !plan.rates) return doc;
  const { rates } = plan;
  const published: PublishedPrices = {
    creditUsd: rates.creditUsd,
    usdtPerCredit: rates.usdtPerCredit,
    idzPerCredit: rates.idzPerCredit,
    services: Object.fromEntries(plan.services.map((r) => [r.id, r.next ?? r.current])),
    quality: levelRecord((l) => {
      const q = plan.quality.find((r) => r.level === l);
      return l === "free" ? 0 : (q?.next ?? doc.published.quality[l]);
    }),
    dailyLimits: levelRecord((l) => plan.quality.find((r) => r.level === l)?.dailyLimit ?? doc.published.dailyLimits[l]),
    available: levelRecord((l) => plan.quality.find((r) => r.level === l)?.enabled ?? doc.published.available[l]),
    custom: {
      enabled: plan.custom.enabled,
      min: plan.custom.min ?? doc.published.custom.min,
      max: plan.custom.max ?? doc.published.custom.max,
    },
    packs: publishedPacks(plan.packs, doc.published.packs),
  };
  const entry: HistoryEntry = {
    at,
    by,
    basis: basisLine(doc.draft.settings, rates),
    changes: plan.changes,
  };
  return {
    ...doc,
    published,
    history: [entry, ...doc.history].slice(0, HISTORY_MAX),
  };
}
