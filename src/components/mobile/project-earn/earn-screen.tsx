"use client";

// Earn on the phone (Figma "Project Details · 2026 update" 12–17; the web's
// /projects/[id]/earn at 375 px, its words kept): the top bar "Earn" with Back
// to the project and, once there is something to see, Preview as others see
// it (the web header's ghost link, in the bar's right slot); the project's
// name with the one status pill from the commercial axis (`earnStatusOf`) and
// the lock line once sold in full; the tabs Overview · Sell · Business plan ·
// Money, which scroll sideways as on the web, each its own address so Back
// and a reload keep it. The tab's body scrolls under them.
//
// Owner only (`canOpenEarn`): anyone else gets "Only the owner can manage
// earning". Bones while the stores are read; an unknown address says so.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, FolderSearchIcon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { StateCard } from "@/components/ideeza/state-card";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { commercialFactsOf, commercialStateOf } from "@/lib/commerce/state";
import type { EarnSection } from "@/lib/manual/earn-route";
import { canOpenEarn, earnStatusOf } from "@/lib/manual/earn-view";
import { labelOf } from "@/lib/manual/journey";
import { can, hasAudience } from "@/lib/manual/permissions";
import { PHONE_EARN_TABS, phoneEarnHref, phonePreviewHref } from "@/lib/manual/phone-earn";
import { headerText } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import type { Ready } from "../project/context";
import { EarnProvider, type EarnCtx } from "./context";
import { EarnMoneyTab } from "./money-tab";
import { EarnOverviewTab } from "./overview-tab";
import { PhoneWalletScope } from "./phone-wallet";
import { EarnPlanTab } from "./plan-tab";
import { EarnSellTab } from "./sell-tab";

export function EarnScreen({ id, section }: { id: string; section: EarnSection }) {
  const data = useProjectPageData(id, "project");
  if (data.state === "loading") return <EarnLoading id={id} />;
  if (data.state === "missing") return <EarnMissing />;
  return <EarnReady data={data} section={section} />;
}

function EarnLoading({ id }: { id: string }) {
  return (
    <Screen top={<TopBar back={`/m/projects/${encodeURIComponent(id)}`} title="Earn" />}>
      <div role="status" aria-label="Loading earning" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[40px] w-full" />
        <Skeleton shape="block" className="h-[240px] w-full" />
        <Skeleton shape="block" className="h-[120px] w-full" />
      </div>
    </Screen>
  );
}

function EarnMissing() {
  return (
    <Screen top={<TopBar back="/m/projects" title="Earn" />} className="px-8 pb-8">
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
    </Screen>
  );
}

function EarnReady({ data, section }: { data: Ready; section: EarnSection }) {
  const { project, view, viewer, brief } = data;
  const router = useRouter();
  const back = `/m/projects/${encodeURIComponent(project.id)}`;
  const commercial = commercialStateOf(commercialFactsOf(project, brief, { listing: view.listing, sales: view.sales }));
  const [live, setLive] = React.useState("");
  const announce = React.useCallback((message: string) => {
    setLive("");
    window.setTimeout(() => setLive(message), 50);
  }, []);
  const ctx = React.useMemo<EarnCtx>(() => ({ ...data, commercial, announce }), [data, commercial, announce]);

  if (!canOpenEarn(viewer)) {
    return (
      <Screen top={<TopBar back={back} title="Earn" />} className="px-8 pb-8">
        <StateCard
          tone="empty"
          className="w-full"
          titleAs="h1"
          icon={<Icon icon={LockIcon} size={32} />}
          title="Only the owner can manage earning"
          action={
            <Link href={back} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
              Back to {project.name}
            </Link>
          }
        />
      </Screen>
    );
  }

  const status = earnStatusOf(commercial);
  const text = headerText(view.summary, { viewer, now: { label: labelOf(view.current) } });
  const preview = commercial !== "none" && can(viewer, "preview.enter") && hasAudience(view.summary.status, view.summary.showcase);

  return (
    <PhoneWalletScope>
      <EarnProvider value={ctx}>
        <Screen
          top={
            <>
              <TopBar
                back={back}
                title="Earn"
                actions={preview ? [{ icon: EyeIcon, label: "Preview as others see it", onClick: () => router.push(phonePreviewHref(project.id, "buyer")) }] : []}
              />
              <div className="flex flex-col gap-2 px-8 pb-6">
                <div className="flex min-w-0 items-center gap-4">
                  <p className="min-w-0 truncate text-md font-medium leading-md text-text-primary">{project.name}</p>
                  <Badge tone={status.tone} className="shrink-0">
                    {status.word}
                  </Badge>
                </div>
                {text.lockLine && (
                  <p className="flex items-start gap-2 text-sm leading-sm text-text-primary">
                    <span aria-hidden className="mt-1 text-[color:var(--color-icon-secondary)]">
                      <Icon icon={LockIcon} size={14} />
                    </span>
                    {text.lockLine}
                  </p>
                )}
              </div>
              <EarnTabs projectId={project.id} section={section} />
            </>
          }
        >
          <OfflineBanner />
          <div className="px-8 pb-12 pt-8">
            {section === "overview" && <EarnOverviewTab />}
            {section === "sell" && <EarnSellTab />}
            {section === "plan" && <EarnPlanTab />}
            {section === "money" && <EarnMoneyTab />}
          </div>
          <p aria-live="polite" className="sr-only">
            {live}
          </p>
        </Screen>
      </EarnProvider>
    </PhoneWalletScope>
  );
}

/** M14 Tabs, Line, Width=HUG: page links that scroll sideways; the current one is brought into view. */
function EarnTabs({ projectId, section }: { projectId: string; section: EarnSection }) {
  const current = React.useRef<HTMLAnchorElement>(null);
  React.useEffect(() => {
    current.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [section]);
  return (
    <nav aria-label="Earn" className="border-b-[length:var(--border-width-1)] border-solid border-border-default">
      <div className="flex overflow-x-auto pl-8 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PHONE_EARN_TABS.map((t) => {
          const on = t.id === section;
          return (
            <Link
              key={t.id}
              ref={on ? current : undefined}
              href={phoneEarnHref(projectId, t.id)}
              replace
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={cn(
                "-mb-[var(--border-width-1)] flex h-[40px] shrink-0 items-center whitespace-nowrap border-b-[length:var(--border-width-2)] border-solid px-2 text-md font-medium leading-md outline-none transition-colors duration-fast focus-visible:bg-bg-subtle",
                on ? "border-[var(--color-border-brand)] text-text-brand" : "border-transparent text-text-secondary hover:text-text-primary",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
