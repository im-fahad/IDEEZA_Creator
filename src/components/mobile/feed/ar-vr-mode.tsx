"use client";

// Feed · AR/VR mode (mobile Figma "Clip ⋯ menu" 04): the top bar (Back,
// "AR/VR Mode"), the item on the light stage, and the clip's creator, chip,
// title and description at the foot over a dark scrim (text over it white).
// What the phone can do is real: it asks the browser whether it can open an
// AR or a VR session (WebXR). A sample post has no 3D file (the web's words),
// so there is nothing to place yet and View in AR says so.

import * as React from "react";
import { useRouter } from "next/navigation";
import { VirtualRealityVr01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { clipById, clipDetailsHref } from "@/lib/innovations/clips";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { shortOf } from "./clip-view";

type XrSupport = { ar: boolean; vr: boolean } | null;

type XrLike = { isSessionSupported: (mode: string) => Promise<boolean> };

const xrOf = () => (navigator as Navigator & { xr?: XrLike }).xr;

/** /m renders only in the browser (mobile-root.tsx), so `navigator` is there on the first render. */
function useXrSupport(): XrSupport {
  const [support, setSupport] = React.useState<XrSupport>(() => (xrOf() ? null : { ar: false, vr: false }));
  React.useEffect(() => {
    const xr = xrOf();
    if (!xr) return;
    let alive = true;
    const ask = (mode: string) => xr.isSessionSupported(mode).catch(() => false);
    Promise.all([ask("immersive-ar"), ask("immersive-vr")]).then(([ar, vr]) => {
      if (alive) setSupport({ ar, vr });
    });
    return () => {
      alive = false;
    };
  }, []);
  return support;
}

export function ArVrMode({ id }: { id: string }) {
  const router = useRouter();
  const clip = clipById(id);
  const xr = useXrSupport();

  if (!clip) {
    return (
      <Screen top={<TopBar back title="AR/VR Mode" />}>
        <div className="flex h-full items-center px-8">
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={VirtualRealityVr01Icon} size={32} />}
            title="This clip isn’t on the Feed"
            body="It may have been taken down."
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

  const can = xr === null ? "Checking what this phone can open…" : xr.ar || xr.vr ? `This phone can open ${[xr.ar && "AR", xr.vr && "VR"].filter(Boolean).join(" and ")}.` : "This browser can’t open AR or VR.";

  return (
    <Screen top={<TopBar back title="AR/VR Mode" />} className="relative flex flex-col">
      <div className="relative flex min-h-full flex-1 flex-col bg-gradient-to-b from-[var(--color-white)] to-[var(--color-gray-300)]">
        <div data-theme="light" className="flex flex-col gap-6 px-8 pt-4">
          <Banner tone="info" title="No 3D file to place yet">
            This sample post has no 3D file; this is its render. {can}
          </Banner>
          <Button size="lg" className="w-full" disabled>
            View in AR
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          {clip.poster && (
            // eslint-disable-next-line @next/next/no-img-element -- the item's render
            <img src={clip.poster} alt={`${clip.title}, its render`} className="max-h-[320px] w-full object-contain px-12" />
          )}
        </div>
        <div data-theme="dark" className="bg-gradient-to-b from-transparent via-[color:color-mix(in_srgb,var(--color-black)_50%,transparent)] via-[30%] to-[color:color-mix(in_srgb,var(--color-black)_80%,transparent)] px-8 pb-6 pt-16 text-text-primary">
          <div className="flex flex-col items-start gap-4">
            <span className="flex items-center gap-6">
              <Avatar size="md" initials={clip.creator.initials} color={clip.creator.color} />
              <span className="text-lg font-medium leading-lg">{clip.creator.name}</span>
            </span>
            <span className="rounded-full bg-bg-inverse px-4 py-2 text-sm leading-xs text-text-inverse">{clip.kind === "project" ? "Project" : "Product"}</span>
            <button type="button" onClick={() => router.push(clipDetailsHref(clip))} className="flex flex-col gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
              <span className="text-lg font-semibold leading-lg">{clip.title}</span>
              <span className="text-lg leading-lg">
                {shortOf(clip.description)}
                <span className="text-text-tertiary">more</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
