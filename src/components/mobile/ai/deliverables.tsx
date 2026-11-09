"use client";

// A build's pieces on a phone (19–25 · A7 · Switch product 26): the product
// above (its project and "Product 1 of 2", Switch product when there are
// more), the pieces as tabs — PCB · Code · 3D Module · Assembly · Wiring —
// and the Parts list on its own screen (the M14 tabs hold five). Each panel
// is the web's own artifact, derived from that product's parts (build-
// artifacts.ts): the board, the firmware, the wiring, the bill of materials,
// the 3D assembly; and "What this covers", the web's lines. A piece still
// being made says so with its progress; a failed one is retried here, free.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown01Icon, CheckmarkCircle02Icon, CpuIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { StateCard } from "@/components/ideeza/state-card";
import { Skeleton } from "@/components/ideeza/skeleton";
import { FirmwarePreview, PcbPreview, WiringPreview, coversFor } from "@/components/create/deliverable-previews";
import { useBuildModel } from "@/components/create/use-build-model";
import { bomFor, isSampleModel } from "@/lib/create/build-artifacts";
import { ITEM_LABELS, productsOf, statusOf, useCreateHistory, type BuildItemKind, type BuildJob } from "@/lib/create/history";
import { isLeftOut } from "@/lib/create/pieces";
import { deriveAssembly, enclosureOnly } from "@/lib/three/assembly";
import { cn } from "@/lib/utils";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { Sheet } from "../kit/sheet";
import { BuildPill } from "./build-pill";
import { CARD, ProgressRing } from "./parts";
import { PickList } from "./pick-sheet";
import { ModelView } from "./model-view";

const TABS: BuildItemKind[] = ["pcb", "code", "3d", "assembly", "wiring"];
const TITLE: Record<BuildItemKind, string> = { ...ITEM_LABELS, parts: "Parts" };

export function AiDeliverables({ buildId }: { buildId: string }) {
  const { hydrated, getBuild, getChat } = useCreateHistory();
  const job = getBuild(buildId);
  if (!hydrated) {
    return (
      <Screen top={<TopBar back title="Pieces" />}>
        <div role="status" aria-label="Loading" className="flex flex-col gap-6 p-8">
          <Skeleton className="h-[64px] w-full rounded-xl" />
          <Skeleton size="lg" className="w-full rounded-xl" />
        </div>
      </Screen>
    );
  }
  if (!job) {
    return (
      <Screen top={<TopBar back="/m/ai" title="Pieces" />} className="p-8">
        <StateCard
          tone="empty"
          className="w-full"
          icon={<Icon icon={CpuIcon} size={32} />}
          title="This build isn't on this phone"
          body="It may have been deleted with its chat, or it was made in another browser."
          action={
            <Link href="/m/ai/history" className={buttonVariants({ size: "lg" })}>
              Open History
            </Link>
          }
        />
      </Screen>
    );
  }
  return <Pieces job={job} back={getChat(job.chatId) ? `/m/ai/chat/${job.chatId}` : "/m/ai/history"} />;
}

