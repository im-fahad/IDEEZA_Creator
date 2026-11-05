"use client";

// One mobile screen, as every frame in the mobile Figma is laid out: the
// status bar, the screen's top bar, the content (the only part that scrolls)
// and what is pinned at the foot (a Bottom action bar). The home indicator
// closes it, unless the screen sits above the tab bar, which carries its own.

import * as React from "react";
import { cn } from "@/lib/utils";
import { SplashBody } from "./account/parts";
import { useHasTabBar } from "./device";
import { HomeIndicator } from "./home-indicator";
import { FOOT_ATTR } from "./kit/toast";
import { StatusBar, type StatusTone } from "./status-bar";

/** On the screen's scrolling content: what a tap on the current tab scrolls to the top. */
export const SCROLL_ATTR = "data-m-scroll";

export function Screen({
  top,
  footer,
  status = "default",
  className,
  children,
}: {
  top?: React.ReactNode;
  footer?: React.ReactNode;
  status?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  const tabBar = useHasTabBar();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <StatusBar tone={status} />
      {top}
      <div {...{ [SCROLL_ATTR]: "" }} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}>
        {children}
      </div>
      {footer && (
        <div {...{ [FOOT_ATTR]: "" }} className="shrink-0">
          {footer}
        </div>
      )}
      {!tabBar && (
        <div {...{ [FOOT_ATTR]: "" }} className="shrink-0">
          <HomeIndicator />
        </div>
      )}
    </div>
  );
}

/** AU-01 Splash: the logo held at the screen's centre whatever the bars around it,
 *  so it doesn't jump when the app takes over from the page's first paint. */
export function SplashScreen() {
  return (
    <div className="relative flex h-full flex-col">
      <StatusBar />
      <div className="absolute inset-0 flex flex-col">
        <SplashBody />
      </div>
      <div className="flex-1" />
      <HomeIndicator />
    </div>
  );
}
