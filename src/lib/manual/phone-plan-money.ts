// Earn › Business plan and Earn › Money on the phone (mobile Figma "Project
// Details · 2026 update" 16–16o, 17–17j): the small choices the phone makes
// over the web's own logic. The plan's store, runner and words stay the
// web's (business-plan.ts, plan-runner.tsx, plan-section.tsx); the money's
// stay contributors.ts, customers.ts, legal.ts and account/payout.ts (the
// per-coin sum stays in the Sales screen: engineering doesn't import wallet).
//
// Pure. Value imports are relative, so node:test loads the compiled module.

import { PLAN_SECTIONS, planChipState, type BusinessPlan, type PlanSection, type PlanVersion } from "./business-plan";
import { formatDate } from "./project-summary";

const TOTAL = PLAN_SECTIONS.length;

// ─────────────────────────── the business plan ───────────────────────────

/** The web's four states (`planChipState`), and 16i: a plan whose only
 *  version has no section written (every one failed) reads as "the plan
 *  couldn't be written" instead of seven "Couldn't write …" lines. With an
 *  earlier version to go back to, it stays "ready": each failed section
 *  offers Try again, and the versions sheet the way back. */
export type PhonePlanState = "none" | "writing" | "interrupted" | "failed" | "ready";

export function currentVersionOf(plan: BusinessPlan | null): PlanVersion | null {
  return plan?.versions.find((v) => v.n === plan.current) ?? null;
}

export function phonePlanState(plan: BusinessPlan | null, live: boolean): PhonePlanState {
  const chip = planChipState(plan, { live });
  if (chip !== "ready") return chip;
  const current = currentVersionOf(plan);
  if (!current) return "none";
  const done = current.sections.some((s) => s.state === "done");
  const failed = current.sections.some((s) => s.state === "failed");
  return !done && failed && plan!.versions.length === 1 ? "failed" : "ready";
}

/** The Generate sheet's prefill (P2-TABS-14, the web's `promptSeed`): the project description, then its product names. */
export function planPromptSeed(description: string, productNames: readonly string[]): string {
  const desc = description.trim();
  const names = productNames.filter(Boolean);
  if (!names.length) return desc;
  return desc ? `${desc}\n\nProducts: ${names.join(", ")}.` : `Products: ${names.join(", ")}.`;
}

/** The run row's line while it writes (16g) and once it stopped (16h), in the web's words. */
export function runLineOf(run: NonNullable<BusinessPlan["run"]>, live: boolean): string {
  return live ? `Writing business plan · ${run.next} of ${TOTAL}` : `Writing stopped with ${TOTAL + 1 - run.next} of ${TOTAL} sections left.`;
}

/** The run's progress, 0–100: the sections before the one being written. */
export function runProgressOf(run: NonNullable<BusinessPlan["run"]>): number {
  return ((run.next - 1) / TOTAL) * 100;
}

/** "Smart Plant Watering Kit · Version 1 · Generated Oct 28, 2026 · 7 sections". */
export function planMetaLine(projectName: string, version: PlanVersion): string {
  const done = version.sections.filter((s) => s.state === "done").length;
  return `${projectName} · Version ${version.n} · Generated ${formatDate(version.createdAt)} · ${done} sections`;
}

/** The plan without version `n` and without a run: what Start over (16h) and
 *  Try again (16i) clear before a fresh run, so a half-written or failed
 *  version never stays behind. `current` falls back to the newest left. */
export function withoutVersion(plan: BusinessPlan, n: number): BusinessPlan {
  const versions = plan.versions.filter((v) => v.n !== n);
  const current = versions.some((v) => v.n === plan.current) ? plan.current : versions.length ? Math.max(...versions.map((v) => v.n)) : 0;
  return { v: 1, projectId: plan.projectId, current, versions };
}

/** The Ready sheet's preview (16f, the web's Ready dialog): Identity and Market research, once written. */
export function readyPreviewOf(version: PlanVersion): PlanSection[] {
  return version.sections.filter((s) => s.state === "done" && (s.kind === "identity" || s.kind === "market")).slice(0, 2);
}

/** "7 sections · saved to this project". */
export function readyLineOf(version: PlanVersion): string {
  return `${version.sections.filter((s) => s.state === "done").length} sections · saved to this project`;
}

/** Why ⋯'s Edit and Regenerate are left out of the menu, or null when both are there. */
export function planMenuNote(midRun: boolean): string | null {
  return midRun ? "Edit and Regenerate are available once the plan has finished writing." : null;
}

/** Sections the phone edits one at a time (16k): the written ones. */
export function editableSections(version: PlanVersion): PlanSection[] {
  return version.sections.filter((s) => s.state === "done");
}

/** "{n} of 5 versions kept — the oldest is removed when a 6th is made." (the web's versions footer). */
export function versionsKeptLine(count: number): string {
  return `${count} of 5 versions kept — the oldest is removed when a 6th is made.`;
}

// ─────────────────────────── money ───────────────────────────


/** A sale row's second line: "Main NFT · 10% share", or the edition's name. */
export function saleItemLine(text: { item: string; share: string | null }): string {
  return text.share ? `${text.item} · ${text.share} share` : text.item;
}

/** A sale row's date side: "Oct 28, 2026 · 2 benefits", or "· —" with none. */
export function saleWhenLine(at: number, benefits: string | null): string {
  return `${formatDate(at)} · ${benefits ?? "—"}`;
}

/** `?sale=<id>` read once: the sale it names, when this project has it. */
export function saleFromQuery<T extends { saleId: string }>(rows: readonly T[], raw: string | null): T | null {
  if (!raw) return null;
  return rows.find((r) => r.saleId === raw) ?? null;
}
