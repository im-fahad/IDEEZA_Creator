"use client";

// 04 · Activity tab (M3; 04, 04d, 04g, 04h, 04i, 04m, 04n, 04t): the web's
// Activity History drawer as a tab, the project's own journey, newest first
// (`historyOf`, the synthesized Planning last). "+ Add new activity" (A01
// Tonal: the bar's Publish is the screen's one primary) opens the full-screen
// form. Each entry: its type and the ? help (a sheet, the phone has no hover),
// the date, the description, the price snapshot taken while it was listed
// (04i; a tap opens the prices), its proof — photo, video and file tiles that
// open the proof viewer (04n) and link rows that ask first (04h) — and ⋮ with
// Edit Activity · Delete Activity (04d), Delete asking first (04g). Planning is
// made automatically, so it has no ⋮.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Doc01Icon,
  HelpCircleIcon,
  MoreVerticalIcon,
  PencilEdit01Icon,
  Pdf01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { getMediaFile, removeActivity, useJourney } from "@/lib/manual/journey-store";
import { helpOf, historyOf, labelOf, type JourneyEntry, type MediaRef, type PriceSnapshot } from "@/lib/manual/journey";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { formatAmount } from "@/lib/manual/rail-copy";
import { phoneProjectPath } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ActionSheet, Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { useProject } from "./context";
import { LIST_CARD, LIST_ROW } from "./parts";

