"use client";

// Clips stacked one per screen, scrolled a screen at a time (the Feed, and a
// single clip on its own page), with everything a clip's buttons open: the
// comments, sharing to your Feed and the ⋯ menu. The clip on screen plays;
// the ones beside it load. Each clip reads its heart, count and comments from
// the web's stores (reactions.ts, comments-store.ts), so they agree with the
// web's post page.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useReactions, countsOf, follows } from "@/lib/innovations/reactions";
import { clipBuyHref, clipDetailsHref, type FeedClip } from "@/lib/innovations/clips";
import { useCommentCount } from "@/lib/innovations/comments-store";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import { profileHrefOf } from "@/lib/people/ids";
import { cn } from "@/lib/utils";
import { useToast } from "../kit/toast";
import { ClipComments } from "./clip-comments";
import { ClipMenu } from "./clip-menu";
import { ClipShare } from "./clip-share";
import { ClipView } from "./clip-view";
import { useFeedPrefs } from "./use-feed";
import type { Guard } from "./use-guest";

type Open = { kind: "comments" | "share" | "menu"; clipId: string } | null;

export function ClipDeck({
  clips,
  guard,
  className,
  startWithComments = false,
}: {
  clips: readonly FeedClip[];
  guard: Guard;
  className?: string;
  /** Opens the first clip's comments on arrival (a copied comment link). */
  startWithComments?: boolean;
}) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = React.useState<string | null>(clips[0]?.id ?? null);
  const [open, setOpen] = React.useState<Open>(startWithComments && clips[0] ? { kind: "comments", clipId: clips[0].id } : null);
  // The clip whose sheets are mounted: kept after its menu closes, so a sheet the menu opened
  // (speed, quality, report) stays up.
  const [target, setTarget] = React.useState<string | null>(open?.clipId ?? null);
  const [speed, setSpeed] = React.useState(1);
  const [heights, setHeights] = React.useState<Record<string, number>>({});
  const { prefs } = useFeedPrefs();

  // The clip that fills most of the screen is the one on screen.
  React.useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId((e.target as HTMLElement).dataset.clip ?? null);
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll<HTMLElement>("[data-clip]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [clips]);

  // A clip that left the list (hidden, not interested) hands the screen to the one now there.
  const current = clips.some((c) => c.id === activeId) ? activeId : (clips[0]?.id ?? null);
  const at = clips.findIndex((c) => c.id === current);
  const openClip = target ? clips.find((c) => c.id === target) ?? null : null;

  return (
    <div ref={scroller} className={cn("h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {clips.map((c, i) => (
        <div key={c.id} data-clip={c.id} className="h-full snap-start snap-always">
          <WiredClip
            clip={c}
            active={c.id === current}
            suspended={!!open}
            near={Math.abs(i - at) <= 1}
            speed={speed}
            dataSaver={prefs.dataSaver}
            guard={guard}
            onOpen={(kind) => {
              setTarget(c.id);
              setOpen({ kind, clipId: c.id });
            }}
            onHeight={(h) => setHeights((m) => (m[c.id] === h ? m : { ...m, [c.id]: h }))}
          />
        </div>
      ))}
      {openClip && (
        <>
          <ClipComments clip={openClip} open={open?.kind === "comments"} onClose={() => setOpen(null)} guard={guard} />
          <ClipShare clip={openClip} open={open?.kind === "share"} onClose={() => setOpen(null)} />
          <ClipMenu
            clip={openClip}
            open={open?.kind === "menu"}
            onClose={() => setOpen(null)}
            speed={speed}
            onSpeed={setSpeed}
            height={heights[openClip.id] ?? null}
            guard={guard}
          />
        </>
      )}
    </div>
  );
}

function WiredClip({
  clip,
  active,
  suspended,
  near,
  speed,
  dataSaver,
  guard,
  onOpen,
  onHeight,
}: {
  clip: FeedClip;
  active: boolean;
  suspended: boolean;
  near: boolean;
  speed: number;
  dataSaver: boolean;
  guard: Guard;
  onOpen: (kind: "comments" | "share" | "menu") => void;
  onHeight: (h: number) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { reactions, toggle, markViewed, setFollow } = useReactions();
  const comments = useCommentCount(clip.postId, sampleSeedOf(clip.postId));
  const counts = countsOf(reactions, clip.postId, clip.base);
  const following = follows(reactions, clip.creator.id, clip.followedByDataset);
  const failed = () => toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
  const go = (title: string, href: string) => guard(title, () => router.push(href), href);

  const creatorHref = profileHrefOf(clip.creator.id, "innovations");
  const handlers = {
    onDetails: () => go(clip.kind === "project" ? "Sign in to see this project" : "Sign in to see this product", clipDetailsHref(clip)),
    onCreator: () => {
      if (creatorHref) go(`Sign in to see ${clip.creator.name}’s profile`, `/m${creatorHref}`);
    },
    onFollow: () =>
      guard(`Sign in to follow ${clip.creator.name}`, () => {
        if (!setFollow(clip.creator.id, !following)) failed();
      }),
    onAppreciate: () =>
      guard("Sign in to appreciate this", () => {
        if (!toggle("appreciated", clip.postId)) failed();
      }),
    onComments: () => onOpen("comments"),
    onShare: () => guard("Sign in to share this video", () => onOpen("share")),
    onMore: () => onOpen("menu"),
    onArVr: () => go("Sign in to view it in AR/VR", `/m/clip/${encodeURIComponent(clip.id)}/ar`),
    onBuy: () => go("Sign in to buy", clipBuyHref(clip)),
    onSeen: () => markViewed(clip.postId),
    onHeight,
  };

  return (
    <ClipView
      clip={clip}
      state={{ following, appreciated: counts.appreciated, appreciations: counts.appreciations, comments }}
      active={active}
      suspended={suspended}
      near={near}
      speed={speed}
      dataSaver={dataSaver}
      handlers={handlers}
    />
  );
}
