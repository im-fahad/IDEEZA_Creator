"use client";

// The product page's states around its content (Product Details 10v–10wb,
// 32a–32b): loading (the page's shape under the bar, "Loading product"),
// offline while loading (the saved copy is shown once it is read), a read
// that never finishes ("We couldn't load this product" + Try again), the
// product that isn't in its project, the project that isn't here, and — on
// the marketplace — a project that isn't on it, or is off it for now.

import * as React from "react";
import Link from "next/link";
import { FolderSearchIcon, HelpCircleIcon, Store01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { buttonVariants } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { StateCard } from "@/components/ideeza/state-card";
import { cn } from "@/lib/utils";
import { useOnline } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";

/** How long a read may take before the page says it couldn't load (10wb). */
const STUCK_MS = 10_000;

/** 10w · Loading product; 10wa offline; 10wb couldn't load. */
export function ProductLoading() {
  const online = useOnline();
  const [stuck, setStuck] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setStuck(true), STUCK_MS);
    return () => window.clearTimeout(t);
  }, []);
  if (stuck && online) {
    return (
      <Screen top={<TopBar back />} className="px-8 pb-8">
        <Banner
          tone="error"
          title="We couldn’t load this product"
          action={
            <button type="button" onClick={() => window.location.reload()} className="-my-6 inline-flex min-h-[44px] items-center text-md font-medium leading-md outline-none hover:underline focus-visible:underline">
              Try again
            </button>
          }
        >
          Check your connection and try again.
        </Banner>
      </Screen>
    );
  }
  return (
    <Screen top={<TopBar back />}>
      <div className="flex flex-col gap-6 px-8 pb-8">
        {!online && (
          <Banner tone="attention" title="You’re offline">
            Showing what was saved on this phone. It updates when you’re back online.
          </Banner>
        )}
        <div role="status" aria-label="Loading product" className="flex flex-col gap-6">
          <Skeleton shape="text" size="sm" />
          <Skeleton shape="text" size="lg" />
          <Skeleton shape="text" size="md" />
          <Skeleton shape="block" className="h-[60px] w-full" />
          <div className="flex gap-4">
            <Skeleton shape="block" className="h-[28px] w-[88px]" />
            <Skeleton shape="block" className="h-[28px] w-[72px]" />
          </div>
          <Skeleton shape="block" className="h-[40px] w-full" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="block" className="h-[72px] w-full" />
          ))}
        </div>
      </div>
    </Screen>
  );
}

function CardScreen({ title, top, children }: { title?: string; top?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Screen top={top ?? <TopBar back title={title} />} className="px-8 pb-8">
      {children}
    </Screen>
  );
}

/** 10v · Product not found. */
export function ProductMissing({ projectName, back }: { projectName: string; back: string }) {
  return (
    <CardScreen title="Product">
      <StateCard
        tone="empty"
        className="w-full"
        titleAs="h1"
        icon={<Icon icon={HelpCircleIcon} size={32} />}
        title={`This product isn’t in ${projectName}`}
        body="Its link doesn’t match any product in this project. It may have been removed."
        action={
          <Link href={back} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
            Back to the project
          </Link>
        }
      />
    </CardScreen>
  );
}

/** An address that matches no project in this browser (the project page's 20d). */
export function ProjectMissing() {
  return (
    <CardScreen>
      <StateCard
        tone="empty"
        className="w-full"
        titleAs="h1"
        icon={<Icon icon={FolderSearchIcon} size={32} />}
        title="We couldn't find this project"
        body="It may have been deleted, or it was made in another browser."
        action={
          <Link href="/m/projects" className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
            Back to My projects
          </Link>
        }
      />
    </CardScreen>
  );
}

/** 32a · not on the marketplace; 32b · off it for now (its creator paused it). The phone's
 *  marketplace items live on the Feed, so that is where Back goes. */
export function OffMarket({ paused }: { paused: boolean }) {
  return (
    <CardScreen title="Explore marketplace">
      <StateCard
        tone="empty"
        className="w-full"
        titleAs="h1"
        icon={<Icon icon={paused ? HelpCircleIcon : Store01Icon} size={32} />}
        title={paused ? "This project is off the marketplace for now" : "This project isn’t on the marketplace"}
        body={
          paused
            ? "Its creator paused the listing to make changes. It can’t be bought until they relist it, and then it’s back here."
            : "This page shows only projects their creator added to Explore marketplace. This one may never have been listed, or its creator took it off."
        }
        action={
          <Link href="/m" className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
            Back to the Feed
          </Link>
        }
      />
    </CardScreen>
  );
}
