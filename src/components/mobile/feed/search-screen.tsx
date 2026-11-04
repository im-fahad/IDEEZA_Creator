"use client";

// Global Search (mobile Figma, Design - Light Mode › Global Search):
// - the field focused with nothing typed: Recent searches (Clear all; ✕ on a
//   row), a query or a person you opened;
// - typing: People, Projects and Blogs that match, the match in the brand ink;
//   a pick opens it and is remembered;
// - Search (Enter): the chips People · Post · Projects · Parts & Agile Module
//   · Marketplace · Blog over every kind's results (People with View all), or
//   one kind's under its chip; a chip with nothing typed lists all of it
//   ("Search People" from the Feed). The query and the chip live in the
//   address, so Back returns to them.
// People are followed as on the web (Follow / Following; no Friends, D-1). A
// result opens the phone's screen for it; parts and modules have no phone
// page yet, so their cards only read.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft02Icon,
  Cancel01Icon,
  Clock01Icon,
  CpuIcon,
  FavouriteIcon,
  Globe02Icon,
  Search01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { StateCard } from "@/components/ideeza/state-card";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { CoverImage } from "@/components/blog/cover-image";
import { formatCount } from "@/lib/feed";
import { clipBuyHref, clipHref, OFFER_NAME } from "@/lib/innovations/clips";
import { CREATORS } from "@/lib/feed";
import { follows, useReactions } from "@/lib/innovations/reactions";
import {
  groupResults,
  highlightParts,
  recentKeyOf,
  searchEntries,
  SEARCH_KINDS,
  SUGGEST_LABEL,
  suggestionsOf,
  withRecent,
  withoutRecent,
  type SearchEntry,
  type SearchKind,
} from "@/lib/innovations/search";
import { formatDate } from "@/lib/settings/dates";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { useRecentSearches } from "./use-feed";
import { useSearchIndex, type SearchItem } from "./use-search-index";

type Entry = SearchEntry<SearchItem>;

const kindOf = (raw: string | null): SearchKind | null => SEARCH_KINDS.find((k) => k.id === raw)?.id ?? null;

/** How many of a kind the all-kinds results show before "View all". */
const PREVIEW = 3;

