// Credit packs, the admin's side (owner, 2026-11-11): the admin names a pack
// and sets its price, and its credits follow:
//
//   base  = the price at the credit's list price, rounded down to the step
//   bonus = base × the bonus of the tier the price reaches, rounded down to the step
//   total = base + bonus
//
// Rounded down, never up, so a pack's credits never cost less than the list
// price less its bonus. No tier can go above the maximum pack bonus the AI
// prices are worked out with (credit-pricing.ts), so every price keeps its
// markup when it's paid with a pack's credits too.
//
// The live admin (Admin › AI Credit System › Credit Packs) has the admin type
// a pack's base and bonus credits by hand; its rules are kept here: a pack
// holds at least 10 base credits (`CREDIT_PACK_MIN_BASE_CREDITS`) and never
// fewer than the minimum purchase (PR-8937), one pack at most is the most
// popular, and a hidden pack isn't sold.
//
// Pure, relative imports only, so node:test can load it.

import { checkNumber, formatCredits, formatUsd, MAX_CREDITS, type Check } from "./credit-format";

export type PackStep = 1 | 10 | 50 | 100;
export const PACK_STEPS: readonly PackStep[] = [1, 10, 50, 100];

/** The live admin's least base credits a pack can hold. */
export const PACK_MIN_BASE = 10;
export const PACK_MAX = 12;
export const PACK_NAME_MAX = 32;
export const PACK_PRICE_MAX = 10_000;
export const TIER_MAX = 6;

/** A pack as the admin typed it. */
export type PackDraft = { id: string; name: string; price: string; visible: boolean; popular: boolean };
/** Packs from `from` dollars get `pct` percent bonus credits. The first tier is from $0. */
export type BonusTierDraft = { from: string; pct: string };
export type PackRulesDraft = { tiers: BonusTierDraft[]; step: PackStep };

/** A pack as makers have it: the last publish. */
export type Pack = { id: string; name: string; priceUsd: number; base: number; bonus: number; visible: boolean; popular: boolean };

// ── The rules ───────────────────────────────────────────────────────────────

export type TierRow = { from: number | null; fromError: string | null; pct: number | null; pctError: string | null };

/** Dollars and cents, more than 0 and up to $10,000. */
export function checkPrice(raw: string, required: string): Check {
  const c = checkNumber(raw, {
    min: 0,
    max: PACK_PRICE_MAX,
    minExclusive: true,
    required,
    range: `Enter more than $0, up to ${formatUsd(PACK_PRICE_MAX)}`,
  });
  if (c.value !== null && Math.abs(Math.round(c.value * 100) - c.value * 100) > 1e-6) {
    return { value: null, error: "Enter dollars and cents, like 9.99" };
  }
  return c;
}

/** Each tier from more dollars than the one before it, its bonus no smaller,
 *  and none above the maximum pack bonus (null while that setting is wrong). */
export function checkTiers(tiers: readonly BonusTierDraft[], maxBonusPct: number | null): TierRow[] {
  const rows: TierRow[] = [];
  tiers.forEach((t, i) => {
    const prev = rows[i - 1];
    let from: Check = i === 0 ? { value: 0, error: null } : checkPrice(t.from, "Enter a price");
    if (i > 0 && from.value !== null && prev?.from != null && from.value <= prev.from) {
      from = { value: null, error: `Enter more than ${formatUsd(prev.from)}, the tier above` };
    }
    const cap = maxBonusPct ?? 500;
    let pct = checkNumber(t.pct, {
      min: 0,
      max: cap,
      required: "Enter a percent",
      range: maxBonusPct === null ? "Enter 0 to 500" : `Enter 0 to ${cap}: the maximum pack bonus is ${cap}%`,
    });
    if (pct.value !== null && prev?.pct != null && pct.value < prev.pct) {
      pct = { value: null, error: `Enter ${prev.pct} or more: a bigger pack never gets a smaller bonus` };
    }
    rows.push({ from: from.value, fromError: from.error, pct: pct.value, pctError: pct.error });
  });
  return rows;
}

