"use client";

// Small parts the AI tab's screens share (mobile Figma "AI create · 2026
// update"): the step line under the top bar, the prompt bubble, the progress
// ring of a drawing or a piece, the caps label over a card, the credits line
// under the composer and the sheet its (i) opens, the held composer of a
// booked build, and the web's sentences for a concept that couldn't be drawn.

import * as React from "react";
import { Coins01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import type { ConceptFailReason } from "@/lib/create/history";
import { PIECES, PICKABLE_KINDS, defaultPick, pickCost } from "@/lib/create/pieces";
import { QUALITIES, QUALITY_INFO } from "@/lib/create/quality";
import { STEPS, promptPreview, stepsReached, type FlowStage } from "@/lib/mobile-ai/flow";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";

// ─────────────────────────── the step line ───────────────────────────

/** Idea · Concepts · Build · Save: a dot per step, filled up to the stage,
 *  and the line between two reached steps filled too. */
export function Stepper({ stage }: { stage: FlowStage }) {
  const reached = stepsReached(stage);
  return (
    <ol aria-label="Steps" className="flex items-start px-8 pb-6 pt-2">
      {STEPS.map((s, i) => {
        const on = i < reached;
        const current = i === reached - 1 && stage !== "saved";
        return (
          <li key={s} className={cn("flex items-start", i < STEPS.length - 1 && "flex-1")} aria-current={current ? "step" : undefined}>
            <span className="flex w-[44px] shrink-0 flex-col items-center gap-2">
              <span
                aria-hidden
                className={cn("mt-1 size-[12px] rounded-full", on ? "bg-bg-brand" : "bg-bg-subtle ring-1 ring-border")}
              />
              <span className={cn("text-sm leading-sm", on ? "text-text-primary" : "text-text-tertiary", current && "font-medium")}>{s}</span>
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className={cn("mt-[9px] h-[2px] flex-1 rounded-full", i < reached - 1 ? "bg-bg-brand" : "bg-bg-subtle")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─────────────────────────── the prompt bubble ───────────────────────────

/** The maker's idea, right-aligned in the brand's quiet fill; a long one
 *  shows its start and "Show full prompt" (05 → 06). */
export function PromptBubble({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  const short = promptPreview(text);
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[280px] flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-ai-prompt-border)] bg-[var(--color-ai-prompt-bg)] px-7 py-6">
        <p className="whitespace-pre-wrap break-words text-md leading-md text-text-primary">{open || !short ? text : short}</p>
        {short && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="-my-3 inline-flex min-h-[32px] w-fit items-center text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:underline"
          >
            {open ? "Show less" : "Show full prompt"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── the ring ───────────────────────────

/** A piece's or a drawing's progress, as the ring the Figma draws (40 px). */
export function ProgressRing({ value, label, size = 40 }: { value: number; label: string; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg aria-hidden viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" className="stroke-[var(--color-bg-brand-subtle)]" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-[var(--color-icon-brand)] transition-[stroke-dashoffset] duration-normal ease-out motion-reduce:transition-none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
        />
      </svg>
      <span className="relative text-xs font-medium leading-xs tabular-nums text-text-primary">{Math.round(v)}%</span>
    </span>
  );
}

// ─────────────────────────── labels ───────────────────────────

/** The small caps line over a card: CONCEPTS, BUILDING, BUILD FINISHED. */
export function Eyebrow({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "success" | "error" | "quiet" }) {
  return (
    <p
      className={cn(
        "text-sm font-medium uppercase leading-sm",
        tone === "brand" && "text-text-brand",
        tone === "success" && "text-text-success",
        tone === "error" && "text-text-error",
        tone === "quiet" && "text-text-tertiary",
      )}
    >
      {children}
    </p>
  );
}

/** A card on the chat: bg/surface, border/subtle, radius/xl. */
export const CARD = "rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface";

/** The same, dashed — the reading card and the Build line. */
export const DASHED = "rounded-xl border-[length:var(--border-width-1)] border-dashed";

// ─────────────────────────── credits ───────────────────────────

/** Under the composer: the balance on the left, what the next thing costs on
 *  the right with (i) for how credits are spent. */
export function CreditsFoot({ right }: { right: React.ReactNode }) {
  const { hydrated, balance } = useCredits();
  const [info, setInfo] = React.useState(false);
  return (
    <div className="flex items-center justify-between gap-4 px-8 pb-4 pt-5">
      <p className="inline-flex items-center gap-2 text-sm leading-sm text-text-secondary">
        <span className="text-[color:var(--color-icon-brand)]">
          <Icon icon={Coins01Icon} size={14} />
        </span>
        <span className="font-semibold tabular-nums text-text-brand">{hydrated ? balance.toLocaleString("en-US") : "…"}</span>
        Credits
      </p>
      <button
        type="button"
        onClick={() => setInfo(true)}
        aria-haspopup="dialog"
        className="-my-4 inline-flex min-h-[44px] items-center gap-2 text-sm leading-sm text-text-secondary outline-none hover:text-text-primary focus-visible:underline"
      >
        {right}
        <span className="text-[color:var(--color-icon-default)]">
          <Icon icon={InformationCircleIcon} size={14} />
        </span>
        <span className="sr-only">How credits are spent</span>
      </button>
      <CreditsInfoSheet open={info} onClose={() => setInfo(false)} />
    </div>
  );
}

/** What each step costs, in the web's prices (credits.tsx, pieces.ts). */
export function CreditsInfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hydrated, balance } = useCredits();
  const rows: [string, string][] = [
    ["Reading your idea", "Free"],
    ["Each concept drawn", `${CONCEPT_COST} credit`],
    ["Refine or Regenerate", `${CONCEPT_COST} credit each`],
    ["Edit spec", "Free"],
    ...QUALITIES.map((q): [string, string] => [`Building a product · ${QUALITY_INFO[q].label}`, `${pickCost(defaultPick(q))} credits`]),
    ["Parts list", "Free with every build"],
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="How credits are spent"
      description={hydrated ? `You have ${balance.toLocaleString("en-US")} credits. Nothing is charged until a concept starts drawing.` : undefined}
      actions={
        <Button size="xl" className="w-full" onClick={onClose}>
          Done
        </Button>
      }
    >
      <dl className="flex flex-col">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-6 border-b-[length:var(--border-width-1)] border-solid border-border-subtle py-5 last:border-b-0">
            <dt className="text-md leading-md text-text-secondary">{k}</dt>
            <dd className="text-md font-medium leading-md text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-sm text-text-tertiary">
        A build makes {PICKABLE_KINDS.map((k) => PIECES[k].name).join(", ")} for each product, plus its parts list. A render that fails costs nothing.
      </p>
    </Sheet>
  );
}

// ─────────────────────────── the held composer ───────────────────────────

/** Once a build holds the concepts, the composer says why it draws nothing (16–18). */
export function HeldComposer({ text }: { text: string }) {
  return (
    <div className="px-8">
      <p className="rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border-focus)] bg-bg-surface px-8 py-7 text-md leading-md text-text-secondary">
        {text}
      </p>
    </div>
  );
}

// ─────────────────────────── a failed drawing ───────────────────────────

/** The web's sentence for each reason a render failed (image-turn.tsx). */
export const FAIL_COPY: Record<ConceptFailReason, string> = {
  "provider-credit":
    "The image service turned the render down — the account it bills has run out of credit. Trying again won't help until it's topped up. Nothing was charged; your credit balance is unchanged.",
  busy: "The image service was busy and didn't finish in time. Nothing was charged — your credit balance is unchanged.",
  unreachable: "Couldn't reach the image service at all. Nothing was charged — your credit balance is unchanged.",
  storage:
    "The image was generated, but we couldn't store it, so there is nothing to show. That is a fault on our side, not yours — nothing was charged.",
  "parent-lost":
    "The concept this was refining is no longer stored, so there was nothing to evolve. Nothing was charged — start a fresh concept instead.",
  credits: "Your credit balance ran out before this render started. Nothing was charged.",
  cap: "You reached your monthly limit. This render would go over the monthly spending limit you set. Nothing was charged.",
  filtered:
    "The image service's safety filter blocked this render by mistake, so there is no picture. Nothing was charged — trying again usually works.",
  "pool-off":
    "Images are off: you switched off the volunteer GPU pool in Settings › AI & your data, and this app has no other image service. Switch it back on to draw concepts. Nothing was charged.",
};

export const FAIL_FALLBACK = "The request didn't reach the model. Nothing was charged — your credit balance is unchanged.";
