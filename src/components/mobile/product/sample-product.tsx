"use client";

// Someone else's product, as the Feed links it (`/m/projects/p1/products/
// remote`; Product Details 10h, 10x–10z read as a visitor): the web's sample
// post (`samplePostOf`) and its sample journey, on the buyer's page —
// Media first, then Overview (the Marketplace block from the post's copies,
// the Testnet demo badge, Specs) and Build (the pieces it was built with; the
// PCB, firmware and wiring come with a copy, D2 — the parts list is open).
// The header carries the product's activity (Now, Earlier). The sticky bar
// says what copies start at; buying a sample is Explore marketplace's, which
// the phone hasn't opened, so Buy a copy is off with that reason — as on the
// sample project page.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { historyOf } from "@/lib/manual/journey";
import { formatDate } from "@/lib/manual/project-summary";
import { BUY_LATER } from "@/lib/manual/phone-project";
import { parseProductTab, phoneProductPath, productTabsOf, type ProductTab } from "@/lib/manual/phone-product";
import { offerOf, type ClipOffer } from "@/lib/innovations/clips";
import { sampleJourneyOf } from "@/lib/innovations/sample-activity";
import { PIECE_LABEL, type InnovationPost, type PostPiece, type PostProduct } from "@/lib/innovations/types";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { InfoRow, LIST_ROW, ListCard, SectionHeading } from "../project/parts";
import { ActivityCardBlock } from "./activity";
import { TabRow } from "./product-screen";

/** Copies only: a product has no Main NFT (owner, 2026-10-12). */
function copiesOf(post: InnovationPost): ClipOffer[] {
  return (post.listing?.rows ?? []).map((r) => offerOf(r, post.license)).filter((o): o is ClipOffer => o !== null && o.kind !== "main");
}

const amountOf = (price: string) => Number.parseFloat(price);

/** The pieces a visitor may open (D2): the 3D model and the parts list. */
const OPEN: ReadonlySet<PostPiece> = new Set<PostPiece>(["3d", "parts"]);
const PIECE_SLUG: Record<PostPiece, string> = { "3d": "3d", pcb: "pcb", code: "code", wiring: "wiring", parts: "parts" };

