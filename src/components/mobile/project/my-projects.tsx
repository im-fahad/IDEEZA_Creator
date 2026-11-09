"use client";

// My projects (master page "My project" section, Shared kit KIT-EM-01): every
// project this account keeps, as the web's /projects lists them — the tabs
// All · Draft · Minted · Listed · Sold with their counts, search over
// project and product names and descriptions, Shared only and the sort (one
// filter sheet), the count line, and one card per project: the cover, the
// title with its status chip, "{n} products · Saved {date}" and the next-step
// hint. A card has no button: the whole card opens the project (owner,
// 2026-10-11). Twelve at a time, Show more for the rest. The view lives in the
// address (`?tab=&q=&sort=&showcase=1`), so Back returns to it.

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRight02Icon, CpuIcon, File01Icon, FilterHorizontalIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { SearchInput } from "@/components/ideeza/search-input";
import { Skeleton } from "@/components/ideeza/skeleton";
import { StateCard } from "@/components/ideeza/state-card";
import { useMinuteClock } from "@/components/create/build-status";
import { ICONS, StatusChip } from "@/components/projects/status-chip";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { readBriefDraft } from "@/lib/brief/project-brief";
import { briefDraftKey } from "@/lib/brief/types";
import { useCreateHistory } from "@/lib/create/history";
import {
  LIST_TABS,
  SORT_OPTIONS,
  countLine,
  filterProjects,
  listQueryString,
  parseListQuery,
  type ListItem,
  type ListTab,
} from "@/lib/manual/project-list";
import { PAGE_SIZE, cardText, projectSummary, type ListQuery, type ProjectSummary } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { useMarket } from "@/lib/market/market-store";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { OfflineBanner } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";

const DRAFT_PREFIX = briefDraftKey("");
let draftsVersion = 0;
function subscribeDrafts(onChange: () => void): () => void {
  const bump = () => {
    draftsVersion += 1;
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(DRAFT_PREFIX)) bump();
  };
  window.addEventListener("focus", bump);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("focus", bump);
    window.removeEventListener("storage", onStorage);
  };
}

/** The web's empty-tab words (LST-53). */
const EMPTY_TAB: Record<Exclude<ListTab, "all">, { title: string; body?: string; icon: keyof typeof ICONS }> = {
  draft: { title: "Nothing in progress", body: "A build you save starts here.", icon: "circle" },
  minted: { title: "Nothing minted yet", body: "Open a draft and mint it.", icon: "hexagon" },
  listed: { title: "Nothing on the marketplace", body: "Open a minted project and sell it.", icon: "tag" },
  sold: { title: "Nothing sold yet", icon: "badge-check" },
};

