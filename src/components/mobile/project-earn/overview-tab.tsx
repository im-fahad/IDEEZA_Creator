"use client";

// Earn › Overview on the phone (Figma 12, 12b; the web's Earn overview,
// design A, its words): one card, "Get {project} earning", with "n of m done"
// over a progress bar and the two steps ① Mint your project ② Put it on sale.
// The current step says why, lists its tasks (the ladder's steps for its
// commit point, the same ones the project page's Earn button counts) — only
// the first missing one opens, with its one-tap fix — and ends with the step's
// own action (Start mint, Choose what to sell), the screen's one primary,
// shown only once nothing above it is missing. A later step's tasks show
// dimmed. Once something is live (listed, paused, given, sold, or copies on
// sale) the card is "You're selling" (12b): the state in words, its facts
// and where it is managed — both steps are done then, so the checklist goes.

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle01Icon, CircleIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { earnSourceOf, useEarnFacts } from "@/components/projects/earn/ladder/use-earn-facts";
import type { License } from "@/lib/brief/types";
import { levelStepsOf, type EarnFacts, type LadderStep } from "@/lib/commerce/ladder";
import { earnLiveFactsOf, earnNextOf, earnPathOf, type EarnPathStep } from "@/lib/manual/earn-view";
import { phoneEarnHref } from "@/lib/manual/phone-earn";
import { phoneHrefOf } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { useEarn } from "./context";
import { EARN_CARD, EARN_H2_CLASS, EARN_LEAD, EARN_NOTE, FactRows, StepFix } from "./parts";

type Task = LadderStep & { ok: boolean };

/** Mint asks the ladder's first two levels; Sell its third, minus "Minted" (step one itself). */
function tasksOf(step: EarnPathStep["id"], facts: EarnFacts): Task[] {
  if (step === "mint") return [...levelStepsOf(1, facts), ...levelStepsOf(2, facts)];
  return levelStepsOf(3, facts).filter((s) => s.id !== "minted");
}

/** The checklist says each task as something to do (the ladder's labels are states). */
const TASK_WORD: Partial<Record<LadderStep["id"], string>> = {
  built: "Build a product",
  wallet: "Connect the demo wallet",
  ownership: "Confirm you own this design",
  videos: "Make a video for each product",
  license: "Choose a license",
};

const ACTION_LINE: Record<EarnPathStep["id"], string> = {
  mint: "Opens the mint: keep it private, give it away, or sell it.",
  sell: "Opens Sell: the Main NFT, or Physical and Virtual copies.",
};

export function EarnOverviewTab() {
  const { project, view, brief, commercial, announce } = useEarn();
  const source = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const { facts, ready } = useEarnFacts(source);
  const copiesOnSale = view.lock === null && view.editions.some((t) => t.listing !== null);
  const next = earnNextOf(project.id, commercial, copiesOnSale);
  const steps = earnPathOf(commercial, copiesOnSale);
  const headingId = React.useId();

  if (next.point === null) {
    const live = earnLiveFactsOf({
      projectId: project.id,
      commercial,
      listing: view.listing,
      sales: view.sales,
      editions: view.editions,
      buyers: view.customers.buyerCount,
    });
    return <LiveCard title={next.title} why={next.why} facts={live} manage={next.action} given={commercial === "given"} projectId={project.id} />;
  }

  const all = steps.map((s) => ({ step: s, tasks: ready ? tasksOf(s.id, facts) : [] }));
  const total = all.reduce((n, g) => n + g.tasks.length + 1, 0);
  const done = all.reduce((n, g) => n + (g.step.state === "done" ? g.tasks.length + 1 : g.tasks.filter((t) => t.ok).length), 0);

  return (
    <section aria-labelledby={headingId} className={EARN_CARD}>
      <h2 id={headingId} className={EARN_H2_CLASS}>{`Get ${project.name} earning`}</h2>
      <p className={EARN_LEAD}>Two steps: mint it, then put it on sale.</p>
      {ready && <p className="text-sm font-medium leading-sm tabular-nums text-text-secondary">{`${done} of ${total} done`}</p>}
      <ProgressBar value={total ? (done / total) * 100 : 0} label="Progress to earning" />
      <ol className="flex flex-col">
        {all.map(({ step, tasks }) => (
          <StepGroup
            key={step.id}
            step={step}
            tasks={tasks}
            ready={ready}
            why={step.state === "current" ? next.why : null}
            action={step.state === "current" ? next.action : null}
            projectId={project.id}
            license={brief?.state.license ?? null}
            announce={announce}
          />
        ))}
      </ol>
    </section>
  );
}

