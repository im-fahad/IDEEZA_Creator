"use client";

// History on a phone (master page "Text → Model": Prompt History 10702:174047
// and its details), on the web's History (history-list.ts): two tabs —
// Prompts (each chat, its newest drawing, its project and how many builds)
// and Builds (each build's state and progress, its project, the newest first,
// filtered by In progress / Ready / Needs attention) — and a search. A row
// opens the chat; a build row opens its pieces. ⋯ on a prompt deletes it,
// with the web's rule for the builds that go with it.

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AiMagicIcon, Delete02Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { StateCard } from "@/components/ideeza/state-card";
import { relativeLabel } from "@/components/create/use-clock";
import {
  HISTORY_FILTERS,
  buildEntries,
  filterCounts,
  narrowBuilds,
  narrowPrompts,
  parseFilter,
  parseTab,
  promptEntries,
  type BuildEntry,
  type HistoryTab,
} from "@/lib/create/history-list";
import { queuedAhead, rollupBuild, useCreateHistory, type ChatSession } from "@/lib/create/history";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { ActionSheet } from "../kit/sheet";
import { ListBones } from "../kit/states";
import { BuildPill } from "./build-pill";
import { DeleteChatSheet } from "./delete-chat-sheet";

const STATUS: Record<BuildEntry["status"], { word: string; tone: "brand" | "success" | "error" | "warning" | "neutral" }> = {
  waiting: { word: "Waiting", tone: "neutral" },
  building: { word: "Building", tone: "brand" },
  ready: { word: "Ready", tone: "success" },
  failed: { word: "Needs a retry", tone: "error" },
  paused: { word: "Paused", tone: "warning" },
};

function firstPrompt(chat: ChatSession): string {
  const t = chat.turns.find((x) => x.role === "user");
  return t?.role === "user" ? t.text : chat.title;
}

function newestImage(chat: ChatSession): string | undefined {
  for (let i = chat.turns.length - 1; i >= 0; i--) {
    const t = chat.turns[i];
    if (t.role === "assistant" && t.status === "ready" && t.imageUrl) return t.imageUrl;
  }
  return undefined;
}

