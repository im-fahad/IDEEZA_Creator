"use client";

// Earn Coin › Buy $IDZ (Figma "Buy IDEEZA Coin" › Ideeza-Wallet 229495 not
// connected, 229392 connected; the web's Balance › Buy IDZ Token): the
// balance card with Import IDZ Token and Buy IDZ Coin, and every presale
// purchase of the connected demo account, filtered by Chain Type and Status,
// each with where it stands — Unlocks in … (Claim off), Ready to claim now
// (Claim, through the wallet sheet), Claimed. After a purchase the presale
// comes back here with `?bought=<tx>`, and the success sheet (Figma 230189)
// counts down to its claim; View transaction log goes to the list.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlarmClockIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { demoAddress, readWallet } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { LOCK_WORDS, claimRequestOf, countdownOf } from "@/lib/wallet/presale";
import { PURCHASE_STATUSES, filterPurchases, purchaseStatusOf, purchasesOf, type Purchase, type PurchaseStatus } from "@/lib/wallet/presale-records";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useEarnMenu } from "./earn-menu";
import {
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
  EarnTabs,
  clockOf,
  useEarnState,
  whenOf,
} from "./parts";
import { useWalletSheet } from "./wallet-sheet";

export const ACTIVITY_ID = "earn-activity";

export function BuyTab() {
  const router = useRouter();
  const params = useSearchParams();
  const { wallet, now, id, connected, network, holdings } = useEarnState();
  const menu = useEarnMenu();
  const [importing, setImporting] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const bought = params.get("bought");

  const buyButton = (
    <Button size="xl" className="w-full px-4" onClick={() => router.push("/m/earn/presale")}>
      Buy IDZ Coin
    </Button>
  );

  return (
    <Screen top={<TopBar back="/m/earn" title="Earn Coin" actions={[menu.action]} />} className="px-8 pb-8">
      <div className="flex flex-col gap-12">
        <EarnTabs />
        <section className="flex flex-col gap-6" aria-label="Current Balance">
          <BalanceHeading network={network} connected={connected} />
          {!wallet ? (
            <Skeleton shape="block" className="h-[242px] w-full" />
          ) : holdings ? (
            <BalanceCard network={network} holdings={holdings}>
              <CardActions>
                <Button hierarchy="secondary" size="xl" className="w-full px-4" onClick={() => setImporting(true)}>
                  Import IDZ Token
                </Button>
                {buyButton}
              </CardActions>
            </BalanceCard>
          ) : (
            <NoBalanceCard>
              <CardActions>
                <Button hierarchy="secondary" size="xl" className="w-full px-4" onClick={() => setConnecting(true)}>
                  Connect Wallet
                </Button>
                {buyButton}
              </CardActions>
            </NoBalanceCard>
          )}
        </section>

        <section className="flex flex-col gap-8" aria-labelledby={ACTIVITY_ID}>
          <h2 id={ACTIVITY_ID} tabIndex={-1} className={cn(SECTION_TITLE, "outline-none")}>
            Transaction Activity
          </h2>
          {!wallet ? null : connected && id ? (
            <Purchases purchases={purchasesOf(wallet, id)} now={now} />
          ) : (
            <EmptyCard lines={["No data found.", "Please connect your wallet."]} />
          )}
        </section>
      </div>
      <ImportTokenSheet open={importing} onClose={() => setImporting(false)} network={network} />
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} />
      {bought && wallet && id && (
        <PurchaseSuccess
          purchase={purchasesOf(wallet, id).find((p) => p.txHash === bought) ?? null}
          now={now}
          onClose={() => router.replace("/m/earn/buy", { scroll: false })}
        />
      )}
      {menu.node}
    </Screen>
  );
}

