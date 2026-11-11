"use client";

// The admin's own chrome (prototype, owner 2026-11-10): the IDEEZA logo with
// an Admin tag, the admin's pages and the way back to the app. The admin pages
// sit outside the app shell (`components/dashboard/app-shell.tsx`), so a maker's
// sidebar never shows here. From `md` it is a sidebar the width of the app's;
// below it, a bar over the page.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft01Icon, CoinsDollarIcon, PackageIcon } from "@hugeicons/core-free-icons";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { useAuth } from "@/lib/account/auth";
import { cn } from "@/lib/utils";

const NAV: readonly { href: string; label: string; icon: IconValue }[] = [
  {
    href: "/admin/ai-credits",
    label: "AI credit pricing",
    icon: CoinsDollarIcon,
  },
  {
    href: "/admin/credit-packs",
    label: "Credit packs",
    icon: PackageIcon,
  },
];

const ROW =
  "flex h-[32px] items-center gap-[12px] rounded-md px-[10px] text-md leading-md text-text-primary outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";

export function AdminSidebar() {
  const pathname = usePathname();
  const { account } = useAuth();
  // Whose name a publish records: the demo admin's unless someone else was signed in.
  const signedInAs = account ? `${account.firstName} ${account.lastName}`.trim() || account.email : "";
  return (
    <aside
      aria-label="Admin"
      className="flex shrink-0 flex-col gap-6 border-b border-solid border-border bg-bg-page px-8 py-6 md:h-full md:w-[var(--layout-sidebar)] md:gap-12 md:border-b-0 md:border-r md:px-6 md:py-8"
    >
      <div className="flex items-center justify-between gap-4 md:px-[10px]">
        <Link
          href="/admin/ai-credits"
          className="inline-flex items-center gap-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <IdeezaLogo height={22} />
          <Badge tone="neutral">Admin</Badge>
        </Link>
        <Link href="/" className={cn(ROW, "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary md:hidden")}>
          <Icon icon={ArrowLeft01Icon} />
          <span>Back to IDEEZA</span>
        </Link>
      </div>
      <nav aria-label="Admin pages" className="md:flex-1">
        <ul className="m-0 flex list-none gap-2 p-0 md:flex-col">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(ROW, active ? "bg-bg-surface-raised font-medium" : "font-regular hover:bg-bg-surface-raised")}
                >
                  <Icon icon={item.icon} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="hidden flex-col gap-4 md:flex">
        <p className="m-0 px-[10px] text-sm leading-sm text-text-tertiary">
          Prototype: prices are kept in this browser and reach no maker.
        </p>
        {signedInAs ? <p className="m-0 truncate px-[10px] text-sm leading-sm text-text-tertiary">Signed in as {signedInAs}</p> : null}
        <Link href="/" className={cn(ROW, "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary")}>
          <Icon icon={ArrowLeft01Icon} />
          <span>Back to IDEEZA</span>
        </Link>
      </div>
    </aside>
  );
}