export function AiHistory() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: HistoryTab = parseTab(params.get("tab"));
  const filter = parseFilter(params.get("filter"));
  const [query, setQuery] = React.useState("");
  const [menuFor, setMenuFor] = React.useState<ChatSession | null>(null);
  const [deleting, setDeleting] = React.useState<ChatSession | null>(null);
  const { hydrated, chats, builds, attentionBuilds } = useCreateHistory();
  const { projects } = useManualProjects();
  const [now] = React.useState(() => Date.now());

  const { prompts, buildRows } = React.useMemo(() => {
    const projectName = new Map(projects.map((p) => [p.id, p.name]));
    const attention = new Set(attentionBuilds.map((a) => a.job.id));
    const inputs = builds.map((b) => {
      const rollup = rollupBuild(b);
      return {
        id: b.id,
        chatId: b.chatId,
        title: b.projectChoiceName?.trim() || b.title,
        prompt: b.conceptPrompt,
        imageUrl: b.conceptImageUrl,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        startedAt: b.startedAt,
        endedAt: b.endedAt,
        queued: b.status === "queued",
        blocked: !!b.blocked,
        rollup: rollup.status,
        progress: rollup.progress,
        projectId: b.projectId,
        projectName: b.projectId ? projectName.get(b.projectId) : undefined,
        attention: attention.has(b.id),
        ahead: queuedAhead(b, builds),
        products: [{ id: "primary", name: b.title, items: b.items }, ...(b.companions ?? []).map((c) => ({ id: c.id, name: c.name, items: c.items }))],
      };
    });
    return {
      prompts: promptEntries(
        chats.map((c) => ({ id: c.id, title: c.title, prompt: firstPrompt(c), imageUrl: newestImage(c), updatedAt: c.updatedAt })),
        inputs,
      ),
      buildRows: buildEntries(inputs, new Set(chats.map((c) => c.id))),
    };
  }, [chats, builds, projects, attentionBuilds]);

  const counts = filterCounts(buildRows);
  const shownPrompts = narrowPrompts(prompts, query);
  const shownBuilds = narrowBuilds(buildRows, filter, query);
  const setUrl = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `/m/ai/history?${qs}` : "/m/ai/history", { scroll: false });
  };

  return (
    <Screen top={<TopBar back="/m/ai" title="History" />}>
      <div className="flex flex-col gap-6 px-8 pb-8 pt-2">
        <div role="tablist" aria-label="History" className="grid grid-cols-2 rounded-xl bg-bg-subtle p-1">
          {(["prompts", "builds"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tab}
              onClick={() => setUrl({ tab: t === "prompts" ? null : t, filter: null })}
              className={cn(
                "min-h-[40px] rounded-lg text-md font-medium leading-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                t === tab ? "bg-bg-surface text-text-primary shadow-1" : "text-text-secondary",
              )}
            >
              {t === "prompts" ? `Prompts · ${prompts.length}` : `Builds · ${buildRows.length}`}
            </button>
          ))}
        </div>
        <SearchInput value={query} onValueChange={setQuery} placeholder={tab === "prompts" ? "Search prompts" : "Search builds"} aria-label="Search" />
        {tab === "builds" && (
          <div className="-mx-8 flex gap-3 overflow-x-auto px-8 [scrollbar-width:none]">
            {HISTORY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={f.id === filter}
                onClick={() => setUrl({ filter: f.id === "all" ? null : f.id })}
                className={cn(
                  "inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-full border-[length:var(--border-width-1)] border-solid px-5 text-sm leading-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  f.id === filter ? "border-border-brand bg-bg-brand-subtle text-text-brand" : "border-border-subtle text-text-secondary",
                )}
              >
                {f.label} <span className="tabular-nums">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        )}

        {!hydrated ? (
          <ListBones rows={5} />
        ) : tab === "prompts" ? (
          shownPrompts.length === 0 ? (
            <Empty query={query} what="prompts" />
          ) : (
            <ul className="flex flex-col gap-3">
              {shownPrompts.map((p) => {
                const chat = chats.find((c) => c.id === p.chatId) ?? null;
                return (
                  <li key={p.chatId} className="flex items-center gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface">
                    <Link href={`/m/ai/chat/${p.chatId}`} className="flex min-w-0 flex-1 items-center gap-5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
                      <Thumb url={p.imageUrl} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-md font-medium leading-md text-text-primary">{p.name}</span>
                        <span className="truncate text-sm leading-sm text-text-secondary">{p.prompt}</span>
                        <span className="truncate text-sm leading-sm text-text-tertiary">
                          {relativeLabel(p.ts, now)}
                          {p.projectName ? ` · ${p.projectName}` : ""}
                          {p.builds ? ` · ${p.builds} ${p.builds === 1 ? "build" : "builds"}` : ""}
                        </span>
                      </span>
                    </Link>
                    {chat && (
                      <button
                        type="button"
                        aria-label={`More for ${p.name}`}
                        onClick={() => setMenuFor(chat)}
                        className="mr-2 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <Icon icon={MoreHorizontalIcon} size={18} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : shownBuilds.length === 0 ? (
          <Empty query={query} what="builds" />
        ) : (
          <ul className="flex flex-col gap-3">
            {shownBuilds.map((b) => {
              const s = STATUS[b.status];
              return (
                <li key={b.id}>
                  <Link
                    href={`/m/ai/build/${b.id}`}
                    className="flex items-center gap-5 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface p-5 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <Thumb url={b.imageUrl} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-md font-medium leading-md text-text-primary">{b.name}</span>
                        <Badge tone={s.tone}>{b.status === "building" && b.progress !== undefined ? `${s.word} · ${b.progress}%` : s.word}</Badge>
                      </span>
                      <span className="truncate text-sm leading-sm text-text-secondary">
                        {b.products.length} {b.products.length === 1 ? "product" : "products"} · {b.products.reduce((n, g) => n + g.done, 0)} of{" "}
                        {b.products.reduce((n, g) => n + g.steps.length, 0)} pieces
                        {b.projectName ? ` · ${b.projectName}` : ""}
                      </span>
                      <span className="text-sm leading-sm text-text-tertiary">
                        {relativeLabel(b.createdAt, now)}
                        {b.older ? " · an older build of its chat" : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <BuildPill />
      <ActionSheet
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title}
        items={[{ label: "Delete chat", icon: Delete02Icon, destructive: true, onSelect: () => setDeleting(menuFor) }]}
      />
      <DeleteChatSheet chat={deleting} onClose={() => setDeleting(null)} />
    </Screen>
  );
}

function Thumb({ url }: { url?: string }) {
  return (
    <span className="relative inline-flex size-[48px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
      {url ? <Image src={url} alt="" fill sizes="48px" className="object-cover" unoptimized /> : <Icon icon={AiMagicIcon} size={20} />}
    </span>
  );
}

function Empty({ query, what }: { query: string; what: "prompts" | "builds" }) {
  return (
    <StateCard
      tone="empty"
      className="w-full"
      icon={<Icon icon={AiMagicIcon} size={32} />}
      title={query ? `No ${what} match “${query}”` : what === "prompts" ? "No prompts yet" : "No builds yet"}
      body={query ? "Try other words." : what === "prompts" ? "Every idea you describe on the AI tab is kept here." : "Builds appear here once a concept is built."}
      action={
        query ? undefined : (
          <Link href="/m/ai" className={buttonVariants({ size: "lg" })}>
            Describe an idea
          </Link>
        )
      }
    />
  );
}
