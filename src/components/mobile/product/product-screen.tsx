"use client";

// The phone's product page (Figma "Product Details · 2026 update" 10–10f,
// 10h, 10n, 10t–10wb, 10x–10z, 23d, 28, 31a–32b). The same product as the
// web's /projects/[id]/products/[productId], read through the web's one
// derivation, placed for a phone:
// · the top bar: Back and the owner's ⋯ (10c); the name comes into the bar
//   once the header scrolls away;
// · the header: "{project} · product", the name, "You own copy #n" for a
//   buyer who does (23d), the meta line ("AI build · {date} · All 6 pieces
//   ready" with Add the rest, or the line of a product no build stands
//   behind), the lock line once sold in full (10u), the description (3
//   lines, Show more), the version select and its notice (10e, 28a–28c), the
//   computer note that replaces Open in editor (D3; one line, dismissable),
//   and everyone but the owner reads the product's activity here (10h);
// · the tabs pinned under the top bar (`?tab=`): the owner's Overview ·
//   Build · Media, a buyer's Media · Overview · Build · Contributors; a
//   product no build stands behind has one panel and no strip (10t);
// · the buyer's sticky bar (D1): Copies from · Buy a copy, or You own copy ·
//   See your files.
// Banners lead on the buyer's side: the marketplace's "Testnet demo ·
// shopping as Mira" (10h) and the previews' "Previewing as …" with Exit
// preview (31a, 31b). A Feed sample's product is someone else's: the sample
// viewer reads it (sample-product.tsx).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown01Icon, Cancel01Icon, LockIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { ROLE_WORD, initialsOf, teamOf } from "@/lib/manual/contributors";
import { parseProductTab, piecesLine, productTabsOf, versionRowsOf, type ProductTab } from "@/lib/manual/phone-product";
import { phoneProjectHref, sampleProjectOf } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "../kit/states";
import { Sheet } from "../kit/sheet";
import { Screen } from "../screen";
import { MORE_ICON, TopBar } from "../top-bar";
import { usePhoneWriteGate } from "../project/write-gate";
import { TapLink } from "../project/parts";
import { ActivitySection, HeaderActivity } from "./activity";
import { AddPiecesSheet, BuildTab } from "./build-tab";
import { BuyBar, BuyCopy, DemoBuyerBanner } from "./buy";
import { MediaTab } from "./media-tab";
import { ProductMenu, RenameSheet } from "./menu";
import { OverviewTab, useListedCopies } from "./overview";
import { SampleProduct } from "./sample-product";
import { OffMarket, ProductLoading, ProductMissing, ProjectMissing } from "./states";
import { ProductProvider, useProduct, useProductData, type ProductCtx } from "./use-product";
import { isLeftOut } from "@/lib/create/pieces";
import { UNBUILT } from "@/components/projects/product/product-states";

export function ProductScreen({ id, productId }: { id: string; productId: string }) {
  const data = useProductData(id, productId);
  if (data.state === "loading") return <ProductLoading />;
  if (data.state === "missing") {
    if (data.market) return <OffMarket paused={false} />;
    // Not one of the viewer's own: another creator's shared product, as the Feed links it.
    const sample = sampleProjectOf(id);
    if (!sample) return <ProjectMissing />;
    const product = sample.products.find((p) => p.id === productId);
    return product ? <SampleProduct post={sample} product={product} id={id} /> : <ProductMissing projectName={sample.title} back={`/m/projects/${encodeURIComponent(id)}`} />;
  }
  if (data.state === "no-product") return <ProductMissing projectName={data.projectName} back={phoneProjectHref(data.projectId, "products")} />;
  return (
    <ProductProvider value={data.ctx}>
      <MarketGate ctx={data.ctx} />
    </ProductProvider>
  );
}

/** 32b: on the marketplace, a project its creator paused, with none of this product's copies on sale. */
function MarketGate({ ctx }: { ctx: ProductCtx }) {
  const listed = useListedCopies().length > 0;
  if (ctx.mode === "market" && ctx.view.listing.kind === "paused" && !listed && ctx.copies.length === 0) return <OffMarket paused />;
  return <ProductReady />;
}

