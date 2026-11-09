"use client";

// The pieces of a creator profile on the phone ("People · 2026 update" PR-02,
// PR-10): the cover with the photo over its lower edge, the identity block
// (name, headline, where and since when, how they are tied to you, what they
// are open to), the four counts, About with Show more, Mobile / Info rows,
// the M14 line tabs, the Mobile / Project card, the More projects grid and the
// Activity rows. Layout and spacing from those frames; every fact comes from
// the web's profile logic (use-profile.ts).

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, Bookmark02Icon, Comment01Icon, CpuIcon, FavouriteIcon, MoreHorizontalIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { IconButton } from "@/components/ideeza/icon-button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { cn } from "@/lib/utils";
import { useCommentCount } from "@/lib/innovations/comments-store";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import type { MadeItem } from "@/lib/people/made";
import { ageOf, compactCount, phoneProjectHref, videoLengthOf, type Stat } from "@/lib/people/phone-profile";
import { featuredOf, stageToneOf, type ActivityItem, type StageTone } from "@/lib/people/portfolio";
import { useToast } from "../kit/toast";
import { cardFactsOf } from "./use-profile";

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

// ─────────────────────────── cover, identity, counts ───────────────────────────

/** Cover + avatar (PR-02 "Cover + avatar"): a 140 band, the 64 photo 108 down, a Change cover
 *  action 8 above the band's foot. With no picture at all (PR-04) there is no band. */
export function CoverAndAvatar({
  cover,
  action,
  avatar,
}: {
  /** The picture; null for the quiet brand tint; undefined for no band. */
  cover: string | null | undefined;
  action?: React.ReactNode;
  avatar: { initials: string; color: string | null; src: string | null; label: string };
}) {
  const photo = (
    <Avatar
      size="xl"
      initials={avatar.initials}
      color={avatar.color ?? undefined}
      src={avatar.src ?? undefined}
      label={avatar.label}
      className="ring-4 ring-bg-page"
    />
  );
  if (cover === undefined) return <div className="px-8 pt-2">{photo}</div>;
  return (
    <div className="relative h-[172px] shrink-0">
      <div className="absolute inset-x-0 top-0 h-[140px] overflow-hidden bg-bg-brand-subtle">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      {action && <div className="absolute right-8 top-[100px]">{action}</div>}
      <div className="absolute left-8 top-[108px]">{photo}</div>
    </div>
  );
}

const TONE: Record<StageTone, BadgeTone> = { neutral: "neutral", blue: "info", warning: "warning", success: "success" };

export function Identity({
  titleRef,
  name,
  latinName,
  demo,
  headline,
  meta,
  relation,
  openTo,
}: {
  titleRef?: React.Ref<HTMLHeadingElement>;
  name: string;
  latinName: string | null;
  /** A sample person: every profile but yours is a demo creator until there are accounts. */
  demo: boolean;
  /** Their headline, or on your own empty profile the prompt that opens Edit profile. */
  headline: React.ReactNode;
  meta: string | null;
  /** How they are tied to you; only you see it. */
  relation: string | null;
  openTo: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <h1 ref={titleRef} tabIndex={-1} className="min-w-0 break-words text-3xl font-semibold leading-3xl text-text-primary outline-none">
            {name}
          </h1>
          {demo && <Badge tone="neutral">Demo creator</Badge>}
        </div>
        {latinName && <p className="text-sm leading-sm text-text-tertiary">{latinName}</p>}
        {headline && <div className="text-md leading-md text-text-primary">{headline}</div>}
      </div>
      {meta && <p className="text-sm leading-sm text-text-secondary">{meta}</p>}
      {relation && (
        <p className="self-start rounded-full bg-badge-brand-bg px-4 py-1 text-sm leading-sm text-badge-brand-text">{relation}</p>
      )}
      {openTo && <p className="text-sm leading-sm text-text-secondary">{openTo}</p>}
    </div>
  );
}

/** The prompt in place of an empty field on your own profile ("+ Add what you build"). */
export function Prompt({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("-my-6 inline-flex min-h-[44px] items-center text-md leading-md text-text-brand hover:underline", FOCUS)}>
      + {children}
    </button>
  );
}

