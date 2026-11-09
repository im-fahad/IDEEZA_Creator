// Marketplace activity on the phone (mobile Figma "Feed · 2026 update",
// Marketplace activities, opened from the Feed's activity button): the sales
// this browser's marketplace recorded (market-store.tsx), as the week's
// average price and volume in dollars at the demo rate (one rule for the app,
// lib/account/payout.ts), the sales of each of the last 30 days, and the
// sales themselves, newest first. Pure, relative imports only.

import { centsFloor, usdOf } from "../account/payout";
import { formatAmount } from "../wallet/money";
import type { Sale } from "./types";

const DAY = 86_400_000;
export const CHART_DAYS = 30;

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

type SaleLike = Pick<Sale, "id" | "projectId" | "at" | "item" | "token" | "price" | "sellerAddress" | "buyerAddress" | "tokenId">;

const usd = (s: SaleLike) => Number(centsFloor(usdOf(s.price, s.token))) || 0;

/** The last seven days: how many sold, their dollars, and the average sale (null with none). */
export function weekStats(sales: readonly SaleLike[], now: number): { count: number; volumeUsd: number; averageUsd: number | null } {
  const week = sales.filter((s) => s.at <= now && now - s.at < 7 * DAY);
  const volumeUsd = Math.round(week.reduce((sum, s) => sum + usd(s), 0) * 100) / 100;
  return { count: week.length, volumeUsd, averageUsd: week.length ? Math.round((volumeUsd / week.length) * 100) / 100 : null };
}

/** "$1,459.99". */
export function dollars(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Sales per day, oldest first, ending today. */
export function dailySales(sales: readonly SaleLike[], now: number, days = CHART_DAYS): { day: number; count: number }[] {
  const today = startOfDay(now);
  const out = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return { day: d.getTime(), count: 0 };
  });
  for (const s of sales) {
    const day = startOfDay(s.at);
    const slot = out.find((x) => x.day === day);
    if (slot) slot.count += 1;
  }
  return out;
}

/** A round top for the chart's scale (at least 4, then the next even number up). */
export function chartTop(series: readonly { count: number }[]): number {
  const max = Math.max(0, ...series.map((s) => s.count));
  return Math.max(4, max + (max % 2));
}

/** The chart's points in a `w` × `h` box, x by day, y by count (0 at the bottom). */
export function chartPoints(series: readonly { count: number }[], w: number, h: number): { x: number; y: number }[] {
  const top = chartTop(series);
  const step = series.length > 1 ? w / (series.length - 1) : 0;
  return series.map((s, i) => ({ x: Math.round(i * step * 10) / 10, y: Math.round((h - (s.count / top) * h) * 10) / 10 }));
}

const short = (a: string) => (a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

export type ActivityRow = {
  id: string;
  projectId: string;
  nft: "main" | "physical" | "virtual";
  /** "#12" once minted. */
  token: string | null;
  from: string;
  to: string;
  price: string;
  usd: string;
  at: number;
};

/** The sales, newest first, as the list shows them. */
export function activityRows(sales: readonly SaleLike[]): ActivityRow[] {
  return sales
    .slice()
    .sort((a, b) => b.at - a.at)
    .map((s) => ({
      id: s.id,
      projectId: s.projectId,
      nft: s.item.nft,
      token: s.tokenId === null ? null : `#${s.tokenId}`,
      from: short(s.sellerAddress),
      to: short(s.buyerAddress),
      price: formatAmount(s.price, s.token),
      usd: dollars(usd(s)),
      at: s.at,
    }));
}