function ProductReady() {
  const ctx = useProduct();
  const { project, viewer, bp, mode, buyer, name, path } = ctx;
  const params = useSearchParams();
  const router = useRouter();
  const gate = usePhoneWriteGate(project.id);
  const [sheet, setSheet] = React.useState<"menu" | "rename" | "buy" | null>(() => (params.get("buy") === "1" && buyer ? "buy" : null));
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useScrolledPast(titleRef, scrollRef);

  const contributors = (project.contributors ?? []).length;
  const tabs = productTabsOf({
    buyer,
    built: bp !== null,
    contributors: buyer && (can(viewer, "people.seeRoster") || (can(viewer, "people.seeTeam") && contributors > 0)),
  });
  const tab = parseProductTab(params.get("tab"), tabs);
  const goTab = (t: ProductTab) => {
    const scroller = scrollRef.current;
    const strip = tabsRef.current;
    if (scroller && strip && scroller.scrollTop > strip.offsetTop) scroller.scrollTop = strip.offsetTop;
    router.replace(path("", { tab: t === tabs[0]?.id ? null : t }), { scroll: false });
  };
  const owner = mode === "owner";
  const toFiles = () => goTab("build");

  return (
    <>
      <Screen
        top={
          <TopBar
            back
            title={titleGone ? name : undefined}
            actions={owner ? [{ icon: MORE_ICON, label: "Product actions", onClick: () => setSheet("menu") }] : []}
          />
        }
        footer={buyer ? <BuyBar onBuy={() => setSheet("buy")} onFiles={toFiles} /> : undefined}
      >
        <ScrollHost scrollRef={scrollRef}>
          <div className="flex flex-col gap-6 px-8 pb-6 empty:hidden">
            {mode === "market" && <DemoBuyerBanner />}
            {(mode === "preview" || mode === "contributor") && <PreviewBanner />}
          </div>
          <OfflineBanner />
          <ProductHeader titleRef={titleRef} />
          {tab && (
            <div ref={tabsRef} className="sticky top-0 z-10 bg-bg-page">
              <TabRow tabs={tabs} tab={tab} onChange={goTab} />
            </div>
          )}
          <div role={tab ? "tabpanel" : undefined} id={tab ? `panel-${tab}` : undefined} className="px-8 pb-12 pt-8">
            {tab === "overview" && <OverviewTab />}
            {tab === "build" && <BuildTab />}
            {tab === "media" && <MediaTab />}
            {tab === "contributors" && <ContributorsTab />}
            {!tab && (
              <div className="flex flex-col gap-12">
                {owner && <ActivitySection />}
                <MediaTab />
              </div>
            )}
          </div>
        </ScrollHost>
      </Screen>
      {owner && <ProductMenu open={sheet === "menu"} onClose={() => setSheet(null)} onRename={() => setSheet("rename")} />}
      {owner && sheet === "rename" && <RenameSheet open onClose={() => setSheet(null)} gate={gate} />}
      {buyer && <BuyCopy open={sheet === "buy"} onClose={() => setSheet(null)} onFiles={toFiles} />}
      {gate.sheet}
    </>
  );
}

/** Screen's content is the scroller; this finds it so the page can read and set its scroll. */
function ScrollHost({ scrollRef, children }: { scrollRef: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const scroller = ref.current?.parentElement as HTMLDivElement | null;
    if (scroller) scrollRef.current = scroller;
  }, [scrollRef]);
  return <div ref={ref}>{children}</div>;
}

function useScrolledPast(target: React.RefObject<HTMLElement | null>, root: React.RefObject<HTMLElement | null>): boolean {
  const [gone, setGone] = React.useState(false);
  React.useEffect(() => {
    const el = target.current;
    const scroller = root.current;
    if (!el || !scroller) return;
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), { root: scroller });
    io.observe(el);
    return () => io.disconnect();
  }, [target, root]);
  return gone;
}

// ─────────────────────────── banners (10h, 31a, 31b) ───────────────────────────

function PreviewBanner() {
  const { viewer, project, product } = useProduct();
  const exit = `/m/projects/${encodeURIComponent(project.id)}/products/${encodeURIComponent(product.id)}`;
  const contributor = viewer.kind === "contributor-preview" ? viewer : null;
  return (
    <Banner
      tone="info"
      title={contributor ? `Previewing as ${contributor.name}` : "Previewing as others see it"}
      action={<TapLink href={exit}>Exit preview</TapLink>}
    >
      {contributor
        ? `${ROLE_WORD[contributor.role]} · ${contributor.share}%. This is the page their role shows, and nothing can be changed in a preview.`
        : "This is your page without your editing controls. Nothing is published yet."}
    </Banner>
  );
}

// ─────────────────────────── the header ───────────────────────────

const NOTE_KEY = "ideeza:m:product-desk-note";

