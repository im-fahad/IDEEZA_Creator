"use client";

// The five tabs (Figma Navbar Container): the tab bar stays mounted while you
// move between them, and the screen above it scrolls on its own.

import { TabBarProvider } from "@/components/mobile/device";
import { TabBar } from "@/components/mobile/tab-bar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <TabBarProvider value>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">{children}</div>
        <TabBar />
      </div>
    </TabBarProvider>
  );
}
