"use client";

// The business plan's sheets on the phone (Figma 16b, 16c, 16f, 16n; the
// web's plan-dialogs.tsx, plan-runner.tsx's Ready dialog and plan-versions,
// their words kept):
// · GenerateSheet — Describe your product (500, prefilled with the project's
//   description and products), the help line, "At least 50 characters…" and
//   the count; Generate plan stays off until there are 50;
// · WritingSheet — "Writing {Section} — k of 7", the A22 bar and the time
//   line, or "Couldn't write {Section}" with Try again once the run isn't
//   live; Close · Stop writing;
// · ReadySheet — "Your business plan is ready": the first sections, Open full
//   plan · Discard (which asks first: it deletes what was just written);
// · VersionsSheet — the plan's versions, newest first, as a pick-one list:
//   picking another restores it (the `current` pointer moves); the current
//   one just closes; Restore waits while a run writes or once sold in full.

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Radio } from "@/components/ideeza/checkbox";
import { Textarea } from "@/components/ideeza/text-input";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { clearBusinessPlan, retryPlanSection, sectionAtOrdinal, useIsPlanLive } from "@/components/projects/business-plan/plan-runner";
import { PLAN_SECTIONS, type BusinessPlan, type PlanVersion } from "@/lib/manual/business-plan";
import { formatDate } from "@/lib/manual/project-summary";
import { readyLineOf, readyPreviewOf, versionsKeptLine } from "@/lib/manual/phone-plan-money";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { Sheet } from "../../kit/sheet";
import { EARN_NOTE } from "../parts";
import { SectionCard } from "./section-view";

const MIN = 50;
const MAX = 500;
const TOTAL = PLAN_SECTIONS.length;

export function GenerateSheet({
  open,
  initialPrompt,
  onClose,
  onGenerate,
}: {
  open: boolean;
  initialPrompt: string;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}) {
  const [text, setText] = React.useState(initialPrompt);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setText(initialPrompt.slice(0, MAX));
  }
  const ids = useFieldIds(["prompt"] as const);
  const helpId = React.useId();
  const capId = React.useId();
  const trimmed = text.trim();
  const tooShort = trimmed.length < MIN;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Generate business plan"
      actions={
        <>
          <Button size="xl" className="w-full" disabled={tooShort} onClick={() => onGenerate(trimmed.slice(0, MAX))}>
            Generate plan
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Describe your product" htmlFor={ids.prompt.id}>
        <Textarea
          id={ids.prompt.id}
          value={text}
          onValueChange={(v) => setText(v.slice(0, MAX))}
          rows={5}
          aria-describedby={`${helpId} ${capId}`}
        />
      </Field>
      <p id={helpId} className={EARN_NOTE}>
        What does it do, who is it for, and what makes it different from what already exists?
      </p>
      <div id={capId} className="flex items-start justify-between gap-6 text-sm leading-sm text-text-secondary">
        <span>At least 50 characters — the more detail, the better the plan.</span>
        <span className="shrink-0 tabular-nums">
          {trimmed.length} / {MAX}
        </span>
      </div>
      {tooShort && (
        <p role="status" className="text-sm leading-sm text-text-error">
          {MIN - trimmed.length} more characters needed
        </p>
      )}
    </Sheet>
  );
}