const tiersOk = (rows: readonly TierRow[]) => rows.length > 0 && rows.every((r) => !r.fromError && !r.pctError);

/** The bonus of the last tier a price reaches. */
export function bonusPctFor(priceUsd: number, tiers: readonly TierRow[]): number {
  let pct = 0;
  for (const t of tiers) if (t.from !== null && t.pct !== null && priceUsd >= t.from - 1e-9) pct = t.pct;
  return pct;
}

/** Down to a step; a float a hair under a whole step (999.9999999) is that step. */
function floorTo(n: number, step: number): number {
  const units = n / step;
  const near = Math.round(units);
  return (Math.abs(units - near) <= 1e-9 * Math.max(1, units) ? near : Math.floor(units)) * step;
}

/** A pack's credits for its price. */
export function packCredits(priceUsd: number, creditUsd: number, bonusPct: number, step: PackStep): { base: number; bonus: number } {
  const base = floorTo(priceUsd / creditUsd, step);
  return { base, bonus: floorTo((base * bonusPct) / 100, step) };
}

/** The least price, in cents, whose base credits reach `minBase`. */
export function minPriceFor(minBase: number, creditUsd: number, step: PackStep): number {
  const steps = Math.ceil(minBase / step) * step;
  let cents = Math.ceil(steps * creditUsd * 100 - 1e-6);
  while (floorTo(cents / 100 / creditUsd, step) < minBase) cents += 1;
  return cents / 100;
}

// ── The packs ───────────────────────────────────────────────────────────────

export type PackStatus = "new" | "changed" | "same";

export type PackRow = {
  id: string;
  /** Trimmed. */
  name: string;
  nameError: string | null;
  price: number | null;
  priceError: string | null;
  base: number | null;
  bonus: number | null;
  bonusPct: number | null;
  total: number | null;
  perCreditUsd: number | null;
  /** How much less a credit costs in this pack than at list price. */
  offListPct: number | null;
  visible: boolean;
  popular: boolean;
  /** Fewer base credits than a pack may hold, with the price that would reach it. */
  belowMin: { minBase: number; minPrice: number } | null;
  /** `belowMin` on a pack makers can see: Publish waits. */
  minError: string | null;
  current: Pack | null;
  status: PackStatus;
};

export type PacksPlan = {
  /** Cheapest first; a pack with no price yet last. */
  rows: PackRow[];
  tiers: TierRow[];
  step: PackStep;
  /** Published packs the draft no longer has. */
  removed: Pack[];
  /** The least base credits a pack can hold: 10, or the minimum purchase when that's more. */
  minBase: number;
  /** Nothing makers could buy credits with. */
  error: string | null;
  /** Any field or rule wrong: the packs' changes wait. */
  blocked: boolean;
};

export type PacksInput = {
  draft: readonly PackDraft[];
  rules: PackRulesDraft;
  published: readonly Pack[];
  /** Null while the credit's price is wrong. */
  creditUsd: number | null;
  maxBonusPct: number | null;
  /** The custom credit minimum, null while it's wrong. */
  minPurchase: number | null;
  customOn: boolean;
};

const sameDeal = (a: Pack, b: { name: string; price: number; base: number; bonus: number }) =>
  a.name === b.name && Math.abs(a.priceUsd - b.price) < 1e-9 && a.base === b.base && a.bonus === b.bonus;