export function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const kind = kindOf(params.get("kind"));
  const [text, setText] = React.useState(q);
  const [lastQ, setLastQ] = React.useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setText(q);
  }
  const field = React.useRef<HTMLInputElement>(null);
  const { hydrated, entries } = useSearchIndex();
  const { recent, update } = useRecentSearches();
  const toast = useToast();

  const go = (nextQ: string, nextKind: SearchKind | null) => {
    const sp = new URLSearchParams();
    if (nextQ) sp.set("q", nextQ);
    if (nextKind) sp.set("kind", nextKind);
    router.replace(`/m/search${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    update((r) => withRecent(r, { kind: "query", text: t, at: Date.now() }));
    field.current?.blur();
    go(t, kind);
  };

  const open = (entry: Entry) => {
    const it = entry.ref;
    if (it.type === "person") {
      update((r) => withRecent(r, { kind: "person", id: it.person.id, name: it.person.name, subtitle: it.subtitle, href: it.href, at: Date.now() }));
      router.push(it.href);
    } else if (it.type === "post") router.push(clipHref(it.clip.id));
    else if (it.type === "project" || it.type === "blog") router.push(it.href);
    else if (it.type === "market") router.push(clipHref(it.clip.id));
  };

  const typing = text.trim() !== q || (!q && !kind);

  return (
    <Screen
      top={
        <form role="search" onSubmit={submit} className="flex h-[56px] shrink-0 items-center gap-4 px-8">
          <IconButton
            type="button"
            hierarchy="secondary"
            size="xl"
            aria-label="Back"
            icon={<Icon icon={ArrowLeft02Icon} size={22} />}
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/m"))}
          />
          <div className="flex h-[44px] min-w-0 flex-1 items-center gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-6 focus-within:border-[var(--color-input-border-focus)] focus-within:shadow-focus-brand">
            <span className="text-[color:var(--color-icon-default)]">
              <Icon icon={Search01Icon} size={16} />
            </span>
            <input
              ref={field}
              type="search"
              enterKeyHint="search"
              aria-label="Search"
              autoFocus={!q && !kind}
              value={text}
              maxLength={100}
              placeholder="Search"
              onChange={(e) => setText(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-lg leading-lg text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)] [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                aria-label="Clear the search"
                onClick={() => {
                  setText("");
                  field.current?.focus();
                }}
                className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-secondary)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            )}
          </div>
        </form>
      }
    >
      {!hydrated ? (
        <div className="px-8">
          <ListBones rows={5} />
        </div>
      ) : typing && !text.trim() ? (
        <Recent
          onQuery={(t) => {
            setText(t);
            update((r) => withRecent(r, { kind: "query", text: t, at: Date.now() }));
            go(t, kind);
          }}
          onPerson={(href) => router.push(href)}
          recent={recent}
          onRemove={(key) => update((r) => withoutRecent(r, key))}
          onClear={() => {
            if (update(() => [])) toast({ title: "Recent searches cleared" });
          }}
        />
      ) : typing ? (
        <Suggestions entries={entries} q={text} onOpen={open} onSearch={() => submit()} />
      ) : (
        <Results entries={entries} q={q} kind={kind} onKind={(k) => go(q, k)} onOpen={open} />
      )}
    </Screen>
  );
}

function Recent({
  recent,
  onQuery,
  onPerson,
  onRemove,
  onClear,
}: {
  recent: ReturnType<typeof useRecentSearches>["recent"];
  onQuery: (t: string) => void;
  onPerson: (href: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (!recent.length) {
    return <p className="px-8 py-4 text-md leading-md text-text-secondary">Search people, posts, projects, parts, the marketplace and blogs.</p>;
  }
  return (
    <section className="flex flex-col gap-2 px-8 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-md font-medium leading-md text-text-primary">Recent searches</h2>
        <button type="button" onClick={onClear} className="-mr-2 min-h-[44px] rounded-md px-2 text-md leading-md text-text-secondary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus">
          Clear all
        </button>
      </div>
      <ul className="flex flex-col">
        {recent.map((r) => {
          const key = recentKeyOf(r);
          return (
            <li key={key} className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => (r.kind === "query" ? onQuery(r.text) : onPerson(r.href))}
                className="flex min-h-[52px] min-w-0 flex-1 items-center gap-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {r.kind === "query" ? (
                  <>
                    <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]">
                      <Icon icon={Clock01Icon} size={20} />
                    </span>
                    <span className="truncate text-lg leading-lg text-text-primary">{r.text}</span>
                  </>
                ) : (
                  <>
                    <PersonAvatar id={r.id} name={r.name} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-lg leading-lg text-text-primary">{r.name}</span>
                      <span className="truncate text-md leading-md text-text-secondary">{r.subtitle}</span>
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                aria-label={`Remove ${r.kind === "query" ? r.text : r.name} from recent searches`}
                onClick={() => onRemove(key)}
                className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Cancel01Icon} size={20} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PersonAvatar({ id, name, size = "md" }: { id: string; name: string; size?: "sm" | "md" }) {
  const creator = CREATORS.find((c) => `feed:${c.id}` === id);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <Avatar size={size} initials={creator?.initials ?? initials} color={creator?.color} />;
}

function Marked({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlightParts(text, q).map((p, i) =>
        p.match ? (
          <span key={i} className="text-text-brand">
            {p.text}
          </span>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ),
      )}
    </>
  );
}

function Suggestions({ entries, q, onOpen, onSearch }: { entries: readonly Entry[]; q: string; onOpen: (e: Entry) => void; onSearch: () => void }) {
  const groups = suggestionsOf(entries, q);
  return (
    <div className="flex flex-col gap-6 px-8 pb-8">
      {groups.map((g) => (
        <section key={g.kind} className="flex flex-col gap-2">
          <h2 className="text-md font-medium leading-md text-text-secondary">{SUGGEST_LABEL[g.kind]}</h2>
          <ul className="flex flex-col">
            {g.entries.map((e) => (
              <li key={`${e.kind}:${e.id}`}>
                <button type="button" onClick={() => onOpen(e)} className="flex min-h-[48px] w-full items-center gap-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
                  <Thumb item={e.ref} />
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("truncate text-text-primary", e.ref.type === "person" ? "text-lg leading-lg" : "text-md leading-md")}>
                      <Marked text={e.title} q={q} />
                    </span>
                    {e.ref.type === "person" && <span className="truncate text-sm leading-sm text-text-secondary">{e.ref.subtitle}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Button hierarchy="secondary" size="lg" className="w-full" onClick={onSearch}>
        See all results for “{q.trim()}”
      </Button>
    </div>
  );
}

function Thumb({ item }: { item: SearchItem }) {
  if (item.type === "person") return <PersonAvatar id={item.person.id} name={item.person.name} size="sm" />;
  const src = item.type === "project" ? item.image : item.type === "post" || item.type === "market" ? item.clip.poster : null;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- the result's picture
    return <img src={src} alt="" className="size-[32px] shrink-0 rounded-full object-cover" />;
  }
  return (
    <span aria-hidden className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]">
      <Icon icon={CpuIcon} size={16} />
    </span>
  );
}

function Results({
  entries,
  q,
  kind,
  onKind,
  onOpen,
}: {
  entries: readonly Entry[];
  q: string;
  kind: SearchKind | null;
  onKind: (k: SearchKind | null) => void;
  onOpen: (e: Entry) => void;
}) {
  const one = kind ? (q ? searchEntries(entries, q, kind) : entries.filter((e) => e.kind === kind)) : [];
  const all = kind ? [] : groupResults(entries, q);
  const nothing = kind ? one.length === 0 : all.length === 0;
  return (
    <div className="flex flex-col gap-8 pb-8">
      <div role="tablist" aria-label="What to search" className="flex gap-4 overflow-x-auto px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SEARCH_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            onClick={() => onKind(kind === k.id ? null : k.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-5 py-3 text-sm font-medium leading-xs outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              kind === k.id ? "bg-bg-brand text-text-on-brand" : "bg-bg-surface text-text-secondary",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      {nothing ? (
        <div className="px-8">
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={Search01Icon} size={32} />}
            title={q ? `No results for “${q}”` : "Nothing here yet"}
            body={q ? "Check the spelling, or try another word or another chip." : "There is nothing of this kind to show yet."}
          />
        </div>
      ) : kind ? (
        <ResultList kind={kind} entries={one} q={q} onOpen={onOpen} />
      ) : (
        all.map((g) => (
          <section key={g.kind} className="flex flex-col gap-4">
            <h2 className="px-8 text-md font-medium leading-md text-text-secondary">{SEARCH_KINDS.find((k) => k.id === g.kind)?.label}</h2>
            <ResultList kind={g.kind} entries={g.entries.slice(0, PREVIEW)} q={q} onOpen={onOpen} />
            {g.entries.length > PREVIEW && (
              <div className="px-8">
                <Button hierarchy="secondary" size="lg" className="w-full" onClick={() => onKind(g.kind)}>
                  View all
                </Button>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}

function ResultList({ kind, entries, q, onOpen }: { kind: SearchKind; entries: readonly Entry[]; q: string; onOpen: (e: Entry) => void }) {
  return (
    <ul className={cn("flex flex-col", kind === "people" ? "px-8" : "gap-6 px-8")}>
      {entries.map((e) => (
        <li key={`${e.kind}:${e.id}`}>
          <ResultCard entry={e} q={q} onOpen={() => onOpen(e)} />
        </li>
      ))}
    </ul>
  );
}

const CARD = "flex w-full flex-col overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface text-left";

function ResultCard({ entry, q, onOpen }: { entry: Entry; q: string; onOpen: () => void }) {
  const router = useRouter();
  const settings = useSettings();
  const it = entry.ref;
  switch (it.type) {
    case "person":
      return <PersonResult item={it} q={q} onOpen={onOpen} />;
    case "post":
      return (
        <button type="button" onClick={onOpen} className={cn(CARD, "outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
          <span className="flex items-center gap-6 p-6">
            <Avatar size="md" initials={it.clip.creator.initials} color={it.clip.creator.color} />
            <span className="flex min-w-0 flex-col">
              <span className="text-lg leading-lg text-text-primary">{it.clip.creator.name}</span>
              <span className="flex items-center gap-2 text-sm leading-sm text-text-secondary">
                {formatDate(it.clip.sharedAt, settings.language.dateLocale, { style: "medium" })}
                <span aria-hidden>•</span>
                <Icon icon={Globe02Icon} size={12} aria-label="Public" aria-hidden={false} />
              </span>
            </span>
          </span>
          <span className="px-6 pb-4 text-lg font-medium leading-lg text-text-primary">
            <Marked text={it.clip.title} q={q} />
          </span>
          <span className="px-6 pb-6">
            <span className="line-clamp-3 text-md leading-md text-text-secondary">{it.clip.description}</span>
          </span>
          {it.clip.poster && (
            // eslint-disable-next-line @next/next/no-img-element -- the clip's picture
            <img src={it.clip.poster} alt="" className="aspect-[4/3] w-full object-cover" />
          )}
          <span className="flex items-center gap-8 px-6 py-4 text-md leading-md text-text-secondary">
            <span className="flex items-center gap-2">
              <Icon icon={FavouriteIcon} size={16} />
              {formatCount(it.clip.base.appreciations)}
            </span>
            <span className="flex items-center gap-2">
              <Icon icon={ViewIcon} size={16} />
              {formatCount(it.clip.base.views)}
            </span>
          </span>
        </button>
      );
    case "project":
      return (
        <button type="button" onClick={onOpen} className={cn(CARD, "outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
          {it.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- the project's picture
            <img src={it.image} alt="" className="aspect-[16/9] w-full object-cover" />
          ) : (
            <span aria-hidden className="flex aspect-[16/9] w-full items-center justify-center bg-bg-subtle text-[color:var(--color-icon-secondary)]">
              <Icon icon={CpuIcon} size={32} />
            </span>
          )}
          <span className="flex flex-col gap-1 p-6">
            <span className="text-2xl font-medium leading-2xl text-text-primary">
              <Marked text={it.name} q={q} />
            </span>
            <span className="text-md leading-md text-text-secondary">{it.by}</span>
          </span>
        </button>
      );
    case "part":
      return (
        <div className={CARD}>
          <span aria-hidden className="flex aspect-[16/9] w-full items-center justify-center bg-bg-subtle text-[color:var(--color-icon-secondary)]">
            <Icon icon={CpuIcon} size={40} />
          </span>
          <span className="flex flex-col gap-2 p-6">
            <span className="flex items-start justify-between gap-4">
              <span className="text-2xl font-medium leading-2xl text-text-primary">
                <Marked text={it.title} q={q} />
              </span>
              <Badge tone="neutral">{it.tag}</Badge>
            </span>
            <span className="text-md leading-md text-text-secondary">{it.meta}</span>
          </span>
        </div>
      );
    case "market":
      return (
        <div className={CARD}>
          <button type="button" onClick={onOpen} className="relative block text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
            {it.clip.poster && (
              // eslint-disable-next-line @next/next/no-img-element -- the item's picture
              <img src={it.clip.poster} alt="" className="aspect-[16/10] w-full object-cover" />
            )}
            {it.stage && <span className="absolute right-6 top-6 rounded-full bg-bg-surface px-5 py-2 text-md leading-md text-text-primary">{it.stage}</span>}
          </button>
          <div className="flex flex-col gap-4 p-6">
            <span className="text-2xl font-medium leading-2xl text-text-primary">
              <Marked text={it.clip.title} q={q} />
            </span>
            <span className="flex items-center justify-between gap-4 text-md leading-md text-text-secondary">
              <span className="truncate">{it.clip.creator.name}</span>
              <span className="flex shrink-0 items-center gap-4">
                <span className="flex items-center gap-2">
                  <Icon icon={ViewIcon} size={16} />
                  {formatCount(it.clip.base.views)}
                </span>
                <span className="flex items-center gap-2">
                  <Icon icon={FavouriteIcon} size={16} />
                  {formatCount(it.clip.base.appreciations)}
                </span>
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              {it.clip.offers.map((o) => (
                <Badge key={o.kind} tone={o.kind === "main" ? "success" : o.kind === "physical" ? "info" : "warning"}>
                  {OFFER_NAME[o.kind]}
                </Badge>
              ))}
            </span>
            <span className="flex items-end justify-between gap-4 border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-4">
              <span className="flex flex-col">
                <span className="text-md leading-md text-text-secondary">{it.offer.kind === "main" ? "Price" : `${OFFER_NAME[it.offer.kind]} from`}</span>
                <span className="text-2xl font-medium leading-2xl text-text-primary">{it.offer.price}</span>
              </span>
              <TestnetDemoBadge />
            </span>
            <Button size="xl" className="w-full" onClick={() => router.push(clipBuyHref(it.clip))}>
              Buy now
            </Button>
          </div>
        </div>
      );
    case "blog":
      return (
        <button type="button" onClick={onOpen} className={cn(CARD, "flex-row items-center gap-6 p-6 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm leading-sm text-text-secondary">{it.by}</span>
            <span className="text-lg font-medium leading-lg text-text-primary">
              <Marked text={it.title} q={q} />
            </span>
            <span className="text-sm leading-sm text-text-tertiary">{formatDate(it.at, settings.language.dateLocale, { style: "medium" })}</span>
          </span>
          {it.cover && <CoverImage cover={it.cover} decorative className="size-[72px] shrink-0 rounded-md" />}
        </button>
      );
  }
}

function PersonResult({ item, q, onOpen }: { item: Extract<SearchItem, { type: "person" }>; q: string; onOpen: () => void }) {
  const { reactions, setFollow, hydrated } = useReactions();
  const toast = useToast();
  const dataset = CREATORS.find((c) => c.id === item.followKey)?.following ?? false;
  const on = item.followKey ? follows(reactions, item.followKey, dataset) : false;
  return (
    <div className="flex flex-col gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-subtle py-6">
      <button type="button" onClick={onOpen} className="flex items-center gap-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <PersonAvatar id={item.person.id} name={item.person.name} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-lg leading-lg text-text-primary">
            <Marked text={item.person.name} q={q} />
          </span>
          <span className="line-clamp-2 text-md leading-md text-text-secondary">{item.subtitle}</span>
        </span>
      </button>
      {item.followKey && (
        <Button
          hierarchy={on ? "secondary" : "primary"}
          size="lg"
          className="ml-[52px]"
          aria-pressed={on}
          disabled={!hydrated}
          onClick={() => {
            if (!setFollow(item.followKey as string, !on)) toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
          }}
        >
          {on ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}
