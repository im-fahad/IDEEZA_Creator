"use client";

// Feed · Marketplace activities (mobile Figma "Marketplace activities"): the
// top bar with the period (the clock: 7, 30 or 90 days, a pick-one sheet);
// Statistics · Sales overview with the week's average price and volume (demo
// dollars); the sales per day as a line over a grid; then the sales, newest
// first — the project, its token, the NFT (Main, Physical, Virtual), from the
// seller to the buyer, the quantity, the price and its dollars, the date.
// Every number is the web's marketplace record in this browser (market-store),
// so a sale made on the web or the phone shows here. Money is Testnet demo.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock01Icon, DollarCircleIcon, EthereumIcon, Store01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { activityRows, chartPoints, chartTop, dailySales, dollars, weekStats } from "@/lib/market/activity-stats";
import { useMarket } from "@/lib/market/market-store";
import { useManualProjects } from "@/lib/manual/projects";
import { initialsOf } from "@/lib/people/ids";
import { formatDate } from "@/lib/settings/dates";
import { useSettings } from "@/lib/settings/use-settings";
import { ListBones } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { PickSheet } from "./pick-sheet";
import { useMinuteNow } from "./use-feed";

const PERIODS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
] as const;

const NFT: Record<"main" | "physical" | "virtual", { label: string; tone: BadgeTone }> = {
  main: { label: "Main NFT", tone: "error" },
  physical: { label: "Physical NFT", tone: "warning" },
  virtual: { label: "Virtual NFT", tone: "brand" },
};

const W = 280;
const H = 200;

export function MarketActivity() {
  const router = useRouter();
  const settings = useSettings();
  const now = useMinuteNow();
  const { hydrated, data } = useMarket();
  const { projects } = useManualProjects();
  const [days, setDays] = React.useState<number>(30);
  const [picking, setPicking] = React.useState(false);

  const since = now - days * 86_400_000;
  const sales = React.useMemo(() => data.sales.filter((s) => s.at > since), [data.sales, since]);
  const week = weekStats(data.sales, now);
  const series = dailySales(sales, now, days);
  const points = chartPoints(series, W, H);
  const top = chartTop(series);
  const rows = activityRows(sales);
  const nameOf = (id: string) => projects.find((p) => p.id === id)?.name.trim() || "Untitled project";
  const date = (ms: number) => formatDate(ms, settings.language.dateLocale, { style: "medium" });
  const tick = (ms: number) => {
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const ticks = series.filter((_, i) => i % Math.max(1, Math.round(series.length / 7)) === 0);
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");

  return (
    <Screen
      top={
        <TopBar
          back
          title="Marketplace Activities"
          actions={[{ icon: Clock01Icon, label: `Period: ${PERIODS.find((p) => p.value === days)?.label}`, onClick: () => setPicking(true) }]}
        />
      }
    >
      {!hydrated || !now ? (
        <div className="px-8">
          <ListBones rows={5} />
        </div>
      ) : (
        <div className="flex flex-col gap-8 px-8 pb-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm leading-sm text-text-tertiary">Statistics</span>
              <span className="text-md font-medium leading-md text-text-primary">Sales overview</span>
            </div>
            <div className="flex flex-col items-end text-sm leading-sm text-text-secondary">
              <span>
                Weekly average price: <span className="text-text-brand">{week.averageUsd === null ? "No sales" : dollars(week.averageUsd)}</span>
              </span>
              <span>
                Weekly volume: <span className="text-text-brand">{dollars(week.volumeUsd)}</span>
              </span>
              <TestnetDemoBadge className="mt-2" />
            </div>
          </div>

          <figure className="flex flex-col gap-4 rounded-lg bg-bg-surface p-6">
            <figcaption className="sr-only">
              Sales per day, {PERIODS.find((p) => p.value === days)?.label.toLowerCase()}: {sales.length} in all.
            </figcaption>
            <div className="flex gap-4">
              <div aria-hidden className="flex h-[200px] flex-col justify-between text-xs leading-xs text-text-tertiary">
                {[top, (top * 3) / 4, top / 2, top / 4, 0].map((v) => (
                  <span key={v}>{Math.round(v)}</span>
                ))}
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[200px] w-full overflow-visible" aria-hidden>
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} className="stroke-[var(--color-border-subtle)]" strokeWidth={1} />
                ))}
                <path d={`${line} L${W},${H} L0,${H} Z`} className="fill-[var(--color-bg-brand-subtle)]" />
                <path d={line} fill="none" className="stroke-[var(--color-icon-brand)]" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <div aria-hidden className="flex justify-between pl-[28px] text-xs leading-xs text-text-tertiary">
              {ticks.map((t) => (
                <span key={t.day}>{tick(t.day)}</span>
              ))}
            </div>
          </figure>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium leading-lg text-text-primary">Recent sales</h2>
            {rows.length === 0 ? (
              <StateCard
                tone="empty"
                className="w-full"
                icon={<Icon icon={Store01Icon} size={32} />}
                title="No sales in this period"
                body="Sales on the marketplace show up here, yours and the demo buyers’."
                action={
                  days < 90 ? (
                    <Button hierarchy="secondary" size="lg" onClick={() => setDays(90)}>
                      Show the last 90 days
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="flex flex-col">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/m/projects/${encodeURIComponent(r.projectId)}?tab=marketplace`)}
                      className="flex w-full items-start gap-6 border-b-[length:var(--border-width-1)] border-solid border-border-subtle py-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <Avatar size="md" initials={initialsOf(nameOf(r.projectId))} />
                      <span className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="truncate text-lg leading-lg text-text-primary">{nameOf(r.projectId)}</span>
                        {r.token && (
                          <span className="text-md leading-md text-text-secondary">
                            ID: <span className="text-text-brand">{r.token}</span>
                          </span>
                        )}
                        <Badge tone={NFT[r.nft].tone} className="self-start">
                          {NFT[r.nft].label}
                        </Badge>
                        <span className="text-md leading-md text-text-secondary">
                          {r.from} to {r.to}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-2 text-md leading-md text-text-primary">
                        <span className="text-sm leading-sm text-text-secondary">Quantity: 01</span>
                        <span className="flex items-center gap-2">
                          <Icon icon={EthereumIcon} size={16} />
                          {r.price}
                        </span>
                        <span className="flex items-center gap-2">
                          <Icon icon={DollarCircleIcon} size={16} />
                          {r.usd}
                        </span>
                        <span className="text-sm leading-sm text-text-tertiary">{date(r.at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <PickSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Period"
        options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
        value={days}
        onPick={setDays}
      />
    </Screen>
  );
}
