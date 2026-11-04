"use client";

// The sign-in pages' showcase (owner 2026-11-04: the front door of an AI
// platform should look like one, not a bare form): beside the form from `lg`,
// what IDEEZA does in one picture — an idea typed in, the concept it became,
// what the build delivers — over the brand's deep violet. Three real examples
// from the Innovations art take turns; under reduced motion the first stays.

import * as React from "react";
import Image from "next/image";
import { AiMagicIcon, BlockchainIcon, CheckmarkCircle02Icon, SecurityCheckIcon, SparklesIcon, Store01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { DELIVERABLE_ICON } from "@/components/dashboard/deliverable-icon";
import { ITEM_KINDS, ITEM_LABELS } from "@/lib/create/history";
import { motionReduced } from "@/lib/settings/appearance";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  {
    prompt: "A smart plant-watering hub that texts me when the soil gets dry",
    name: "Smart plant-watering hub",
    image: "/innovations/smart-plant-watering-hub.png",
  },
  {
    prompt: "A solar weather station that reports over LoRa from my roof",
    name: "LoRa weather station",
    image: "/innovations/lora-weather-station.png",
  },
  {
    prompt: "An e-ink smartwatch that lasts a whole week on one charge",
    name: "E-ink smartwatch",
    image: "/innovations/e-ink-smartwatch.png",
  },
] as const;

const TURN_MS = 5000;

// White ink at two strengths, from the white token: the panel is dark in both themes.
const INK_SOFT = "text-[color:color-mix(in_srgb,var(--color-white)_72%,transparent)]";
const INK_MID = "text-[color:color-mix(in_srgb,var(--color-white)_82%,transparent)]";
const GLASS_LINE = "border border-solid border-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)]";
const GLASS_FILL = "bg-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)]";

const PROMISES = [
  { icon: SecurityCheckIcon, text: "No wallet or KYC to start" },
  { icon: BlockchainIcon, text: "Mint to prove it's yours" },
  { icon: Store01Icon, text: "Sell it when you're ready" },
];

function useTurn(count: number): number {
  const [turn, setTurn] = React.useState(0);
  React.useEffect(() => {
    if (motionReduced()) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setTurn((t) => (t + 1) % count);
    }, TURN_MS);
    return () => window.clearInterval(id);
  }, [count]);
  return turn;
}

