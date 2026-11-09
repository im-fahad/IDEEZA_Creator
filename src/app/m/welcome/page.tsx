"use client";

// AU-02 · Welcome (first launch and after sign-out): the hero showcase, the
// ways in, Explore first. AU-02a offline, AU-04c a provider's error back here.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { ACCOUNT_CONTENT } from "@/components/mobile/account/parts";
import { WaysIn, useProviderSheet } from "@/components/mobile/account/ways-in";
import { useOnline } from "@/components/mobile/kit/states";
import { Screen } from "@/components/mobile/screen";
import { PROVIDERS, PROVIDER_WORDS, mobileNext, updatePhone, type Provider } from "@/lib/account/phone";
import { PROJECTS } from "@/lib/feed";
import { motionReduced } from "@/lib/settings/appearance";
import { cn } from "@/lib/utils";

const SLIDES = [
  { src: "/m/welcome-plant.png", caption: "Smart Plant Watering Kit · by Rafi Karim" },
  ...PROJECTS.filter((p) => p.image)
    .slice(0, 2)
    .map((p) => ({ src: p.image as string, caption: `${p.title} · by ${p.creator.name}` })),
];

export default function WelcomePage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const failed = PROVIDERS.find((p) => p === params.get("error")) as Provider | undefined;
  const online = useOnline();
  const { start, sheet } = useProviderSheet({ from: "/m/welcome", next });

  const explore = () => {
    updatePhone({ explored: true });
    router.replace("/m");
  };

  return (
    <Screen>
      <Hero />
      <div className={cn(ACCOUNT_CONTENT, "pb-4")}>
        {!online && <Banner tone="attention">You’re offline. Connect to sign in, or explore what was loaded before.</Banner>}
        {failed && online && (
          <Banner tone="error" title={`Couldn’t sign in with ${PROVIDER_WORDS[failed]}`}>
            Try again, or use another way.
          </Banner>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold leading-4xl text-text-primary">Turn an idea into a real electronic product</h1>
          <p className="text-md leading-md text-text-secondary">With AI or by hand. No electronics knowledge needed.</p>
        </div>
        <WaysIn
          onProvider={start}
          onEmail={() => router.push(next === "/m" ? "/m/sign-in" : `/m/sign-in?next=${encodeURIComponent(next)}`)}
        />
        <Button hierarchy="ghost" size="xl" className="w-full" onClick={explore}>
          Explore first
        </Button>
      </div>
      {sheet}
    </Screen>
  );
}

/** "Hero showcase (3 slides, auto-advance, still with Reduce motion)": swipe, or wait 5 s. */
function Hero() {
  const track = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);
  const touched = React.useRef(false);

  React.useEffect(() => {
    if (motionReduced()) return;
    const id = window.setInterval(() => {
      const el = track.current;
      if (!el || touched.current) return;
      const nextIndex = (Math.round(el.scrollLeft / el.clientWidth) + 1) % SLIDES.length;
      el.scrollTo({ left: nextIndex * el.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section aria-label="Made on IDEEZA" aria-roledescription="carousel" className="flex shrink-0 flex-col gap-4 pb-6">
      <div
        ref={track}
        onPointerDown={() => (touched.current = true)}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex h-[250px] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s, i) => (
          <div key={s.src} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${SLIDES.length}`} className="h-full w-full shrink-0 snap-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- static showcase art */}
            <img src={s.src} alt={s.caption} className="size-full object-cover" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 px-8">
        <p className="min-w-0 flex-1 truncate text-sm leading-sm text-text-secondary">{SLIDES[index]?.caption}</p>
        <div className="flex items-center gap-2" aria-hidden>
          {SLIDES.map((s, i) => (
            <span
              key={s.src}
              className={cn("rounded-full", i === index ? "size-[8px] bg-bg-brand" : "size-[6px] bg-[var(--color-bg-inverse)]")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
