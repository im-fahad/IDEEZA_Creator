"use client";

// One Feed clip, full screen (mobile Figma "Feed · 2026 update", states 1–6
// and "Play and pause a clip"). The video fills the screen under a dark scrim
// at the top and the bottom; everything over it is the Dark semantic mode, so
// its text is white (owner rule). At the foot, the creator (A16b, • Follow),
// the Project / Product chip, the title (H6) and two lines of the description
// with "more" — the title and the description open the item's details; the
// video itself plays or pauses. Under them, the item's marketplace offers. On
// the right, the clip side nav: 3D, AR/VR, appreciate (with its count),
// comments (with theirs), share and ⋯.
//
// It plays only while it is the clip on screen (muted, looping, inline); with
// Data saver on it waits for a tap. A clip that can't load says so with Try
// again. 3D swaps the video for the item's 3D view in place.

import * as React from "react";
import {
  Alert02Icon,
  Blockchain01Icon,
  CommentAdd02Icon,
  FavouriteIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  Share01Icon,
  VirtualRealityVr01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Button } from "@/components/ideeza/button";
import { Spinner } from "@/components/ideeza/spinner";
import { formatCount } from "@/lib/feed";
import type { ClipOffer, FeedClip } from "@/lib/innovations/clips";
import { cn } from "@/lib/utils";
import { ClipOffers } from "./clip-offers";

export type ClipHandlers = {
  onDetails: () => void;
  onCreator: () => void;
  onFollow: () => void;
  onAppreciate: () => void;
  onComments: () => void;
  onShare: () => void;
  onMore: () => void;
  onArVr: () => void;
  onBuy: (o: ClipOffer) => void;
  /** It has been on screen a moment: count the view. */
  onSeen: () => void;
  /** The height the video really has, once known (Video quality). */
  onHeight?: (h: number) => void;
};

export type ClipState = {
  following: boolean;
  appreciated: boolean;
  appreciations: number;
  comments: number | null;
};

const SEEN_MS = 1000;
/** About two lines of Body/MD in the clip's text column. */
const SHORT_CHARS = 56;

/** The description's first two lines, then "...": "more" follows it (Figma). */
export function shortOf(text: string): string {
  const t = text.trim();
  if (t.length <= SHORT_CHARS) return `${t} `;
  const cut = t.slice(0, SHORT_CHARS);
  const space = cut.lastIndexOf(" ");
  return `${(space > 30 ? cut.slice(0, space) : cut).replace(/[,.;:]$/, "")}...`;
}

