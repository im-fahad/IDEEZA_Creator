"use client";

// Earn Coin › Stake (Figma "Stacking" › Ideeza-Wallet 228508, Contract pause
// 228566, Contract Block 228625): the balance card, then every stake of the
// connected demo account, filtered by Month and Year. Each card: its chain,
// Withdraw (open in the grace time and once the lock-up ends; locked in
// between, with why), STAKED and REWARD (earned so far, and what was
// claimed), the lock-up's progress and days left, its transaction, and where
// its reward stands — Claim, Claim in …, Claimed. A paused contract counts on
// but takes nothing (the pause mark on its transaction); a blocked one shows
// only Get support. Stake IDZ (beside the heading) opens the Stake List.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PauseIcon, Tick02Icon, UnavailableIcon, Settings02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Skeleton } from "@/components/ideeza/skeleton";
import { cn } from "@/lib/utils";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import {
  STAKE_TIME_LINE,
  STATUS_WORDS,
  claimRewardRequestOf,
  contractOf,
  contractStatusOf,
  daysLeftOf,
  daysText,
  filterStakes,
  lockProgressOf,
  rewardOf,
  stakeActionBlockOf,
  stakePhaseOf,
  stakeYearsOf,
  stakesOf,
  withdrawRequestOf,
  type ContractStatus,
  type Stake,
  type StakeAdmin,
} from "@/lib/wallet/staking";
import { readWallet } from "@/lib/wallet/demo-wallet";
import { useStakeAdmin } from "@/lib/wallet/use-earn-stores";
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
  ImportTokenSheet,
  MONTH_OPTIONS,
  NoBalanceCard,
  SECTION_TITLE,
  EarnTabs,
  clockOf,
  useEarnState,
} from "./parts";
import { StakeAdminSheet } from "./stake-admin-sheet";
import { useWalletSheet } from "./wallet-sheet";

/** "Get support": a mail to IDEEZA naming the stake. */
export function supportHref(s: Stake): string {
  return `mailto:support@ideeza.com?subject=${encodeURIComponent(`Staking contract blocked · stake ${s.txHash ?? s.id}`)}`;
}

/** Withdraw and Claim for one stake, through the wallet sheet, with the request rechecked at Confirm. */
export function useStakeActions() {
  const wallet = useWalletSheet();
  const toast = useToast();
  const recheck = (s: Stake, action: "withdraw" | "claim", admin: () => StakeAdmin | undefined) => () => {
    const fresh = stakesOf(readWallet(), s.identity).find((x) => x.id === s.id);
    if (!fresh) return "This stake isn't in this wallet any more.";
    return stakeActionBlockOf(fresh, contractStatusOf(admin(), s.record.contract), Date.now(), action);
  };
  const withdraw = async (s: Stake, admin: () => StakeAdmin | undefined) => {
    const c = contractOf(s.record.contract);
    if (!c) return;
    const r = await wallet.request(withdrawRequestOf(c, s), { recheck: recheck(s, "withdraw", admin) });
    if (r.ok) toast({ title: `${formatAmount(s.record.amount, "IDZ")} is back in your balance` });
  };
  const claim = async (s: Stake, admin: () => StakeAdmin | undefined) => {
    const c = contractOf(s.record.contract);
    if (!c) return;
    const ready = rewardOf(s, Date.now()).ready;
    if (compareAmounts(ready, "0") <= 0) return;
    const r = await wallet.request(claimRewardRequestOf(c, s, ready), { recheck: recheck(s, "claim", admin) });
    if (r.ok) toast({ title: `${formatAmount(ready, "IDZ")} added to your balance` });
  };
  return { withdraw, claim, sheet: wallet.sheet, busy: wallet.busy };
}

export function StakeTab() {
  const router = useRouter();
  const { wallet, now, id, connected, network, holdings } = useEarnState();
  const admin = useStakeAdmin();
  const [importing, setImporting] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [demo, setDemo] = React.useState(false);
  const menu = useEarnMenu({ extra: [{ label: "Demo: contract states", icon: Settings02Icon, onSelect: () => setDemo(true) }] });
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

        <section className="flex flex-col gap-8" aria-labelledby="stake-activity">
          <div className="flex items-center justify-between gap-6">
            <h2 id="stake-activity" className={SECTION_TITLE}>
              Transaction Activity
            </h2>
            <Link href="/m/earn/stake/contracts" className="text-lg font-medium leading-lg text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
              Stake IDZ
            </Link>
          </div>
          {!wallet ? null : connected && id ? (
            <Stakes stakes={stakesOf(wallet, id)} now={now} admin={admin} />
          ) : (
            <EmptyCard lines={["No data found.", "Please connect your wallet."]} />
          )}
        </section>
      </div>
      <ImportTokenSheet open={importing} onClose={() => setImporting(false)} network={network} />
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} />
      <StakeAdminSheet open={demo} onClose={() => setDemo(false)} />
      {menu.node}
    </Screen>
  );
}

