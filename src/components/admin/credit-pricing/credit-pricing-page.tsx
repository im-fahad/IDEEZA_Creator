"use client";

// Admin › AI credit pricing (prototype, owner 2026-11-10): the admin enters
// what each AI service really costs us and the profit to make, and every
// service's price in credits follows (lib/admin/credit-pricing.ts). The draft
// saves as it is typed; makers' prices change only on Publish. All of it is
// kept in this browser (lib/admin/credit-pricing-store.ts): no backend, and
// nothing here reaches the maker's side of the prototype.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { ConfirmDialog } from "@/components/ideeza/dialog";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TAB, TAB_OFF, TAB_ON } from "@/components/projects/details/tab-strip";
import { useAuth } from "@/lib/account/auth";
import type { PackDraft, PackRulesDraft } from "@/lib/admin/credit-packs";
import { cn } from "@/lib/utils";
import { basisLine, pricingPlan, type CustomCreditDraft, type PricingSettings, type QualityDraft, type QualityLevel } from "@/lib/admin/credit-pricing";
import { publishDraft, resetPricing, saveDraft, usePricingDoc } from "@/lib/admin/credit-pricing-store";
import { CreditPacksTab } from "./credit-packs-tab";
import { CurrencySection } from "./currency-section";
import { CustomCreditSection } from "./custom-credit-section";
import { PriceHistory } from "./price-history";
import type { PriceDraftField } from "./price-table";
import { PricingSummary } from "./pricing-summary";
import { ProfitSection } from "./profit-section";
import { PublishDialog } from "./publish-dialog";
import { QualityAccessSection, QualitySection, ServicesSection } from "./services-section";

const SAVE_FAILED = "This browser didn't save that change. Its storage may be full or blocked.";

type Notice = { tone: "good" | "error"; text: string };

// The live admin's AI Credit System has tabs (Base Settings, AI Services,
// Credit Packs); here the prices are one tab, since every price follows from
// the settings above it, and the packs are the other. Each tab is a page of
// its own (/admin/ai-credits, /admin/credit-packs), so the admin sidebar lists
// both and a link survives the sign-in redirect; the tabs are links, styled
// as the project page's tab strip (as the Earn tabs are).
type View = "prices" | "packs";
const VIEWS: readonly { id: View; label: string; href: string }[] = [
  { id: "prices", label: "Prices", href: "/admin/ai-credits" },
  { id: "packs", label: "Credit packs", href: "/admin/credit-packs" },
];

