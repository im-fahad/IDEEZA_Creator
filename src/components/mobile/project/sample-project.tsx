"use client";

// Someone else's project, as a viewer sees it (Figma 18 / 18b, read-only):
// the Feed links each shared sample project here by its feed id
// (`/m/projects/p1`), and the page reads the web's sample post for it
// (`samplePostOf`). No owner control shows. The tabs are Overview · Products
// · Media; the Overview has the Marketplace block when it is listed (the
// Feed's `?tab=marketplace` lands there), the project's activity, the
// products, the legal and chain facts, and About. Buying is a testnet demo by
// the active demo creator (project-earn/buyer/sample-shop.tsx: the banner, the
// Marketplace block and the bar); Ask the creator opens a conversation about
// the post.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { CATALOGUES } from "@/lib/manual/journey";
import { formatDate } from "@/lib/manual/project-summary";
import { VIEWER_TABS, parseViewerTab, type PhoneTab } from "@/lib/manual/phone-project";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { PIECE_LABEL, type InnovationPost, type PostMedia } from "@/lib/innovations/types";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { SampleMarketSection, SampleShop, SampleShopBanner, SampleShopBar } from "../project-earn/buyer/sample-shop";
import { InfoRow, LIST_CARD, ListCard, ProductRow, SectionHeading, SubLine } from "./parts";

const enc = encodeURIComponent;