function Purchases({ purchases, now }: { purchases: Purchase[]; now: number }) {
  const [chain, setChain] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const filter = {
    network: chain === "all" ? "all" : (chain as Network),
    status: status === "all" ? "all" : (status as PurchaseStatus),
    month: "all",
    year: "all",
  } as const;
  const shown = filterPurchases(purchases, filter, now);
  const wallet = useWalletSheet();
  const toast = useToast();

  const claim = async (p: Purchase) => {
    const result = await wallet.request(claimRequestOf(p), {
      recheck: () => {
        const fresh = purchasesOf(readWallet(), p.identity).find((x) => x.id === p.id);
        if (!fresh) return "This purchase isn't in this wallet any more.";
        if (fresh.claim) return "This purchase was already claimed.";
        if (Date.now() < fresh.buy.unlocksAt) return "It isn't unlocked yet.";
        return null;
      },
    });
    if (result.ok) toast({ title: `${formatAmount(p.buy.idz, "IDZ")} added to your balance` });
  };

  return (
    <>
      <div className="flex gap-6">
        <FilterButton
          label="Chain Type"
          value={chain}
          onChange={setChain}
          options={[{ value: "all", label: "All chains" }, ...NETWORKS.map((n) => ({ value: n.value, label: n.label }))]}
        />
        <FilterButton
          label="Status"
          value={status}
          onChange={setStatus}
          options={[{ value: "all", label: "Every status" }, ...PURCHASE_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyCard
          lines={purchases.length ? ["No purchases match these filters."] : ["No purchases yet.", "Buy IDZ in the presale to see it here."]}
          action={
            purchases.length ? (
              <Button
                hierarchy="secondary"
                size="lg"
                onClick={() => {
                  setChain("all");
                  setStatus("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-8">
          {shown.map((p) => (
            <PurchaseCard key={p.id} p={p} now={now} busy={wallet.busy} onClaim={() => claim(p)} />
          ))}
        </ul>
      )}
      {wallet.sheet}
    </>
  );
}

function PurchaseCard({ p, now, busy, onClaim }: { p: Purchase; now: number; busy: boolean; onClaim: () => void }) {
  const status = purchaseStatusOf(p, now);
  const lockId = `unlock-${p.id}`;
  return (
    <li className={cn(CARD, "flex flex-col gap-8 p-8")}>
      <div className="flex items-center justify-between gap-6">
        <ChainTitle network={p.network} />
        <IdzFigure amount={p.buy.idz} />
      </div>
      <dl className="flex flex-col gap-4">
        <InfoRow label="Txn ID">{p.txHash ? <CopyChip value={p.txHash} what="Transaction ID" /> : "—"}</InfoRow>
        <InfoRow label="Wallet Address">
          <CopyChip value={demoAddress(p.identity)} what="Wallet address" />
        </InfoRow>
        <InfoRow label="YOU PAID">{formatAmount(p.buy.paid.amount, p.buy.paid.coin)}</InfoRow>
        <InfoRow label="Date">{whenOf(p.at)}</InfoRow>
      </dl>
      <div className="flex min-h-[36px] items-center justify-between gap-6 border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-8">
        {status === "claimed" ? (
          <>
            <span className="text-md leading-md text-text-secondary">In your balance</span>
            <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
              Claimed
            </Badge>
          </>
        ) : status === "claimable" ? (
          <>
            <span className="text-md font-medium leading-md text-text-success">Ready to claim now</span>
            <Button size="md" className="w-[80px]" disabled={busy} onClick={onClaim} aria-label={`Claim ${formatAmount(p.buy.idz, "IDZ")}`}>
              Claim
            </Button>
          </>
        ) : (
          <>
            <span id={lockId} className="flex items-center gap-3 text-md leading-md text-text-primary">
              Unlocks in:
              <span role="timer" className="inline-flex h-[24px] items-center gap-2 rounded-full bg-bg-error-subtle px-4 text-sm leading-xs tabular-nums text-text-error">
                <Icon icon={AlarmClockIcon} size={14} />
                {clockOf(p.buy.unlocksAt - now)}
              </span>
            </span>
            <Button size="md" className="w-[80px]" disabled aria-describedby={lockId}>
              Claim
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

const UNITS = [
  { key: "hours", name: "hr" },
  { key: "minutes", name: "min" },
  { key: "seconds", name: "sec" },
] as const;

/** Figma 230189 (as a sheet): the purchase went through; its IDZ can be claimed when the countdown ends. */
function PurchaseSuccess({ purchase, now, onClose }: { purchase: Purchase | null; now: number; onClose: () => void }) {
  const left = purchase ? purchase.buy.unlocksAt - now : 0;
  const c = countdownOf(left);
  const hours = c.days * 24 + c.hours;
  const viewLog = () => {
    onClose();
    window.setTimeout(() => {
      const h = document.getElementById(ACTIVITY_ID);
      h?.scrollIntoView({ block: "start" });
      h?.focus();
    }, 0);
  };
  const subject = encodeURIComponent(`IDZ presale purchase ${purchase?.txHash ?? ""}`.trim());
  return (
    <Sheet
      open
      onClose={onClose}
      title="Purchase successful"
      description={purchase ? `${formatAmount(purchase.buy.idz, "IDZ")} for ${formatAmount(purchase.buy.paid.amount, purchase.buy.paid.coin)}.` : undefined}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={viewLog}>
            View transaction log
          </Button>
          <p className="text-center text-sm leading-sm text-text-secondary">
            If you have any questions or need support, please{" "}
            <a href={`mailto:support@ideeza.com?subject=${subject}`} className="text-text-brand underline underline-offset-2">
              contact us
            </a>
            .
          </p>
        </>
      }
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <span aria-hidden className="inline-flex size-[56px] items-center justify-center rounded-full bg-bg-success-subtle text-text-success">
          <Icon icon={Tick02Icon} size={28} />
        </span>
        {purchase && left > 0 ? (
          <>
            <p className="text-3xl font-semibold leading-3xl text-text-primary">Your IDZ will be available to claim in</p>
            <div role="timer" aria-label={`${hours} hours ${c.minutes} minutes ${c.seconds} seconds`} className="flex gap-4">
              {UNITS.map((u) => (
                <span key={u.key} aria-hidden className="inline-flex h-[28px] items-center gap-1 rounded-md bg-bg-subtle px-4 text-md leading-md tabular-nums text-text-primary">
                  <span className="font-semibold">{String(u.key === "hours" ? hours : c[u.key]).padStart(2, "0")}</span>
                  <span className="text-sm leading-sm text-text-secondary">{u.name}</span>
                </span>
              ))}
            </div>
            <p className="text-lg leading-lg text-text-primary">Once the countdown reaches zero, you’ll be able to claim your IDZ.</p>
          </>
        ) : (
          <p role="status" className="text-3xl font-semibold leading-3xl text-text-primary">
            Your IDZ is ready to claim.
          </p>
        )}
        <p className="text-sm leading-sm text-text-secondary">
          Bought IDZ unlocks {LOCK_WORDS} after the purchase confirms. Then you claim it here, on Buy $IDZ.
        </p>
      </div>
    </Sheet>
  );
}
