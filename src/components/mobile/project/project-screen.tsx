"use client";

// The phone's project page (Figma "Project Details · 2026 update" 01–01b,
// 20a–20d; owner decisions M1–M6). The same project as the web's
// /projects/[id], read through the web's one derivation
// (`useProjectPageData`), placed for a phone:
// · the top bar: Back to My projects and ⋯ (07); the project's name comes into
//   the bar once the header scrolls away (01b);
// · the header: the name and its status chip, the stage line with its version
//   (opens Versions), the meta line, the lock line once sold in full, the
//   description clamped to 3 lines (Show more), or Add a description; the
//   description coachmark (07o); a newer version's notice (05b / 05c);
// · the tabs Overview · Products · Media · Activity, pinned under the top bar
//   while the page scrolls (`?tab=`, so Back and a reload keep the tab);
// · the Bottom action bar fixed to the foot (M4): Publish + Earn while there is
//   a way to publish, else Earn alone with its live fact (20b).
// Loading shows bones under the bar with no ⋯ (20c); an address that matches no
// project says so, with Back to My projects (20d).

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight01Icon,
  Coins01Icon,
  FolderSearchIcon,
  InformationCircleIcon,
  PencilEdit01Icon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { StateCard } from "@/components/ideeza/state-card";
import { earnSourceOf, useEarnFacts } from "@/components/projects/earn/ladder/use-earn-facts";
import { coachmarkDue, COACHMARK_TEXT } from "@/components/projects/details/description-coachmark";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { ShowcaseChip, StatusChip } from "@/components/projects/status-chip";
import { earnHref, publishOptionsOf } from "@/lib/manual/earn-route";
import { earnButtonOf } from "@/lib/manual/earn-view";
import { labelOf } from "@/lib/manual/journey";
import { can } from "@/lib/manual/permissions";
import { engineeringMetaOf, pendingNoticesOf, stageLineOf } from "@/lib/manual/project-header";
import { headerText } from "@/lib/manual/project-summary";
import { productRowsOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import {
  PHONE_TABS,
  parsePhoneTab,
  phoneBarOf,
  phoneHrefOf,
  phoneProjectHref,
  phoneProjectPath,
  sampleProjectOf,
  type PhoneTab,
} from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { OfflineBanner } from "../kit/states";
import { Screen } from "../screen";
import { MORE_ICON, TopBar } from "../top-bar";
import { ActivityTab } from "./activity-tab";
import { ProjectProvider, useProject, type ProjectSheet, type Ready } from "./context";
import { MediaTab } from "./media-tab";
import { OverviewTab } from "./overview";
import { TapLink } from "./parts";
import { ProductsTab } from "./products-tab";
import { SampleProject } from "./sample-project";
import { ProjectSheets } from "./sheets";
import { usePhoneWriteGate } from "./write-gate";

export function ProjectScreen({ id }: { id: string }) {
  const data = useProjectPageData(id, "project");
  if (data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") {
    // Not one of the viewer's own: another creator's shared project, as the Feed links it.
    const sample = sampleProjectOf(id);
    return sample ? <SampleProject post={sample} id={id} /> : <ProjectMissing />;
  }
  return <ProjectReady data={data} />;
}

/** 20c · Loading project: the bar and the header's shape, no ⋯ yet. */
export function ProjectLoading() {
  return (
    <Screen top={<TopBar back="/m/projects" />}>
      <div role="status" aria-label="Loading project" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="text" size="lg" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[60px] w-full" />
        <Skeleton shape="block" className="h-[40px] w-full" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} shape="block" className="h-[80px] w-full" />
        ))}
      </div>
    </Screen>
  );
}

/** 20d · Project not found. */
function ProjectMissing() {
  return (
    <Screen top={<TopBar back="/m/projects" />} className="px-8 pb-8">
      <StateCard
        tone="empty"
        className="w-full"
        titleAs="h1"
        icon={<Icon icon={FolderSearchIcon} size={32} />}
        title="We couldn't find this project"
        body="It may have been deleted, or it was made in another browser."
        action={
          <Link href="/m/projects" className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
            Back to My projects
          </Link>
        }
      />
    </Screen>
  );
}