const noteListeners = new Set<() => void>();
let noteDismissed = false;

function readNote(): boolean {
  if (noteDismissed) return true;
  try {
    return window.localStorage.getItem(NOTE_KEY) === "1";
  } catch {
    return false;
  }
}

/** The computer note, once dismissed, stays dismissed on this phone (a per-viewer convenience). */
function useDeskNote(): [boolean, () => void] {
  const hidden = React.useSyncExternalStore(
    (on) => {
      noteListeners.add(on);
      return () => noteListeners.delete(on);
    },
    readNote,
    () => true,
  );
  const dismiss = () => {
    noteDismissed = true;
    try {
      window.localStorage.setItem(NOTE_KEY, "1");
    } catch {
      // Dismissed for this visit; it comes back next time.
    }
    noteListeners.forEach((on) => on());
  };
  return [hidden, dismiss];
}

function ProductHeader({ titleRef }: { titleRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { project, view, product, name, mode, job, bp, pieces, version, canEdit, copies, path } = useProduct();
  const params = useSearchParams();
  const router = useRouter();
  const [noteHidden, dismissNote] = useDeskNote();
  const [adding, setAdding] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const owner = mode === "owner";
  const description = bp?.description?.trim() || product.description.trim();
  const lockLine = owner ? (view.lock?.line ?? null) : null;
  const latestCopy = copies.length ? copies.reduce((a, s) => (s.at > a.at ? s : a), copies[0]) : null;
  const home = version?.home ?? 1;
  const tab = params.get("tab");
  const hrefFor = (n: number) => path("", { v: n === home ? null : String(n), tab });

  return (
    <header className="flex flex-col gap-6 px-8 pb-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm leading-sm text-text-secondary">{project.name} · product</p>
        <h1 ref={titleRef} className="min-w-0 break-words text-2xl font-semibold leading-2xl text-text-primary">
          {name}
        </h1>
        {latestCopy && latestCopy.item.nft !== "main" && (
          <div>
            <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
              You own copy #{latestCopy.item.serial}
            </Badge>
          </div>
        )}
        <p className="flex flex-wrap items-center gap-x-2 text-sm leading-sm text-text-secondary">
          {job && pieces ? (
            <>
              <span>
                AI build · {formatDate(job.endedAt ?? job.createdAt)} · {piecesLine(pieces)}
                {canEdit && bp && pieces.leftOut > 0 ? " ·" : ""}
              </span>
              {canEdit && bp && pieces.leftOut > 0 && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="-my-6 inline-flex min-h-[44px] items-center text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:underline"
                >
                  Add the rest
                </button>
              )}
            </>
          ) : product.state !== "built" ? (
            UNBUILT[product.state]
          ) : null}
        </p>
      </div>

      {lockLine && (
        <p className="flex items-start gap-3 text-md leading-md text-text-primary">
          <span aria-hidden className="mt-[2px] text-[color:var(--color-icon-secondary)]">
            <Icon icon={LockIcon} size={16} />
          </span>
          {lockLine}
        </p>
      )}

      {description && <Description text={description} />}

      {owner && version && version.options.length > 1 && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setPicking(true)}
          className="flex h-[44px] w-full items-center justify-between gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-6 text-left outline-none focus-visible:shadow-focus-brand"
        >
          <span className="text-lg leading-lg text-[color:var(--color-input-text)]">
            Version {version.shown} of {version.options.length}
          </span>
          <span className="text-[color:var(--color-icon-default)]">
            <Icon icon={ArrowDown01Icon} size={16} />
          </span>
        </button>
      )}
      {owner && version?.notice && <VersionNotice hrefFor={hrefFor} />}

      {owner && canEdit && !noteHidden && (
        <div className="relative">
          <Banner tone="info">
            <span className="block pr-12 text-lg leading-lg">Edit the board, code and 3D on a computer</span>
          </Banner>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissNote}
            className="absolute right-2 top-2 inline-flex size-[44px] items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} size={20} />
          </button>
        </div>
      )}

      {!owner && <HeaderActivity />}

      {adding && bp && <AddPiecesSheet bp={bp} preselect={bp.items.filter(isLeftOut).map((i) => i.kind)} onClose={() => setAdding(false)} />}
      {owner && version && (
        <Sheet open={picking} onClose={() => setPicking(false)} title="Version">
          <ul role="listbox" aria-label="Version" className="-mx-8 flex flex-col pb-8">
            {versionRowsOf(version.options, formatDate).map((o) => (
              <li key={o.n}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.n === version.shown}
                  onClick={() => {
                    setPicking(false);
                    router.push(hrefFor(o.n), { scroll: false });
                  }}
                  className="flex min-h-[56px] w-full items-center justify-between gap-4 rounded-md px-8 py-3 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-lg leading-lg text-text-primary">{o.label}</span>
                    {o.sub && <span className="text-sm leading-sm text-text-secondary">{o.sub}</span>}
                  </span>
                  {o.n === version.shown && (
                    <span className="text-[color:var(--color-icon-brand)]">
                      <Icon icon={Tick02Icon} size={20} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </header>
  );
}

/** 10e, 28a–28c: the web's version notice (product-version.tsx), its link under it. */
function VersionNotice({ hrefFor }: { hrefFor: (n: number) => string }) {
  const { version, name } = useProduct();
  const notice = version?.notice;
  if (!notice || !version) return null;
  let title: string | undefined;
  let body: string;
  let link: { n: number; label: string } | null = null;
  switch (notice.kind) {
    case "older":
      body = `You’re viewing version ${notice.n}${notice.at !== null ? ` (${formatDate(notice.at)})` : ""}. The project now uses version ${notice.latest}.`;
      link = { n: version.home, label: "Back to latest" };
      break;
    case "dropped":
      body = `Version ${notice.latest} doesn’t include ${name} — this is version ${notice.n}, the last one that did.`;
      break;
    case "absent":
      title = `Not in version ${notice.n}`;
      body = `${name} isn’t part of version ${notice.n} of this project.`;
      link = { n: notice.nearest, label: `Open version ${notice.nearest}` };
      break;
    case "gone":
      title = `Version ${notice.n} isn’t in this browser`;
      body = "Its build isn’t stored here any more, so nothing of it can be shown.";
      link = { n: notice.nearest, label: `Open version ${notice.nearest}` };
      break;
  }
  return (
    <Banner tone="info" title={title} action={link ? <TapLink href={hrefFor(link.n)}>{link.label}</TapLink> : undefined}>
      {body}
    </Banner>
  );
}

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const [clamps, setClamps] = React.useState(false);
  const ref = React.useRef<HTMLParagraphElement>(null);
  const id = React.useId();
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setClamps(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);
  return (
    <div className="flex flex-col gap-2">
      <p ref={ref} id={id} className={cn("whitespace-pre-line break-words text-md leading-md text-text-primary", !expanded && "line-clamp-3")}>
        {text}
      </p>
      {(clamps || expanded) && (
        <div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((v) => !v)}
            className="-my-6 inline-flex min-h-[44px] items-center text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── the tabs (M14, Line Full) ───────────────────────────

export function TabRow({ tabs, tab, onChange }: { tabs: readonly { id: ProductTab; label: string }[]; tab: ProductTab; onChange: (t: ProductTab) => void }) {
  const refs = React.useRef(new Map<ProductTab, HTMLButtonElement>());
  const move = (from: number, dir: 1 | -1) => {
    const next = tabs[(from + dir + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current.get(next.id)?.focus();
  };
  return (
    <div role="tablist" aria-label="Product" className="flex border-b-[length:var(--border-width-1)] border-solid border-border">
      {tabs.map((t, i) => {
        const on = t.id === tab;
        return (
          <button
            key={t.id}
            ref={(el) => {
              if (el) refs.current.set(t.id, el);
            }}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              "-mb-[var(--border-width-1)] flex h-[40px] min-w-0 flex-1 items-center justify-center border-b-[length:var(--border-width-2)] border-solid px-2 text-md font-medium leading-md outline-none transition-colors duration-fast focus-visible:bg-bg-subtle",
              on ? "border-[var(--color-border-brand)] text-text-brand" : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Contributors (10z) ───────────────────────────

function ContributorsTab() {
  const { project } = useProduct();
  const team = teamOf(project.contributors ?? []);
  return (
    <section aria-labelledby="pd-team" className="flex flex-col gap-6">
      <h2 id="pd-team" className="text-lg font-semibold leading-lg text-text-primary">
        Contributors
      </h2>
      {team.length ? (
        <ul className="flex flex-col gap-6">
          {team.map((t) => (
            <li key={t.id} className="flex items-center gap-4">
              <Avatar size="md" initials={initialsOf(t.name)} />
              <span className="text-md leading-md text-text-primary">
                {t.name} <span className="text-text-secondary">· {t.role}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-md leading-md text-text-secondary">No contributors on this project.</p>
      )}
    </section>
  );
}