export function WritingSheet({
  open,
  onClose,
  onStop,
  projectId,
  plan,
}: {
  open: boolean;
  onClose: () => void;
  onStop: () => void;
  projectId: string;
  plan: BusinessPlan | null;
}) {
  const live = useIsPlanLive(projectId);
  const run = plan?.run;
  const version = plan?.versions.find((v) => v.n === run?.version) ?? null;
  const current = run && version ? sectionAtOrdinal(version.sections, run.next) : null;
  const shown = open && !!run && !!current;
  return (
    <Sheet
      open={shown}
      onClose={onClose}
      title="Writing your business plan"
      actions={
        <>
          <Button size="xl" className="w-full" onClick={onClose}>
            Close
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" disabled={!live} onClick={onStop}>
            Stop writing
          </Button>
        </>
      }
    >
      {run && current && (
        <>
          <p className="text-md font-medium leading-md text-text-primary">
            {current.state === "failed" ? `Couldn't write ${current.title}` : `Writing ${current.title} — ${run.next} of ${TOTAL}`}
          </p>
          <ProgressBar value={((run.next - 1) / TOTAL) * 100} label={`${run.next} of ${TOTAL} sections`} />
          {current.state === "failed" ? (
            !live && (
              <Button hierarchy="secondary" size="xl" className="self-start" onClick={() => retryPlanSection(projectId, current.id)}>
                Try again
              </Button>
            )
          ) : (
            <p className="text-md leading-md text-text-secondary">About 2–5 minutes. You can close this — writing carries on while IDEEZA is open.</p>
          )}
        </>
      )}
    </Sheet>
  );
}

export function ReadySheet({
  projectId,
  version,
  onOpen,
  onClose,
  onDiscarded,
}: {
  projectId: string;
  version: PlanVersion | null;
  onOpen: () => void;
  onClose: () => void;
  onDiscarded: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  return (
    <>
      <Sheet
        open={version !== null && !confirming}
        onClose={onClose}
        title="Your business plan is ready"
        description={version ? readyLineOf(version) : undefined}
        actions={
          <>
            <Button size="xl" className="w-full" onClick={onOpen}>
              Open full plan
            </Button>
            <Button hierarchy="ghost" size="xl" className="w-full" onClick={() => setConfirming(true)}>
              Discard
            </Button>
          </>
        }
      >
        {version && readyPreviewOf(version).map((s) => <SectionCard key={s.id} section={s} />)}
      </Sheet>
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Discard this business plan?"
        body="This deletes every section IDEEZA just wrote. This can't be undone."
        verb="Discard"
        destructive
        onConfirm={() => {
          clearBusinessPlan(projectId);
          onDiscarded();
        }}
      />
    </>
  );
}

export function VersionsSheet({
  open,
  plan,
  restoreBlocked,
  onClose,
  onView,
  onRestore,
}: {
  open: boolean;
  plan: BusinessPlan;
  /** Why Restore can't run now (sold in full, or a run is writing); null when it can. */
  restoreBlocked: string | null;
  onClose: () => void;
  onView: () => void;
  onRestore: (n: number) => void;
}) {
  const blockedId = React.useId();
  const ordered = [...plan.versions].sort((a, b) => b.n - a.n);
  return (
    <Sheet open={open} onClose={onClose} title="Plan version">
      <ul role="radiogroup" aria-label="Plan version" className="-mx-8 flex flex-col">
        {ordered.map((v) => {
          const current = v.n === plan.current;
          const blocked = !current && restoreBlocked !== null;
          return (
            <li key={v.n}>
              <button
                type="button"
                role="radio"
                aria-checked={current}
                aria-disabled={blocked || undefined}
                aria-describedby={blocked ? blockedId : undefined}
                aria-label={`${current ? "View" : "Restore"} version ${v.n}, ${formatDate(v.createdAt)}`}
                onClick={() => {
                  if (blocked) return;
                  onClose();
                  if (current) onView();
                  else onRestore(v.n);
                }}
                className={cn(
                  "flex w-full items-start gap-6 rounded-md px-8 py-4 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
                  blocked && "cursor-not-allowed opacity-60",
                )}
              >
                <Radio checked={current} decorative className="mt-1 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-lg leading-lg text-text-primary">{`Version ${v.n} · ${formatDate(v.createdAt)}`}</span>
                  <span className="truncate text-sm italic leading-sm text-text-tertiary">&ldquo;{v.prompt}&rdquo;</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {restoreBlocked && plan.versions.length > 1 && (
        <p id={blockedId} className="text-md leading-md text-text-secondary">
          {restoreBlocked}
        </p>
      )}
      <p className="border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-4 text-sm leading-sm text-text-tertiary">
        {versionsKeptLine(plan.versions.length)}
      </p>
    </Sheet>
  );
}
