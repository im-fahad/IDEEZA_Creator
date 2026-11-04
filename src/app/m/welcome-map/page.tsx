"use client";

// AU-18 · Welcome map (after setup; tour first): the web's five stages, the
// 8 free credits a new account starts with (lib/create/credits.tsx), and what
// a phone is for. Look around first is the primary; Start with my idea opens
// the AI tab.

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { AccountHeading } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Screen } from "@/components/mobile/screen";
import { mobileNext } from "@/lib/account/phone";

const STAGES = [
  { title: "Describe your idea", body: "In plain words, or start by hand." },
  { title: "See your concept", body: "AI draws each product; change it in plain words." },
  { title: "Build it", body: "AI makes the PCB, code, 3D model, assembly, wiring and parts list." },
  { title: "Make it yours", body: "Change anything in the editors." },
  { title: "Own it, sell it or share it", body: "Mint it as yours, sell it or copies, or show it off." },
];

export default function WelcomeMapPage() {
  const router = useRouter();
  const next = mobileNext(useSearchParams().get("next"));
  return (
    <Screen
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" onClick={() => router.replace(next)}>
            Look around first
          </Button>
          <Button hierarchy="ghost" size="xl" className="w-full" onClick={() => router.replace("/m/ai")}>
            Start with my idea
          </Button>
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-6 p-8">
        <AccountHeading title="Welcome to IDEEZA">
          Turn an idea into a real electronic product, with AI or by hand. You have 8 free credits to start. A concept uses 1.
        </AccountHeading>
        <ol className="flex flex-col gap-8">
          {STAGES.map((s, i) => (
            <li key={s.title} className="flex gap-6">
              <span aria-hidden className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-md bg-bg-brand-subtle text-md leading-md text-text-primary">
                {i + 1}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-semibold leading-lg text-text-primary">{s.title}</span>
                <span className="text-md leading-md text-text-secondary">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm leading-sm text-text-tertiary">
          On a phone you can send ideas, follow builds, sell and share. Editing a design needs a computer.
        </p>
      </div>
    </Screen>
  );
}