export function MyProjectsScreen() {
  const { hydrated, projects } = useManualProjects();
  const { hydrated: buildsHydrated, builds } = useCreateHistory();
  const { hydrated: jobsHydrated, jobs } = useVideoJobs();
  const { hydrated: marketHydrated, data: market } = useMarket();
  const params = useSearchParams();
  const pathname = usePathname();
  const now = useMinuteClock();
  const query = React.useMemo(() => parseListQuery(params), [params]);
  const [view, setView] = React.useState<ListQuery>(query);
  const [shown, setShown] = React.useState(PAGE_SIZE);
  const [filtering, setFiltering] = React.useState(false);

  const change = (patch: Partial<ListQuery>) => {
    const next = { ...view, ...patch, page: 1 };
    setView(next);
    setShown(PAGE_SIZE);
    window.history.replaceState(window.history.state, "", `${pathname}${listQueryString(next)}`);
  };

  const tick = React.useSyncExternalStore(subscribeDrafts, () => draftsVersion, () => -1);
  const ready = hydrated && buildsHydrated && jobsHydrated && marketHydrated && tick >= 0;
  const items = React.useMemo<ListItem[] | null>(
    () =>
      ready
        ? projects.map((project) => ({
            project,
            summary: projectSummary(project, { builds, brief: readBriefDraft(project.id), videoJobs: jobs, now, projects, market }),
          }))
        : null,
    // `tick` re-reads the drafts when another tab or the focus changes them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, projects, builds, jobs, now, market, tick],
  );
  // Every match, in order (the web's pages, one after another): the phone shows them twelve at a time.
  const result = React.useMemo(() => (items ? filterProjects(items, { ...view, page: 1 }) : null), [items, view]);
  const matches = React.useMemo(() => {
    if (!items || !result) return [];
    return Array.from({ length: result.pageCount }, (_, i) => (i === 0 ? result.rows : filterProjects(items, { ...view, page: i + 1 }).rows)).flat();
  }, [items, result, view]);

  const noProjects = result !== null && result.total === 0;
  const tabLabel = LIST_TABS.find((t) => t.id === view.tab)?.label ?? "All";

  return (
    <Screen top={<TopBar back title="My projects" />} className="pb-12">
      <OfflineBanner />
      {noProjects ? (
        <div className="px-8 pt-8">
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={File01Icon} size={32} />}
            title="No projects yet"
            body="Describe a device and IDEEZA builds its PCB, code, 3D model and more."
            action={
              <Link href="/m/ai" className={cn(buttonVariants({ hierarchy: "primary", size: "xl" }))}>
                Create a project
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Projects" className="flex overflow-x-auto border-b-[length:var(--border-width-1)] border-solid border-border px-4 [scrollbar-width:none]">
            {LIST_TABS.map((t) => {
              const on = view.tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => change({ tab: t.id })}
                  className={cn(
                    "-mb-[var(--border-width-1)] flex h-[44px] shrink-0 items-center gap-2 border-b-[length:var(--border-width-2)] border-solid px-6 text-md font-medium leading-md outline-none focus-visible:bg-bg-subtle",
                    on ? "border-[var(--color-border-brand)] text-text-brand" : "border-transparent text-text-secondary",
                  )}
                >
                  {t.label}
                  <span className={cn("text-xs leading-xs", on ? "text-text-brand" : "text-text-tertiary")}>{result ? result.counts[t.id] : "—"}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-6 px-8 pt-8">
            <div className="flex items-center gap-4">
              <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 flex-1">
                <SearchInput
                  value={view.q}
                  onValueChange={(q) => change({ q })}
                  placeholder="Search projects and products"
                  aria-label="Search projects and products"
                  enterKeyHint="search"
                  containerClassName="min-h-[44px]"
                />
              </form>
              <Button
                hierarchy="secondary"
                size="xl"
                iconOnly
                aria-label={view.showcase || view.sort !== "updated" ? "Filter and sort, on" : "Filter and sort"}
                aria-haspopup="dialog"
                onClick={() => setFiltering(true)}
                className={view.showcase || view.sort !== "updated" ? "border-[var(--color-border-brand)]" : undefined}
              >
                <Icon icon={FilterHorizontalIcon} size={20} />
              </Button>
            </div>
            <p aria-live="polite" className="text-md font-medium leading-md text-text-primary">
              {result ? countLine(result) : "—"}
            </p>
            {!result ? (
              <ul aria-label="Loading" className="flex flex-col gap-6">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-4">
                    <Skeleton shape="block" className="aspect-[16/10] h-auto w-full" />
                    <Skeleton shape="text" size="lg" />
                    <Skeleton shape="text" size="md" />
                  </li>
                ))}
              </ul>
            ) : matches.length === 0 ? (
              view.tab !== "all" && result.counts[view.tab] === 0 ? (
                <StateCard
                  tone="empty"
                  className="w-full"
                  icon={<Icon icon={ICONS[EMPTY_TAB[view.tab].icon]} size={32} />}
                  title={EMPTY_TAB[view.tab].title}
                  body={EMPTY_TAB[view.tab].body}
                />
              ) : view.q.trim() ? (
                <StateCard
                  tone="empty"
                  className="w-full"
                  icon={<Icon icon={Search01Icon} size={32} />}
                  title={`No matches for "${view.q}"`}
                  body={`Nothing in ${view.showcase ? `${tabLabel} (Shared only)` : tabLabel} has that in a project or product name or description.`}
                  action={
                    <Button hierarchy="secondary" size="xl" onClick={() => change({ q: "" })}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <StateCard tone="empty" className="w-full" icon={<Icon icon={ICONS.eye} size={32} />} title={`Nothing shared in ${tabLabel}`} />
              )
            ) : (
              <>
                <ul aria-label={`${tabLabel} projects`} className="flex flex-col gap-6">
                  {matches.slice(0, shown).map((row) => (
                    <li key={row.summary.id}>
                      <ProjectCard summary={row.summary} via={row.via} now={now} />
                    </li>
                  ))}
                </ul>
                {matches.length > shown && (
                  <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                    Show more ({matches.length - shown})
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}

      <Sheet open={filtering} onClose={() => setFiltering(false)} title="Filter and sort">
        <div className="flex flex-col gap-6 pb-8">
          <label className="relative flex min-h-[44px] cursor-pointer items-center gap-4 text-lg leading-lg text-text-primary">
            <input type="checkbox" className="sr-only" checked={view.showcase} onChange={() => change({ showcase: !view.showcase })} />
            <Checkbox checked={view.showcase} decorative />
            Shared only
          </label>
          <div role="radiogroup" aria-label="Sort" className="flex flex-col">
            <p className="pb-2 text-md font-medium leading-md text-text-secondary">Sort</p>
            {SORT_OPTIONS.map((o) => (
              <label key={o.value} className="relative flex min-h-[44px] cursor-pointer items-center gap-4 text-lg leading-lg text-text-primary">
                <input type="radio" name="m-projects-sort" className="sr-only" checked={view.sort === o.value} onChange={() => change({ sort: o.value })} />
                <Radio checked={view.sort === o.value} decorative />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      </Sheet>
    </Screen>
  );
}

function ProjectCard({ summary, via, now }: { summary: ProjectSummary; via?: string; now: number }) {
  const [failed, setFailed] = React.useState(false);
  const text = cardText(summary, now);
  return (
    <Link
      href={phoneProjectHref(summary.id)}
      className="flex flex-col gap-4 overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-4 outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-md bg-bg-surface-raised">
        {summary.cover && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element -- the project's cover from the build store
          <img src={summary.cover} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[color:var(--color-icon-secondary)]">
            <Icon icon={CpuIcon} size={24} />
          </span>
        )}
      </span>
      <span className="flex flex-col gap-2 px-2 pb-2">
        <span className="flex items-start justify-between gap-4">
          <span className="line-clamp-2 min-w-0 text-lg font-semibold leading-lg text-text-primary">{summary.name}</span>
          <StatusChip status={summary.status} word={text.chip.word} showcased={text.chip.badge !== null} />
        </span>
        <span className="truncate text-md leading-md text-text-secondary">
          {text.count} · <time dateTime={text.time.dateTime}>{text.time.text}</time>
          {via ? ` · matches ${via}` : ""}
        </span>
        <span className="flex items-center gap-2 text-md font-medium leading-md text-text-secondary">
          <span className="truncate">{text.hint}</span>
          <Icon icon={ArrowRight02Icon} size={14} className="shrink-0" />
        </span>
      </span>
    </Link>
  );
}
