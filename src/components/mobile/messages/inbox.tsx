"use client";

// Message tab › Messages (Figma MS-01…08c): Inbox · Requests (M14) with their
// counts, search (A07, filters live), All · Unread · Archived and the Project
// filter (A18 chips; the project chip opens a pick-one sheet, MS-04), then one
// Kit / Conversation row per conversation — swipe it left for Archive or
// Unarchive (MS-05). There is no compose button (P2-MS-2): conversations
// start from a profile, a post or a listing. Requests carries the web's
// quiet-mode and hidden-words lines as M01 alerts. States: loading bones after
// 300 ms, both empty states, no results, offline over the cached rows, and
// couldn't load. The list is the web's (`listFor`, `countsFor`).

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircleIcon,
  ArchiveIcon,
  ArrowDown01Icon,
  InboxIcon,
  NotificationOff01Icon,
  Search01Icon,
  Settings01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { StateCard } from "@/components/ideeza/state-card";
import { Tag } from "@/components/ideeza/tag";
import { useMessagesView } from "@/components/messages/messages-context";
import { setMember } from "@/lib/messages/actions";
import { initialsOfName } from "@/lib/messages/people";
import { askedListingOf, M_MESSAGES_HREF, M_REQUESTS_HREF, mThreadHref, unreadCountOf } from "@/lib/messages/phone";
import {
  countsFor,
  hiddenRequestCount,
  listFor,
  shortTimeOf,
  subjectNameOf,
  subjectsFor,
  type ListFilter,
  type ListRow,
  type Side,
  type Tab,
} from "@/lib/messages/rules";
import { ME } from "@/lib/messages/types";
import { quietEndLabel } from "@/lib/settings/audience";
import { quietModeOn } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { ListBones, OfflineBanner } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useRowSwipe } from "./gestures";
import { PhoneMessages, useAfter } from "./view";

/** Settings › Privacy & safety on the phone (Figma Settings · 2026 update, ST-30 / ST-34). */
export const M_PRIVACY_HREF = "/m/settings/privacy";
export const M_HIDDEN_WORDS_HREF = "/m/settings/privacy/hidden-words";

const FILTERS: { value: ListFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "archived", label: "Archived" },
];

const ALL = "all";
const SIDE_MINE = "side:mine";
const SIDE_THEIRS = "side:theirs";
const NO_WORDS: readonly string[] = [];
/** The swiped row's action, 88 wide (the w-[88px] below). */
const ACTION_W = 88;

export function Inbox() {
  return (
    <PhoneMessages>
      <InboxScreen />
    </PhoneMessages>
  );
}