function ProjectReady({ data }: { data: Ready }) {
  const params = useSearchParams();
  const router = useRouter();
  const { project } = data;
  const tab = parsePhoneTab(params.get("tab"));
  const gate = usePhoneWriteGate(project.id);
  const [sheet, setSheet] = React.useState<ProjectSheet | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useScrolledPast(titleRef, scrollRef);

  // A new tab starts at its top, under the pinned tabs, when the page was scrolled past the header.
  const goTab = (t: PhoneTab) => {
    const scroller = scrollRef.current;
    const tabs = tabsRef.current;
    if (scroller && tabs && scroller.scrollTop > tabs.offsetTop) scroller.scrollTop = tabs.offsetTop;
    router.replace(phoneProjectHref(project.id, t), { scroll: false });
  };

  const ctx = { ...data, gate, open: setSheet };
  const owner = can(data.viewer, "facts.seeOwnerOnly");
  return (
    <ProjectProvider value={ctx}>
      <Screen
        top={
          <TopBar
            back="/m/projects"
            title={titleGone ? project.name : undefined}
            actions={owner ? [{ icon: MORE_ICON, label: "Project actions", onClick: () => setSheet({ kind: "menu" }) }] : []}
          />
        }
        footer={<ProjectBar />}
      >
        <ScrollHost scrollRef={scrollRef}>
          <OfflineBanner />
          <ProjectHeader titleRef={titleRef} />
          <div ref={tabsRef} className="sticky top-0 z-10 bg-bg-page">
            <TabRow tab={tab} onChange={goTab} />
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="px-8 pb-12 pt-8">
            {tab === "overview" && <OverviewTab />}
            {tab === "products" && <ProductsTab />}
            {tab === "media" && <MediaTab />}
            {tab === "activity" && <ActivityTab />}
          </div>
        </ScrollHost>
      </Screen>
      <ProjectSheets sheet={sheet} onSheet={setSheet} />
      {gate.sheet}
    </ProjectProvider>
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

/** True once `target` has scrolled up out of `root`'s view (the top bar takes the title then). */
function useScrolledPast(target: React.RefObject<HTMLElement | null>, root: React.RefObject<HTMLElement | null>): boolean {
  const [gone, setGone] = React.useState(false);
  React.useEffect(() => {
    const el = target.current;
    const scroller = root.current;
    if (!el || !scroller) return;
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), {
      root: scroller,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [target, root]);
  return gone;
}

// ─────────────────────────── the header ───────────────────────────

function ProjectHeader({ titleRef }: { titleRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { project, view, viewer, open } = useProject();
  const { setDescriptionHint } = useManualProjects();
  const { summary, canCtx } = view;
  const text = headerText(summary, { viewer, now: null, context: "project" });
  const owner = can(viewer, "facts.seeOwnerOnly");
  const canDescribe = owner && can(viewer, "project.editDescription", canCtx);

  const stage = stageLineOf(view.engineering, summary).split(" · ");
  const version = view.engineering.state === "empty" ? null : stage.pop() ?? null;
  const meta = engineeringMetaOf(summary, { label: labelOf(view.current) })
    .map((m) => (m.kind === "time" ? m.time.text : m.text))
    .join(" · ");

  const review = text.pair.first?.kind === "review-version" && can(viewer, "product.add", canCtx) ? text.pair.first : null;
  const notices = owner ? pendingNoticesOf(view.pending, view.lineages, review ? (summary.pendingVersion?.buildId ?? null) : null) : [];

  return (
    <header className="flex flex-col gap-6 px-8 pb-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 ref={titleRef} className="min-w-0 break-words text-2xl font-semibold leading-2xl text-text-primary">
              {project.name}
            </h1>
            <StatusChip status={summary.status} word={text.chip.word} />
          </div>
          {text.chip.badge && (
            <div className="flex">
              <ShowcaseChip />
            </div>
          )}
          <p className="flex flex-wrap items-center gap-2 text-sm leading-sm text-text-secondary">
            <span>
              {stage.join(" · ")}
              {version ? " ·" : ""}
            </span>
            {version && (
              <Link
                href={phoneProjectPath(project.id, "versions")}
                aria-label={`${version}, open Versions`}
                className={cn("-my-6 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:underline")}
              >
                {version}
                <Icon icon={ArrowRight01Icon} size={14} />
              </Link>
            )}
          </p>
        </div>
        <p className="text-sm leading-sm text-text-secondary">{meta}</p>
      </div>

      {text.lockLine && (
        <div className="flex flex-col gap-2">
          <p className="flex items-start gap-2 text-md leading-md text-text-primary">
            <span aria-hidden className="mt-1 text-[color:var(--color-icon-secondary)]">
              <Icon icon={InformationCircleIcon} size={14} />
            </span>
            {text.lockLine}
          </p>
          <div className="pl-8">
            <TapLink href={phoneHrefOf(earnHref(project.id, "customers")) ?? "/m/projects"}>See the sale</TapLink>
          </div>
        </div>
      )}

      <Description text={project.description} onAdd={canDescribe ? () => open({ kind: "edit" }) : undefined} />

      {canDescribe && coachmarkDue(project) && (
        <div className="flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-brand-subtle p-6">
          <p className="text-md leading-md text-text-primary">{COACHMARK_TEXT}</p>
          <div className="flex gap-4">
            <Button hierarchy="secondary" size="lg" onClick={() => open({ kind: "edit", ai: true })}>
              Update description
            </Button>
            <Button
              hierarchy="ghost"
              size="lg"
              onClick={() => setDescriptionHint(project.id, { dismissedAt: Date.now(), productCount: productRowsOf(project).length })}
            >
              Not now
            </Button>
          </div>
        </div>
      )}

      {notices.map((n) => {
        const href = n.action ? phoneHrefOf(n.action.href, project.id) : null;
        return (
          <Banner key={n.buildId} tone={n.tone} action={n.action && href ? <TapLink href={href}>{n.action.label}</TapLink> : undefined}>
            {n.text}
          </Banner>
        );
      })}
      {review && (
        <Link href={phoneHrefOf(review.href, project.id) ?? "#"} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
          {review.label}
        </Link>
      )}
    </header>
  );
}

/** The description, clamped to 3 lines with Show more (A03 Link SM), or Add a description. */
function Description({ text, onAdd }: { text: string; onAdd?: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const [clamps, setClamps] = React.useState(false);
  const ref = React.useRef<HTMLParagraphElement>(null);
  const id = React.useId();
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setClamps(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  if (!text.trim()) {
    return onAdd ? (
      <div>
        <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={PencilEdit01Icon} size={20} />} onClick={onAdd}>
          Add a description
        </Button>
      </div>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-2">
      <p ref={ref} id={id} className={cn("whitespace-pre-line break-words text-md leading-md text-text-secondary", !expanded && "line-clamp-3")}>
        {text}
      </p>
      {(clamps || expanded) && (
        <div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((v) => !v)}
            className={cn("-my-6 inline-flex min-h-[44px] items-center text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:underline")}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── the tabs (M14 Tabs, Line Full) ───────────────────────────

function TabRow({ tab, onChange }: { tab: PhoneTab; onChange: (t: PhoneTab) => void }) {
  const refs = React.useRef(new Map<PhoneTab, HTMLButtonElement>());
  const move = (from: number, dir: 1 | -1) => {
    const next = PHONE_TABS[(from + dir + PHONE_TABS.length) % PHONE_TABS.length];
    onChange(next.id);
    refs.current.get(next.id)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Project"
      className="flex border-b-[length:var(--border-width-1)] border-solid border-border"
    >
      {PHONE_TABS.map((t, i) => {
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

// ─────────────────────────── the Bottom action bar (M4) ───────────────────────────

function ProjectBar() {
  const { project, view, viewer, brief, open } = useProject();
  const owner = can(viewer, "facts.seeOwnerOnly");
  const earnSource = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const ladder = useEarnFacts(earnSource);
  if (!owner) return null;
  const text = headerText(view.summary, { viewer, now: null, context: "project" });
  const reviewPending = text.pair.first?.kind === "review-version" && can(viewer, "product.add", view.canCtx);
  const earn = earnButtonOf({
    projectId: project.id,
    commercial: earnSource.commercial,
    soldSharePct: view.summary.customers.soldSharePct,
    facts: ladder.ready ? ladder.facts : null,
    reviewPending,
  });
  const publishOptions = view.lock === null ? publishOptionsOf(view.summary.status, brief?.state.mintedAt != null) : null;
  const bar = phoneBarOf({ publishOptions, earn, reviewPending });
  if (!bar) return null;
  const earnHrefPhone = phoneHrefOf(earn.href) ?? `/m/projects/${project.id}/earn`;
  const earnLink = (
    <Link
      href={earnHrefPhone}
      className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full min-w-0 flex-1")}
    >
      <Icon icon={Coins01Icon} size={20} />
      Earn
    </Link>
  );
  return (
    <BottomBar className={bar.kind === "pair" ? "flex-row gap-6 pt-8" : "gap-2 pt-8"}>
      {bar.kind === "pair" ? (
        <>
          <Button
            hierarchy={bar.publishPrimary ? "primary" : "secondary"}
            size="xl"
            className="min-w-0 flex-1"
            iconLeading={<Icon icon={Rocket01Icon} size={20} />}
            onClick={() => open({ kind: "publish" })}
          >
            Publish
          </Button>
          {earnLink}
        </>
      ) : (
        <>
          {earnLink}
          {bar.fact && <p className={cn("text-sm leading-sm text-text-secondary")}>{bar.fact}</p>}
        </>
      )}
    </BottomBar>
  );
}

