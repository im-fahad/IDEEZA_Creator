// The phone's Notification screen (mobile Figma, Design - Light Mode ›
// Notification) over the web's notices (sources.ts, the bell's one list):
// - All and Unread; All puts what is unread under "New", then what was read by
//   day (Today, Yesterday, then the date); Unread lists by day;
// - each notice's button says what it does there ("Try again", "Reply",
//   "View sale"), and leads to the phone's own screen for it;
// - Delete this notification and Clear all take notices off this phone's list
//   (the web's bell keeps every record; the phone keeps what it cleared under
//   `ideeza:m:notifications:cleared`).
// Pure, relative imports only.

import type { Notice } from "./types";

export const NOTICE_CLEARED_KEY = "ideeza:m:notifications:cleared";
export const CLEARED_MAX = 1000;

/** What this phone took off its list: single notices, and everything up to a moment (Clear all). */
export type Cleared = { v: 1; ids: string[]; before: number | null };

export const NOTHING_CLEARED: Cleared = { v: 1, ids: [], before: null };

export function clearedIn(value: unknown): Cleared {
  if (typeof value !== "object" || value === null) return NOTHING_CLEARED;
  const r = value as Record<string, unknown>;
  const list = Array.isArray(r.ids) ? [...new Set(r.ids.filter((x): x is string => typeof x === "string" && x.length > 0))] : [];
  return { v: 1, ids: list.slice(-CLEARED_MAX), before: typeof r.before === "number" && Number.isFinite(r.before) ? r.before : null };
}

export const isCleared = (n: Pick<Notice, "id" | "at">, c: Cleared) => c.ids.includes(n.id) || (c.before !== null && n.at <= c.before);

export function withClearedId(c: Cleared, id: string): Cleared {
  return c.ids.includes(id) ? c : { ...c, ids: [...c.ids, id].slice(-CLEARED_MAX) };
}

/** Clear all: everything that has happened up to `now`; what comes later still arrives. */
export function withAllCleared(c: Cleared, now: number): Cleared {
  return { v: 1, ids: [], before: Math.max(now, c.before ?? 0) };
}

// ─────────────────────────── groups ───────────────────────────

export type PhoneTab = "all" | "unread";

export type PhoneGroup = { key: string; label: string; notices: Notice[] };

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "27 December, 2024" (the Figma's date), on this device's calendar. */
export function longDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "long" })}, ${d.getFullYear()}`;
}

/** "27 December, 2024 12:44". */
export function noticeTime(ms: number): string {
  const d = new Date(ms);
  return `${longDate(ms)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "Today", "Yesterday", else the date (`date` writes it: Settings › Language's format in the app). */
export function dayLabelOf(day: number, now: number, date: (ms: number) => string = longDate): string {
  const today = startOfDay(now);
  if (day === today) return "Today";
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (day === y.getTime()) return "Yesterday";
  return date(day);
}

function byDay(list: readonly Notice[], now: number, date?: (ms: number) => string): PhoneGroup[] {
  const groups: PhoneGroup[] = [];
  for (const n of list) {
    const day = startOfDay(n.at);
    const last = groups[groups.length - 1];
    if (last && last.key === String(day)) last.notices.push(n);
    else groups.push({ key: String(day), label: dayLabelOf(day, now, date), notices: [n] });
  }
  return groups;
}

/** The list under its headings. `list` is newest first and already without what was cleared. */
export function phoneGroups(
  list: readonly Notice[],
  isRead: (n: Notice) => boolean,
  tab: PhoneTab,
  now: number,
  date?: (ms: number) => string,
): PhoneGroup[] {
  const unread = list.filter((n) => !isRead(n));
  if (tab === "unread") return byDay(unread, now, date);
  const read = list.filter((n) => isRead(n));
  return [...(unread.length ? [{ key: "new", label: "New", notices: unread }] : []), ...byDay(read, now, date)];
}

// ─────────────────────────── what each notice offers ───────────────────────────

/** The notice's button, by what it is (its id says: "build:…:retry", "sale:…"). */
export function actionLabelOf(n: Pick<Notice, "id" | "kind">): string {
  const [type, , reason] = n.id.split(":");
  switch (type) {
    case "build":
      return reason === "retry" ? "Try again" : reason === "credits" ? "Buy credits" : reason === "cap" ? "See limits" : "Review build";
    case "msg":
      return "Reply";
    case "req":
      return "See request";
    case "team":
      return "Open chat";
    case "sale":
      return "View sale";
    case "bid":
      return "View bids";
    case "auction":
      return "View auction";
    case "coin":
      return n.id.startsWith("coin:plan") ? "See plan" : "Buy credits";
    case "payout":
      return "See Get paid";
    case "video":
      return "Watch video";
    case "comment":
      return "View comment";
    case "blog":
      return "Read";
    default:
      return "Open";
  }
}

/** The phone's screen for a notice: its project or product details, Messages, the AI tab,
 *  Earn Coin, Settings, or a blog. `href` is the web address the notice carries. */
export function phoneHrefOf(n: Pick<Notice, "href" | "projectId">): string {
  const path = n.href.split(/[?#]/)[0];
  const product = /^\/projects\/([^/]+)\/products\/([^/]+)/.exec(path);
  if (product) return `/m/projects/${product[1]}/products/${product[2]}`;
  const project = /^\/projects\/([^/]+)/.exec(path);
  if (project) return `/m/projects/${project[1]}${/\/earn/.test(path) ? "?tab=marketplace" : ""}`;
  if (path.startsWith("/innovations/")) return n.projectId ? `/m/projects/${encodeURIComponent(n.projectId)}` : "/m";
  if (path.startsWith("/messages")) return "/m/messages";
  if (path.startsWith("/chat/") || path.startsWith("/build/")) return "/m/ai";
  const blog = /^\/blog\/([^/]+)/.exec(path);
  if (blog) return `/m/blog/${blog[1]}`;
  if (path.startsWith("/settings/plan")) return "/m/earn";
  if (path.startsWith("/settings")) return "/m/settings";
  return "/m";
}
