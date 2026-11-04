"use client";

// One clip on its own page: the Feed's clip, Back over its top-left corner (A02
// Icon Button on the glass), the home indicator in its On media tone. A clip
// that isn't on the Feed (any more) says so and leads back to it.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft02Icon, VideoOffIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { clipById } from "@/lib/innovations/clips";
import { HomeIndicator } from "../home-indicator";
import { Screen } from "../screen";
import { StatusBar } from "../status-bar";
import { TopBar } from "../top-bar";
import { ClipDeck } from "./clip-deck";
import { useGuestGuard } from "./use-guest";

export function ClipPage({ id, withComments }: { id: string; withComments: boolean }) {
  const router = useRouter();
  const clip = clipById(id);
  const { guard, gate } = useGuestGuard();
  const clips = React.useMemo(() => (clip ? [clip] : []), [clip]);

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/m");
  };

  if (!clip) {
    return (
      <Screen top={<TopBar back title="Clip" />}>
        <div className="flex h-full items-center px-8">
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={VideoOffIcon} size={32} />}
            title="This clip isn’t on the Feed"
            body="It may have been taken down, or the link is wrong."
            action={
              <Button size="xl" className="w-full" onClick={() => router.push("/m")}>
                Back to the Feed
              </Button>
            }
          />
        </div>
      </Screen>
    );
  }

  return (
    <div data-theme="dark" className="relative flex h-full flex-col overflow-hidden bg-bg-page text-text-primary">
      <div className="min-h-0 flex-1">
        <ClipDeck clips={clips} guard={guard} startWithComments={withComments} />
      </div>
      <HomeIndicator tone="media" className="absolute inset-x-0 bottom-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0">
        <StatusBar tone="media" />
        <div className="pointer-events-auto px-8 py-2">
          <button
            type="button"
            aria-label="Back"
            onClick={back}
            className="inline-flex size-[44px] items-center justify-center rounded-xl bg-[var(--color-glass-fill-sm)] text-[color:var(--color-white)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={ArrowLeft02Icon} size={22} />
          </button>
        </div>
      </div>
      {gate}
    </div>
  );
}
