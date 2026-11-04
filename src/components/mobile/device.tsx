"use client";

// Where the mobile prototype is running. On a phone it fills the screen; on a
// desktop the /m layout draws a phone (375 × 812, the Figma frame) holding
// the same page in an iframe, so the page inside always has a phone's width —
// the DS tokens' phone values, real `position: fixed`, real scrolling — and
// what the desktop shows is exactly what the phone shows.
//
// `framed` (inside that iframe) also draws the phone's own chrome the OS draws
// on a real device: the status bar and the home indicator.

import * as React from "react";

export type DeviceMode = "pending" | "desktop" | "framed" | "phone";

/** The web's own phone/desktop switch (tokens.css overrides below 768 px). */
const WIDE = "(min-width: 768px)";

/** The iframe tells the desktop page its path, so the address bar follows it. */
export const PATH_MESSAGE = "ideeza:m:path";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function inFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function snapshot(): DeviceMode {
  if (inFrame()) return "framed";
  return window.matchMedia(WIDE).matches ? "desktop" : "phone";
}

export function useDeviceMode(): DeviceMode {
  return React.useSyncExternalStore(subscribe, snapshot, () => "pending");
}

const FramedContext = React.createContext(false);
export const FramedProvider = FramedContext.Provider;

/** True inside the desktop's phone frame: draw the status bar and home indicator. */
export function useFramed(): boolean {
  return React.useContext(FramedContext);
}

/** Set by the tab layout: the tab bar sits at the foot, so a screen draws no
 *  home indicator of its own and a toast stands above the bar. */
const TabBarContext = React.createContext(false);
export const TabBarProvider = TabBarContext.Provider;

export function useHasTabBar(): boolean {
  return React.useContext(TabBarContext);
}
