"use client";

// The Overview tab (Product Details 10, 10e, 10u, 10x, 29a, 31b) — the web
// rail's blocks in one column:
// · Activity (the owner's; everyone else reads it in the header);
// · Marketplace (the buyer's side, 10x): Physical NFT · Virtual NFT, the
//   collection and chain, each listed copy's use, NFTs sold, This version /
//   With future updates and Royalties — the web's EditionBlock, buyers'
//   words. One buy path: the sticky bar;
// · Specs: the booked facts (`productFacts`), "Worked out from the parts."
//   for a build that predates the spec, and the owner's part changes (29a);
// · Build check: the web's chip and line (`checkWordsOf`), See why opening
//   the grouped checks in a sheet (10q, 29b) with the web's credit note.

import * as React from "react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { GROUP_LABEL, GROUP_ORDER } from "@/components/create/confidence-badge";
import { checkWordsOf } from "@/components/projects/product/product-facts";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import { TIER_WORD } from "@/components/marketplace/purchase-dialog";
import { bookedSpec, specOfSource } from "@/lib/create/build-artifacts";
import {
  DRAFT_CREDIT_NOTE,
  DRAFT_PARTLY_CHECKED_MEANING,
  DRAFT_UNCHECKED_MEANING,
  TIER_MEANING,
  type ProductConfidence,
} from "@/lib/create/confidence";
import { productFacts } from "@/lib/manual/products-tab-view";
import { editionChainOf, KIND_WORD, trackCardOf, tracksOf } from "@/lib/market/editions";
import { USE_LABEL } from "@/lib/market/sell-flow";
import type { EditionKind, EditionTrack, EditionUse } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { InfoRow, LIST_CARD, ListCard, SectionHeading } from "../project/parts";
import { ActivitySection } from "./activity";
import { useProduct } from "./use-product";

export function OverviewTab() {
  const { mode, buyer, bp, confidence } = useProduct();
  return (
    <div className="flex flex-col gap-12">
      {mode === "owner" && <ActivitySection />}
      {buyer && <MarketplaceBlock />}
      {bp && <SpecsSection />}
      {confidence && <BuildCheckSection confidence={confidence} />}
    </div>
  );
}

// ─────────────────────────── Specs (10, 29a) ───────────────────────────

function SpecsSection() {
  const { bp, partChanges } = useProduct();
  if (!bp) return null;
  const facts = productFacts(specOfSource(bp), bp.parts);
  if (!facts.length && !partChanges) return null;
  return (
    <section aria-labelledby="pd-specs" className="flex flex-col gap-4">
      <SectionHeading id="pd-specs" title="Specs" />
      {facts.length > 0 && (
        <ListCard label="Specs">
          {facts.map((f) => (
            <InfoRow key={f.label} label={f.label} value={f.value} />
          ))}
        </ListCard>
      )}
      {!bookedSpec(bp) && facts.length > 0 && <p className="text-sm leading-sm text-text-secondary">Worked out from the parts.</p>}
      {partChanges && <p className="text-md leading-md text-text-secondary">Built with your part changes: {partChanges}</p>}
    </section>
  );
}

// ─────────────────────────── Build check (10, 10q, 29a, 29b) ───────────────────────────

const CHIP_TONE: Record<"ok" | "warn" | "quiet", BadgeTone> = { ok: "success", warn: "warning", quiet: "neutral" };

function BuildCheckSection({ confidence }: { confidence: ProductConfidence }) {
  const [open, setOpen] = React.useState(false);
  const words = checkWordsOf(confidence);
  return (
    <section aria-labelledby="pd-check" className="flex flex-col gap-4">
      <SectionHeading id="pd-check" title="Build check" />
      <div className={cn(LIST_CARD, "gap-4 p-8")}>
        <div>
          <Badge tone={CHIP_TONE[words.tone]}>{words.chip}</Badge>
        </div>
        <p className="text-md leading-md text-text-primary">{words.line}</p>
        {confidence.tier === "draft" && (
          <div>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setOpen(true)}
              className="-my-6 inline-flex min-h-[44px] items-center text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:underline"
            >
              See why
            </button>
          </div>
        )}
      </div>
      <SeeWhySheet open={open} onClose={() => setOpen(false)} confidence={confidence} />
    </section>
  );
}

const ROW_TONE = { notRun: "neutral", found: "warning", passed: "success" } as const;

