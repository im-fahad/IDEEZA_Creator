"use client";

// Figma "Navbar Container" (3070:11343, variants Home · Earn Coin · Ai ·
// Message · Profile): the app's five tabs, in that order with the AI orb in
// the middle. bg/page with Elevation/4 — Overlay; a 64 px row padded 12 / 4,
// items spread. Each item is 48 wide: a 2 px border/focus line on top when
// it is the current tab, then the 24 px icon and its Caption/SM label 4
// apart — icon/default + text/secondary when current, icon/secondary +
// text/tertiary when not. The orb (48) has no label. Under the row: the home
// indicator (21) in the phone frame, the safe-area inset on a phone.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CoinsDollarIcon, Home09Icon, Message01Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { useAuth } from "@/lib/account/auth";
import { cn } from "@/lib/utils";
import { GuestGate } from "./account/guest-gate";
import { HomeIndicator } from "./home-indicator";
import { FOOT_ATTR } from "./kit/toast";

type Tab = {
  href: string;
  label: string;
  icon: IconValue | null;
  /** A guest (Explore first) browses Home only; the others ask them in (AU-03). */
  gate?: { title: string; description?: string };
};

export const TABS: readonly Tab[] = [
  { href: "/m", label: "Home", icon: Home09Icon },
  { href: "/m/earn", label: "Earn Coin", icon: CoinsDollarIcon, gate: { title: "Sign in to earn coins" } },
  {
    href: "/m/ai",
    label: "AI",
    icon: null,
    gate: { title: "Sign in to start a project", description: "Your idea is kept. You’ll come right back here." },
  },
  { href: "/m/messages", label: "Message", icon: Message01Icon, gate: { title: "Sign in to see your messages" } },
  { href: "/m/profile", label: "Profile", icon: UserCircleIcon, gate: { title: "Sign in to see your profile" } },
];

function isCurrent(href: string, pathname: string): boolean {
  if (href === "/m") return pathname === "/m";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();
  const { signedIn } = useAuth();
  const [gate, setGate] = React.useState<Tab | null>(null);
  return (
    <nav aria-label="Tabs" {...{ [FOOT_ATTR]: "" }} className="relative shrink-0 bg-bg-page shadow-overlay">
      <ul className="flex h-[64px] items-center justify-between px-6 py-2">
        {TABS.map((t) => {
          const current = isCurrent(t.href, pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={current ? "page" : undefined}
                aria-label={t.icon ? undefined : t.label}
                onClick={(e) => {
                  if (signedIn || !t.gate) return;
                  e.preventDefault();
                  setGate(t);
                }}
                className={cn(
                  "flex h-[56px] min-w-[48px] flex-col items-center justify-center gap-2 border-t-[length:var(--border-width-2)] border-solid outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  current ? "border-[var(--color-border-focus)]" : "border-transparent",
                )}
              >
                {t.icon ? (
                  <>
                    <span
                      className={cn(
                        current ? "text-[color:var(--color-icon-default)]" : "text-[color:var(--color-icon-secondary)]",
                      )}
                    >
                      <Icon icon={t.icon} size={24} />
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap text-xs leading-xs",
                        current ? "text-text-secondary" : "text-text-tertiary",
                      )}
                    >
                      {t.label}
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- the orb is a static brand mark
                  <img src="/m/ai-orb.svg" alt="" width={48} height={48} className="size-[48px]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <HomeIndicator />
      <GuestGate
        open={!!gate}
        onClose={() => setGate(null)}
        title={gate?.gate?.title ?? ""}
        description={gate?.gate?.description}
        next={gate?.href}
      />
    </nav>
  );
}