export function Stats({ stats }: { stats: readonly Stat[] }) {
  if (!stats.length) return null;
  return (
    <dl className="m-0 grid grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col-reverse justify-end">
          <dt className="text-sm leading-sm text-text-secondary">{s.label}</dt>
          <dd className="m-0 text-lg font-semibold leading-lg tabular-nums text-text-primary">{compactCount(s.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** About: three lines, then Show more when there is more. */
export function About({ text, prompt }: { text: string; prompt?: React.ReactNode }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = React.useState(false);
  const [clipped, setClipped] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  if (!text && !prompt) return null;
  return (
    <section aria-label="About" className="flex flex-col gap-2">
      {text && <h2 className="text-md font-regular leading-md text-text-primary">About</h2>}
      {text ? (
        <>
          <p ref={ref} className={cn("whitespace-pre-line text-md leading-md text-text-secondary", !open && "line-clamp-3")}>
            {text}
          </p>
          {(clipped || open) && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={cn("-my-6 inline-flex min-h-[44px] items-center self-start text-md font-medium leading-md text-text-brand hover:underline", FOCUS)}
            >
              {open ? "Show less" : "Show more"}
            </button>
          )}
        </>
      ) : (
        <div>{prompt}</div>
      )}
    </section>
  );
}

const INFO_ROW = cn("flex h-[44px] w-full items-center gap-4 rounded-md p-6 text-left transition-colors duration-fast hover:bg-bg-subtle", FOCUS);

/** Mobile / Info row: a label, a value on the right, the chevron. */
export function InfoRow({ label, value, href, onClick }: { label: string; value?: string; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="min-w-0 shrink truncate text-md leading-md text-text-secondary">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-md leading-md text-text-primary">{value}</span>
      <span className="shrink-0 text-[color:var(--color-icon-default)]">
        <Icon icon={ArrowRight01Icon} size={20} />
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={INFO_ROW}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={INFO_ROW}>
      {body}
    </button>
  );
}

// ─────────────────────────── the work ───────────────────────────

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function CoverImage({ item, className, children }: { item: MadeItem; className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("relative flex items-center justify-center overflow-hidden rounded-lg bg-bg-subtle text-[color:var(--color-icon-default)]", className)}>
      {item.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Icon icon={CpuIcon} size={32} />
      )}
      {children}
    </span>
  );
}

export type Maker = { name: string; initials: string; color: string | null; src: string | null };

/** Mobile / Project card (10646:3): the 4:3 cover with Minted and the video's length, the title
 *  and its stage, the maker with the product count, then Appreciate · Comments · Views · Save —
 *  the Feed's own stores, so the card, the Feed and the web agree. */
export function ProjectCard({ item, maker, onMore }: { item: MadeItem; maker: Maker; onMore?: () => void }) {
  const toast = useToast();
  const facts = React.useMemo(() => cardFactsOf(item), [item]);
  const { reactions, toggle, hydrated } = useReactions();
  const counts = countsOf(reactions, facts.postId, facts.base);
  const seed = React.useMemo(() => (item.projectId ? () => [] : sampleSeedOf(facts.postId)), [item.projectId, facts.postId]);
  const comments = useCommentCount(facts.postId, seed);
  const href = phoneProjectHref(item);
  const failed = () => toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
  return (
    <article aria-label={item.title} className="flex flex-col gap-4">
      <Link href={href} className={cn("rounded-lg", FOCUS)} aria-label={`Open ${item.title}`}>
        <CoverImage item={item} className="aspect-[4/3] w-full">
          {facts.minted && (
            <span className="absolute left-4 top-4">
              <Badge tone="success">Minted</Badge>
            </span>
          )}
          {facts.videoMs !== null && (
            <span className="absolute bottom-4 right-4 rounded-full bg-bg-inverse px-3 py-1 text-xs leading-xs tabular-nums text-text-inverse">
              <span className="sr-only">Video, </span>▶ {videoLengthOf(facts.videoMs)}
            </span>
          )}
        </CoverImage>
      </Link>
      <div className="flex flex-col gap-2">
        <Link href={href} className={cn("self-start rounded-xs text-lg font-semibold leading-lg text-text-primary", FOCUS)}>
          {item.title}
        </Link>
        <div className="flex flex-wrap gap-2">
          {item.stage && <Badge tone={TONE[stageToneOf(item.stageId)]}>{item.stage}</Badge>}
          {item.sale && <Badge tone="blue">{item.sale === "whole" ? "For sale" : "Copies for sale"}</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Avatar size="xs" initials={maker.initials} color={maker.color ?? undefined} src={maker.src ?? undefined} />
        <span className="truncate text-sm leading-sm text-text-primary">{maker.name}</span>
        {item.products > 0 && <span className="shrink-0 text-sm leading-sm text-text-tertiary">· {plural(item.products, "product", "products")}</span>}
      </div>
      <div className="flex items-center">
        <IconButton
          hierarchy="ghost"
          size="xl"
          aria-label={counts.appreciated ? "Remove appreciation" : "Appreciate"}
          aria-pressed={counts.appreciated}
          disabled={!hydrated}
          className={counts.appreciated ? "text-text-brand" : undefined}
          icon={<Icon icon={FavouriteIcon} size={22} />}
          onClick={() => {
            if (!toggle("appreciated", facts.postId)) failed();
          }}
        />
        <span className="text-sm leading-sm tabular-nums text-text-secondary">{compactCount(counts.appreciations)}</span>
        <Link
          href={facts.clipId ? `/m/clip/${encodeURIComponent(facts.clipId)}?comment=1` : href}
          aria-label={`Comments${comments !== null ? `, ${comments}` : ""}`}
          className={cn("ml-2 inline-flex size-[44px] items-center justify-center rounded-xl text-[color:var(--color-icon-default)] hover:bg-bg-subtle", FOCUS)}
        >
          <Icon icon={Comment01Icon} size={22} />
        </Link>
        <span className="text-sm leading-sm tabular-nums text-text-secondary">{comments === null ? "" : compactCount(comments)}</span>
        <span className="flex items-center gap-2 px-6 text-sm leading-sm tabular-nums text-text-secondary">
          <span className="text-[color:var(--color-icon-default)]">
            <Icon icon={ViewIcon} size={16} />
          </span>
          <span className="sr-only">Views</span>
          {compactCount(counts.views)}
        </span>
        <span className="flex-1" />
        {onMore && (
          <IconButton hierarchy="ghost" size="xl" aria-label={`Actions for ${item.title}`} icon={<Icon icon={MoreHorizontalIcon} size={22} />} onClick={onMore} />
        )}
        <IconButton
          hierarchy="ghost"
          size="xl"
          aria-label={counts.saved ? "Unsave" : "Save"}
          aria-pressed={counts.saved}
          disabled={!hydrated}
          className={counts.saved ? "text-text-brand" : undefined}
          icon={<Icon icon={Bookmark02Icon} size={22} />}
          onClick={() => {
            if (!toggle("saved", facts.postId)) failed();
            else toast({ title: counts.saved ? "Removed from Saved" : "Saved" });
          }}
        />
      </div>
    </article>
  );
}

/** A More projects tile: the 4:3 cover and the name; your own carry ⋯ for pinning. */
function ProjectTile({ item, onMore }: { item: MadeItem; onMore?: () => void }) {
  return (
    <li className="relative flex min-w-0 flex-col gap-2">
      <Link href={phoneProjectHref(item)} className={cn("flex flex-col gap-2 rounded-lg", FOCUS)}>
        <CoverImage item={item} className="aspect-[4/3] w-full" />
        <span className="truncate text-sm leading-sm text-text-primary">{item.title}</span>
      </Link>
      {onMore && (
        <span className="absolute right-2 top-2">
          <IconButton
            hierarchy="secondary"
            size="xl"
            aria-label={`Actions for ${item.title}`}
            icon={<Icon icon={MoreHorizontalIcon} size={22} />}
            onClick={onMore}
          />
        </span>
      )}
    </li>
  );
}

const TAB = "flex h-[40px] items-center px-2 text-md font-medium leading-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus";

type WorkTab = "projects" | "activity";

/** Projects · Activity (M14 line tabs, sticky under the top bar), Featured and More projects, or
 *  the Activity rows. With no Activity the projects show without the strip, as on the web. */
export function Work({
  items,
  activity,
  maker,
  pinnedBy,
  now,
  onMore,
}: {
  items: readonly MadeItem[];
  activity: readonly ActivityItem[];
  maker: Maker;
  /** "you" or a first name: "Pinned by …". */
  pinnedBy: string;
  now: number;
  /** Your own profile: a card's ⋯ (Pin to top · Open project). */
  onMore?: (item: MadeItem) => void;
}) {
  const [tab, setTab] = React.useState<WorkTab>("projects");
  const lead = featuredOf(items);
  const tabs = items.length > 0 && activity.length > 0;
  const active = tabs ? tab : "projects";
  const panelId = React.useId();
  if (!lead) return null;
  return (
    <div className="flex flex-col gap-6">
      {tabs && (
        <div className="sticky top-0 z-sticky -mx-8 bg-bg-page px-8">
          <div role="tablist" aria-label="Work" className="flex">
            {(["projects", "activity"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active === t}
                aria-controls={panelId}
                onClick={() => setTab(t)}
                className={cn(
                  TAB,
                  "border-b-[length:var(--border-width-2)] border-solid",
                  active === t ? "border-[var(--color-border-brand)] text-text-brand" : "border-transparent text-text-tertiary",
                )}
              >
                {t === "projects" ? `Projects ${items.length}` : `Activity ${activity.length}`}
              </button>
            ))}
          </div>
        </div>
      )}
      <div id={panelId} role={tabs ? "tabpanel" : undefined} className="flex flex-col gap-6">
        {active === "projects" ? (
          <>
            <section aria-label="Featured" className="flex flex-col gap-4">
              <p className="flex items-baseline gap-4">
                <span className="text-md leading-md text-text-primary">Featured</span>
                {lead.pinned && <span className="text-sm leading-sm text-text-tertiary">Pinned by {pinnedBy}</span>}
              </p>
              <ProjectCard item={lead.featured} maker={maker} onMore={onMore && lead.featured.projectId ? () => onMore(lead.featured) : undefined} />
            </section>
            {lead.rest.length > 0 && (
              <section aria-label="More projects" className="flex flex-col gap-4">
                <p className="text-md leading-md text-text-primary">More projects</p>
                <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0">
                  {lead.rest.map((m) => (
                    <ProjectTile key={m.key} item={m} onMore={onMore && m.projectId ? () => onMore(m) : undefined} />
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <ActivityRows items={activity} now={now} />
        )}
      </div>
    </div>
  );
}

const ACTIVITY_FIRST = 10;

/** Activity: "Prototype built · Smart Plant Watering Kit · 2 d", each opening its project. */
function ActivityRows({ items, now }: { items: readonly ActivityItem[]; now: number }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? items : items.slice(0, ACTIVITY_FIRST);
  return (
    <div className="flex flex-col gap-2">
      <ol className="m-0 flex list-none flex-col p-0">
        {shown.map((a) => (
          <li key={a.key}>
            <InfoRow label={a.type} value={`${a.project} · ${ageOf(a.at, now)}`} href={a.href} />
          </li>
        ))}
      </ol>
      {items.length > ACTIVITY_FIRST && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((v) => !v)}
          className={cn("inline-flex min-h-[44px] items-center self-start px-6 text-md font-medium leading-md text-text-brand hover:underline", FOCUS)}
        >
          {all ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────── states ───────────────────────────

/** PR-19: the cover band, the photo, two lines and the two buttons' places. */
export function ProfileBones() {
  return (
    <div role="status" aria-label="Loading the profile" className="flex flex-col">
      <Skeleton shape="block" className="h-[120px] w-full rounded-none" />
      <div className="flex flex-col gap-6 px-8 pt-6">
        <Skeleton shape="circle" size="lg" />
        <Skeleton shape="text" size="lg" className="w-[240px]" />
        <Skeleton shape="text" size="md" className="w-[160px]" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton shape="block" className="h-[44px] w-full" />
          <Skeleton shape="block" className="h-[44px] w-full" />
        </div>
      </div>
    </div>
  );
}