export function ClipView({
  clip,
  state,
  active,
  suspended = false,
  near,
  speed,
  dataSaver,
  handlers,
  className,
}: {
  clip: FeedClip;
  state: ClipState;
  /** The clip on screen: it plays. */
  active: boolean;
  /** A sheet is open over it: it holds still where it is. */
  suspended?: boolean;
  /** On screen or next to it: its video loads. */
  near: boolean;
  speed: number;
  dataSaver: boolean;
  handlers: ClipHandlers;
  className?: string;
}) {
  const video = React.useRef<HTMLVideoElement>(null);
  // Tapped to pause (or, with Data saver, not yet tapped to play).
  const [paused, setPaused] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [flash, setFlash] = React.useState<"play" | "pause" | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [waiting, setWaiting] = React.useState(false);
  const [model, setModel] = React.useState(false);

  // Leaving the screen starts the clip afresh next time (adjusted while rendering, not in an effect).
  const [wasActive, setWasActive] = React.useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setPaused(false);
      setStarted(false);
      setModel(false);
    }
  }

  const waitsForTap = dataSaver && !started;
  const playing = active && !suspended && !paused && !waitsForTap && !model && !failed;

  React.useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.playbackRate = speed;
    if (playing) v.play().catch(() => setPaused(true));
    else v.pause();
  }, [playing, speed, near]);

  const seen = React.useRef(handlers.onSeen);
  React.useEffect(() => {
    seen.current = handlers.onSeen;
  }, [handlers.onSeen]);
  React.useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => seen.current(), SEEN_MS);
    return () => window.clearTimeout(id);
  }, [active]);

  React.useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 700);
    return () => window.clearTimeout(id);
  }, [flash]);

  const toggle = () => {
    if (model || failed) return;
    if (waitsForTap) {
      setStarted(true);
      setPaused(false);
      setFlash("play");
      return;
    }
    setPaused((p) => !p);
    setFlash(paused ? "play" : "pause");
  };

  const retry = () => {
    setFailed(false);
    video.current?.load();
  };

  const showPlay = active && !model && !failed && (paused || waitsForTap);
  const centre = showPlay ? "play" : flash;

  return (
    <article aria-label={`${clip.kind === "project" ? "Project" : "Product"}: ${clip.title}`} className={cn("relative h-full w-full overflow-hidden bg-[var(--color-black)]", className)}>
      {model ? (
        <ModelView clip={clip} />
      ) : (
        <>
          {clip.poster && (
            // eslint-disable-next-line @next/next/no-img-element -- the clip's still, under the video while it loads
            <img src={clip.poster} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          {near && (
            <video
              ref={video}
              src={clip.video.src}
              poster={clip.poster ?? undefined}
              muted
              loop
              playsInline
              preload={active && !dataSaver ? "auto" : "metadata"}
              aria-label={clip.video.label}
              onLoadedMetadata={(e) => handlers.onHeight?.(e.currentTarget.videoHeight)}
              onWaiting={() => setWaiting(true)}
              onPlaying={() => setWaiting(false)}
              onError={() => setFailed(true)}
              className="absolute inset-0 size-full object-cover"
            />
          )}
        </>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[140px] bg-gradient-to-b from-[color:color-mix(in_srgb,var(--color-black)_70%,transparent)] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-b from-transparent from-[14%] to-[color:color-mix(in_srgb,var(--color-black)_70%,transparent)]" />

      <button
        type="button"
        aria-label={model ? "3D view" : playing ? "Pause" : "Play"}
        disabled={model || failed}
        onClick={toggle}
        className="absolute inset-0 cursor-default outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
      />

      <div data-theme="dark" className="pointer-events-none absolute inset-0 flex flex-col justify-end text-text-primary">
        {centre && (
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 inline-flex size-[48px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-glass-fill-sm)] text-[color:var(--color-white)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-fast"
          >
            <Icon icon={centre === "play" ? PlayIcon : PauseIcon} size={24} />
          </span>
        )}
        {waiting && playing && (
          <span role="status" aria-label="Loading the clip" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Spinner size={32} />
          </span>
        )}
        {failed && (
          <div className="pointer-events-auto absolute inset-x-8 top-1/2 flex -translate-y-1/2 flex-col items-center gap-6 text-center">
            <span className="text-[color:var(--color-icon-error)]">
              <Icon icon={Alert02Icon} size={24} />
            </span>
            <p className="text-lg font-medium leading-lg">Couldn’t play this clip</p>
            <Button hierarchy="secondary" size="md" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        <div className="flex items-end gap-6 px-8 pb-6">
          <div className="pointer-events-auto flex min-w-0 flex-1 flex-col gap-8">
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handlers.onCreator}
                  className="flex items-center gap-6 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <Avatar size="md" initials={clip.creator.initials} color={clip.creator.color} />
                  <span className="text-lg font-medium leading-lg">{clip.creator.name}</span>
                </button>
                <span aria-hidden className="text-md font-semibold leading-md text-text-disabled">
                  •
                </span>
                <button
                  type="button"
                  aria-pressed={state.following}
                  onClick={handlers.onFollow}
                  className="rounded-sm border-[length:var(--border-width-1-5)] border-solid border-[var(--color-glass-border-strong)] px-2 text-md font-medium leading-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {state.following ? "Following" : "Follow"}
                </button>
              </div>
              <span className="rounded-full bg-bg-inverse px-4 py-2 text-sm leading-xs text-text-inverse">
                {clip.kind === "project" ? "Project" : "Product"}
              </span>
              <button type="button" onClick={handlers.onDetails} className="flex flex-col gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
                <span className="text-lg font-semibold leading-lg">{clip.title}</span>
                <span className="text-lg leading-lg">
                  {shortOf(clip.description)}
                  <span className="text-text-tertiary">more</span>
                </span>
              </button>
            </div>
            <ClipOffers offers={clip.offers} onBuy={handlers.onBuy} />
          </div>

          <nav aria-label="Clip actions" className="pointer-events-auto flex w-[44px] shrink-0 flex-col items-center gap-4">
            <SideButton icon={Blockchain01Icon} label="3D" pressed={model} onClick={() => setModel((m) => !m)} />
            <SideButton icon={VirtualRealityVr01Icon} label="AR/VR" onClick={handlers.onArVr} />
            <SideButton
              icon={FavouriteIcon}
              label={formatCount(state.appreciations)}
              name={state.appreciated ? "Appreciated" : "Appreciate"}
              pressed={state.appreciated}
              filled={state.appreciated}
              onClick={handlers.onAppreciate}
            />
            <SideButton
              icon={CommentAdd02Icon}
              label={state.comments === null ? "" : formatCount(state.comments)}
              name={state.comments === null ? "Comments" : `Comments, ${state.comments}`}
              onClick={handlers.onComments}
            />
            <SideButton icon={Share01Icon} name="Share to your Feed" onClick={handlers.onShare} />
            <SideButton icon={MoreHorizontalIcon} name="More" onClick={handlers.onMore} />
          </nav>
        </div>
      </div>
    </article>
  );
}

function SideButton({
  icon,
  label,
  name,
  pressed,
  filled,
  onClick,
}: {
  icon: IconValue;
  label?: string;
  name?: string;
  pressed?: boolean;
  filled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={name ?? label}
      aria-pressed={pressed}
      onClick={onClick}
      className="flex min-h-[44px] w-[44px] flex-col items-center justify-center gap-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span className={cn(filled ? "text-[color:var(--color-icon-error)] [&_path]:fill-current" : "text-text-primary")}>
        <Icon icon={icon} size={24} />
      </span>
      {label && <span className="whitespace-nowrap text-md leading-md">{label}</span>}
    </button>
  );
}

/** "3D view mode" (Clip ⋯ menu 03): the item's model in place of its video. A sample post has no
 *  3D file (the web's words), so this is its render, on the light stage the Figma draws. */
function ModelView({ clip }: { clip: FeedClip }) {
  return (
    <div data-theme="light" className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[var(--color-white)] to-[var(--color-gray-300)]">
      {clip.poster && (
        // eslint-disable-next-line @next/next/no-img-element -- the item's render
        <img src={clip.poster} alt={`${clip.title}, its render`} className="max-h-[50%] w-full object-contain px-12" />
      )}
      <p className="absolute inset-x-8 top-[120px] rounded-md bg-[var(--color-glass-fill-lg)] px-6 py-4 text-center text-md leading-md text-text-primary">
        This sample post has no 3D file; this is its render.
      </p>
    </div>
  );
}