function ViewTabs({ view }: { view: View }) {
  return (
    // mb-12: the page frame doesn't space its children; the page header carries mb-12 too.
    <nav aria-label="AI credit pricing sections" className="mb-12 min-w-0 border-b border-solid border-border">
      <ul className="m-0 flex list-none flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden p-0">
        {VIEWS.map((v) => (
          <li key={v.id} className="flex shrink-0">
            <Link href={v.href} aria-current={v.id === view ? "page" : undefined} className={cn(TAB, v.id === view ? TAB_ON : TAB_OFF)}>
              {v.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function CreditPricingPage({ view }: { view: View }) {
  const router = useRouter();
  const { hydrated, doc } = usePricingDoc();
  const { account } = useAuth();
  const plan = React.useMemo(() => pricingPlan(doc), [doc]);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  // The packs were first a `#packs` tab of this page: an old link still lands on them.
  React.useEffect(() => {
    if (view === "prices" && window.location.hash === "#packs") router.replace("/admin/credit-packs");
  }, [view, router]);

  const write = (ok: boolean, done?: string) =>
    setNotice(ok ? (done ? { tone: "good", text: done } : null) : { tone: "error", text: SAVE_FAILED });

  const changeSettings = (patch: Partial<PricingSettings>) => write(saveDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } })).ok);

  const changeCustom = (patch: Partial<CustomCreditDraft>) => write(saveDraft((d) => ({ ...d, custom: { ...d.custom, ...patch } })).ok);

  const changeService = (key: string, field: PriceDraftField, value: string) =>
    write(
      saveDraft((d) => ({
        ...d,
        services: {
          ...d.services,
          [key]: {
            ...(d.services[key] ?? { cost: "", profit: "" }),
            [field]: value,
          },
        },
      })).ok,
    );

  const changeLevel = (level: QualityLevel, patch: Partial<QualityDraft>) =>
    write(
      saveDraft((d) => ({
        ...d,
        quality: {
          ...d.quality,
          [level]: { ...d.quality[level], ...patch },
        },
      })).ok,
    );

  const changePacks = (change: (packs: PackDraft[]) => PackDraft[]) => write(saveDraft((d) => ({ ...d, packs: change(d.packs) })).ok);

  const changePackRules = (change: (rules: PackRulesDraft) => PackRulesDraft) =>
    write(saveDraft((d) => ({ ...d, packRules: change(d.packRules) })).ok);

  const publish = () => {
    const n = plan.changes.length;
    const by = account ? `${account.firstName} ${account.lastName}`.trim() || account.email : "";
    const result = publishDraft(Date.now(), by);
    setPublishOpen(false);
    write(result.ok, `Published ${n === 1 ? "1 change" : `${n} changes`}. Makers are charged the new prices from now on.`);
  };

  const reset = () => {
    setResetOpen(false);
    write(resetPricing().ok, "Back to the demo prices.");
  };

  const { settings } = doc.draft;

  return (
    <Page>
      <PageHeader
        title="AI credit pricing"
        description="Enter what each AI service really costs us and the markup to add. Every price in credits follows, and makers pay the new prices once you publish."
        actions={
          <>
            <Button hierarchy="ghost" iconLeading={<Icon icon={RefreshIcon} />} onClick={() => setResetOpen(true)} disabled={!hydrated}>
              Reset demo data
            </Button>
            <Button
              hierarchy="primary"
              onClick={() => setPublishOpen(true)}
              disabled={!hydrated || !!plan.blocked}
              aria-describedby={plan.blocked ? "publish-blocked" : undefined}
            >
              Review and publish
            </Button>
          </>
        }
      />

      <ViewTabs view={view} />

      {!hydrated ? (
        <div className="flex flex-col gap-8" aria-busy>
          <Skeleton className="h-[96px] w-full" />
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {notice ? (
            <Banner
              tone={notice.tone}
              action={
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="cursor-pointer border-0 bg-transparent p-0 text-sm font-medium leading-sm text-inherit underline underline-offset-2"
                >
                  Dismiss
                </button>
              }
            >
              {notice.text}
            </Banner>
          ) : null}
          {plan.blocked ? (
            <p id="publish-blocked" className="m-0 text-sm leading-sm text-text-tertiary">
              Publish: {plan.blocked}
            </p>
          ) : null}
          <PricingSummary plan={plan} last={doc.history[0]} />
          {view === "prices" ? (
            <>
              <CurrencySection settings={settings} errors={plan.errors} rates={plan.rates} published={doc.published} onChange={changeSettings} />
              <CustomCreditSection draft={doc.draft.custom} plan={plan.custom} rates={plan.rates} onChange={changeCustom} />
              <ProfitSection settings={settings} errors={plan.errors} rates={plan.rates} onChange={changeSettings} />
              <ServicesSection draft={doc.draft} plan={plan} onChange={changeService} />
              <QualityAccessSection draft={doc.draft} plan={plan} onChange={changeLevel} />
              <QualitySection draft={doc.draft} plan={plan} onChange={changeLevel} />
            </>
          ) : (
            <CreditPacksTab doc={doc} plan={plan} onPacks={changePacks} onRules={changePackRules} />
          )}
          <PriceHistory history={doc.history} />
        </div>
      )}

      <PublishDialog
        open={publishOpen}
        plan={plan}
        basis={plan.rates ? basisLine(settings, plan.rates) : ""}
        onClose={() => setPublishOpen(false)}
        onPublish={publish}
      />
      <ConfirmDialog
        open={resetOpen}
        title="Reset the demo prices?"
        confirmLabel="Reset"
        onConfirm={reset}
        onCancel={() => setResetOpen(false)}
      >
        Every cost, setting and publish goes back to the demo prices and their history. What you typed or published here is lost.
      </ConfirmDialog>
    </Page>
  );
}