export function AuthShowcase() {
  const turn = useTurn(EXAMPLES.length);
  return (
    <div className="ix-auth-showcase relative flex h-full flex-col gap-[28px] overflow-hidden rounded-[var(--radius-3xl)] p-[40px] text-[color:var(--color-white)] [@media(max-height:820px)]:gap-[20px] [@media(max-height:820px)]:p-[32px]">
      <div className="flex flex-col gap-[16px]">
        <span className={cn("inline-flex w-fit items-center gap-[6px] rounded-full px-[12px] py-[4px] text-sm font-medium leading-sm", GLASS_FILL, GLASS_LINE)}>
          <Icon icon={SparklesIcon} size={14} />
          AI hardware studio
        </span>
        <h2 className="m-0 max-w-[18ch] text-5xl font-bold leading-5xl tracking-close [text-wrap:balance] [@media(max-height:820px)]:text-4xl [@media(max-height:820px)]:leading-4xl">
          From one sentence to a real product.
        </h2>
        <p className={cn("m-0 max-w-[46ch] text-lg leading-lg", INK_SOFT)}>
          Describe an idea. IDEEZA&apos;s AI drafts the schematic, PCB, firmware and 3D enclosure, ready to build, mint and sell.
        </p>
      </div>

      {/* The picture: what a session looks like. Decorative; the words above say
          it. The concept image takes whatever height the window leaves. */}
      <div aria-hidden className="relative mx-auto flex min-h-0 w-full max-w-[540px] flex-1 flex-col justify-center gap-[12px]">
        <div className="flex items-start gap-[12px] rounded-[var(--radius-2xl)] bg-bg-surface p-[14px] text-text-primary shadow-3">
          <span className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-[image:var(--gradient-button-ai)] text-[color:var(--color-white)]">
            <Icon icon={AiMagicIcon} size={18} />
          </span>
          <div className="grid min-w-0 flex-1 pt-[2px]">
            {EXAMPLES.map((ex, i) => (
              <p
                key={ex.name}
                className={cn("ix-showcase-slide m-0 text-md leading-md [grid-area:1/1]", i === turn ? "opacity-100" : "opacity-0")}
              >
                {ex.prompt}
              </p>
            ))}
          </div>
        </div>

        <div className="relative max-h-[420px] min-h-[160px] flex-1 overflow-hidden rounded-[var(--radius-2xl)] bg-bg-subtle shadow-3">
          {EXAMPLES.map((ex, i) => (
            <Image
              key={ex.name}
              src={ex.image}
              alt=""
              fill
              sizes="540px"
              priority={i === 0}
              className={cn("ix-showcase-slide object-cover", i === turn ? "opacity-100" : "opacity-0")}
            />
          ))}
          <span className="absolute right-[12px] top-[12px] inline-flex items-center gap-[6px] rounded-full bg-bg-surface px-[10px] py-[4px] text-sm font-medium leading-sm text-text-primary shadow-2">
            <span className="text-[color:var(--color-icon-success)]">
              <Icon icon={CheckmarkCircle02Icon} size={14} />
            </span>
            Design rules passed
          </span>
          <div className="absolute inset-x-0 bottom-0 grid bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-violet-950)_80%,transparent),transparent)] px-[16px] pb-[14px] pt-[40px]">
            {EXAMPLES.map((ex, i) => (
              <p
                key={ex.name}
                className={cn(
                  "ix-showcase-slide m-0 text-lg font-semibold leading-lg text-[color:var(--color-white)] [grid-area:1/1]",
                  i === turn ? "opacity-100" : "opacity-0",
                )}
              >
                {ex.name}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-[6px]">
          {ITEM_KINDS.map((kind) => (
            <span
              key={kind}
              className={cn("inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] text-sm font-medium leading-sm", GLASS_FILL, GLASS_LINE)}
            >
              <Icon icon={DELIVERABLE_ICON[kind]} size={14} />
              {ITEM_LABELS[kind]}
            </span>
          ))}
        </div>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-x-[24px] gap-y-[8px] p-0">
        {PROMISES.map((p) => (
          <li key={p.text} className={cn("inline-flex items-center gap-[8px] text-md leading-md", INK_MID)}>
            <Icon icon={p.icon} size={18} />
            {p.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Below `lg`, where the showcase can't sit beside the form: the same promise
 *  in one brand card above it, the examples taking turns in its corner. */
export function AuthShowcaseCompact() {
  const turn = useTurn(EXAMPLES.length);
  return (
    <div className="ix-auth-showcase flex items-center gap-[16px] overflow-hidden rounded-[var(--radius-2xl)] p-[16px] text-[color:var(--color-white)]">
      <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
        <span className="inline-flex items-center gap-[6px] text-sm font-medium leading-sm">
          <Icon icon={SparklesIcon} size={14} />
          AI hardware studio
        </span>
        <p className="m-0 text-xl font-bold leading-xl tracking-close [text-wrap:balance]">From one sentence to a real product.</p>
        <p className={cn("m-0 text-sm leading-sm", INK_SOFT)}>PCB, code and 3D, drafted by AI.</p>
      </div>
      <div aria-hidden className="relative size-[96px] shrink-0 overflow-hidden rounded-[var(--radius-xl)] bg-bg-subtle shadow-3">
        {EXAMPLES.map((ex, i) => (
          <Image
            key={ex.name}
            src={ex.image}
            alt=""
            fill
            sizes="96px"
            className={cn("ix-showcase-slide object-cover", i === turn ? "opacity-100" : "opacity-0")}
          />
        ))}
      </div>
    </div>
  );
}
