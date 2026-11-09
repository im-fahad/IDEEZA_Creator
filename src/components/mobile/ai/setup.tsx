"use client";

// The question the web asks before anything is drawn (setup-turn.tsx), as
// the Figma lays it out on a phone:
//
// · the reading card (05, 646): "IDEEZA is reading your idea…" while the
//   idea is read, its rows ticking off; "IDEEZA read your idea…", folded,
//   once it is answered;
// · What should we build? (5026): inline, when the idea needs more than one
//   product — the described product always included, each other product
//   with its tick and why it is needed; Continue;
// · Which project is this for? (505–864): a sheet, for one product — a
//   project you have, or a new one by name; What should the project be
//   called? (5110) for several, which always make one new project. Start
//   drawing shows the credits and stays off until there is a project;
// · Required step (580): the sheet closed unanswered — nothing is drawn
//   until it is, and the card opens it again.

import * as React from "react";
import { ArrowDown01Icon, ArrowUp01Icon, CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { TextInput } from "@/components/ideeza/text-input";
import { Tag } from "@/components/ideeza/tag";
import { Field } from "@/components/auth/auth-parts";
import { CreditBadge } from "@/components/credits/credit-badge";
import { CONCEPT_COST } from "@/lib/create/credits";
import type { SetupAnswer } from "@/lib/create/history";
import { relativeLabel } from "@/components/create/use-clock";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { CARD, DASHED, Eyebrow } from "./parts";
import { PickField } from "./pick-sheet";
import type { SetupTurn } from "./use-concept-flow";

const NEW = "__new__";

// ─────────────────────────── reading card ───────────────────────────

type Row = { key: string; text: string; tone: "done" | "info" | "next" | "working"; when: string };

export function ReadingCard({ setup, now, projectName }: { setup: SetupTurn; now: number; projectName: string }) {
  const done = setup.status === "answered";
  const [open, setOpen] = React.useState(!done);
  const [was, setWas] = React.useState(done);
  if (was !== done) {
    setWas(done);
    setOpen(!done);
  }
  const rel = relativeLabel(setup.ts, now);
  const when = rel.charAt(0).toUpperCase() + rel.slice(1);
  const n = 1 + (setup.answer ? setup.answer.picked.length : setup.companions.length);
  const names = [setup.productName?.trim() || "Your product", ...setup.companions.filter((c) => !setup.answer || setup.answer.picked.includes(c.id)).map((c) => c.name)];
  const rows: Row[] =
    setup.status === "loading"
      ? [
          { key: "work", text: "Working out what it needs", tone: "working", when: "Now" },
          { key: "check", text: "Checking concept requirements", tone: "next", when: "Next" },
        ]
      : [
          { key: "work", text: "Working out what it needs", tone: "done", when },
          { key: "needs", text: `This needs ${n} ${n === 1 ? "product" : "products"}: ${names.join(" • ")}`, tone: "info", when },
          done
            ? {
                key: "check",
                text: setup.answer?.projectId ? `Added to ${projectName || "your project"}` : `Started project ${projectName || "your project"}`,
                tone: "done",
                when,
              }
            : { key: "check", text: "Checking concept requirements", tone: "next", when: "Next" },
        ];
  const title = done ? "IDEEZA read your idea…" : "IDEEZA is reading your idea…";
  return (
    <section className={cn(DASHED, "border-border bg-bg-surface")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[48px] w-full items-center gap-4 px-7 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span className={cn("inline-flex", done ? "text-[color:var(--color-icon-success)]" : "text-[color:var(--color-icon-brand)] motion-safe:animate-spin")}>
          <Icon icon={done ? CheckmarkCircle02Icon : Loading03Icon} size={18} />
        </span>
        <span className="flex-1 text-lg font-medium leading-lg text-text-primary">{title}</span>
        <span className="text-[color:var(--color-icon-default)]">
          <Icon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={16} />
        </span>
      </button>
      {open && (
        <ol className="flex flex-col gap-4 px-7 pb-7">
          {rows.map((r) => (
            <li key={r.key} className="flex items-start gap-4">
              <span
                aria-hidden
                className={cn(
                  "mt-[6px] size-[8px] shrink-0 rounded-full",
                  r.tone === "done" && "bg-[var(--color-icon-success)]",
                  r.tone === "info" && "bg-[var(--color-icon-blue)]",
                  r.tone === "working" && "bg-bg-brand motion-safe:animate-pulse",
                  r.tone === "next" && "bg-bg-subtle ring-1 ring-border",
                )}
              />
              <span className={cn("flex-1 text-sm leading-sm", r.tone === "next" ? "text-text-tertiary" : "text-text-primary")}>{r.text}</span>
              <span className="shrink-0 text-sm leading-sm text-text-tertiary">{r.when}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ─────────────────────────── what should we build ───────────────────────────

/** 5026: which products this build includes, one at a time like the web. */
export function ProductQuestion({
  setup,
  picked,
  onToggle,
  onContinue,
}: {
  setup: SetupTurn;
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
}) {
  const name = setup.productName?.trim() || "Your product";
  return (
    <section aria-labelledby="product-q" className={cn(CARD, "flex flex-col gap-6 p-7")}>
      <div className="flex flex-col gap-2">
        <Eyebrow>Product</Eyebrow>
        <h2 id="product-q" className="text-2xl font-semibold leading-2xl text-text-primary">
          What should we build?
        </h2>
        <p className="text-md leading-md text-text-secondary">Your idea needs more than one product to work. Everything ticked gets its own concept.</p>
      </div>
      <ul className="flex flex-col gap-4">
        <li className="flex items-start gap-5 rounded-lg bg-bg-subtle p-6">
          <span className="mt-1">
            <Checkbox checked disabled decorative />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center justify-between gap-4">
              <span className="text-md font-medium leading-md text-text-primary">{name}</span>
              <Tag size="sm">Always included</Tag>
            </span>
            {setup.productSummary && <span className="text-sm leading-sm text-text-secondary">{setup.productSummary}</span>}
          </span>
        </li>
        {setup.companions.map((c) => {
          const on = picked.has(c.id);
          return (
            <li key={c.id}>
              <label className={cn("relative flex cursor-pointer items-start gap-5 rounded-lg p-6", on ? "bg-bg-brand-subtle" : "bg-bg-subtle")}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(c.id)} />
                <span className="mt-1">
                  <Checkbox checked={on} decorative />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-md font-medium leading-md text-text-primary">{c.name}</span>
                  {c.why && <span className="text-sm leading-sm text-text-secondary">{c.why}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button size="xl" className="w-full" onClick={onContinue}>
        Continue
      </Button>
    </section>
  );
}

// ─────────────────────────── which project ───────────────────────────

export function ProjectSheet({
  open,
  onClose,
  products,
  projects,
  onStart,
  canAfford,
}: {
  open: boolean;
  onClose: () => void;
  /** How many products are kept: one may join a project, several make a new one. */
  products: number;
  projects: { id: string; name: string; preselect?: boolean }[];
  onStart: (answer: Pick<SetupAnswer, "projectId" | "projectName">) => void;
  canAfford: (n: number) => boolean;
}) {
  const single = products === 1;
  const [choice, setChoice] = React.useState<string | null>(() => projects.find((p) => p.preselect)?.id ?? null);
  const [name, setName] = React.useState("");
  const nameId = React.useId();
  const isNew = !single || choice === NEW;
  const cost = products * CONCEPT_COST;
  const ready = isNew ? name.trim().length > 0 : !!choice;
  const afford = canAfford(cost);
  const reason = !ready ? (isNew ? "Name the project first" : "Pick a project first") : !afford ? "Not enough credits to draw these concepts" : null;

  const start = () => {
    if (reason) return;
    onStart(isNew ? { projectId: "", projectName: name.trim() } : { projectId: choice!, projectName: "" });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={single ? "Which project is this for?" : "What should the project be called?"}
      description={
        single
          ? "A single product can join a project you already have, or start a new one."
          : `${products} products belong together, so they go in one new project.`
      }
      actions={
        <>
          <Button size="xl" className="w-full" onClick={start} aria-disabled={!!reason || undefined} disabled={!!reason}>
            Start drawing <CreditBadge credits={cost} onBrand={!reason} />
          </Button>
          {reason && (
            <p role="status" className="text-center text-sm leading-sm text-text-secondary">
              {reason}
            </p>
          )}
        </>
      }
    >
      <span className="w-fit">
        <Tag size="sm">Project</Tag>
      </span>
      {single && (
        <div className="flex flex-col gap-3">
          <p className="text-md font-medium leading-md text-text-primary">Choose project</p>
          <PickField
            title="Choose project"
            placeholder="Choose project"
            value={choice}
            onChange={setChoice}
            options={[
              { value: NEW, label: "+ Create new project" },
              ...projects.map((p) => ({ value: p.id, label: p.name, group: "Existing projects" })),
            ]}
          />
        </div>
      )}
      {isNew && (
        <Field label="New project name" htmlFor={nameId}>
          <TextInput
            id={nameId}
            size="xl"
            value={name}
            onValueChange={setName}
            placeholder="e.g. Drone project"
            maxLength={80}
            onKeyDown={(e) => {
              if (e.key === "Enter") start();
            }}
          />
        </Field>
      )}
    </Sheet>
  );
}

/** 580: the question closed unanswered. */
export function RequiredStep({ onOpen }: { onOpen: () => void }) {
  return (
    <section className={cn(DASHED, "flex items-center gap-6 border-border-error bg-bg-error-subtle p-7")}>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="w-fit rounded-full bg-bg-error px-4 py-1 text-xs font-medium leading-xs text-text-on-brand">Required step</span>
        <p className="text-sm leading-sm text-text-secondary">Choose a project to continue to concept drawing.</p>
      </div>
      <Button size="md" onClick={onOpen}>
        Choose project
      </Button>
    </section>
  );
}