function InboxScreen() {
  const { ready, unreadable, data, me, people, now } = useMessagesView();
  const router = useRouter();
  const params = useSearchParams();
  const settings = useSettings();
  const showBones = useAfter(300);
  const tab: Tab = params.get("tab") === "requests" ? "requests" : "inbox";
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<ListFilter>("all");
  const [pick, setPick] = React.useState(ALL);
  const [picking, setPicking] = React.useState(false);
  const [showHidden, setShowHidden] = React.useState(false);

  const hiddenWords = me === ME ? settings.blocking.hiddenWords : NO_WORDS;
  const quietUntil = me === ME && quietModeOn(settings, now) ? settings.audience.quietUntil : null;
  const counts = React.useMemo(() => countsFor(data, me, people.teamIdsOf, hiddenWords), [data, me, people.teamIdsOf, hiddenWords]);
  const hiddenCount = React.useMemo(() => hiddenRequestCount(data, me, hiddenWords), [data, me, hiddenWords]);
  const subjects = React.useMemo(() => subjectsFor(data, me, people.teamIdsOf, people.ownerOf), [data, me, people.teamIdsOf, people.ownerOf]);
  const bothSides = subjects.some((s) => s.side === "mine") && subjects.some((s) => s.side === "theirs");
  const side: Side | null = bothSides && pick === SIDE_MINE ? "mine" : bothSides && pick === SIDE_THEIRS ? "theirs" : null;
  const subjectKey = subjects.some((s) => s.key === pick) ? pick : null;
  const options = React.useMemo(
    () => [
      { value: ALL, label: "All projects" },
      ...(bothSides
        ? [
            { value: SIDE_MINE, label: "Your projects" },
            { value: SIDE_THEIRS, label: "Others’ projects" },
          ]
        : []),
      ...subjects.map((s) => ({ value: s.key, label: s.name })),
    ],
    [subjects, bothSides],
  );
  const picked = options.find((o) => o.value === (subjectKey ?? (side ? pick : ALL))) ?? options[0];
  const rows = React.useMemo(
    () =>
      listFor(data, me, {
        tab,
        filter,
        subjectKey,
        side,
        ownerOf: people.ownerOf,
        q,
        teamIdsOf: people.teamIdsOf,
        nameOf: people.nameOf,
        hiddenWords,
        showHidden,
      }),
    [data, me, tab, filter, subjectKey, side, q, people.ownerOf, people.teamIdsOf, people.nameOf, hiddenWords, showHidden],
  );
  const searching = q.trim() !== "";
  const narrowed = searching || filter !== "all" || subjectKey !== null || side !== null;

  const goTab = (t: Tab) => router.replace(t === "requests" ? M_REQUESTS_HREF : M_MESSAGES_HREF, { scroll: false });
  const showAll = () => {
    setQ("");
    setFilter("all");
    setPick(ALL);
  };

  const list = (() => {
    if (unreadable) {
      return (
        <StateCard
          tone="error"
          className="w-full"
          icon={<Icon icon={AlertCircleIcon} size={32} />}
          title="Couldn’t load messages"
          body="Check your connection, or try again in a moment."
          action={
            <Button hierarchy="secondary" size="lg" onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      );
    }
    if (!ready) return showBones ? <ListBones rows={6} /> : null;
    if (rows.length) {
      return (
        <ul role="list" aria-label={tab === "inbox" ? "Inbox" : "Requests"} className="flex flex-col">
          {rows.map((row) => (
            <SwipeRow key={row.conversation.id} row={row} />
          ))}
        </ul>
      );
    }
    if (narrowed) {
      return (
        <StateCard
          tone="empty"
          className="w-full"
          icon={<Icon icon={Search01Icon} size={32} />}
          title="No conversations match"
          body="Try another search, or show All."
          action={
            <Button hierarchy="secondary" size="lg" onClick={searching ? () => setQ("") : showAll}>
              {searching ? "Clear search" : "Show all"}
            </Button>
          }
        />
      );
    }
    return tab === "inbox" ? (
      <StateCard
        tone="empty"
        className="w-full"
        icon={<Icon icon={InboxIcon} size={32} />}
        title="No messages yet"
        body="Conversations start from a project: people ask from your listing, and you can write to someone who bought from you (Earn › Money) or to a teammate (Team tab)."
      />
    ) : (
      <StateCard
        tone="empty"
        className="w-full"
        icon={<Icon icon={InboxIcon} size={32} />}
        title="No requests"
        body="Messages from people you haven’t worked with land here first."
      />
    );
  })();

  return (
    <Screen
      top={
        <TopBar
          title="Messages"
          actions={[{ icon: Settings01Icon, label: "Message settings", onClick: () => router.push(M_PRIVACY_HREF) }]}
        />
      }
      className="flex flex-col gap-6 px-8 pb-8"
    >
      <div role="tablist" aria-label="Messages" className="flex">
        {(
          [
            ["inbox", counts.unread ? `Inbox (${counts.unread})` : "Inbox"],
            ["requests", counts.requests ? `Requests (${counts.requests})` : "Requests"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls="m-messages-list"
            onClick={() => goTab(value)}
            className={cn(
              "flex h-[40px] items-center border-b-[length:var(--border-width-2)] border-solid px-2 text-lg leading-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              tab === value ? "border-border-brand font-medium text-text-brand" : "border-transparent text-text-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <SearchInput
        value={q}
        onValueChange={setQ}
        onClear={() => setQ("")}
        placeholder="Search messages"
        aria-label="Search messages"
        enterKeyHint="search"
        className="text-[length:var(--font-size-lg)] leading-lg"
        containerClassName="h-[44px] rounded-xl px-6"
      />
      <div role="group" aria-label="Show" className="flex flex-wrap gap-4">
        {FILTERS.map((f) => (
          <Tag key={f.value} selected={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </Tag>
        ))}
        {subjects.length > 1 && (
          <Tag selected={picked.value !== ALL} onClick={() => setPicking(true)} className="max-w-[160px]">
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="truncate">{picked.label}</span>
              <Icon icon={ArrowDown01Icon} size={12} />
            </span>
          </Tag>
        )}
      </div>
      <OfflineBanner />
      {tab === "requests" && quietUntil !== null && (
        <Banner
          tone="info"
          title={`You’re taking a break until ${quietEndLabel(quietUntil)}`}
          action={
            <Link href={M_PRIVACY_HREF} className="hover:underline">
              Change
            </Link>
          }
        >
          New requests are paused.
        </Banner>
      )}
      {tab === "requests" && hiddenCount > 0 && (
        <Banner
          tone="info"
          title={`${hiddenCount === 1 ? "1 request uses" : `${hiddenCount} requests use`} a word you hide`}
          action={
            <span className="flex gap-8">
              <button type="button" aria-pressed={showHidden} onClick={() => setShowHidden((v) => !v)} className="hover:underline">
                {showHidden ? "Hide again" : "Show"}
              </button>
              <Link href={M_HIDDEN_WORDS_HREF} className="hover:underline">
                Hidden words
              </Link>
            </span>
          }
        >
          Your list is in Settings › Hidden words.
        </Banner>
      )}
      <div id="m-messages-list" role="tabpanel" aria-label={tab === "inbox" ? "Inbox" : "Requests"}>
        {list}
      </div>
      <Sheet open={picking} onClose={() => setPicking(false)} title="Project">
        <ul role="listbox" aria-label="Project" className="-mx-8 flex flex-col">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === picked.value}
                onClick={() => {
                  setPick(o.value);
                  setPicking(false);
                }}
                className="flex h-[40px] w-full items-center justify-between gap-4 rounded-md px-8 text-left text-lg leading-lg text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="truncate">{o.label}</span>
                {o.value === picked.value && (
                  <span className="text-[color:var(--color-icon-brand)]">
                    <Icon icon={Tick02Icon} size={16} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </Screen>
  );
}

function SwipeRow({ row }: { row: ListRow }) {
  const { data, me, people, now } = useMessagesView();
  const { locale } = useDates();
  const toast = useToast();
  const swipe = useRowSwipe(ACTION_W);
  const c = row.conversation;
  const team = c.kind === "team";
  const subjectName = subjectNameOf(c.subject);
  const person = row.other ? people.personOf(row.other.id, c.participants) : null;
  const title = team ? `${subjectName} team` : (person?.name ?? "Someone");
  const relation =
    !team && row.other ? people.relationOf(me, row.other.id, c.subject, { askedListing: askedListingOf(data, c.id) }) : null;
  const tag = relation ? (relation.short ?? relation.long) : null;
  const teamSize = team && c.subject.kind === "project" ? 1 + people.teamIdsOf(c.subject.projectId).length : 0;
  const count = unreadCountOf(data, c, me);

  const toggleArchive = () => {
    const archived = !row.archived;
    const r = setMember(c.id, me, { archived });
    swipe.close();
    if (!r.ok) {
      toast({ title: r.reason, lead: "error" });
      return;
    }
    toast({
      title: archived ? "Archived" : "Moved back to your list",
      action: { label: "Undo", onClick: () => setMember(c.id, me, { archived: !archived }) },
    });
  };

  return (
    <li className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex w-[88px]" aria-hidden={swipe.offset === 0 || undefined}>
        <button
          type="button"
          tabIndex={swipe.open ? 0 : -1}
          onClick={toggleArchive}
          className="flex w-full flex-col items-center justify-center gap-1 bg-bg-subtle text-sm font-medium leading-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        >
          <Icon icon={ArchiveIcon} size={20} />
          {row.archived ? "Unarchive" : "Archive"}
        </button>
      </div>
      <Link
        href={mThreadHref(c.id)}
        draggable={false}
        {...swipe.handlers}
        // The row follows the finger: a measured offset.
        style={swipe.offset ? { transform: `translateX(${swipe.offset}px)` } : undefined}
        className={cn(
          "relative flex touch-pan-y select-none items-center gap-6 bg-bg-page py-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
          !swipe.dragging && "transition-transform duration-fast ease-out",
        )}
      >
        <Avatar size="lg" initials={team ? initialsOfName(subjectName) : (person?.initials ?? "?")} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-4">
            <span className="min-w-0 truncate text-md leading-md text-text-primary">{title}</span>
            {tag && (
              <Badge tone="neutral" className="min-w-0 shrink truncate">
                {tag}
              </Badge>
            )}
          </span>
          <span className="truncate text-sm leading-sm text-text-tertiary">
            {team ? `Team · ${teamSize} ${teamSize === 1 ? "person" : "people"}` : subjectName}
          </span>
          <span className="truncate text-md leading-md text-text-primary">{row.preview}</span>
          {row.wordHidden && <span className="text-sm leading-sm text-text-tertiary">Uses a word you hide</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-2 self-stretch pt-1">
          <span className="text-sm leading-sm text-text-tertiary">
            <time dateTime={new Date(row.lastAt).toISOString()}>{shortTimeOf(row.lastAt, now, locale)}</time>
          </span>
          <span className="flex items-center gap-2">
            {row.muted && (
              <span className="text-[color:var(--color-icon-secondary)]">
                <Icon icon={NotificationOff01Icon} size={16} />
                <span className="sr-only">Muted</span>
              </span>
            )}
            {count > 0 && (
              <Badge tone="brand-solid" className="min-w-[20px] justify-center px-3 py-1 text-xs">
                {count}
                <span className="sr-only"> unread</span>
              </Badge>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
