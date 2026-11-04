"use client";

// Wallet Balance (Figma "Wallet Balance" 247010 connected, 246942 not
// connected, 247055 with activity; the web's Balance › Overview): the IDZ
// of the connected demo account with Buy IDZ · Stake IDZ · Import IDZ, and
// every IDZ movement (lib/wallet/idz.ts › idzLedgerOf: rewards, project
// mints, credits, presale buys and claims, stakes and withdrawals), filtered
// by Chain Type and Transfer Type, ten at a time. In and Out are written,
// not only coloured; a presale Buy says where its claim stands.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown02Icon, ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { TRANSFER_TYPES, filterIdzLedger, idzLedgerOf, transferTypeLabel, type IdzRow, type TransferType } from "@/lib/wallet/idz";
import { claimInOf } from "@/lib/wallet/presale";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useEarnMenu } from "./earn-menu";
import {
  ActionTiles,
  BalanceCard,
  BalanceHeading,
  CARD,
  CardActions,
  ChainTitle,
  ConnectSheet,
  CopyChip,
  EmptyCard,
  FilterButton,
  IdzFigure,
  ImportTokenSheet,
  InfoRow,
  NoBalanceCard,
  SECTION_TITLE,
  useEarnState,
  whenOf,
} from "./parts";

const PER_PAGE = 10;

export function WalletBalance() {
  const router = useRouter();
  const { wallet, now, id, connected, network, holdings } = useEarnState();
  const menu = useEarnMenu({ wallet: false });
  const [importing, setImporting] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);

  return (
    <Screen top={<TopBar back title="Wallet Balance" actions={[menu.action]} />} className="px-8 pb-8 pt-4">
      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-6" aria-label="Current Balance">
          <BalanceHeading network={network} connected={connected} />
          {!wallet ? (
            <Skeleton shape="block" className="h-[242px] w-full" />
          ) : holdings ? (
            <BalanceCard network={network} holdings={holdings}>
              <ActionTiles onImport={() => setImporting(true)} />
            </BalanceCard>
          ) : (
            <NoBalanceCard>
              <CardActions>
                <Button hierarchy="secondary" size="xl" className="w-full px-4" onClick={() => setImporting(true)}>
                  Import IDZ Token
                </Button>
                <Button size="xl" className="w-full px-4" onClick={() => router.push("/m/earn/presale")}>
                  Buy IDZ Coin
                </Button>
              </CardActions>
            </NoBalanceCard>
          )}
        </section>
        <section className="flex flex-col gap-8" aria-labelledby="wallet-activity">
          <h2 id="wallet-activity" className={SECTION_TITLE}>
            Transaction Activity
          </h2>
          {!wallet ? null : connected && id ? (
            <Ledger rows={idzLedgerOf(wallet, id)} now={now} />
          ) : (
            <EmptyCard
              lines={["No data found.", "Please connect your wallet."]}
              action={
                <Button size="lg" onClick={() => setConnecting(true)}>
                  Connect wallet
                </Button>
              }
            />
          )}
        </section>
      </div>
      <ImportTokenSheet open={importing} onClose={() => setImporting(false)} network={network} />
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} />
      {menu.node}
    </Screen>
  );
}

function heldLine(r: IdzRow, now: number): string | null {
  if (!r.held) return null;
  if (r.held.claimed) return "Claimed";
  return now >= r.held.unlocksAt ? "Ready to claim" : claimInOf(r.held.unlocksAt - now);
}

function Ledger({ rows, now }: { rows: IdzRow[]; now: number }) {
  const [chain, setChain] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [count, setCount] = React.useState(PER_PAGE);
  const shown = filterIdzLedger(rows, {
    network: chain === "all" ? "all" : (chain as Network),
    type: type === "all" ? "all" : (type as TransferType),
  });
  return (
    <>
      <div className="flex gap-6">
        <FilterButton
          label="Chain Type"
          value={chain}
          onChange={(v) => {
            setChain(v);
            setCount(PER_PAGE);
          }}
          options={[{ value: "all", label: "All chains" }, ...NETWORKS.map((n) => ({ value: n.value, label: n.label }))]}
        />
        <FilterButton
          label="Transfer Type"
          value={type}
          onChange={(v) => {
            setType(v);
            setCount(PER_PAGE);
          }}
          options={[{ value: "all", label: "All types" }, ...TRANSFER_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyCard
          lines={rows.length ? ["No transactions match these filters."] : ["No IDZ has moved in this wallet yet."]}
          action={
            rows.length ? (
              <Button
                hierarchy="secondary"
                size="lg"
                onClick={() => {
                  setChain("all");
                  setType("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-8">
          {shown.slice(0, count).map((r) => {
            const into = r.direction === "in";
            const held = heldLine(r, now);
            return (
              <li key={r.id} className={cn(CARD, "flex flex-col gap-6 p-8")}>
                <div className="flex items-center justify-between gap-6">
                  <ChainTitle network={r.network} />
                  <IdzFigure amount={r.amount} sign={r.held ? "" : into ? "+" : "−"} />
                </div>
                <dl className="flex flex-col gap-4">
                  <InfoRow label="Txn ID">{r.txHash ? <CopyChip value={r.txHash} what="Transaction ID" /> : <span className="text-md leading-md text-text-secondary">Starting balance</span>}</InfoRow>
                  <InfoRow label="Wallet Address">
                    <CopyChip value={r.address} what="Wallet address" />
                  </InfoRow>
                  <InfoRow label="Date">{r.at === null ? "—" : whenOf(r.at)}</InfoRow>
                  <InfoRow label="Transfer Type">
                    {transferTypeLabel(r.type)}
                    <span className={cn("inline-flex items-center gap-1 text-md leading-md", into ? "text-text-success" : "text-text-error")}>
                      <Icon icon={into ? ArrowUp02Icon : ArrowDown02Icon} size={16} />
                      {into ? "In" : "Out"}
                    </span>
                  </InfoRow>
                </dl>
                <p className="border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-6 text-md leading-md text-text-secondary">
                  {r.title}
                  {held && <span className="tabular-nums"> · {held}</span>}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {shown.length > count && (
        <Button hierarchy="secondary" size="lg" className="self-center" onClick={() => setCount((n) => n + PER_PAGE)}>
          Show more
        </Button>
      )}
    </>
  );
}