export function SeeWhySheet({ open, onClose, confidence }: { open: boolean; onClose: () => void; confidence: ProductConfidence }) {
  const { chat } = useProduct();
  const words = checkWordsOf(confidence);
  const found = confidence.issues.filter((i) => !i.notRun).length;
  const meaning =
    confidence.tier === "draft" && found === 0
      ? confidence.passed.length
        ? DRAFT_PARTLY_CHECKED_MEANING
        : DRAFT_UNCHECKED_MEANING
      : TIER_MEANING[confidence.tier];
  const groups = GROUP_ORDER.map((group) => ({
    group,
    rows: [
      ...confidence.issues.filter((i) => i.group === group).map((i) => ({ text: i.text, tone: i.notRun ? ("notRun" as const) : ("found" as const) })),
      ...(group === "assembly" ? confidence.passed.map((text) => ({ text, tone: "passed" as const })) : []),
    ],
  })).filter((g) => g.rows.length > 0);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Build check"
      actions={
        chat ? (
          <Link href={`/m/ai?chat=${encodeURIComponent(chat.id)}`} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
            Open chat
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-8 pb-8">
        <div className="flex flex-col gap-3">
          <div>
            <Badge tone={CHIP_TONE[words.tone]}>{words.chip}</Badge>
          </div>
          <p className="text-md leading-md text-text-primary">{meaning}</p>
        </div>
        {groups.map((g) => (
          <section key={g.group} className="flex flex-col gap-4">
            <h3 className="text-md font-semibold leading-md text-text-primary">{GROUP_LABEL[g.group]}</h3>
            <ul className="flex flex-col gap-4">
              {g.rows.map((r) => (
                <li key={r.text} className="flex items-start gap-4">
                  <Badge tone={ROW_TONE[r.tone]} className="mt-1 shrink-0">
                    {r.tone === "notRun" ? "Not run" : r.tone === "found" ? "Found" : "Passed"}
                  </Badge>
                  <span className="min-w-0 text-md leading-md text-text-secondary">{r.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="flex items-start gap-3 border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-6 text-sm leading-sm text-text-secondary">
          <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-secondary)]">
            <Icon icon={InformationCircleIcon} size={14} />
          </span>
          {DRAFT_CREDIT_NOTE}
        </p>
      </div>
    </Sheet>
  );
}

// ─────────────────────────── Marketplace (10x) ───────────────────────────

const KINDS: EditionKind[] = ["physical", "virtual"];
const USES: EditionUse[] = ["private", "commercial"];

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** What buyers can see of this product: its listed copies, until the project is sold in full. */
export function useListedCopies(): Listed[] {
  const { view, product } = useProduct();
  return React.useMemo(
    () => (view.lock !== null ? [] : tracksOf(product.id, view.editions).filter((t): t is Listed => t.listing !== null)),
    [view.lock, view.editions, product.id],
  );
}

function MarketplaceBlock() {
  const { view, name } = useProduct();
  const tracks = useListedCopies();
  const firstKind = KINDS.find((k) => tracks.some((t) => t.kind === k)) ?? "physical";
  const [kind, setKind] = React.useState<EditionKind>(firstKind);
  if (!tracks.length) return null;
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  const ofKind = tracks.filter((t) => t.kind === kind).sort((a, b) => USES.indexOf(a.use) - USES.indexOf(b.use));
  return (
    <section aria-labelledby="pd-market" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h2 id="pd-market" className="text-lg font-semibold leading-lg text-text-primary">
          Marketplace
        </h2>
        <span className="text-md leading-md text-text-secondary">· {tracks.length} on sale</span>
        <span className="flex-1" />
        <TestnetDemoBadge />
      </div>
      <div role="tablist" aria-label="NFT editions" className="flex border-b-[length:var(--border-width-1)] border-solid border-border">
        {KINDS.map((k) => {
          const on = k === kind;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setKind(k)}
              className={cn(
                "-mb-[var(--border-width-1)] flex h-[44px] flex-1 items-center justify-center border-b-[length:var(--border-width-2)] border-solid text-md font-medium leading-md outline-none focus-visible:bg-bg-subtle",
                on ? "border-[var(--color-border-brand)] text-text-brand" : "border-transparent text-text-secondary",
              )}
            >
              {KIND_WORD[k]} NFT
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="flex flex-col gap-6">
        <p className="text-md leading-md text-text-secondary">{helperLineOf(kind, name)}</p>
        {chain && (
          <ListCard label="Collection">
            <InfoRow label="Collection" value={chain.collection} />
            <InfoRow label="Blockchain" value={networkLabelOf(chain.network)} />
          </ListCard>
        )}
        {ofKind.length ? (
          ofKind.map((t) => {
            const card = trackCardOf(t, view.sales);
            return (
              <section key={t.id} aria-label={`${KIND_WORD[t.kind]} NFT · ${USE_LABEL[t.use]}`} className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <span className="text-md font-semibold leading-md text-text-primary">{USE_LABEL[t.use]}</span>
                  <span className="flex-1" />
                  <span className={cn("text-sm leading-sm", card.soldOut ? "text-text-success" : "text-text-secondary")}>{card.soldLine}</span>
                </div>
                <ListCard label={`${USE_LABEL[t.use]} prices`}>
                  <InfoRow label={TIER_WORD.regular} value={formatAmount(t.listing.regular, t.listing.token)} />
                  <InfoRow label={TIER_WORD.extended} value={formatAmount(t.listing.extended, t.listing.token)} />
                  <InfoRow label="Royalties" value={`${t.listing.royaltyPct}% on resales`} />
                </ListCard>
              </section>
            );
          })
        ) : (
          <p className="text-md leading-md text-text-secondary">{`No ${KIND_WORD[kind]} NFTs of ${name} are on sale.`}</p>
        )}
      </div>
    </section>
  );
}