export function planPacks(input: PacksInput): PacksPlan {
  const { draft, rules, published, creditUsd, maxBonusPct, minPurchase, customOn } = input;
  const tiers = checkTiers(rules.tiers, maxBonusPct);
  const canCount = creditUsd !== null && tiersOk(tiers);
  const minBase = Math.max(PACK_MIN_BASE, minPurchase ?? 0);
  const names = new Map<string, number>();
  for (const p of draft) {
    const key = p.name.trim().toLowerCase();
    if (key) names.set(key, (names.get(key) ?? 0) + 1);
  }
  const order = new Map(draft.map((p, i) => [p.id, i]));
  const rows = draft.map((p): PackRow => {
    const name = p.name.trim();
    const nameError = !name
      ? "Enter a name"
      : name.length > PACK_NAME_MAX
        ? `Use ${PACK_NAME_MAX} characters or fewer`
        : (names.get(name.toLowerCase()) ?? 0) > 1
          ? "Another pack has this name"
          : null;
    const price = checkPrice(p.price, "Enter a price");
    const current = published.find((x) => x.id === p.id) ?? null;
    const row: PackRow = {
      id: p.id,
      name,
      nameError,
      price: price.value,
      priceError: price.error,
      base: null,
      bonus: null,
      bonusPct: null,
      total: null,
      perCreditUsd: null,
      offListPct: null,
      visible: p.visible,
      popular: p.popular,
      belowMin: null,
      minError: null,
      current,
      status: current ? "same" : "new",
    };
    if (price.value === null || !canCount || creditUsd === null) return row;
    const bonusPct = bonusPctFor(price.value, tiers);
    const { base, bonus } = packCredits(price.value, creditUsd, bonusPct, rules.step);
    if (base + bonus > MAX_CREDITS) return { ...row, priceError: "More credits than a pack can hold" };
    const total = base + bonus;
    const perCreditUsd = total > 0 ? price.value / total : null;
    const belowMin = base < minBase ? { minBase, minPrice: minPriceFor(minBase, creditUsd, rules.step) } : null;
    const why = minBase > PACK_MIN_BASE ? "the minimum purchase" : "the least a pack can hold";
    return {
      ...row,
      base,
      bonus,
      bonusPct,
      total,
      perCreditUsd,
      offListPct: perCreditUsd !== null ? (1 - perCreditUsd / creditUsd) * 100 : null,
      belowMin,
      minError:
        belowMin && p.visible
          ? `Fewer than ${formatCredits(minBase)}, ${why}. Raise the price to ${formatUsd(belowMin.minPrice)} or more, or hide the pack.`
          : null,
      status:
        current && sameDeal(current, { name, price: price.value, base, bonus }) && current.visible === p.visible && current.popular === p.popular
          ? "same"
          : current
            ? "changed"
            : "new",
    };
  });
  rows.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const ids = new Set(draft.map((p) => p.id));
  const error = customOn || rows.some((r) => r.visible) ? null : "Makers can't buy credits: show a pack, or turn Custom credit on.";
  const blocked =
    !tiersOk(tiers) || !!error || rows.some((r) => r.nameError || r.priceError || r.minError || (r.price !== null && canCount && r.total === null));
  return {
    rows,
    tiers,
    step: rules.step,
    removed: published.filter((p) => !ids.has(p.id)),
    minBase,
    error,
    blocked,
  };
}

/** "$10.00 for 3,290 credits" */
export function formatDeal(priceUsd: number, total: number): string {
  return `${formatUsd(priceUsd)} for ${formatCredits(total)}`;
}

const shown = (visible: boolean) => (visible ? "Shown" : "Hidden");

/** What Publish would change for makers, in the words of the change list. */
export function packChanges(plan: PacksPlan, published: readonly Pack[]): { label: string; from: string; to: string }[] {
  if (plan.blocked) return [];
  const out: { label: string; from: string; to: string }[] = [];
  for (const r of plan.rows) {
    if (r.price === null || r.base === null || r.bonus === null || r.total === null) continue;
    const deal = formatDeal(r.price, r.total);
    const was = r.current;
    if (!was) {
      out.push({ label: `${r.name} pack`, from: "Not sold", to: r.visible ? deal : `${deal}, hidden` });
      continue;
    }
    if (was.name !== r.name) out.push({ label: "Pack name", from: was.name, to: r.name });
    if (Math.abs(was.priceUsd - r.price) > 1e-9 || was.base !== r.base || was.bonus !== r.bonus) {
      out.push({ label: `${r.name} pack`, from: formatDeal(was.priceUsd, was.base + was.bonus), to: deal });
    }
    if (was.visible !== r.visible) out.push({ label: `${r.name} pack`, from: shown(was.visible), to: shown(r.visible) });
  }
  for (const p of plan.removed) out.push({ label: `${p.name} pack`, from: formatDeal(p.priceUsd, p.base + p.bonus), to: "Removed" });
  const wasPopular = published.find((p) => p.popular);
  const nowPopular = plan.rows.find((r) => r.popular);
  if ((wasPopular?.id ?? null) !== (nowPopular?.id ?? null)) {
    out.push({ label: "Most popular pack", from: wasPopular?.name ?? "None", to: nowPopular?.name ?? "None" });
  }
  return out;
}