export function SampleProduct({ post, product, id }: { post: InnovationPost; product: PostProduct; id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const tabs = productTabsOf({ buyer: true, built: true, contributors: false });
  const tab = parseProductTab(params.get("tab"), tabs) ?? "media";
  const base = phoneProductPath(id, product.id);
  const goTab = (t: ProductTab) => router.replace(t === tabs[0].id ? base : `${base}?tab=${t}`, { scroll: false });
  const entries = React.useMemo(
    () => historyOf(sampleJourneyOf(post), post.id, { kind: "product", productId: product.id }, post.createdAt),
    [post, product.id],
  );
  const copies = copiesOf(post);
  const from = copies.length ? copies.reduce((a, o) => (amountOf(o.price) < amountOf(a.price) ? o : a), copies[0]) : null;

  return (
    <Screen
      top={<TopBar back />}
      footer={
        from ? (
          <BottomBar className="gap-2 pt-6">
            <div className="flex items-center gap-6">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm leading-sm text-text-secondary">Copies from</span>
                <span className="text-lg font-semibold leading-lg text-text-primary">{from.price}</span>
              </span>
              <Button size="xl" className="min-w-0 flex-1" disabled>
                Buy a copy
              </Button>
            </div>
            <p className="text-sm leading-sm text-text-secondary">{BUY_LATER}</p>
          </BottomBar>
        ) : undefined
      }
    >
      <header className="flex flex-col gap-6 px-8 pb-8">
        <div className="flex flex-col gap-2">
          <Link href={`/m/projects/${encodeURIComponent(id)}`} className="self-start text-sm leading-sm text-text-secondary outline-none hover:underline focus-visible:underline">
            {post.title} · product
          </Link>
          <h1 className="break-words text-2xl font-semibold leading-2xl text-text-primary">{product.name}</h1>
          <p className="text-sm leading-sm text-text-secondary">
            {[`By ${post.creator.name}`, `Shared ${formatDate(post.sharedAt)}`, `${product.pieces.length} pieces`].join(" · ")}
          </p>
        </div>
        <p className="text-md leading-md text-text-primary">{product.summary}</p>
        <ActivityCardBlock name={product.name} entries={entries} />
      </header>
      <div className="sticky top-0 z-10 bg-bg-page">
        <TabRow tabs={tabs} tab={tab} onChange={goTab} />
      </div>
      <div role="tabpanel" id={`panel-${tab}`} className="px-8 pb-12 pt-8">
        {tab === "media" && <SampleMedia product={product} />}
        {tab === "overview" && <SampleOverview post={post} product={product} copies={copies} />}
        {tab === "build" && <SampleBuild product={product} base={base} />}
      </div>
    </Screen>
  );
}

function SampleMedia({ product }: { product: PostProduct }) {
  const v = product.video?.kind === "video" ? product.video : null;
  return (
    <div className="flex flex-col gap-12">
      {v && (
        <section aria-labelledby="sp-video" className="flex flex-col gap-4">
          <SectionHeading id="sp-video" title="Video" />
          <video src={v.src} poster={v.poster ?? undefined} controls playsInline preload="metadata" aria-label={v.alt} className="aspect-video w-full rounded-md bg-bg-inverse object-contain" />
          <p className="text-sm leading-sm text-text-secondary">{v.label}</p>
        </section>
      )}
      <section aria-labelledby="sp-images" className="flex flex-col gap-4">
        <SectionHeading id="sp-images" title="Images" />
        {product.image ? (
          <figure className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- a sample post's image */}
            <img src={product.image} alt={`${product.name}: ${product.summary}`} className="aspect-[4/3] w-full rounded-md bg-bg-surface-raised object-cover" />
            <figcaption className="text-sm leading-sm text-text-secondary">{product.name}</figcaption>
          </figure>
        ) : (
          <p className="text-md leading-md text-text-secondary">No images yet.</p>
        )}
      </section>
    </div>
  );
}

function SampleOverview({ post, product, copies }: { post: InnovationPost; product: PostProduct; copies: ClipOffer[] }) {
  return (
    <div className="flex flex-col gap-12">
      {copies.length > 0 && (
        <section aria-labelledby="sp-market" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h2 id="sp-market" className="text-lg font-semibold leading-lg text-text-primary">
              Marketplace
            </h2>
            <span className="text-md leading-md text-text-secondary">· {copies.length} on sale</span>
            <span className="flex-1" />
            <TestnetDemoBadge />
          </div>
          <ListCard label="Marketplace">
            {copies.map((o, i) => (
              <InfoRow
                key={i}
                label={[o.kind === "physical" ? "Physical NFT" : "Virtual NFT", o.use].filter(Boolean).join(" · ")}
                value={o.sold ? `${o.price} · ${o.sold.count}/${o.sold.of} sold` : o.price}
              />
            ))}
          </ListCard>
          <ListCard label="Collection">
            {post.chain && <InfoRow label="Blockchain" value={post.chain} />}
            {post.license && <InfoRow label="License" value={post.license} />}
          </ListCard>
        </section>
      )}
      {product.specs.length > 0 && (
        <section aria-labelledby="sp-specs" className="flex flex-col gap-4">
          <SectionHeading id="sp-specs" title="Specs" />
          <ListCard label="Specs">
            {product.specs.map((s) => (
              <InfoRow key={s.label} label={s.label} value={s.value} />
            ))}
          </ListCard>
        </section>
      )}
    </div>
  );
}

function SampleBuild({ product, base }: { product: PostProduct; base: string }) {
  return (
    <div className="flex flex-col gap-12">
      <ListCard label="Pieces">
        {product.pieces.map((k) => {
          const open = OPEN.has(k);
          const body = (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-md font-semibold leading-md text-text-primary">{PIECE_LABEL[k]}</span>
                <span className="text-sm leading-sm text-text-secondary">
                  {k === "parts" ? `${product.parts.length} parts · bill of materials` : open ? "Enclosure and parts in 3D" : "Comes with a copy"}
                </span>
              </span>
              {open ? (
                <>
                  <Badge tone="success">Ready</Badge>
                  <span aria-hidden className="text-[color:var(--color-icon-default)]">
                    <Icon icon={ArrowRight01Icon} size={20} />
                  </span>
                </>
              ) : (
                <span aria-label="Locked" className="text-[color:var(--color-icon-secondary)]">
                  <Icon icon={SquareLock02Icon} size={20} />
                </span>
              )}
            </>
          );
          return (
            <li key={k} className={LIST_ROW}>
              {open ? (
                <Link href={`${base}/build/${PIECE_SLUG[k]}`} className="flex items-center gap-4 p-6 outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle">
                  {body}
                </Link>
              ) : (
                <div className={cn("flex items-center gap-4 p-6")}>{body}</div>
              )}
            </li>
          );
        })}
      </ListCard>
      <section aria-labelledby="sp-downloads" className="flex flex-col gap-4">
        <SectionHeading id="sp-downloads" title="Downloads" />
        <p className="text-md leading-md text-text-secondary">Firmware and downloads come with a purchase.</p>
      </section>
    </div>
  );
}