function StepGroup({
  step,
  tasks,
  ready,
  why,
  action,
  projectId,
  license,
  announce,
}: {
  step: EarnPathStep;
  tasks: Task[];
  ready: boolean;
  why: string | null;
  action: { label: string; href: string } | null;
  projectId: string;
  license: License | null;
  announce: (m: string) => void;
}) {
  const current = step.state === "current";
  const firstMissing = current ? tasks.find((t) => !t.ok) : undefined;
  const canAct = current && ready && !firstMissing;
  const note = step.state === "done" ? "Done" : current ? "Now" : "Later";
  const href = action ? (phoneHrefOf(action.href) ?? action.href) : null;

  return (
    <li
      aria-current={current ? "step" : undefined}
      className="flex flex-col gap-4 border-t-[length:var(--border-width-1)] border-solid border-border-subtle py-6 first:border-t-0 first:pt-0 last:pb-0"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={cn(
            "inline-flex size-[24px] shrink-0 items-center justify-center rounded-full text-sm font-medium leading-sm tabular-nums",
            step.state === "done" ? "bg-bg-success-subtle text-text-success" : current ? "bg-bg-inverse text-text-inverse" : "bg-bg-subtle text-text-secondary",
          )}
        >
          {step.state === "done" ? <Icon icon={Tick02Icon} size={14} /> : step.n}
        </span>
        <h3 className="min-w-0 flex-1 text-md font-semibold leading-md text-text-primary">
          <span className="sr-only">{`Step ${step.n}: `}</span>
          {step.title}
        </h3>
        <span className={cn("text-sm font-medium leading-sm", current ? "text-text-brand" : step.state === "done" ? "text-text-success" : "text-text-secondary")}>
          {note}
        </span>
      </div>

      {current && why && <p className={EARN_NOTE}>{why}</p>}

      {step.state !== "done" && ready && (
        <ul className={cn("flex flex-col", !current && "opacity-60")}>
          {tasks.map((t) => {
            const open = t === firstMissing;
            return (
              <li key={t.id} className="flex items-start gap-4 py-2">
                <TaskMark ok={t.ok} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="text-md leading-md text-text-primary">
                    {TASK_WORD[t.id] ?? t.label}
                    <span className="sr-only">{t.ok ? ", done" : ", not done yet"}</span>
                  </span>
                  {open && (
                    <>
                      <span className={EARN_NOTE}>{t.reason}</span>
                      <StepFix step={t} projectId={projectId} license={license} announce={announce} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {current && action && href && (
            <li className="flex items-start gap-4 py-2">
              <TaskMark ok={false} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-md leading-md text-text-primary">{action.label}</span>
                {canAct ? (
                  <>
                    <span className={EARN_NOTE}>{ACTION_LINE[step.id]}</span>
                    <Link href={href} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
                      {action.label}
                    </Link>
                  </>
                ) : (
                  <span className={EARN_NOTE}>Unlocks when the steps above are done.</span>
                )}
              </div>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function TaskMark({ ok }: { ok: boolean }) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0", ok ? "text-text-success" : "text-[color:var(--color-icon-secondary)]")}>
      <Icon icon={ok ? CheckmarkCircle01Icon : CircleIcon} size={20} />
    </span>
  );
}

/** 12b "You're selling": what is live, its facts, and where it is managed. */
function LiveCard({
  title,
  why,
  facts,
  manage,
  given,
  projectId,
}: {
  title: string;
  why: string;
  facts: { label: string; value: string }[];
  manage: { label: string; href: string };
  given: boolean;
  projectId: string;
}) {
  const headingId = React.useId();
  const manageHref = phoneHrefOf(manage.href) ?? manage.href;
  return (
    <section aria-labelledby={headingId} className={EARN_CARD}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-md leading-md text-text-secondary">You&apos;re selling</p>
        <TestnetDemoBadge />
      </div>
      <h2 id={headingId} className={EARN_H2_CLASS}>
        {title}
      </h2>
      <p className={EARN_LEAD}>{given ? why : `${why} Your share of each sale, less the 2.5% IDEEZA fee, joins your balance in Get paid.`}</p>
      <FactRows rows={facts} label="Facts" />
      <Link href={manageHref} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
        {manage.label}
      </Link>
      {!given && (
        <Link href={`${phoneEarnHref(projectId, "sell")}#copies`} className={cn(buttonVariants({ hierarchy: "ghost", size: "xl" }), "w-full")}>
          Sell copies of a product
        </Link>
      )}
    </section>
  );
}
