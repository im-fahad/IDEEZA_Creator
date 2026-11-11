// Numbers as the admin types them and as the pricing pages show them: shared by
// the prices (credit-pricing.ts) and the credit packs (credit-packs.ts).
//
// Pure, relative imports only, so node:test can load it.

/** The most credits one price can be (the backend's PositiveIntegerField). */
export const MAX_CREDITS = 2_147_483_647;

// ── Numbers as typed ────────────────────────────────────────────────────────

/** A typed amount: digits with at most one decimal point. Null when empty or not a number. */
export function parseAmount(raw: string): number | null {
  const t = raw.trim();
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type Check = { value: number | null; error: string | null };

/** A typed number checked against a range; the error is what to show under the field. */
export function checkNumber(
  raw: string,
  rule: {
    min: number;
    max: number;
    minExclusive?: boolean;
    whole?: boolean;
    required: string;
    range: string;
  },
): Check {
  if (raw.trim() === "") return { value: null, error: rule.required };
  const n = parseAmount(raw);
  if (n === null) return { value: null, error: "Enter a number, like 0.04" };
  if (rule.whole && !Number.isInteger(n)) return { value: null, error: "Enter a whole number" };
  if ((rule.minExclusive ? n <= rule.min : n < rule.min) || n > rule.max) return { value: null, error: rule.range };
  return { value: n, error: null };
}

// ── Words and numbers on screen ─────────────────────────────────────────────

/** Trailing zeros off, but never fewer than `min` decimals. */
function trimDecimals(fixed: string, min: number): string {
  const [whole, frac = ""] = fixed.split(".");
  let f = frac.replace(/0+$/, "");
  while (f.length < min) f += "0";
  return f ? `${whole}.${f}` : whole;
}

/** Dollars: two decimals from a cent up, and below a cent enough decimals
 *  that the price still reads ($0.00318, not $0.00). */
export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a === 0) return "$0.00";
  if (a >= 1) return `${sign}$${a.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lead = Math.floor(-Math.log10(a));
  return `${sign}$${trimDecimals(a.toFixed(Math.min(8, Math.max(2, lead + 3))), 2)}`;
}

/** A coin amount the same way, with its symbol after it. */
export function formatCoin(n: number, coin: "USDT" | "IDZ"): string {
  return `${formatUsd(n).replace("$", "")} ${coin}`;
}

export function formatCredits(n: number): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? "credit" : "credits"}`;
}

export function formatPercent(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r < 0 ? "−" : ""}${Math.abs(r)}%`;
}

export function formatDailyLimit(n: number): string {
  return n === 0 ? "No limit" : `${n} a day`;
}

/** The most credits a purchase may be: 0 is no limit. */
export function formatPurchaseMax(n: number): string {
  return n === 0 ? "No limit" : formatCredits(n);
}

export function formatOnOff(on: boolean): string {
  return on ? "On" : "Off";
}

/** How many credits one unit of a currency buys, as Base Settings showed it ("$1 = 314.47 credits"). */
export function creditsPerUnit(perCredit: number): string {
  return Number.isFinite(perCredit) && perCredit > 0 ? (1 / perCredit).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
}
