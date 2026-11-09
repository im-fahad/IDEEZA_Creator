"use client";

// Mobile / Video player (Figma 10325:2): a take's clip from this browser's
// clip store (the web's `useClipUrl`), on bg/inverse with radius/md. The
// phone's own controls play it (play, scrub, time, full screen), so the
// player is the platform's. A file that isn't here any more says so.

import * as React from "react";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { CANNOT_PLAY_COPY } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";

export function PhoneVideo({ takeId, label, className }: { takeId: string; label: string; className?: string }) {
  const clip = useClipUrl(takeId);
  const [broken, setBroken] = React.useState(false);
  return (
    <div className={cn("relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-bg-inverse", className)}>
      {clip.state === "ready" && clip.url && !broken ? (
        <video
          key={clip.url}
          src={clip.url}
          poster={clip.posterUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          aria-label={label}
          onError={() => setBroken(true)}
          className="size-full object-contain"
        />
      ) : (
        <p className="px-8 text-center text-md leading-md text-text-inverse">
          {clip.state === "loading" ? "Loading the video…" : broken ? CANNOT_PLAY_COPY : "This video's file isn't in this browser any more."}
        </p>
      )}
    </div>
  );
}
