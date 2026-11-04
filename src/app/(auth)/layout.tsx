import * as React from "react";
import { HeroGlow } from "@/components/dashboard/hero-glow";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";

// Sign up and Sign in (the demo sign-in, lib/account/auth.ts): outside the app
// shell, one narrow column on Home's violet wash, the logo above it.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-bg-page font-sans text-text-primary">
      <HeroGlow />
      <main className="relative mx-auto flex w-full max-w-[464px] flex-col gap-[32px] px-[var(--layout-page-inset)] pb-[64px] pt-[56px]">
        <div className="flex justify-center">
          <IdeezaLogo height={36} />
        </div>
        {children}
      </main>
    </div>
  );
}
