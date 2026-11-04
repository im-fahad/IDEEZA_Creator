"use client";

// The build on a phone (15 · 16 · 17 · 18 · A3–A6): the Build sheet that
// confirms the spend (with Buy credits in place when short), then the build
// card — its state in the web's own words (build-status.tsx `stateRowFor`),
// the whole build's percentage, a tab per product and a row per piece, each
// row's status from the web's needs rules; a failed piece is retried from
// its row (free), a queued build can be cancelled, a stopped one tried again,
// a paused one waits for credits. Once every piece is ready, the summary
// (18): what was made, the source concepts, Save project and Review the
// pieces. Each piece row opens its deliverable.

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  CpuIcon,
  CodeIcon,
  CubeIcon,
  FloppyDiskIcon,
  PackageIcon,
  PlugSocketIcon,
  Refresh01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { CreditBadge } from "@/components/credits/credit-badge";
import { stateRowFor, useMinuteClock } from "@/components/create/build-status";
import { useCredits } from "@/lib/create/credits";
import {
  ITEM_LABELS,
  allItems,
  isOverrunning,
  jobCost,
  productsOf,
  queuedAhead,
  rollupBuild,
  statusOf,
  useCreateHistory,
  type BuildItemKind,
  type BuildJob,
} from "@/lib/create/history";
import { aboutTime, pickCost } from "@/lib/create/pieces";
import { failedPieceNote, pieceWord, type PieceLite } from "@/lib/mobile-ai/flow";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { BuyCreditsSheet } from "./buy-credits-sheet";
import { CARD, Eyebrow, ProgressRing } from "./parts";
import type { ConceptFlow, Gate } from "./use-concept-flow";

export const PIECE_ICON: Record<BuildItemKind, IconValue> = {
  pcb: CpuIcon,
  code: CodeIcon,
  "3d": CubeIcon,
  assembly: Layers01Icon,
  wiring: PlugSocketIcon,
  parts: PackageIcon,
};

/** The piece rows' own labels: "Parts list" where the web's tab says Parts. */
export const PIECE_ROW_LABEL: Record<BuildItemKind, string> = { ...ITEM_LABELS, parts: "Parts list" };

// ─────────────────────────── the Build sheet ───────────────────────────

