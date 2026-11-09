"use client";

// Home = the Feed (mobile Figma "Feed · 2026 update" 10646:2; owner rules:
// no Innovations on the phone, Home is full-screen clips of the projects and
// products shared on the marketplace, a clip's title opens its details). The
// top nav and the queue pill float over the clips; Feed and Following are two
// orders of the same clips (`?tab=following` keeps the choice in the address).
//
// The order is taken when a tab opens, so a clip never jumps while it is
// watched; what the ⋯ menu takes away (Hide video, Not interested) leaves at
// once. States: the bones while the stores are read, Following with nobody
// followed (Search People), everything hidden (show them again), offline.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search01Icon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { StateCard } from "@/components/ideeza/state-card";
import { FEED_CLIPS, followingClips, orderClips, type FeedClip } from "@/lib/innovations/clips";
import { useReactions } from "@/lib/innovations/reactions";
import { OfflineBanner } from "../kit/states";
import { StatusBar } from "../status-bar";
import { ClipDeck } from "./clip-deck";
import { FeedTopNav, QueuePill, type FeedTab } from "./feed-chrome";
import { useFeedPrefs } from "./use-feed";
import { useGuestGuard } from "./use-guest";

export function FeedHome() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: FeedTab = params.get("tab") === "following" ? "following" : "feed";
  const { guard, gate } = useGuestGuard();
  const { hydrated: reactionsRead, reactions } = useReactions();
  const { hydrated: prefsRead, prefs, update } = useFeedPrefs();
  const ready = reactionsRead && prefsRead;

  // The order, taken once per tab (and again when the tab is opened anew).
  const [order, setOrder] = React.useState<{ tab: FeedTab; ids: string[] } | null>(null);
  if (ready && order?.tab !== tab) {
    const list = tab === "following" ? followingClips(FEED_CLIPS, reactions, prefs) : orderClips(FEED_CLIPS, prefs);
    setOrder({ tab, ids: list.map((c) => c.id) });
  }
  const gone = React.useMemo(() => new Set([...prefs.hidden, ...(tab === "feed" ? prefs.notInterested : [])]), [prefs, tab]);
  const clips = React.useMemo<FeedClip[]>(
    () => (order ? order.ids.map((id) => FEED_CLIPS.find((c) => c.id === id)).filter((c): c is FeedClip => !!c && !gone.has(c.id)) : []),
    [order, gone],
  );

  const setTab = (t: FeedTab) => {
    if (t === tab) return;
    router.replace(t === "following" ? "/m?tab=following" : "/m", { scroll: false });
  };

  const empty =
    !ready || !order ? null : tab === "following" && order.ids.length === 0 ? (
      <StateCard
        tone="empty"
        className="w-full border-0 bg-transparent"
        icon={<Icon icon={Search01Icon} size={32} />}
        title="You’re not following anyone yet"
        body="Clips from the creators you follow show up here."
        action={
          <Button size="xl" className="w-full" onClick={() => guard("Sign in to search people", () => router.push("/m/search?kind=people"), "/m/search?kind=people")}>
            Search People
          </Button>
        }
      />
    ) : clips.length === 0 ? (
      <StateCard
        tone="empty"
        className="w-full border-0 bg-transparent"
        icon={<Icon icon={ViewOffSlashIcon} size={32} />}
        title="You’ve hidden every clip here"
        body="Show them again to keep watching."
        action={
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              update((p) => ({ ...p, hidden: [], notInterested: [] }));
              setOrder(null);
            }}
          >
            Show hidden clips
          </Button>
        }
      />
    ) : null;

  return (
    <div data-theme="dark" className="relative h-full overflow-hidden bg-bg-page text-text-primary">
      {!ready || !order ? (
        <FeedBones />
      ) : empty ? (
        <div className="flex h-full items-center px-8 pt-[110px]">{empty}</div>
      ) : (
        <ClipDeck key={tab} clips={clips} guard={guard} />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col">
        <StatusBar tone="media" />
        <div className="pointer-events-auto">
          <FeedTopNav tab={tab} onTab={setTab} guard={guard} />
        </div>
        <div className="pointer-events-auto">
          <QueuePill />
        </div>
        <div className="pointer-events-auto px-8 pt-4">
          <OfflineBanner />
        </div>
      </div>
      {gate}
    </div>
  );
}

/** The Feed loading: the clip's text column and side nav as bones on the dark stage. */
function FeedBones() {
  return (
    <div role="status" aria-label="Loading the Feed" className="flex h-full items-end gap-6 px-8 pb-6">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-6">
          <Skeleton shape="circle" size="md" />
          <Skeleton shape="text" size="md" />
        </div>
        <Skeleton shape="text" size="lg" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[96px] w-full" />
      </div>
      <div className="flex flex-col gap-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} shape="circle" size="sm" />
        ))}
      </div>
    </div>
  );
}
