import * as React from "react";
import { HeroGlow } from "@/components/dashboard/hero-glow";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { AuthShowcase, AuthShowcaseCompact } from "@/components/auth/auth-showcase";

// Sign up and Sign in (the demo sign-in, lib/account/auth.ts): outside the app
// shell. The form on the left, the showcase beside it from `lg` (sticky, the
// height of the window); below `lg` its compact card above the form.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh w-full bg-bg-page font-sans text-text-primary lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="relative flex min-w-0 flex-col overflow-x-hidden">
        <div className="lg:hidden">
          <HeroGlow />
        </div>
        <header className="relative px-[var(--layout-page-inset)] pt-[24px] lg:px-[48px] lg:pt-[32px]">
          <IdeezaLogo height={32} />
        </header>
        <main className="relative mx-auto flex w-full max-w-[448px] flex-1 flex-col justify-center gap-[28px] px-[var(--layout-page-inset)] py-[40px] max-lg:justify-start max-lg:pt-[24px]">
          <div className="lg:hidden">
            <AuthShowcaseCompact />
          </div>
          {children}
        </main>
        <p className="relative m-0 px-[var(--layout-page-inset)] pb-[24px] text-sm leading-sm text-text-tertiary lg:px-[48px]">
          Demo: your account and your work stay in this browser.
        </p>
      </div>
      <aside aria-label="What IDEEZA does" className="hidden p-[16px] pl-0 lg:block">
        <div className="sticky top-[16px] h-[calc(100dvh-32px)] min-h-[640px]">
          <AuthShowcase />
        </div>
      </aside>
    </div>
  );
}
