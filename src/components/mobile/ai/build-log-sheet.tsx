"use client";

// The Build log (Activity 4008–4733): the chat's journey as four stages —
// Idea, Concepts, Build, Save — each with where it stands (Live, Drawing,
// Building, Ready, Upcoming) and what happened in it, read off the web's own
// build log (project-state.ts `buildLogOf`) and build; at the foot, what the
// chat has really cost so far (the credits ledger: charges less refunds).
// Named "Build log", not "Activity": the project page's Activity is the
// maker's own journey (owner, 2026-10-13).

import * as React from "react";
import {
  AiMagicIcon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  CpuIcon,
  Folder01Icon,
  FloppyDiskIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { useCredits } from "@/lib/create/credits";
import { ITEM_LABELS, productsOf, rollupBuild, statusOf, useCreateHistory } from "@/lib/create/history";
import type { BuildLogEntry } from "@/lib/create/project-state";
import { spentLine, spentOf } from "@/lib/mobile-ai/flow";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import type { ConceptFlow } from "./use-concept-flow";

type StageState = "done" | "live" | "upcoming";

const time = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export function BuildLogSheet({ open, onClose, flow }: { open: boolean; onClose: () => void; flow: ConceptFlow }) {
  const { ledger } = useCredits();
  const { buildsForChat } = useCreateHistory();
  const chat = flow.chat;
  const job = flow.activeBuild;
  const stage = flow.stage;
  const log = flow.rail.buildLog;
  const spent = React.useMemo(() => {
    const turns = chat?.turns.filter((t) => t.role === "assistant") ?? [];
    const ids = new Set(turns.map((t) => t.id));
    const refines = new Set(turns.filter((t) => t.role === "assistant" && t.kind === "refine").map((t) => t.id));
    const buildIds = new Set(chat ? buildsForChat(chat.id).map((b) => b.id) : []);
    return spentOf(ledger, ids, refines, buildIds);
  }, [chat, ledger, buildsForChat]);
  if (!chat) return null;

  const setup = chat.turns.find((t) => t.role === "setup");
  const ideaState: StageState = stage === "idea" ? "live" : "done";
  const conceptState: StageState = stage === "idea" ? "upcoming" : stage === "concepts" ? "live" : "done";
  const buildState: StageState = stage === "build" ? "live" : stage === "save" || stage === "saved" ? "done" : "upcoming";
  const saveState: StageState = stage === "saved" ? "done" : stage === "save" ? "live" : "upcoming";
  const conceptEntries = log.filter((e) => chat.turns.some((t) => t.role === "assistant" && t.id === e.id));
  const ideaEntries = log.filter((e) => !conceptEntries.includes(e));
  const drawing = flow.rail.rows.some((r) => r.phase === "drawing");
  const n = flow.rail.rows.length;
  const products = job ? productsOf(job) : [];
  const roll = job ? rollupBuild(job) : null;
  const projectName = flow.projectName || chat.title;

  const subtitle =
    stage === "idea"
      ? "Reading your idea and mapping the journey ahead."
      : stage === "concepts"
        ? drawing
          ? `${n === 1 ? "One product is" : `${n} products are`} set. Drawing ${n === 1 ? "its concept" : "one concept for each"}.`
          : `${n === 1 ? "The concept is" : "Every concept is"} ready to build.`
        : stage === "build"
          ? `Building the pieces for ${n === 1 ? "the product" : n === 2 ? "both products" : `all ${n} products`}.`
          : stage === "save"
            ? "Every piece is ready. Save it to keep it together."
            : `Saved to ${flow.savedName ?? projectName}.`;
  const since =
    stage === "idea"
      ? `Started ${setup ? time(setup.ts) : ""}`
      : stage === "concepts"
        ? `Generating concept ${time(chat.updatedAt)}`
        : job?.startedAt
          ? `Build started · ${time(job.startedAt)}`
          : `Build booked · ${time(job?.createdAt ?? chat.updatedAt)}`;

  return (
    <Sheet open={open} onClose={onClose} title="Build log" description={subtitle}>
      <p className="flex flex-wrap items-center gap-3 text-sm leading-sm text-text-secondary">
        <span className="inline-flex items-center gap-2 rounded-full border-[length:var(--border-width-1)] border-solid border-border-subtle px-4 py-1 text-text-primary">
          <Icon icon={Folder01Icon} size={14} />
          {projectName}
        </span>
        • {since}
      </p>
      <ol className="flex flex-col">
        <Stage
          icon={BubbleChatIcon}
          title="Idea"
          state={ideaState}
          when={setup ? time(setup.ts) : undefined}
          liveTag="Live"
          summary={ideaState === "done" ? "Idea understood" : "Understanding intent, constraints, and product scope."}
          entries={ideaState === "live" ? ideaEntries : []}
        />
        <Stage
          icon={AiMagicIcon}
          title="Concepts"
          state={conceptState}
          liveTag={drawing ? "Drawing" : "Ready"}
          upcoming="Draw concepts for the products you include"
          summary={
            conceptState === "done"
              ? `${n === 1 ? "The drawing is" : n === 2 ? "Both drawings are" : `All ${n} drawings are`} ready${spent.refines ? ` · ${spent.refines} ${spent.refines === 1 ? "refine" : "refines"}` : ""}`
              : undefined
          }
          entries={conceptState === "live" ? conceptEntries : []}
        />
        <Stage
          icon={CpuIcon}
          title="Build"
          state={buildState}
          liveTag="Building"
          upcoming="Build the PCB, Code, 3D Module, Assembly and Wiring, plus the Parts list"
          summary={
            buildState === "done" && job
              ? `${products.reduce((s, p) => s + p.items.filter((i) => i.status === "ready").length, 0)} pieces ready · ${products.length === 1 ? "one product" : `${products.length} products`}`
              : undefined
          }
        >
          {buildState === "live" && job && roll && (
            <div className="flex flex-col gap-5 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-brand-subtle p-6">
              {products.map((p) => {
                const live = p.items.filter((i) => i.status !== "skipped");
                const pct = live.length ? Math.round(live.reduce((s, i) => s + i.progress, 0) / live.length) : 0;
                return (
                  <div key={p.id} className="flex flex-col gap-3">
                    <p className="flex items-center justify-between text-md font-medium leading-md text-text-primary">
                      {p.name}
                      <span className="text-sm leading-sm text-text-brand">{statusOf(job) === "queued" ? "Queued" : `${pct}%`}</span>
                    </p>
                    <ProgressBar value={pct} label={`${p.name} progress`} />
                    <ul className="flex flex-wrap gap-2">
                      {live.map((i) => (
                        <li
                          key={i.kind}
                          className={cn(
                            "rounded-full px-3 text-xs leading-xs",
                            i.status === "ready" ? "text-text-success" : i.status === "failed" ? "text-text-error" : i.status === "building" ? "bg-bg-surface text-text-brand" : "text-text-secondary",
                          )}
                        >
                          {i.status === "ready" ? "✓ " : ""}
                          {ITEM_LABELS[i.kind]}
                          {i.status === "building" ? ` ${Math.round(i.progress)}%` : i.status === "pending" ? " queued" : i.status === "failed" ? " failed" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Stage>
        <Stage
          icon={FloppyDiskIcon}
          title="Save"
          state={saveState}
          liveTag="Ready"
          upcoming="Save the finished deliverables"
          summary={saveState === "done" ? `Saved to ${flow.savedName ?? projectName}` : undefined}
          last
        >
          {saveState === "live" && (
            <div className="flex flex-col gap-3 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-success)] bg-bg-success-subtle p-6">
              <p className="flex items-center gap-3 text-md font-medium leading-md text-text-primary">
                <Icon icon={CheckmarkCircle02Icon} size={16} />
                Save ready
              </p>
              <p className="text-sm leading-sm text-text-secondary">
                {products.map((p) => p.name).join(" and ")} {products.length === 1 ? "is" : "are"} complete with every deliverable.
              </p>
            </div>
          )}
        </Stage>
      </ol>
      <div className="flex items-start gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-blue)] bg-bg-info-subtle p-6">
        <span className="text-[color:var(--color-icon-blue)]">
          <Icon icon={InformationCircleIcon} size={20} />
        </span>
        <span className="flex flex-col">
          <span className="text-md font-medium leading-md text-text-primary">
            {spent.total} {spent.total === 1 ? "credit" : "credits"} so far
          </span>
          <span className="text-sm leading-sm text-text-secondary">{spentLine(spent)}</span>
        </span>
      </div>
    </Sheet>
  );
}

function Stage({
  icon,
  title,
  state,
  when,
  liveTag,
  upcoming,
  summary,
  entries = [],
  last,
  children,
}: {
  icon: IconValue;
  title: string;
  state: StageState;
  when?: string;
  liveTag: string;
  upcoming?: string;
  summary?: string;
  entries?: BuildLogEntry[];
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-5">
      <span className="flex flex-col items-center">
        <span
          className={cn(
            "inline-flex size-[32px] shrink-0 items-center justify-center rounded-full border-[length:var(--border-width-1-5)] border-solid",
            state === "done" && "border-[var(--color-border-success)] text-[color:var(--color-icon-success)]",
            state === "live" && "border-border-brand text-[color:var(--color-icon-brand)]",
            state === "upcoming" && "border-border-subtle text-[color:var(--color-icon-disabled)]",
          )}
        >
          <Icon icon={icon} size={16} />
        </span>
        {!last && <span className={cn("w-[2px] flex-1", state === "done" ? "bg-[var(--color-icon-success)]" : "bg-bg-subtle")} />}
      </span>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-3", !last && "pb-8")}>
        <div className="flex items-center justify-between gap-4">
          <p className={cn("text-lg leading-lg", state === "upcoming" ? "text-text-secondary" : "font-medium text-text-primary")}>
            {title} {when && state === "done" && <span className="text-sm font-regular text-text-tertiary">{when}</span>}
          </p>
          {state === "live" && <Badge tone="brand">● {liveTag}</Badge>}
          {state === "upcoming" && <Badge tone="neutral">Upcoming</Badge>}
        </div>
        {state === "upcoming" && upcoming && <p className="text-sm leading-sm text-text-secondary">{upcoming}</p>}
        {summary && <p className="text-sm leading-sm text-text-secondary">{summary}</p>}
        {entries.length > 0 && (
          <ul className="flex flex-col gap-3 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand p-5">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-4">
                <span className="flex min-w-0 flex-col">
                  <span className="text-md font-medium leading-md text-text-primary">{e.title}</span>
                  {e.detail && <span className="text-sm leading-sm text-text-secondary">{e.title === "You" ? `“${e.detail}”` : e.detail}</span>}
                </span>
                <span className="shrink-0 text-sm leading-sm text-text-tertiary">{time(e.ts)}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </li>
  );
}
