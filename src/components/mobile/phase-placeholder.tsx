"use client";

// Prototype only: what a tab shows until its phase is built (M0 is the shell).
// Each phase replaces its tab's placeholder with the Figma screens.

import Link from "next/link";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { cn } from "@/lib/utils";
import { Screen } from "./screen";
import { TopBar } from "./top-bar";

export function PhasePlaceholder({ title, icon, phase }: { title: string; icon: IconValue; phase: string }) {
  return (
    <Screen top={<TopBar title={title} />} className="px-8 pb-8">
      <StateCard
        tone="empty"
        className="w-full"
        icon={<Icon icon={icon} size={32} />}
        title={`${title} is coming`}
        body={`This tab is built in phase ${phase}.`}
        action={
          <Link href="/m/kit" className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }))}>
            Open the shared kit
          </Link>
        }
      />
    </Screen>
  );
}
