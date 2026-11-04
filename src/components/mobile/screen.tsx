"use client";

// One mobile screen, as every frame in the mobile Figma is laid out: the
// status bar, the screen's top bar, the content (the only part that scrolls)
// and what is pinned at the foot (a Bottom action bar). The home indicator
// closes it, unless the screen sits above the tab bar, which carries its own.

import * as React from "react";
import { cn } from "@/lib/utils";
import { useHasTabBar } from "./device";
import { HomeIndicator } from "./home-indicator";
import { FOOT_ATTR } from "./kit/toast";
import { StatusBar, type StatusTone } from "./status-bar";

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
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}>{children}</div>
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
