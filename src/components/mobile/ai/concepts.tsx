"use client";

// The concept stage on a phone (1135 · 1235 · 5719 · 5494 · 5304 · 5399 ·
// 5208): one card listing every product's current drawing — drawing, ready
// or failed — with "View & refine" into its sheet; the sheet shows the
// drawing, its prompt, its spec (Edit spec) and what will be built at which
// Quality, with Refine and Regenerate; Refine is its own sheet with the
// composer. Under the products, the Build line: what the build costs and
// takes, held until every chosen concept has landed.
//
// The drawing's clock is real (use-clock.ts): a render gives no milestones,
// so the ring turns and says how long it has been drawing, as the web's tile
// does, instead of a percentage nobody measured.

import * as React from "react";
import Image from "next/image";
import {
  Alert02Icon,
  Copy01Icon,
  Edit02Icon,
  Refresh01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { CreditBadge } from "@/components/credits/credit-badge";
import { elapsedLabel } from "@/components/create/use-clock";
import { CONCEPT_COST } from "@/lib/create/credits";
import { aboutTime, cleanPick, namesOf, pickCost, pickSeconds, pickedKinds, qualityOf, withQuality, type PieceQuality } from "@/lib/create/pieces";
import { QUALITIES, QUALITY_INFO } from "@/lib/create/quality";
import type { RailRow } from "@/lib/create/project-state";
import { cardFacts } from "@/lib/spec/format";
import { asConceptSummary } from "@/lib/spec/hints";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { CARD, DASHED, Eyebrow, FAIL_COPY, FAIL_FALLBACK } from "./parts";
import { PickList } from "./pick-sheet";
import { PromptBox } from "./prompt-box";
import type { AssistantTurn, ConceptFlow } from "./use-concept-flow";

// ─────────────────────────── the card ───────────────────────────

export function ConceptsCard({
  flow,
  now,
  onOpen,
}: {
  flow: ConceptFlow;
  now: number;
  onOpen: (productId: string) => void;
}) {
  const rows = flow.rail.rows;
  const chosen = rows.filter((r) => !r.leftOut);
  const ready = chosen.filter((r) => r.phase !== "drawing" && r.phase !== "failed").length;
  const drawing = chosen.filter((r) => r.phase === "drawing").length;
  const title =
    drawing > 0
      ? `Drawing ${drawing} ${drawing === 1 ? "concept" : "concepts"}`
      : `${ready} ${ready === 1 ? "concept" : "concepts"} ready`;
  const multi = rows.length > 1;
  return (
    <section aria-labelledby="concepts-title" className={cn(CARD, "flex flex-col gap-6 p-7")}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>{multi ? "Concepts" : "Concept"}</Eyebrow>
          <span className="text-sm leading-sm text-text-secondary">
            {multi || drawing ? `${ready} of ${chosen.length} ready` : "Ready"}
          </span>
        </div>
        <h2 id="concepts-title" className="text-2xl font-semibold leading-2xl text-text-primary">
          {title}
        </h2>
        <p className="text-sm leading-sm text-text-secondary">I&apos;m turning each product into a build-ready concept.</p>
      </div>
      <ul className="flex flex-col gap-5">
        {rows.map((r) => {
          const turn = flow.state.products.find((t) => t.id === r.turnId);
          return (
            <li key={r.productId}>
              <ConceptRow row={r} turn={turn} flow={flow} now={now} multi={multi} onOpen={() => onOpen(r.productId)} />
            </li>
          );
        })}
      </ul>
      {flow.state.available.length > 0 && !flow.held && (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-sm text-text-secondary">Suggested · 1 credit each</p>
          <div className="flex flex-wrap gap-3">
            {flow.state.available.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.why}
                disabled={!flow.canRender}
                onClick={() => flow.addOffered(c.id)}
                className="inline-flex min-h-[36px] items-center gap-2 rounded-full border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface px-5 text-sm leading-sm text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-text-disabled"
              >
                + {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ConceptRow({
  row,
  turn,
  flow,
  now,
  multi,
  onOpen,
}: {
  row: RailRow;
  turn: AssistantTurn | undefined;
  flow: ConceptFlow;
  now: number;
  multi: boolean;
  onOpen: () => void;
}) {
  const companion = row.productId !== "primary";
  const thumb = "relative size-[64px] shrink-0 overflow-hidden rounded-lg";
  if (row.phase === "drawing") {
    return (
      <div className="flex items-center gap-6 rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle p-5">
        <span aria-hidden className={cn(thumb, "bg-[image:var(--gradient-ai)] opacity-40 blur-[2px] motion-safe:animate-pulse")} />
        <span className="flex min-w-0 flex-1 flex-col">
          <Eyebrow>Drawing concept</Eyebrow>
          <span className="truncate text-lg font-medium leading-lg text-text-primary">{row.name}</span>
          <span className="text-sm leading-sm text-text-secondary">Usually 30–60 seconds</span>
        </span>
        <DrawingRing since={row.since ?? now} now={now} label={`Drawing ${row.name}`} />
      </div>
    );
  }
  if (row.phase === "failed") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border-error p-5">
        <div className="flex items-start gap-6">
          <span aria-hidden className={cn(thumb, "flex items-center justify-center bg-bg-error-subtle text-[color:var(--color-icon-error)]")}>
            <Icon icon={Alert02Icon} size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <Eyebrow tone="error">Couldn&apos;t draft that concept</Eyebrow>
            <span className="truncate text-lg font-medium leading-lg text-text-primary">{row.name}</span>
            <span className="text-sm leading-sm text-text-secondary">{turn?.failReason ? FAIL_COPY[turn.failReason] : FAIL_FALLBACK}</span>
          </span>
        </div>
        <Button
          hierarchy="secondary"
          size="lg"
          className="w-full"
          disabled={!flow.canRender || flow.held || !turn}
          onClick={() => turn && flow.regenerate(turn.id)}
          iconLeading={<Icon icon={Refresh01Icon} size={16} />}
        >
          Try again <CreditBadge credits={CONCEPT_COST} />
        </Button>
      </div>
    );
  }
  const inBuild = !companion || !row.leftOut;
  return (
    <div className={cn("flex items-center gap-6 rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle p-5", !inBuild && "opacity-60")}>
      <span className={cn(thumb, "bg-bg-subtle")}>
        {row.imageUrl && <Image src={row.imageUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Eyebrow tone="success">{row.phase === "reading" ? "Reading the parts" : row.phase === "conflict" ? "Doesn't fit its size" : "Concept ready"}</Eyebrow>
        <span className="truncate text-lg font-medium leading-lg text-text-primary">{row.name}</span>
        <button
          type="button"
          onClick={onOpen}
          className="-my-3 inline-flex min-h-[40px] w-fit items-center gap-2 text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:underline"
        >
          {flow.held ? "View" : "View & refine"}
          <Icon icon={Edit02Icon} size={14} />
        </button>
      </span>
      {companion && multi ? (
        <label className="relative -m-3 inline-flex size-[44px] cursor-pointer items-center justify-center" title={inBuild ? "In this build" : "Left out of this build"}>
          <input
            type="checkbox"
            className="sr-only"
            checked={inBuild}
            disabled={flow.held}
            onChange={() => flow.toggleInBuild(row.productId)}
            aria-label={`Build ${row.name}`}
          />
          <Checkbox checked={inBuild} disabled={flow.held} decorative />
        </label>
      ) : multi ? (
        <span className="text-xs leading-xs text-text-tertiary">Always built</span>
      ) : null}
    </div>
  );
}

/** The ring of a drawing: it turns, and says how long it has been drawing. */
function DrawingRing({ since, now, label }: { since: number; now: number; label: string }) {
  return (
    <span role="status" aria-label={`${label} · ${elapsedLabel(since, now)}`} className="relative inline-flex size-[44px] shrink-0 items-center justify-center">
      <svg aria-hidden viewBox="0 0 40 40" className="absolute inset-0 size-full motion-safe:animate-spin">
        <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" className="stroke-[var(--color-bg-brand-subtle)]" />
        <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 101" className="stroke-[var(--color-icon-brand)]" />
      </svg>
      <span className="relative text-xs font-medium leading-xs tabular-nums text-text-primary">{elapsedLabel(since, now).replace(/ min .*/, " min")}</span>
    </span>
  );
}

// ─────────────────────────── the Build line ───────────────────────────

export function BuildBar({ flow, onBuild }: { flow: ConceptFlow; onBuild: () => void }) {
  const { state } = flow;
  const n = state.selected.length;
  const waiting = !state.allReady;
  const reason = state.failedChoice
    ? `${flow.rail.rows.find((r) => r.turnId === state.failedChoice!.id)?.name ?? "A concept"} couldn't be drawn — try it again, or untick it`
    : waiting
      ? "Wait for all concepts to finish"
      : state.emptyPick
        ? "A product has nothing picked to build"
        : null;
  const off = !!reason || flow.preparing;
  return (
    <section
      aria-label="Build"
      className={cn(DASHED, "flex items-center gap-6 p-7", off && !flow.preparing ? "border-border bg-bg-subtle" : "border-border-brand bg-bg-brand-subtle")}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn("text-md font-medium leading-md", reason ? "text-text-tertiary" : "text-text-brand")}>
          {n} {n === 1 ? "product" : "products"} • {state.cost} credits
        </p>
        <p className="text-sm leading-sm text-text-secondary">
          {reason ?? `${aboutTime(state.seconds).replace(/^about/, "About")} · Parts list included`}
        </p>
      </div>
      <Button size="md" className="shrink-0" onClick={onBuild} disabled={!!reason} loading={flow.preparing} aria-label={flow.preparing ? "Preparing the build" : undefined}>
        {n === 1 ? "Build" : `Build ${n} products`}
      </Button>
    </section>
  );
}

// ─────────────────────────── the product's sheet ───────────────────────────

export function ConceptSheet({
  flow,
  productId,
  onClose,
  onSelect,
  onRefine,
  onEditSpec,
}: {
  flow: ConceptFlow;
  productId: string | null;
  onClose: () => void;
  onSelect: (productId: string) => void;
  onRefine: (turnId: string) => void;
  onEditSpec: (productId: string) => void;
}) {
  const toast = useToast();
  const [qualityOpen, setQualityOpen] = React.useState(false);
  const rows = flow.rail.rows;
  const index = rows.findIndex((r) => r.productId === productId);
  const row = index >= 0 ? rows[index] : null;
  const turn = row ? flow.state.products.find((t) => t.id === row.turnId) : undefined;
  const open = !!row && !!turn;
  const spec = turn ? flow.state.specs.get(turn.id) ?? null : null;
  const parts = turn ? flow.state.parts.get(turn.id) ?? [] : [];
  const concept = turn ? asConceptSummary(turn.concept) : undefined;
  const pick = productId ? flow.state.picks.get(productId) ?? cleanPick(undefined, flow.chat?.quality) : cleanPick(undefined);
  const kinds = pickedKinds(pick).filter((k) => k !== "parts");
  const quality = qualityOf(pick);
  const locked = !!turn && flow.state.locked.has(turn.id);
  const facts = spec && concept && !concept.fallback ? cardFacts(spec, parts) : [];
  const ready = turn?.status === "ready";

  const copy = async () => {
    if (!turn) return;
    try {
      await navigator.clipboard.writeText(turn.prompt);
      toast({ title: "Prompt copied", lead: "success" });
    } catch {
      toast({ title: "Couldn't copy the prompt", lead: "error" });
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={row?.name ?? "Concept"}
        description={rows.length > 1 ? `Product ${index + 1} of ${rows.length} · Concept ${row ? flow.labels.get(row.turnId) ?? "1" : ""}` : `Concept ${row ? flow.labels.get(row.turnId) ?? "1" : ""}`}
        actions={
          locked ? undefined : (
            <>
              <Button
                hierarchy="secondary"
                size="xl"
                className="w-full"
                disabled={!ready || !flow.canRender}
                onClick={() => turn && onRefine(turn.id)}
                iconLeading={<Icon icon={SparklesIcon} size={20} />}
              >
                Refine <CreditBadge credits={CONCEPT_COST} />
              </Button>
              <Button
                hierarchy="secondary"
                size="xl"
                className="w-full"
                disabled={!turn || !flow.canRender}
                onClick={() => {
                  if (turn && flow.regenerate(turn.id)) onClose();
                }}
                iconLeading={<Icon icon={Refresh01Icon} size={20} />}
              >
                Regenerate <CreditBadge credits={CONCEPT_COST} />
              </Button>
              {!flow.canRender && <p className="text-center text-sm leading-sm text-text-secondary">You are out of credits — top them up to draw another concept.</p>}
            </>
          )
        }
      >
        {turn && row && (
          <>
            <div className="flex items-center justify-between gap-4">
              <Badge tone={ready ? "success" : "neutral"}>{ready ? "● Ready" : row.phase === "drawing" ? "Drawing" : "Couldn't draw"}</Badge>
              {locked && <Badge tone="brand">Built</Badge>}
            </div>
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-bg-subtle">
              {turn.imageUrl && <Image src={turn.imageUrl} alt={`${row.name}, concept ${flow.labels.get(turn.id) ?? "1"}`} fill sizes="343px" className="object-cover" unoptimized />}
            </div>
            <div className="flex items-center gap-4">
              <p className="min-w-0 flex-1 truncate text-sm leading-sm text-text-secondary">
                <span className="font-medium text-text-primary">Prompt: </span>
                {turn.prompt}
              </p>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy the prompt"
                className="-m-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Copy01Icon} size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-6 rounded-xl bg-bg-subtle p-7">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium uppercase leading-sm text-text-secondary">Spec</p>
                {concept?.fallback && (
                  <p className="text-sm leading-sm text-text-secondary">
                    Stand-in parts — the model didn&apos;t answer, so these are generic.{" "}
                    <button
                      type="button"
                      disabled={flow.rereading.has(turn.id)}
                      onClick={() => flow.readConcept(turn.id)}
                      className="font-medium text-text-brand hover:underline disabled:text-text-disabled"
                    >
                      {flow.rereading.has(turn.id) ? "Reading again…" : "Read again"}
                    </button>
                  </p>
                )}
                {facts.length > 0 ? (
                  <p className="text-sm leading-sm text-text-primary">
                    {facts.map((f, i) => (
                      <span key={f.key + i} className={cn(f.tone === "error" && "text-text-error", f.tone === "warn" && "text-text-warning")}>
                        {i > 0 && " · "}
                        {f.label ? `${f.label} ${f.value}` : f.value}
                      </span>
                    ))}
                  </p>
                ) : (
                  !concept?.fallback && <p className="text-sm leading-sm text-text-tertiary">{ready ? "Reading the parts…" : "The spec comes with the drawing."}</p>
                )}
                {concept?.description && <p className="text-sm leading-sm text-text-secondary">{concept.description}</p>}
                {spec && (
                  <button
                    type="button"
                    onClick={() => productId && onEditSpec(productId)}
                    className="-my-3 inline-flex min-h-[40px] w-fit items-center gap-2 text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:underline"
                  >
                    {locked ? "View spec" : "Edit spec"} <CreditBadge credits={0} />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium uppercase leading-sm text-text-secondary">What to build</p>
                <p className="text-sm leading-sm text-text-primary">
                  {namesOf(kinds)} · Parts list included. {pickCost(pick)} credits · {aboutTime(pickSeconds(pick))}.
                </p>
                <button
                  type="button"
                  disabled={locked || flow.held}
                  onClick={() => setQualityOpen(true)}
                  className="-my-3 inline-flex min-h-[40px] w-fit items-center text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:underline disabled:text-text-secondary disabled:no-underline"
                >
                  Quality · {QUALITY_INFO[quality].label}
                </button>
              </div>
            </div>
            {locked && <p className="text-sm leading-sm text-text-secondary">This is what was built. To change it, save the build and change the product from its page.</p>}
            {rows.length > 1 && (
              <div role="tablist" aria-label="Products" className="flex justify-center gap-3">
                {rows.map((r, i) => (
                  <button
                    key={r.productId}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={r.name}
                    onClick={() => onSelect(r.productId)}
                    className="inline-flex min-h-[32px] items-center px-1 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <span className={cn("h-[8px] rounded-full transition-[width] duration-fast", i === index ? "w-[24px] bg-[var(--color-icon-secondary)]" : "w-[8px] bg-bg-subtle ring-1 ring-border")} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Sheet>
      <Sheet open={qualityOpen} onClose={() => setQualityOpen(false)} title="Quality" description={`Every piece of ${row?.name ?? "this product"} is built at it.`}>
        <PickList
          label="Quality"
          value={quality}
          options={QUALITIES.map((q) => ({
            value: q,
            label: QUALITY_INFO[q].label,
            sub: `${QUALITY_INFO[q].hint} · ${pickCost(withQuality(pick, q))} credits`,
          }))}
          onPick={(q) => {
            if (productId) flow.setQuality(productId, q as PieceQuality);
            setQualityOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

// ─────────────────────────── Refine ───────────────────────────

export function RefineSheet({ flow, turnId, onClose }: { flow: ConceptFlow; turnId: string | null; onClose: () => void }) {
  const [text, setText] = React.useState("");
  const turn = turnId ? flow.chat?.turns.find((t): t is AssistantTurn => t.id === turnId && t.role === "assistant") : undefined;
  const row = turn ? flow.rail.rows.find((r) => r.productId === (turn.companionOf ?? "primary")) : undefined;
  const label = turn ? flow.labels.get(turn.id) ?? "1" : "1";
  const nextIndex = turn ? (flow.chat?.turns.filter((t) => t.role === "assistant" && t.kind === "refine" && t.parentTurnId === turn.id).length ?? 0) + 1 : 1;
  const name = row?.name ?? "this concept";
  return (
    <Sheet
      open={!!turn}
      onClose={() => {
        setText("");
        onClose();
      }}
      title={`Refine ${name}`}
      description={`The result lands as Concept ${label}.${nextIndex} — the original stays. Each change costs 1 credit.`}
    >
      {turn && (
        <>
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-bg-subtle">
            {turn.imageUrl && <Image src={turn.imageUrl} alt={`${name}, concept ${label}`} fill sizes="343px" className="object-cover" unoptimized />}
          </div>
          <p className="truncate text-sm leading-sm text-text-secondary">
            <span className="font-medium text-text-primary">Prompt: </span>
            {turn.prompt}
          </p>
          <div className="-mx-8 pb-2">
            <PromptBox
              value={text}
              onChange={setText}
              placeholder="Describe a change to this image…"
              sendKind="send"
              enhanceMode="change"
              canSend={flow.canRender}
              sendReason="You are out of credits — top them up to draw another concept."
              onSubmit={(t) => {
                if (!flow.refine(turn.id, t)) return false;
                setText("");
                onClose();
              }}
            />
          </div>
          <p className="text-sm leading-sm text-text-tertiary">Refining evolves this concept. To start over from your prompt, use Regenerate instead.</p>
        </>
      )}
    </Sheet>
  );
}