export function SampleProject({ post, id }: { post: InnovationPost; id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const tab = parseViewerTab(params.get("tab"));
  const [expanded, setExpanded] = React.useState(false);
  const goTab = (t: PhoneTab) => router.replace(`/m/projects/${enc(id)}${t === "overview" ? "" : `?tab=${t}`}`, { scroll: false });
  const chip = post.listing ? "Listed" : post.minted ? "Minted" : null;
  const ask = `/m${startHref({ kind: "post", to: post.creator.id, slug: post.slug }, ME)}`;

  return (
    <SampleShop post={post} id={id}>
    <Screen top={<TopBar back />} footer={<SampleShopBar ask={ask} />}>
      <SampleShopBanner />
      <header className="flex flex-col gap-4 px-8 pb-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="min-w-0 break-words text-2xl font-semibold leading-2xl text-text-primary">{post.title}</h1>
          {chip && <Badge tone="success">{chip}</Badge>}
        </div>
        <p className="text-sm leading-sm text-text-secondary">
          {[`Created by ${post.creator.name}`, post.category, `Shared ${formatDate(post.sharedAt)}`].filter(Boolean).join(" · ")}
        </p>
        {post.description && (
          <div className="flex flex-col gap-2">
            <p className={cn("whitespace-pre-line break-words text-md leading-md text-text-secondary", !expanded && "line-clamp-3")}>{post.description}</p>
            <div>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="-my-6 inline-flex min-h-[44px] items-center text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            </div>
          </div>
        )}
      </header>
      <div className="sticky top-0 z-10 bg-bg-page">
        <div role="tablist" aria-label="Project" className="flex border-b-[length:var(--border-width-1)] border-solid border-border">
          {VIEWER_TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => goTab(t.id)}
                className={cn(
                  "-mb-[var(--border-width-1)] flex h-[40px] flex-1 items-center justify-center border-b-[length:var(--border-width-2)] border-solid text-md font-medium leading-md outline-none focus-visible:bg-bg-subtle",
                  on ? "border-[var(--color-border-brand)] text-text-brand" : "border-transparent text-text-secondary",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div role="tabpanel" className="px-8 pb-12 pt-8">
        {tab === "overview" && <SampleOverview post={post} id={id} />}
        {tab === "products" && <SampleProducts post={post} id={id} />}
        {tab === "media" && <SampleMedia post={post} />}
      </div>
    </Screen>
    </SampleShop>
  );
}

function stageLabel(stage: string | null): string | null {
  if (!stage) return null;
  return CATALOGUES.project.find((t) => t.id === stage)?.label ?? null;
}

function SampleOverview({ post, id }: { post: InnovationPost; id: string }) {
  const stage = stageLabel(post.stage);
  return (
    <div className="flex flex-col gap-12">
      <SampleMarketSection />
      <section aria-labelledby="sv-activity" className="flex flex-col gap-4">
        <SectionHeading id="sv-activity" title="Project activity" />
        <div className={cn(LIST_CARD, "gap-3 px-8 py-6")}>
          <span className="flex items-center gap-4">
            <span className="text-sm leading-sm text-text-secondary">Now</span>
            <Badge tone="brand-outline">{stage ?? "Shared"}</Badge>
            <span className="text-md leading-md text-text-secondary">{formatDate(post.updatedAt)}</span>
          </span>
          {post.story && <span className="line-clamp-3 text-md leading-md text-text-primary">{post.story}</span>}
        </div>
      </section>
      <SampleProducts post={post} id={id} heading />
      <section aria-labelledby="sv-about" className="flex flex-col gap-4">
        <SectionHeading id="sv-about" title="About" />
        <ListCard label="About">
          <InfoRow label="Creator" value={post.creator.name} />
          {post.category && <InfoRow label="Category" value={post.category} />}
          <InfoRow label="Parts" value={`${post.partsCount} ${post.partsCount === 1 ? "part" : "parts"}`} />
          <InfoRow label="Network" value={post.network ?? "Not added"} />
          {post.license && <InfoRow label="License" value={post.license} />}
          {post.chain && <InfoRow label="Blockchain" value={post.chain} />}
        </ListCard>
      </section>
    </div>
  );
}

function SampleProducts({ post, id, heading = false }: { post: InnovationPost; id: string; heading?: boolean }) {
  const rows = (
    <ListCard label="Products">
      {post.products.map((p) => (
        <ProductRow
          key={p.id}
          href={`/m/projects/${enc(id)}/products/${enc(p.id)}`}
          thumb={p.image}
          name={p.name}
          meta={p.summary}
          facts={p.pieces.map((k) => PIECE_LABEL[k]).join(" · ")}
        />
      ))}
    </ListCard>
  );
  const line = `${post.products.length} ${post.products.length === 1 ? "product" : "products"} · ${post.partsCount} parts`;
  if (!heading)
    return (
      <div className="flex flex-col gap-6">
        <SubLine>{line}</SubLine>
        {rows}
      </div>
    );
  return (
    <section aria-labelledby="sv-products" className="flex flex-col gap-4">
      <SectionHeading id="sv-products" title="Products" link={{ href: `/m/projects/${enc(id)}?tab=products`, label: "See all", aria: "See all products" }} />
      <SubLine>{line}</SubLine>
      {rows}
    </section>
  );
}

function SampleMedia({ post }: { post: InnovationPost }) {
  const [open, setOpen] = React.useState<PostMedia | null>(null);
  const shown = post.media.filter((m) => m.kind !== "clip");
  if (shown.length === 0) return <p className="text-md leading-md text-text-secondary">No media shared yet.</p>;
  return (
    <>
      <ul className="grid grid-cols-3 gap-4">
        {shown.map((m, i) => (
          <li key={i}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Open ${m.label}`}
              onClick={() => setOpen(m)}
              className="flex w-full flex-col gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised">
                {(m.kind === "image" ? m.src : m.kind === "video" ? m.poster : null) && (
                  // eslint-disable-next-line @next/next/no-img-element -- a sample post's image
                  <img src={(m.kind === "image" ? m.src : m.kind === "video" ? m.poster : "") ?? ""} alt="" className="absolute inset-0 size-full object-cover" />
                )}
                {m.kind === "video" && (
                  <span aria-hidden className="relative inline-flex size-[28px] items-center justify-center rounded-full bg-bg-inverse text-text-inverse">
                    <Icon icon={PlayIcon} size={16} />
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-sm leading-sm text-text-secondary">{m.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open?.label ?? ""}>
        {open?.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- a sample post's image
          <img src={open.src} alt={open.alt} className="mb-8 max-h-[60vh] w-full rounded-md bg-bg-inverse object-contain" />
        )}
        {open?.kind === "video" && (
          <video src={open.src} poster={open.poster ?? undefined} controls playsInline aria-label={open.alt} className="mb-8 max-h-[60vh] w-full rounded-md bg-bg-inverse" />
        )}
      </Sheet>
    </>
  );
}