export function BuildConfirmSheet({
  flow,
  gate,
  onClose,
  onBooked,
}: {
  flow: ConceptFlow;
  gate: Gate | null;
  onClose: () => void;
  onBooked: (blocked?: string) => void;
}) {
  const { hydrated, balance } = useCredits();
  const [buying, setBuying] = React.useState(false);
  const cost = flow.state.cost;
  const n = flow.state.selected.length;
  const short = hydrated && balance < cost;
  const rows = flow.state.selected.map((t) => {
    const id = t.companionOf ?? "primary";
    const pick = flow.state.picks.get(id);
    const row = flow.rail.rows.find((r) => r.productId === id);
    const pieces = pick ? Object.values(pick).filter((c) => c.on).length : 6;
    return { id, name: row?.name ?? "Product", pieces, cost: pick ? pickCost(pick) : 0 };
  });
  const build = async () => {
    if (!gate || short) return;
    const result = await flow.confirmBuild(gate);
    if (result.booked) onBooked();
    else if (result.blocked) onBooked(result.blocked);
  };
  return (
    <>
      <Sheet
        open={!!gate && !buying}
        onClose={() => !flow.submitting && onClose()}
        title={`Build ${n} ${n === 1 ? "product" : "products"}?`}
        description={
          short
            ? `You have ${balance} credits and this build needs ${cost}. Buy credits and the build starts — nothing is charged until it does.`
            : "The build runs in the background. You can leave and we will tell you when each piece is ready."
        }
        actions={
          short ? (
            <>
              <Button size="xl" className="w-full" onClick={() => setBuying(true)}>
                Buy credits
              </Button>
              <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="xl" className="w-full" loading={flow.submitting} onClick={build}>
                Build <CreditBadge credits={cost} onBrand />
              </Button>
              <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose} disabled={flow.submitting}>
                Cancel
              </Button>
            </>
          )
        }
      >
        <ul className="flex flex-col rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle">
          {rows.map((r, i) => (
            <li key={r.id} className={cn("flex flex-col gap-1 px-6 py-5", i > 0 && "border-t-[length:var(--border-width-1)] border-solid border-border-subtle")}>
              <span className="flex items-baseline justify-between gap-4">
                <span className="text-lg font-medium leading-lg text-text-primary">{r.name}</span>
                <span className="shrink-0 text-sm leading-sm text-text-secondary">
                  {r.pieces} pieces · {r.cost} credits
                </span>
              </span>
              {gate?.lines[i] && <span className="text-sm leading-sm text-text-tertiary">{gate.lines[i].replace(/^.*? — /, "")}</span>}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 rounded-xl bg-bg-subtle p-7">
          <p className="text-sm leading-sm text-text-secondary">
            Your concept images are a visual reference. The engineered output may differ from them.
          </p>
          <p className="text-sm leading-sm text-text-secondary">
            Automated design rule checks run on completion. If issues are found, you&apos;ll still receive the full output with a{" "}
            <strong className="font-semibold text-text-primary">Draft</strong> label and a list of what needs review.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border-[length:var(--border-width-1)] border-solid border-border-subtle px-5 py-1 text-sm leading-sm text-text-secondary">
            {hydrated ? (short ? `You have ${balance} — ${cost - balance} short` : `${cost} credits · ${balance} → ${balance - cost} after`) : `${cost} credits`}
          </span>
          <span className="rounded-full border-[length:var(--border-width-1)] border-solid border-border-subtle px-5 py-1 text-sm leading-sm text-text-secondary">
            {aboutTime(flow.state.seconds).replace(/^about/, "About")}
          </span>
        </div>
      </Sheet>
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} need={cost} />
    </>
  );
}


// ─────────────────────────── the build card ───────────────────────────

const EYEBROW: Record<string, string> = {
  queued: "Build queue",
  paused: "Build paused",
  failed: "Build failed",
  running: "Building",
  partial: "Building",
  ready: "Build finished",
};

export function BuildCard({ job, product, onProduct }: { job: BuildJob; product: string; onProduct: (id: string) => void }) {
  const router = useRouter();
  const { builds, retryBuildItem, retryBuild, cancelBuild, failBuildSystem } = useCreateHistory();
  const now = useMinuteClock();
  const [buying, setBuying] = React.useState(false);
  const status = statusOf(job);
  const row = stateRowFor(job, now, queuedAhead(job, builds), true);
  const products = productsOf(job);
  const shown = products.find((p) => p.id === product) ?? products[0];
  const roll = rollupBuild(job);
  const percent = status === "ready" ? 100 : status === "queued" || status === "failed" ? 0 : roll.progress;
  const eyebrow = job.blocked ? EYEBROW.paused : EYEBROW[status];
  const name = job.projectChoiceName?.trim() || job.title;
  const each = new Set(products.map((p) => p.items.filter((i) => i.status !== "skipped").length));
  const piecesLine = each.size === 1 ? `${[...each][0]} pieces each` : `${allItems(job).filter((i) => i.status !== "skipped").length} pieces`;
  const pieces: PieceLite[] = shown.items.map((i) => ({ kind: i.kind, status: i.status, progress: i.progress, omitted: i.omitted }));
  const systemFailure = job.failure === "system";

  return (
    <section aria-label={row.sectionLabel} className="flex flex-col gap-6">
      <div className={cn(CARD, "flex flex-col gap-5 p-7")}>
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Badge tone={row.badge.tone === "success" ? "success" : row.badge.tone === "error" ? "error" : row.badge.tone === "warning" ? "warning" : row.badge.tone === "brand" ? "brand" : "neutral"}>
            ● {row.badge.text}
          </Badge>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-lg font-medium leading-lg text-text-primary">{name}</p>
            <p className="text-sm leading-sm text-text-secondary">
              {products.length} {products.length === 1 ? "product" : "products"} · {piecesLine}
            </p>
          </div>
          <p className="text-3xl font-semibold leading-3xl tabular-nums text-text-brand">{percent}%</p>
        </div>
        <ProgressBar value={percent} label={`${name} build progress`} />
        <p className="text-sm leading-sm text-text-secondary">
          {row.banner
            ? `${row.banner.title}. ${row.banner.body}`
            : status === "ready"
              ? row.footer
              : "Runs in the background. You can leave, and we'll notify you as each piece is ready."}
        </p>
        {row.meta && <p className="text-sm leading-sm text-text-tertiary">{row.meta}</p>}
        {job.blocked === "credits" && (
          <button type="button" onClick={() => setBuying(true)} className="-my-3 min-h-[40px] w-fit text-md font-medium leading-md text-text-brand hover:underline">
            Buy credits
          </button>
        )}
        {row.actions === "cancelQueued" && (
          <button type="button" onClick={() => cancelBuild(job.id)} className="-my-3 min-h-[40px] w-fit text-md font-medium leading-md text-text-brand hover:underline">
            Cancel this build
          </button>
        )}
        {row.actions === "retryAll" && (
          <button type="button" onClick={() => retryBuild(job.id)} className="-my-3 inline-flex min-h-[40px] w-fit items-center gap-2 text-md font-medium leading-md text-text-brand hover:underline">
            Try this build again <CreditBadge credits={jobCost(job)} />
          </button>
        )}
        {isOverrunning(job, now) && (
          <button type="button" onClick={() => failBuildSystem(job.id)} className="-my-3 min-h-[40px] w-fit text-md font-medium leading-md text-text-error hover:underline">
            Stop and refund
          </button>
        )}
      </div>

      {products.length > 1 && (
        <div role="tablist" aria-label="Products" className="-mx-8 flex gap-4 overflow-x-auto px-8 [scrollbar-width:none]">
          {products.map((p) => {
            const live = p.items.filter((i) => i.status !== "skipped");
            const pct = live.length ? Math.round(live.reduce((s, i) => s + i.progress, 0) / live.length) : 0;
            const on = p.id === shown.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onProduct(p.id)}
                className={cn(
                  "inline-flex min-h-[40px] shrink-0 items-center gap-3 rounded-full px-6 text-md leading-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  on ? "border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface text-text-primary" : "text-text-secondary",
                )}
              >
                {p.name}
                <span className="rounded-full bg-bg-subtle px-3 text-xs leading-xs tabular-nums text-text-secondary">{pct}%</span>
              </button>
            );
          })}
        </div>
      )}

      <ul className="flex flex-col gap-4" aria-label={`${shown.name} pieces`}>
        {shown.items
          .filter((i) => i.status !== "skipped" || i.omitted)
          .map((item) => {
            const word = pieceWord(
              { kind: item.kind, status: item.status, progress: item.progress, omitted: item.omitted },
              pieces,
              { systemFailure, queued: status === "queued" },
            );
            const failed = item.status === "failed" && !systemFailure;
            return (
              <li key={item.kind}>
                <div
                  className={cn(
                    CARD,
                    "flex flex-col gap-3 p-6",
                    failed && "border-border-error",
                  )}
                >
                  <div className="flex items-center gap-5">
                    <span
                      className={cn(
                        "inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg",
                        failed ? "bg-bg-error-subtle text-[color:var(--color-icon-error)]" : "bg-bg-brand-subtle text-[color:var(--color-icon-brand)]",
                      )}
                    >
                      <Icon icon={PIECE_ICON[item.kind]} size={18} />
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push(`/m/ai/build/${job.id}?product=${shown.id}&tab=${item.kind}`)}
                      className="min-w-0 flex-1 text-left text-lg leading-lg text-text-primary outline-none focus-visible:underline"
                    >
                      {PIECE_ROW_LABEL[item.kind]}
                    </button>
                    <span
                      className={cn(
                        "shrink-0 text-sm leading-sm",
                        word.tone === "done" && "text-text-success",
                        word.tone === "error" && "text-text-error",
                        word.tone === "working" && "text-text-brand",
                        (word.tone === "plain" || word.tone === "muted") && "text-text-secondary",
                      )}
                    >
                      {item.status === "building" ? "Building" : word.word}
                    </span>
                    {(item.status === "building" || item.status === "ready") && (
                      <ProgressRing value={item.status === "ready" ? 100 : item.progress} label={`${PIECE_ROW_LABEL[item.kind]} progress`} size={36} />
                    )}
                    {failed && (
                      <button
                        type="button"
                        onClick={() => retryBuildItem(job.id, item.kind, shown.id)}
                        aria-label={`Retry ${ITEM_LABELS[item.kind]} — free`}
                        className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-full bg-bg-error text-[color:var(--color-icon-on-brand)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <Icon icon={Refresh01Icon} size={18} />
                      </button>
                    )}
                  </div>
                  {failed && <p className="text-sm leading-sm text-text-secondary">{failedPieceNote(item.kind, pieces)}</p>}
                </div>
              </li>
            );
          })}
      </ul>
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} need={jobCost(job)} />
    </section>
  );
}

