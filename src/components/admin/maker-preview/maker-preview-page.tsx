"use client";

// Admin › Maker preview (owner, 2026-11-11: "can we create a new menu in
// sidebar and add examples how user will see all of part? like packages,
// service and quality costs"): examples of the maker's screens drawn from the
// admin's prices (lib/admin/maker-view.ts). The credit packs in Buy credits,
// the Quality menu and Build button, and each AI service's price badge. Shows
// the prices after the draft is published by default, or live now. Read only:
// prices change on AI credit pricing and Credit packs.

import * as React from "react";
import Link from "next/link";
import { Banner } from "@/components/ideeza/banner";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { Segmented } from "@/components/ideeza/segmented";
import { Skeleton } from "@/components/ideeza/skeleton";
import { usePricingDoc } from "@/lib/admin/credit-pricing-store";
import { makerView, previewPrices, type PreviewWhen } from "@/lib/admin/maker-view";
import { PacksPreview } from "./packs-preview";
import { QualityPreview } from "./quality-preview";
import { ServicesPreview } from "./services-preview";

const WHEN_OPTIONS: readonly { label: string; value: PreviewWhen }[] = [
  { label: "After you publish", value: "next" },
  { label: "Live now", value: "live" },
];

const changesWord = (n: number) => (n === 1 ? "1 change" : `${n} changes`);

function statusLine(when: PreviewWhen, waiting: number, held: string | null): string {
  if (when === "live") {
    const tail = waiting > 0 ? ` ${changesWord(waiting)} waiting to publish aren't in it.` : "";
    return `What makers have now, from the last publish.${tail}`;
  }
  if (held) return "Publish is blocked, so this is what makers have now.";
  return waiting > 0
    ? `What makers get once you publish the ${changesWord(waiting)} waiting.`
    : "Nothing is waiting to publish: this is what makers have now.";
}

export function MakerPreviewPage() {
  const { hydrated, doc } = usePricingDoc();
  const [when, setWhen] = React.useState<PreviewWhen>("next");
  const { prices, held, waiting } = React.useMemo(() => previewPrices(doc, when), [doc, when]);
  const view = React.useMemo(() => makerView(prices), [prices]);

  return (
    <Page>
      <PageHeader
        title="Maker preview"
        description="How makers see AI credits: the packs they can buy, the build quality they can pick and what each AI service costs. Examples only; nothing here reaches makers."
      />
      {!hydrated ? (
        <div className="flex flex-col gap-8" aria-busy>
          <Skeleton className="h-[64px] w-full" />
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-4">
            <Segmented label="Show the prices" value={when} options={WHEN_OPTIONS} onChange={setWhen} size="sm" className="self-start" />
            <p className="m-0 text-sm leading-sm text-text-tertiary" aria-live="polite">
              {statusLine(when, waiting, held)}
            </p>
          </div>
          {held ? (
            <Banner
              tone="attention"
              title="The changes waiting can't be shown yet"
              action={
                <Link href="/admin/ai-credits" className="text-sm font-medium leading-sm text-inherit underline underline-offset-2">
                  Open AI credit pricing
                </Link>
              }
            >
              {held}
            </Banner>
          ) : null}
          <PacksPreview view={view} />
          <QualityPreview view={view} />
          <ServicesPreview view={view} />
        </div>
      )}
    </Page>
  );
}