/** The packs makers get on Publish: the plan's, which has no wrong field then. */
export function publishedPacks(plan: PacksPlan, before: readonly Pack[]): Pack[] {
  if (plan.blocked) return [...before];
  return plan.rows.flatMap((r) =>
    r.price !== null && r.base !== null && r.bonus !== null
      ? [{ id: r.id, name: r.name, priceUsd: r.price, base: r.base, bonus: r.bonus, visible: r.visible, popular: r.popular }]
      : [],
  );
}

/** A pack id no other pack has. */
export function newPackId(taken: readonly string[], now: number): string {
  let id = `pack-${now.toString(36)}`;
  for (let i = 2; taken.includes(id); i += 1) id = `pack-${now.toString(36)}-${i}`;
  return id;
}

/** One pack the most popular, or none: choosing one clears the rest. */
export function withPopular(packs: readonly PackDraft[], id: string | null): PackDraft[] {
  return packs.map((p) => ({ ...p, popular: p.id === id }));
}

// ── Reading what was stored ─────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string | null => (typeof v === "string" ? v.slice(0, max) : null);
const whole = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_CREDITS ? v : null);

/** Packs as typed. Not a list is `fallback`; a broken entry is dropped, an id
 *  twice keeps the first, and only the first popular one stays popular. */
export function readPackDrafts(raw: unknown, fallback: PackDraft[]): PackDraft[] {
  if (!Array.isArray(raw)) return fallback;
  const seen = new Set<string>();
  let popular = false;
  const out: PackDraft[] = [];
  for (const item of raw.slice(0, PACK_MAX)) {
    if (!isObj(item)) continue;
    const id = str(item.id, 40);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const isPopular: boolean = item.popular === true && !popular;
    popular ||= isPopular;
    out.push({
      id,
      name: str(item.name, 64) ?? "",
      price: str(item.price, 16) ?? "",
      visible: typeof item.visible === "boolean" ? item.visible : true,
      popular: isPopular,
    });
  }
  return out;
}

export function readPackRules(raw: unknown, fallback: PackRulesDraft): PackRulesDraft {
  if (!isObj(raw)) return fallback;
  const tiers = Array.isArray(raw.tiers)
    ? raw.tiers
        .slice(0, TIER_MAX)
        .filter(isObj)
        .map((t, i) => ({ from: i === 0 ? "0" : (str(t.from, 16) ?? ""), pct: str(t.pct, 16) ?? "" }))
    : [];
  return {
    tiers: tiers.length > 0 ? tiers : fallback.tiers,
    step: PACK_STEPS.includes(raw.step as PackStep) ? (raw.step as PackStep) : fallback.step,
  };
}

/** Published packs: a broken entry is dropped. Not a list is `fallback`. */
export function readPacks(raw: unknown, fallback: Pack[]): Pack[] {
  if (!Array.isArray(raw)) return fallback;
  const seen = new Set<string>();
  let popular = false;
  return raw.slice(0, PACK_MAX).flatMap((item): Pack[] => {
    if (!isObj(item)) return [];
    const id = str(item.id, 40);
    const name = str(item.name, 64);
    const base = whole(item.base);
    const bonus = whole(item.bonus);
    const price = typeof item.priceUsd === "number" && Number.isFinite(item.priceUsd) && item.priceUsd > 0 ? item.priceUsd : null;
    if (!id || seen.has(id) || !name || base === null || bonus === null || price === null) return [];
    seen.add(id);
    const isPopular: boolean = item.popular === true && !popular;
    popular ||= isPopular;
    return [{ id, name, priceUsd: price, base, bonus, visible: item.visible !== false, popular: isPopular }];
  });
}