// ─────────────────────────── finished (18) ───────────────────────────

export function FinishedCard({
  job,
  flow,
  onSave,
  onOpenConcept,
}: {
  job: BuildJob;
  flow: ConceptFlow;
  onSave: () => void;
  onOpenConcept: (productId: string) => void;
}) {
  const products = productsOf(job);
  const live = allItems(job).filter((i) => i.status !== "skipped");
  const name = flow.projectName || job.projectChoiceName?.trim() || job.title;
  const saved = flow.saveInfo?.mode.kind === "saved" ? flow.saveInfo.mode.project : null;
  const each = new Set(products.map((p) => p.items.filter((i) => i.status !== "skipped").length));
  return (
    <section aria-label="Build finished" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-success)] bg-bg-success-subtle px-8 py-10 text-center">
        <span className="inline-flex size-[44px] items-center justify-center rounded-full bg-bg-success text-[color:var(--color-icon-on-brand)]">
          <Icon icon={CheckmarkCircle02Icon} size={24} />
        </span>
        <p className="text-2xl font-semibold leading-2xl text-text-success">All {live.length} pieces are ready</p>
        <p className="text-sm leading-sm text-text-secondary">
          {saved
            ? `Saved to ${saved.name}. Open the project for what's next.`
            : flow.saveInfo?.mode.kind === "join"
              ? `Add ${products.length > 1 ? "these products" : job.title} to ${flow.saveInfo.mode.project.name} to keep every deliverable with the project.`
              : products.length > 1
              ? `Save “${name}” to keep ${products.length === 2 ? "both" : "all"} products and every deliverable together.`
              : `Save “${name}” to keep the product and every deliverable together.`}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-4">
        {[
          [String(products.length), products.length === 1 ? "Product" : "Products"],
          [String(live.length), "Ready pieces"],
          [each.size === 1 ? String([...each][0]) : "—", "Pieces each"],
        ].map(([v, k]) => (
          <div key={k} className={cn(CARD, "flex flex-col gap-1 p-6")}>
            <dd className="text-2xl font-semibold leading-2xl text-text-brand">{v}</dd>
            <dt className="text-sm leading-sm text-text-secondary">{k}</dt>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium leading-lg text-text-primary">Source concepts</h3>
          <span className="text-sm leading-sm text-text-tertiary">Read only</span>
        </div>
        <ul className="flex flex-col gap-3">
          {products.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpenConcept(p.id)}
                className={cn(CARD, "flex w-full items-center gap-5 p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
              >
                <span className="relative size-[48px] shrink-0 overflow-hidden rounded-lg bg-bg-subtle">
                  {p.conceptImageUrl && <Image src={p.conceptImageUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-md font-medium leading-md text-text-primary">{p.name}</span>
                  <span className="text-sm leading-sm text-text-success">
                    Concept ready · {p.items.filter((i) => i.status !== "skipped").length} pieces
                  </span>
                </span>
                <Icon icon={ArrowRight01Icon} size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-success)] bg-bg-success-subtle p-6 text-sm leading-sm text-text-primary">
        <span className="text-[color:var(--color-icon-success)]">
          <Icon icon={CheckmarkCircle02Icon} size={20} />
        </span>
        Saving keeps your concepts, build history and deliverables linked.
      </p>
      <div className="flex flex-col gap-4">
        {saved ? (
          <Link href={`/m/projects/${saved.id}`} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
            View project
          </Link>
        ) : (
          <Button size="xl" className="w-full" iconLeading={<Icon icon={FloppyDiskIcon} size={20} />} onClick={onSave}>
            {flow.saveInfo?.mode.kind === "join"
              ? `Add to ${flow.saveInfo.mode.project.name}`
              : flow.saveInfo?.mode.kind === "version"
                ? `Save version ${flow.saveInfo.mode.version}`
                : "Save project"}
          </Button>
        )}
        <Link href={`/m/ai/build/${job.id}`} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
          Review the pieces
        </Link>
      </div>
    </section>
  );
}
