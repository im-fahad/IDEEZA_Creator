"use client";

// Small pieces every Account screen shares (mobile Figma AU-*): the heading
// (Heading/H4, then Body/SM in text/secondary, 4 apart), the live password
// checklist, the M01 alert slot, and Splash.

import * as React from "react";
import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Banner, type BannerTone } from "@/components/ideeza/banner";
import { Spinner } from "@/components/ideeza/spinner";
import { phonePasswordChecks } from "@/lib/account/phone";
import { cn } from "@/lib/utils";

export function AccountHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-3xl font-semibold leading-3xl text-text-primary">{title}</h2>
      {children && <p className="text-md leading-md text-text-secondary [overflow-wrap:anywhere]">{children}</p>}
    </div>
  );
}

/** The Account screens' content column: 16 to the sides, 12 apart, 16 below. */
export const ACCOUNT_CONTENT = "flex flex-col gap-6 px-8 pb-8";

/** "Password checklist (live)": each rule ticks (icon and text success) as it is met. */
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} aria-label="Password rules" className="flex flex-col gap-2">
      {phonePasswordChecks(password).map((c) => (
        <li key={c.id} className={cn("flex items-center gap-4 text-sm leading-sm", c.met ? "text-text-success" : "text-text-secondary")}>
          <span className={c.met ? "text-[color:var(--color-icon-success)]" : "text-[color:var(--color-icon-secondary)]"}>
            <Icon icon={c.met ? CheckmarkCircle02Icon : CircleIcon} size={16} />
          </span>
          {c.label}
          <span className="sr-only">{c.met ? "(done)" : "(not yet)"}</span>
        </li>
      ))}
    </ul>
  );
}

export type AlertSpec = { tone: BannerTone; title: string; body: React.ReactNode; action?: React.ReactNode };

/** One M01 alert at a time, under the heading (never two errors at once, MFR-13). */
export function AccountAlert({ alert }: { alert: AlertSpec | null }) {
  if (!alert) return null;
  return (
    <Banner tone={alert.tone} title={alert.title} action={alert.action}>
      {alert.body}
    </Banner>
  );
}

/** AU-01 · Splash: the full logo and a brand spinner, while the app works out where to open
 *  (AU-04a adds "Signing you in…" under them). */
export function SplashBody({ text }: { text?: string }) {
  return (
    <div role="status" aria-label={text ?? "Opening IDEEZA"} className="flex flex-1 flex-col items-center justify-center gap-16 px-8 text-text-primary">
      <IdeezaLogo height={72} decorative />
      <Spinner size={16} />
      {text && <p className="text-md leading-md text-text-secondary">{text}</p>}
    </div>
  );
}