function Stakes({ stakes, now, admin }: { stakes: Stake[]; now: number; admin: StakeAdmin | undefined }) {
  const router = useRouter();
  const [month, setMonth] = React.useState("all");
  const [year, setYear] = React.useState("all");
  const actions = useStakeActions();
  const adminRef = React.useRef(admin);
  React.useEffect(() => {
    adminRef.current = admin;
  }, [admin]);
  const shown = filterStakes(stakes, { month: month === "all" ? "all" : Number(month), year: year === "all" ? "all" : Number(year) });
  return (
    <>
      <div className="flex gap-6">
        <FilterButton label="Month" value={month} onChange={setMonth} options={MONTH_OPTIONS} />
        <FilterButton
          label="Year"
          value={year}
          onChange={setYear}
          options={[{ value: "all", label: "Every year" }, ...stakeYearsOf(stakes, now).map((y) => ({ value: String(y), label: String(y) }))]}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyCard
          lines={stakes.length ? ["No stakes match these filters."] : ["Nothing staked yet.", "Pick a staking option to start."]}
          action={
            stakes.length ? (
              <Button
                hierarchy="secondary"
                size="lg"
                onClick={() => {
                  setMonth("all");
                  setYear("all");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button size="lg" onClick={() => router.push("/m/earn/stake/contracts")}>
                Stake IDZ
              </Button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-8">
          {shown.map((s) => (
            <StakeCard
              key={s.id}
              s={s}
              now={now}
              status={contractStatusOf(admin, s.record.contract)}
              busy={actions.busy}
              onWithdraw={() => actions.withdraw(s, () => adminRef.current)}
              onClaim={() => actions.claim(s, () => adminRef.current)}
            />
          ))}
        </ul>
      )}
      <p className="text-sm leading-sm text-text-secondary">{STAKE_TIME_LINE}</p>
      {actions.sheet}
    </>
  );
}

function Pill({ tone, children, timer }: { tone: "brand" | "error"; children: React.ReactNode; timer?: boolean }) {
  return (
    <span
      role={timer ? "timer" : undefined}
      className={cn(
        "inline-flex h-[24px] shrink-0 items-center rounded-full px-4 text-sm leading-xs tabular-nums",
        tone === "brand" ? "bg-bg-brand-subtle text-text-brand" : "bg-bg-error-subtle text-text-error",
      )}
    >
      {children}
    </span>
  );
}

function StakeCard({
  s,
  now,
  status,
  busy,
  onWithdraw,
  onClaim,
}: {
  s: Stake;
  now: number;
  status: ContractStatus;
  busy: boolean;
  onWithdraw: () => void;
  onClaim: () => void;
}) {
  const phase = stakePhaseOf(s, now);
  const reward = rewardOf(s, now);
  const withdrawBlock = stakeActionBlockOf(s, status, now, "withdraw");
  const noteId = `stake-note-${s.id}`;
  const txn = s.txHash ?? s.id;

  if (status === "blocked") {
    return (
      <li className={cn(CARD, "flex flex-col gap-8 p-8")}>
        <div className="flex items-center justify-between gap-6">
          <ChainTitle network={s.network} tone="error" />
          <a href={supportHref(s)} className="text-lg leading-lg text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
            Get support
          </a>
        </div>
        <div className="flex items-center justify-between gap-6 border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-8">
          <span className="flex min-w-0 items-center gap-4">
            <span className="shrink-0 text-md leading-md text-text-primary">TXN ID:</span>
            <CopyChip value={txn} what="Transaction ID" tone="error" lead={<Icon icon={UnavailableIcon} size={14} />} />
          </span>
          <Pill tone="error">Blocked</Pill>
        </div>
        <p className="text-sm leading-sm text-text-error">{STATUS_WORDS.blocked}. Your {formatAmount(s.record.amount, "IDZ")} and its rewards are held until it’s sorted out.</p>
      </li>
    );
  }

  let foot: React.ReactNode;
  if (status === "paused") foot = reward.nextAt ? <Pill tone="brand" timer>Next claim in {clockOf(reward.nextAt - now)}</Pill> : <Pill tone="brand">Paused</Pill>;
  else if (compareAmounts(reward.ready, "0") > 0)
    foot = (
      <Button size="md" className="w-[80px]" disabled={busy} onClick={onClaim} aria-label={`Claim ${formatAmount(reward.ready, "IDZ")}`}>
        Claim
      </Button>
    );
  else if (reward.nextAt) foot = <Pill tone="brand" timer>Claim in {clockOf(reward.nextAt - now)}</Pill>;
  else if (compareAmounts(reward.claimed, "0") <= 0) foot = <Badge tone="neutral">No reward</Badge>;
  else
    foot = (
      <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
        Claimed
      </Badge>
    );

  return (
    <li className={cn(CARD, "flex flex-col gap-8 p-8")}>
      <div className="flex items-center justify-between gap-6">
        <ChainTitle network={s.network} />
        {phase === "withdrawn" ? (
          <span className="text-lg leading-lg text-text-disabled">Withdrawn</span>
        ) : (
          <button
            type="button"
            onClick={withdrawBlock ? undefined : onWithdraw}
            aria-disabled={withdrawBlock || busy ? true : undefined}
            aria-describedby={withdrawBlock ? noteId : undefined}
            className={cn(
              "rounded-xs text-lg leading-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              withdrawBlock ? "cursor-not-allowed text-text-disabled" : "text-text-brand",
            )}
          >
            Withdraw
          </button>
        )}
      </div>
      <Link href={`/m/earn/staked/${s.txHash ?? s.id}`} className="-m-2 flex flex-col gap-8 rounded-lg p-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus" aria-label={`Stake details, ${formatAmount(s.record.amount, "IDZ")}`}>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle p-6">
            <span className="text-sm uppercase leading-sm text-text-secondary">Staked</span>
            <span className="inline-flex items-center gap-2 text-2xl font-medium leading-2xl tabular-nums text-text-primary">
              <IdzCoin height={18} />
              {formatAmount(s.record.amount, "IDZ").replace(/ IDZ$/, "")}
              <span className="text-sm leading-sm text-text-brand">IDZ</span>
            </span>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle p-6">
            <span className="text-sm uppercase leading-sm text-text-secondary">Reward</span>
            <span className="inline-flex items-center gap-2 text-2xl font-medium leading-2xl tabular-nums text-text-success">
              <IdzCoin height={18} />
              <span className="truncate">{formatAmount(reward.total, "IDZ").replace(/ IDZ$/, "")}</span>
              <span className="text-sm leading-sm text-text-brand">IDZ</span>
            </span>
            <span className="text-xs leading-xs tabular-nums text-text-secondary">{formatAmount(reward.claimed, "IDZ")} claimed</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-6">
            <span className="text-lg leading-lg text-text-primary">Lockup period • {daysText(s.record.lockDays)}</span>
            <span className="text-md leading-md tabular-nums text-text-secondary">
              {phase === "withdrawn" ? "Withdrawn" : phase === "open" ? "Ended" : `${daysLeftOf(s, now)}d left`}
            </span>
          </div>
          <ProgressBar value={lockProgressOf(s, now)} label="Lock-up" />
        </div>
      </Link>
      <div className="flex items-center justify-between gap-6 border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-8">
        <span className="flex min-w-0 items-center gap-4">
          <span className="shrink-0 text-md leading-md text-text-primary">TXN ID:</span>
          <CopyChip value={txn} what="Transaction ID" tone={status === "paused" ? "warning" : "brand"} lead={status === "paused" ? <Icon icon={PauseIcon} size={14} /> : undefined} />
        </span>
        {foot}
      </div>
      {(status === "paused" || withdrawBlock) && phase !== "withdrawn" && (
        <p id={noteId} className="text-sm leading-sm text-text-secondary">
          {status === "paused" ? `${STATUS_WORDS.paused}. Claims and withdrawals wait until it resumes.` : withdrawBlock}
        </p>
      )}
    </li>
  );
}
