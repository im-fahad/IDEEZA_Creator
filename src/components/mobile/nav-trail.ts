"use client";

// The screens this tab has moved through inside /m, so Back knows whether the
// previous history entry is still the app. `window.history.length` can't say:
// it counts pages from before the app (a search result, a chat link, the
// desktop page around the phone frame), so a deep link's Back used to leave
// IDEEZA, and a Back that pushed its parent made loops (project ⇄ My projects).
//
// The trail lives in sessionStorage (it survives a reload of the same tab) and
// follows the history itself: a pushState adds a screen, a replaceState swaps
// the top one, a popstate (Back, Forward) walks to where the browser went. A
// fresh page load starts a new trail, so Back on a deep link goes to the
// screen's parent, never out of the app.

import * as React from "react";
import { useRouter } from "next/navigation";

const KEY = "ideeza:m:trail";
const MAX = 50;

function read(): string[] {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(trail: string[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-MAX)));
  } catch {
    // Storage refused: Back falls back to each screen's parent.
  }
}

const here = () => window.location.pathname + window.location.search;
const inApp = (path: string) => path === "/m" || path.startsWith("/m/") || path.startsWith("/m?");

function pushed(path: string) {
  const t = read();
  if (t[t.length - 1] !== path) write([...t, path]);
}

function replaced(path: string) {
  const t = read();
  write([...t.slice(0, -1), path]);
}

function popped(path: string) {
  const t = read();
  if (t[t.length - 2] === path) return write(t.slice(0, -1));
  const at = t.lastIndexOf(path);
  write(at >= 0 ? t.slice(0, at + 1) : [...t, path]);
}

/** A fresh document: a reload keeps the trail, Back/Forward into it walks it, anything else starts over. */
function arrived(path: string) {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const t = read();
  if (nav?.type === "reload" && t[t.length - 1] === path) return;
  if (nav?.type === "back_forward" && t.includes(path)) return popped(path);
  write([path]);
}

let installed = false;

/** Mounted once by the /m root: starts following the history. */
export function useNavTrail(): void {
  React.useEffect(() => {
    if (installed) return;
    installed = true;
    arrived(here());
    const h = window.history;
    const push = h.pushState;
    const replace = h.replaceState;
    h.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
      const before = here();
      push.apply(this, args);
      const after = here();
      if (after !== before && inApp(after)) pushed(after);
    };
    h.replaceState = function (this: History, ...args: Parameters<History["replaceState"]>) {
      const before = here();
      replace.apply(this, args);
      const after = here();
      if (after !== before && inApp(after)) replaced(after);
    };
    window.addEventListener("popstate", () => {
      if (inApp(here())) popped(here());
    });
    // Installed for the life of the page: Next.js wraps these too, and unwrapping would drop its layer.
  }, []);
}

/** True when the previous history entry is a screen of this app. */
export function canGoBack(): boolean {
  return read().length > 1;
}

/** Back: the previous screen when there is one in the app, else `parent` in place of this one.
 *  Never pushes, so Back can't loop. For a hand-made header's ←; TopBar uses it. */
export function useGoBack(parent = "/m"): () => void {
  const router = useRouter();
  return React.useCallback(() => {
    if (canGoBack()) router.back();
    else router.replace(parent);
  }, [router, parent]);
}