function Pieces({ job, back }: { job: BuildJob; back: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { retryBuildItem, setBuildModelFailed } = useCreateHistory();
  const [switching, setSwitching] = React.useState(false);
  useBuildModel(job);
  const products = productsOf(job);
  const productId = params.get("product") ?? "primary";
  const index = Math.max(0, products.findIndex((p) => p.id === productId));
  const product = products[index];
  const made = product.items.filter((i) => i.status !== "skipped" || isLeftOut(i));
  const tabs = TABS.filter((k) => made.some((i) => i.kind === k));
  const asked = params.get("tab") as BuildItemKind | null;
  const tab: BuildItemKind =
    asked === "parts" || (asked && tabs.includes(asked))
      ? asked
      : (made.find((i) => i.status === "ready" && i.kind !== "parts")?.kind ?? tabs[0] ?? "parts");
  const item = product.items.find((i) => i.kind === tab);
  const go = (next: { product?: string; tab?: BuildItemKind }) =>
    router.replace(`/m/ai/build/${job.id}?product=${next.product ?? product.id}&tab=${next.tab ?? tab}`, { scroll: false });
  const projectName = job.projectChoiceName?.trim() || job.title;
  const isPrimary = product.id === "primary";
  const hasAssembly = product.items.some((i) => i.kind === "assembly" && (i.status !== "skipped" || isLeftOut(i)));
  const shellNote = !isPrimary ? null : job.modelFailed ? "failed" : !job.modelGlbUrl ? "pending" : null;
  const systemFailure = job.failure === "system";

  return (
    <Screen top={<TopBar back={back} title={TITLE[tab]} />}>
      <div className="flex flex-col gap-6 px-8 pb-8 pt-2">
        <div className="flex items-center gap-4 rounded-xl bg-bg-subtle px-7 py-5">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-sm leading-sm text-text-secondary">
              {projectName} • Product {index + 1} of {products.length}
            </p>
            <p className="truncate text-lg font-medium leading-lg text-text-primary">{product.name}</p>
          </div>
          {products.length > 1 && (
            <IconButton hierarchy="secondary" size="lg" aria-label="Switch product" icon={<Icon icon={ArrowDown01Icon} size={18} />} onClick={() => setSwitching(true)} />
          )}
        </div>

        <div role="tablist" aria-label="Pieces" className="-mx-8 flex gap-1 overflow-x-auto px-8 [scrollbar-width:none]">
          {tabs.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === tab}
              onClick={() => go({ tab: k })}
              className={cn(
                "min-h-[44px] shrink-0 border-b-[length:var(--border-width-2)] border-solid px-4 text-lg leading-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                k === tab ? "border-border-brand text-text-brand" : "border-transparent text-text-secondary",
              )}
            >
              {TITLE[k]}
            </button>
          ))}
        </div>

        <section className={cn(CARD, "flex flex-col gap-6 p-6")} aria-label={TITLE[tab]}>
          {!item || isLeftOut(item) ? (
            <p className="p-4 text-md leading-md text-text-secondary">This piece wasn&apos;t in this build.</p>
          ) : item.status !== "ready" ? (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              {item.status === "building" ? (
                <ProgressRing value={item.progress} label={`${TITLE[tab]} progress`} size={48} />
              ) : item.status === "failed" ? null : (
                <span className="text-[color:var(--color-icon-disabled)]">
                  <Icon icon={CpuIcon} size={28} />
                </span>
              )}
              <p className="text-lg font-medium leading-lg text-text-primary">
                {item.status === "failed"
                  ? systemFailure
                    ? "This piece didn't run"
                    : "This piece couldn't be generated"
                  : item.status === "building"
                    ? `Generating · ${Math.round(item.progress)}%`
                    : "Waiting to start"}
              </p>
              <p className="text-sm leading-sm text-text-secondary">
                {item.status === "failed"
                  ? systemFailure
                    ? "The whole build stopped on our side — try it again from the chat."
                    : "The other pieces are unaffected. Retrying costs no extra credits."
                  : "It appears here the moment it lands."}
              </p>
              {item.status === "failed" && !systemFailure && (
                <Button hierarchy="secondary" size="lg" iconLeading={<Icon icon={Refresh01Icon} size={16} />} onClick={() => retryBuildItem(job.id, tab, product.id)}>
                  Retry {ITEM_LABELS[tab]}
                </Button>
              )}
            </div>
          ) : tab === "3d" || tab === "assembly" ? (
            <JobModel
              key={`${product.id}-${tab}`}
              job={job}
              productId={product.id}
              enclosure={tab === "3d" && hasAssembly}
              shellNote={shellNote}
              onRetryMesh={isPrimary ? () => setBuildModelFailed(job.id, false) : undefined}
            />
          ) : tab === "parts" ? (
            <PartsList job={product} />
          ) : (
            <div className="min-w-0 overflow-x-auto">
              {tab === "pcb" && <PcbPreview job={product} />}
              {tab === "code" && <FirmwarePreview job={product} />}
              {tab === "wiring" && <WiringPreview job={product} />}
            </div>
          )}
        </section>

        {item && !isLeftOut(item) && (
          <section aria-labelledby="covers" className={cn(CARD, "flex flex-col gap-4 p-7")}>
            <h2 id="covers" className="text-sm font-medium uppercase leading-sm text-text-secondary">
              What this covers
            </h2>
            <ul className="flex flex-col gap-3">
              {coversFor(tab, product, isSampleModel(job.modelGlbUrl), !isPrimary).map((line) => (
                <li key={line} className="flex w-fit items-start gap-2 rounded-lg bg-bg-blue-subtle px-4 py-2 text-sm leading-sm text-text-blue">
                  <span className="mt-[2px] shrink-0">
                    <Icon icon={CheckmarkCircle02Icon} size={14} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}
        {statusOf(job) !== "ready" && (
          <Link href={back} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
            Back to the build
          </Link>
        )}
      </div>
      <BuildPill />
      <Sheet open={switching} onClose={() => setSwitching(false)} title="Switch product" description={`${products.length} in ${projectName}`}>
        <PickList
          label="Switch product"
          value={product.id}
          options={products.map((p) => ({
            value: p.id,
            label: p.name,
            sub: `${p.items.filter((i) => i.status === "ready").length} of ${p.items.filter((i) => i.status !== "skipped").length} pieces ready`,
          }))}
          onPick={(v) => {
            setSwitching(false);
            go({ product: v });
          }}
        />
      </Sheet>
    </Screen>
  );
}

/** One product's assembly, from its own parts, spec and (the primary's) concept mesh. */
export function JobModel({
  job,
  productId,
  enclosure,
  shellNote,
  onRetryMesh,
  hero = false,
}: {
  job: BuildJob;
  productId: string;
  enclosure: boolean;
  shellNote: "pending" | "failed" | null;
  onRetryMesh?: () => void;
  hero?: boolean;
}) {
  const assembly = React.useMemo(() => {
    const p = productsOf(job).find((x) => x.id === productId) ?? productsOf(job)[0];
    const whole = deriveAssembly({ title: p.title, parts: p.parts, spec: p.spec, meshUrl: p.id === "primary" ? job.modelGlbUrl : undefined });
    return enclosure ? enclosureOnly(whole) : whole;
  }, [job, productId, enclosure]);
  return <ModelView assembly={assembly} shellNote={shellNote} onRetryMesh={onRetryMesh} hero={hero} />;
}

/** Parts in this build (25): the counts, then every part — name, reference,
 *  category and quantity — grouped by function, from the build's own BOM. */
function PartsList({ job }: { job: Parameters<typeof bomFor>[0] }) {
  const bom = bomFor(job);
  const chips = [
    `${bom.unique} unique`,
    `${bom.units} units`,
    `${bom.active} active`,
    `${bom.passives} passives`,
    `${bom.connectors} conn & mech`,
  ];
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-medium uppercase leading-sm text-text-secondary">Parts in this build</p>
      <ul className="flex flex-wrap gap-3">
        {chips.map((c, i) => (
          <li key={c} className={cn("rounded-full px-4 py-1 text-sm leading-sm", i === 0 ? "bg-bg-brand-subtle text-text-brand" : "bg-bg-subtle text-text-secondary")}>
            {c}
          </li>
        ))}
      </ul>
      <ul className="flex flex-col rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle">
        {bom.rows.map((r, i) => (
          <li key={`${r.ref}-${i}`} className="flex items-center gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-subtle px-6 py-4 last:border-b-0">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-md leading-md text-text-primary">{r.name}</span>
              <span className="truncate text-sm leading-sm text-text-secondary">
                <span className="font-mono">{r.ref}</span> • {r.category}
              </span>
            </span>
            <span className="shrink-0 text-sm leading-sm tabular-nums text-text-secondary">×{r.qty}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm leading-sm text-text-tertiary">Grouped by function · quantities are per board</p>
    </div>
  );
}
