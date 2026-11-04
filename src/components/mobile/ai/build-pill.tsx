"use client";

// Build queue popups (10706:6681, 01–06): a build keeps running while the
// maker is elsewhere, and a small pill under the top bar says where it is —
// queued (and how many are ahead), starting, building with its percentage
// and time left, then ready to review, needing a retry, stopped or paused.
// The words are the web's (attention-banner.tsx), worked out by `pillOf`.
// A running build's pill stays while it runs; the rest say it once (6 s).
// Tapping opens the build's chat; on that chat the pill says nothing, since
// the build is already in front of the maker.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Alert02Icon, CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { allItems, productsOf, queuedAhead, statusOf, useCreateHistory, ITEM_LABELS, type BuildJob } from "@/lib/create/history";
import { chainSeconds, choiceOfItem, pieceSeconds } from "@/lib/create/pieces";
import { pillOf, type Pill } from "@/lib/mobile-ai/flow";
import { cn } from "@/lib/utils";
import { useFramed } from "../device";

const SAY_ONCE_MS = 6_000;
/** Under this long since it started, a running build is "just started". */
const STARTING_MS = 4_000;

/** Seconds the slowest product still needs, from each piece's own estimate. */
export function secondsLeftOf(job: BuildJob): number {
  let most = 0;
  for (const p of productsOf(job)) {
    const sec: Partial<Record<(typeof p.items)[number]["kind"], number>> = {};
    for (const it of p.items) {
      if (it.status !== "building" && it.status !== "pending") continue;
      sec[it.kind] = pieceSeconds(it.kind, choiceOfItem(it)) * (1 - it.progress / 100);
    }
    most = Math.max(most, chainSeconds(sec));
  }
  return Math.round(most);
}

function failedNames(job: BuildJob): string[] {
  const products = productsOf(job);
  const multi = products.length > 1;
  return products.flatMap((p) =>
    p.items.filter((i) => i.status === "failed").map((i) => (multi ? `${p.name} ${ITEM_LABELS[i.kind]}` : ITEM_LABELS[i.kind])),
  );
}

export function pillForJob(job: BuildJob, builds: BuildJob[], now: number): Pill | null {
  const status = statusOf(job);
  const live = allItems(job).filter((i) => i.status !== "skipped");
  const percent = live.length ? live.reduce((s, i) => s + i.progress, 0) / live.length : 0;
  return pillOf({
    status,
    name: job.projectChoiceName?.trim() || job.title,
    ahead: queuedAhead(job, builds),
    percent,
    secondsLeft: secondsLeftOf(job),
    justStarted: !!job.startedAt && now - job.startedAt < STARTING_MS,
    blocked: job.blocked,
    systemFailure: job.failure === "system",
    refunded: job.creditsRefunded,
    failed: failedNames(job),
    saved: !!job.projectId,
  });
}

export function BuildPill() {
  const { hydrated, builds } = useCreateHistory();
  const pathname = usePathname();
  const router = useRouter();
  const framed = useFramed();
  const [now, setNow] = React.useState(() => Date.now());
  // The building one first; else the newest, whose news is said once.
  const job = React.useMemo(() => {
    const sorted = [...builds].sort((a, b) => b.updatedAt - a.updatedAt);
    return sorted.find((b) => ["queued", "running"].includes(statusOf(b)) && !b.blocked) ?? sorted[0] ?? null;
  }, [builds]);
  const pill = job ? pillForJob(job, builds, now) : null;
  const key = job && pill ? `${job.id}:${pill.tone}:${pill.lasting ? "on" : pill.title}` : null;
  const [seenAt, setSeenAt] = React.useState<{ key: string; at: number } | null>(null);
  if (key && seenAt?.key !== key) setSeenAt({ key, at: now });

  // Ticks while something is shown, so "about 2 min left" and the one-time
  // pills move on their own.
  const showing = !!pill && (pill.lasting || (seenAt !== null && now - seenAt.at < SAY_ONCE_MS));
  React.useEffect(() => {
    if (!pill) return;
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, [pill]);

  if (!hydrated || !job || !pill || !showing) return null;
  // A build that was already finished before this screen opened has nothing new to say.
  if (!pill.lasting && job.updatedAt < (seenAt?.at ?? now) - SAY_ONCE_MS) return null;
  if (pathname === `/m/ai/chat/${job.chatId}`) return null;

  const glyph = pill.tone === "done" ? CheckmarkCircle02Icon : pill.tone === "working" ? Loading03Icon : Alert02Icon;
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-toast flex justify-center px-8",
        framed ? "top-[117px]" : "top-[calc(env(safe-area-inset-top)_+_64px)]",
      )}
    >
      <button
        type="button"
        role="status"
        onClick={() => router.push(`/m/ai/chat/${job.chatId}`)}
        className={cn(
          "pointer-events-auto flex max-w-full items-center gap-4 rounded-md border-[length:var(--border-width-1)] border-solid px-6 py-3 text-left shadow-2 outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal focus-visible:ring-2 focus-visible:ring-border-focus",
          pill.tone === "error"
            ? "border-border-error bg-bg-error-subtle text-text-error"
            : pill.tone === "attention"
              ? "border-[var(--color-border-warning)] bg-bg-warning-subtle text-text-primary"
              : "border-border-subtle bg-bg-surface text-text-primary",
        )}
      >
        <span
          className={cn(
            "inline-flex shrink-0",
            pill.tone === "working" && "text-[color:var(--color-icon-brand)] motion-safe:animate-spin",
            pill.tone === "done" && "text-[color:var(--color-icon-success)]",
            pill.tone === "error" && "text-[color:var(--color-icon-error)]",
            pill.tone === "attention" && "text-[color:var(--color-icon-warning)]",
          )}
        >
          <Icon icon={glyph} size={16} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm leading-sm">{pill.title}</span>
          {pill.detail && <span className="truncate text-sm leading-sm opacity-90">{pill.detail}</span>}
        </span>
      </button>
    </div>
  );
}
