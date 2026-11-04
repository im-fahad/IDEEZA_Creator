"use client";

// Feed · Saved clips (mobile Figma 01–02): Back, "Saved"; "Saved Items", then a
// row per saved clip — its picture, its name and "Saved on: <date>" (when this
// phone saved it; one saved on the web says Saved), and ⋯: the M12 menu with
// View original post, Copy link and Unsave. The list is the web's Saved (the
// reactions store), so a video saved on either shows on both. Newest first.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark01Icon, BookmarkRemove01Icon, Copy01Icon, MoreHorizontalIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { FEED_CLIPS, clipHref, type FeedClip } from "@/lib/innovations/clips";
import { withSavedAt } from "@/lib/innovations/feed-prefs";
import { useReactions } from "@/lib/innovations/reactions";
import { formatDate } from "@/lib/settings/dates";
import { useSettings } from "@/lib/settings/use-settings";
import { ActionSheet } from "../kit/sheet";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useCopyClipLink } from "./clip-menu";
import { useFeedPrefs } from "./use-feed";

type SavedRow = { clip: FeedClip; at: number | null };

export function SavedScreen() {
  const router = useRouter();
  const toast = useToast();
  const settings = useSettings();
  const copy = useCopyClipLink();
  const { hydrated, reactions, toggle } = useReactions();
  const { hydrated: prefsRead, prefs, update } = useFeedPrefs();
  const [menu, setMenu] = React.useState<SavedRow | null>(null);

  const rows = React.useMemo<SavedRow[]>(() => {
    const out: (SavedRow & { i: number })[] = [];
    reactions.saved.forEach((postId, i) => {
      const clip = FEED_CLIPS.find((c) => c.postId === postId && c.kind === "project");
      if (clip) out.push({ clip, at: prefs.savedAt[postId] ?? null, i });
    });
    return out.sort((a, b) => (b.at ?? 0) - (a.at ?? 0) || b.i - a.i);
  }, [reactions.saved, prefs.savedAt]);

  const unsave = (r: SavedRow) => {
    if (!toggle("saved", r.clip.postId)) {
      toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
      return;
    }
    update((p) => withSavedAt(p, r.clip.postId, null));
    toast({
      title: "Removed from Saved",
      action: {
        label: "Undo",
        onClick: () => {
          if (toggle("saved", r.clip.postId)) update((p) => withSavedAt(p, r.clip.postId, r.at));
        },
      },
    });
  };

  return (
    <Screen top={<TopBar back title="Saved" />}>
      <div className="flex flex-col gap-4 px-8 pb-8">
        <h2 className="pt-2 text-lg font-medium leading-lg text-text-primary">Saved Items</h2>
        {!hydrated || !prefsRead ? (
          <ListBones rows={6} />
        ) : rows.length === 0 ? (
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={Bookmark01Icon} size={32} />}
            title="Nothing saved yet"
            body="Save a video from its ⋯ menu on the Feed and it waits for you here."
            action={
              <Button size="xl" className="w-full" onClick={() => router.push("/m")}>
                Go to the Feed
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col">
            {rows.map((r) => (
              <li key={r.clip.postId} className="flex items-center gap-6 border-b-[length:var(--border-width-1)] border-solid border-border-subtle py-6">
                <button
                  type="button"
                  onClick={() => router.push(clipHref(r.clip.id))}
                  className="flex min-w-0 flex-1 items-center gap-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {r.clip.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the clip's picture
                    <img src={r.clip.poster} alt="" className="size-[40px] shrink-0 rounded-md object-cover" />
                  ) : (
                    <span aria-hidden className="size-[40px] shrink-0 rounded-md bg-bg-subtle" />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-lg leading-lg text-text-primary">{r.clip.title}</span>
                    <span className="text-md leading-md text-text-secondary">
                      {r.at === null ? "Saved" : `Saved on: ${formatDate(r.at, settings.language.dateLocale, { style: "numeric" })}`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`More for ${r.clip.title}`}
                  onClick={() => setMenu(r)}
                  className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <Icon icon={MoreHorizontalIcon} size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.clip.title}
        items={
          menu
            ? [
                { label: "View original post", icon: ViewIcon, onSelect: () => router.push(clipHref(menu.clip.id)) },
                { label: "Copy link", icon: Copy01Icon, onSelect: () => copy(menu.clip.id) },
                { label: "Unsave", icon: BookmarkRemove01Icon, onSelect: () => unsave(menu) },
              ]
            : []
        }
      />
    </Screen>
  );
}