export function ActivityTab() {
  const { project, view, viewer } = useProject();
  const router = useRouter();
  const { record } = useJourney(project.id);
  const toast = useToast();
  const entries = historyOf(record, project.id, { kind: "project" }, project.createdAt);
  const canWrite = can(viewer, "activity.write", view.canCtx);
  const [actions, setActions] = React.useState<JourneyEntry | null>(null);
  const [deleting, setDeleting] = React.useState<JourneyEntry | null>(null);
  const [help, setHelp] = React.useState<JourneyEntry | null>(null);
  const [link, setLink] = React.useState<string | null>(null);
  const [prices, setPrices] = React.useState<PriceSnapshot | null>(null);
  const [viewing, setViewing] = React.useState<{ media: MediaRef[]; index: number } | null>(null);
  const editHref = (e: JourneyEntry) => phoneProjectPath(project.id, `activity/${encodeURIComponent(e.id)}`);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-sm text-text-secondary">
        {project.name} · newest first.
        {canWrite && entries.some((e) => !e.isDefault) && (
          <>
            {" "}Use <Icon icon={MoreVerticalIcon} size={14} className="inline align-[-2px]" />
            <span className="sr-only">⋮</span> to edit a stage.
          </>
        )}
      </p>
      {canWrite && (
        <Link href={phoneProjectPath(project.id, "activity/new")} className={cn(buttonVariants({ hierarchy: "tonal", size: "xl" }), "w-full")}>
          <Icon icon={Add01Icon} size={20} />
          Add new activity
        </Link>
      )}
      <ul aria-label="Activity" className={LIST_CARD}>
        {entries.map((e) => (
          <li key={e.id} className={cn(LIST_ROW, "flex flex-col gap-4 p-8")}>
            <div className="flex items-center gap-2">
              <span className="text-md font-semibold leading-md text-text-primary">{labelOf(e)}</span>
              {helpOf(e) && (
                <button
                  type="button"
                  aria-label={`What is ${labelOf(e)}?`}
                  aria-haspopup="dialog"
                  onClick={() => setHelp(e)}
                  className="inline-flex size-[44px] -my-6 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <Icon icon={HelpCircleIcon} size={20} />
                </button>
              )}
              <span className="flex-1" />
              {canWrite && !e.isDefault && (
                <button
                  type="button"
                  aria-label={`Actions for ${labelOf(e)}`}
                  aria-haspopup="dialog"
                  onClick={() => setActions(e)}
                  className="inline-flex size-[44px] -my-6 -mr-4 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <Icon icon={MoreVerticalIcon} size={20} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <time dateTime={new Date(e.createdAt).toISOString()} className="text-sm leading-sm text-text-secondary">
                {formatDate(e.createdAt)}
              </time>
              <p className="whitespace-pre-line break-words text-md leading-md text-text-primary">{e.isDefault ? "Project created." : e.description}</p>
            </div>
            {e.pricing && <PriceLine pricing={e.pricing} onOpen={() => setPrices(e.pricing!)} />}
            {e.media.length > 0 && (
              <ul className="flex flex-wrap gap-4">
                {e.media.map((m, i) => (
                  <li key={m.id}>
                    <ProofTile media={m} onOpen={() => setViewing({ media: e.media, index: i })} />
                  </li>
                ))}
              </ul>
            )}
            {e.urls.length > 0 && (
              <ul className="flex flex-col">
                {e.urls.map((u, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => setLink(u)}
                      className="flex min-h-[44px] w-full items-center gap-6 text-left outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle"
                    >
                      <span className="w-[56px] shrink-0 text-md leading-md text-text-secondary">Link</span>
                      <span className="min-w-0 flex-1 truncate text-md leading-md text-text-primary">{u.replace(/^https:\/\//i, "")}</span>
                      <Icon icon={ArrowRight01Icon} size={20} className="shrink-0 text-[color:var(--color-icon-default)]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <ActionSheet
        open={actions !== null}
        onClose={() => setActions(null)}
        title={actions ? `${labelOf(actions)} · ${formatDate(actions.createdAt)}` : undefined}
        items={
          actions
            ? [
                { label: "Edit Activity", icon: PencilEdit01Icon, onSelect: () => router.push(editHref(actions)) },
                { label: "Delete Activity", icon: Delete02Icon, destructive: true, onSelect: () => setDeleting(actions) },
              ]
            : []
        }
      />
      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this activity?"
        body={
          deleting
            ? `“${labelOf(deleting)}” (${formatDate(deleting.createdAt)}). Its files, links and prices are removed from this browser. This can't be undone.`
            : null
        }
        verb="Delete activity"
        destructive
        onConfirm={async () => {
          const e = deleting;
          if (!e) return;
          const out = await removeActivity(project.id, e.id);
          toast(out.ok ? { title: `${labelOf(e)} deleted` } : { title: "Couldn't delete it — this browser's storage refused.", lead: "error" });
        }}
      />
      <Sheet open={help !== null} onClose={() => setHelp(null)} title={help ? `What is ${labelOf(help)}?` : ""}>
        {help && <p className="pb-8 text-md leading-md text-text-secondary">{helpOf(help)}</p>}
      </Sheet>
      <ConfirmSheet
        open={link !== null}
        onClose={() => setLink(null)}
        title="Open this link in a new tab?"
        body={
          <>
            <span className="block break-all font-medium text-text-primary">{link}</span>
            <span className="mt-2 block">It leaves IDEEZA — only open links you trust.</span>
          </>
        }
        verb="Open link"
        onConfirm={() => {
          if (link) window.open(link, "_blank", "noopener,noreferrer");
        }}
      />
      <PricesSheet pricing={prices} onClose={() => setPrices(null)} />
      <ProofViewer viewing={viewing} onIndex={(index) => setViewing((v) => (v ? { ...v, index } : v))} onClose={() => setViewing(null)} />
    </div>
  );
}

// ─────────────────────────── 04i · the price snapshot ───────────────────────────

function minAmount(values: string[]): string {
  const nums = values.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? String(Math.min(...nums)) : "";
}

function PriceLine({ pricing, onOpen }: { pricing: PriceSnapshot; onOpen: () => void }) {
  const physical = pricing.editions.filter((e) => e.kind === "physical");
  const virtual = pricing.editions.filter((e) => e.kind === "virtual");
  if (!pricing.main && !physical.length && !virtual.length) return null;
  return (
    <button type="button" aria-haspopup="dialog" onClick={onOpen} className="flex flex-wrap items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
      {pricing.main && <Badge tone="blue">Main {formatAmount(pricing.main, pricing.token)}</Badge>}
      {physical.length > 0 && (
        <Badge tone="blue">Physical from {formatAmount(minAmount(physical.flatMap((r) => [r.regular, r.extended])), pricing.token)}</Badge>
      )}
      {virtual.length > 0 && (
        <Badge tone="blue">Virtual from {formatAmount(minAmount(virtual.flatMap((r) => [r.regular, r.extended])), pricing.token)}</Badge>
      )}
      <TestnetDemoBadge />
    </button>
  );
}

const USE_LABEL = { private: "Private use", commercial: "Commercial use" } as const;

function PricesSheet({ pricing, onClose }: { pricing: PriceSnapshot | null; onClose: () => void }) {
  const { view } = useProject();
  const nameOf = (id: string) => view.products.find((p) => p.id === id)?.name ?? "A product";
  return (
    <Sheet open={pricing !== null} onClose={onClose} title="Prices" description="Listed prices when this entry was added — Testnet demo.">
      {pricing && (
        <div className="flex flex-col gap-6 pb-8">
          {pricing.main && (
            <div className="flex items-center justify-between text-md leading-md">
              <span className="text-text-secondary">Main NFT</span>
              <span className="text-text-primary">{formatAmount(pricing.main, pricing.token)}</span>
            </div>
          )}
          {pricing.editions.map((r, i) => (
            <div key={i} className="flex flex-col gap-2">
              <p className="text-md font-medium leading-md text-text-tertiary">
                {nameOf(r.productId)} · {r.kind === "physical" ? "Physical" : "Virtual"}
              </p>
              <div className="flex items-center justify-between text-md leading-md">
                <span className="text-text-secondary">{USE_LABEL[r.use]} · Regular</span>
                <span className="text-text-primary">{formatAmount(r.regular, pricing.token)}</span>
              </div>
              <div className="flex items-center justify-between text-md leading-md">
                <span className="text-text-secondary">{USE_LABEL[r.use]} · Extended</span>
                <span className="text-text-primary">{formatAmount(r.extended, pricing.token)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// ─────────────────────────── the proof (04m, 04n) ───────────────────────────

/** A stored proof file's object URL, read from the journey's media store. */
export function useMediaUrl(key: string | null): string | null {
  const [url, setUrl] = React.useState<{ key: string; url: string | null } | null>(null);
  React.useEffect(() => {
    if (!key) return;
    let alive = true;
    let made: string | null = null;
    void getMediaFile(key).then((blob) => {
      if (!alive) return;
      made = blob ? URL.createObjectURL(blob) : null;
      setUrl({ key, url: made });
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [key]);
  return url && url.key === key ? url.url : null;
}

export function ProofTile({ media, onOpen }: { media: MediaRef; onOpen: () => void }) {
  const url = useMediaUrl(media.kind === "image" ? media.blobKey : (media.posterKey ?? null));
  return (
    <button
      type="button"
      aria-label={`Open ${media.name}`}
      aria-haspopup="dialog"
      onClick={onOpen}
      className="relative flex size-[56px] items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a proof file from this browser
        <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-[color:var(--color-icon-secondary)]">
          <Icon icon={media.kind === "pdf" ? Pdf01Icon : Doc01Icon} size={20} />
          <span className="text-xs leading-xs text-text-secondary">{media.kind === "pdf" ? "PDF" : media.kind === "video" ? "Video" : "DOC"}</span>
        </span>
      )}
    </button>
  );
}

export function ProofViewer({
  viewing,
  onIndex,
  onClose,
}: {
  viewing: { media: MediaRef[]; index: number } | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const m = viewing ? viewing.media[viewing.index] : null;
  const url = useMediaUrl(m?.blobKey ?? null);
  const count = viewing?.media.length ?? 0;
  return (
    <Sheet
      open={viewing !== null}
      onClose={onClose}
      title={m?.name ?? ""}
      description={viewing && count > 1 ? `${viewing.index + 1} of ${count}` : undefined}
      actions={
        viewing && count > 1 ? (
          <div className="flex gap-6">
            <Button hierarchy="secondary" size="xl" className="flex-1" onClick={() => onIndex((viewing.index - 1 + count) % count)}>
              Previous
            </Button>
            <Button hierarchy="secondary" size="xl" className="flex-1" onClick={() => onIndex((viewing.index + 1) % count)}>
              Next
            </Button>
          </div>
        ) : undefined
      }
    >
      {m && (
        <div className="flex flex-col gap-6 pb-8">
          {!url ? (
            <p className="text-md leading-md text-text-secondary">This file isn&apos;t in this browser any more.</p>
          ) : m.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- a proof file from this browser
            <img src={url} alt={m.name} className="max-h-[60vh] w-full rounded-md bg-bg-inverse object-contain" />
          ) : m.kind === "video" ? (
            <video src={url} controls playsInline aria-label={m.name} className="max-h-[60vh] w-full rounded-md bg-bg-inverse" />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" download={m.name} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
              <Icon icon={m.kind === "pdf" ? Pdf01Icon : Doc01Icon} size={20} />
              Open {m.kind === "pdf" ? "the PDF" : "the document"}
            </a>
          )}
        </div>
      )}
    </Sheet>
  );
}
