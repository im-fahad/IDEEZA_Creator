"use client";

// Earn Coin › Refer & Earn (Figma "Refer & Earn" 228855 Generate Link, 228900
// Connect Your Wallet, 228949 the campaign, 229005 the wallet menu, 229066 /
// 229159 / 229224 its activity, waiting for approval, claiming). Before a
// link: Refer and Earn with IDEEZA and Generate Link, which asks for the
// wallet first (the rewards go to it). With one: the campaign card — its
// name and the wallet (Disconnect), the publisher, the chain ID and History,
// the link to copy, Referred Users · $IDZ Earned · Points, and where the
// campaign stands (lock-up countdown, waiting for approval, ready, claimed).
// Activity lists every referral by campaign and name; Claim all points claims
// the campaign's points as IDZ through the wallet sheet once it is approved.
// A Demo sheet plays a demo creator coming through the link (prototype only).
// Logic: lib/wallet/referral.ts.

import * as React from "react";
import Link from "next/link";
import { Clock01Icon, LinkSquare02Icon, Logout02Icon, Share08Icon, Tick02Icon, ArrowDown01Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";
import { demoAddress, readWallet, shortAddress, walletDisconnect } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import {
  CAMPAIGNS,
  REFERRAL_NETWORK,
  REFERRAL_PUBLISHER,
  REFERRED,
  addReferral,
  campaignOf,
  campaignStateOf,
  campaignStatsOf,
  claimReferralRequestOf,
  currentLinkOf,
  demoReferralCheckOf,
  earnOf,
  filterReferrals,
  generateLink,
  nextCampaignOf,
  referralClaimBlockOf,
  referralRowsOf,
  referralUrlOf,
  referredNameOf,
  type CampaignState,
  type ReferralLink,
  type ReferralRow,
} from "@/lib/wallet/referral";
import { chainIdOf } from "@/lib/wallet/staking";
import type { DemoBuyerId, IdentityId } from "@/lib/wallet/types";
import { readReferralData, useReferralData, writeReferralData } from "@/lib/wallet/use-earn-stores";
import { ActionSheet, Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useEarnMenu } from "./earn-menu";
import { CARD, ConnectSheet, EmptyCard, FilterButton, InfoRow, SECTION_TITLE, EarnTabs, clockOf, useCopy, useEarnState, whenOf } from "./parts";
import { useWalletSheet } from "./wallet-sheet";

const STORAGE = "This browser couldn’t save it — storage is full or blocked.";
const nonce = () => Math.random().toString(36).slice(2, 10);

function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function ReferTab() {
  const { wallet, now, id, connected } = useEarnState();
  const data = useReferralData();
  const toast = useToast();
  const copy = useCopy();
  const sheet = useWalletSheet();
  const [asking, setAsking] = React.useState(false);
  const [demo, setDemo] = React.useState(false);
  const link = data && id ? currentLinkOf(data, id) : null;
  const url = link ? referralUrlOf(origin(), link.code) : null;

  const share = async () => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on IDEEZA", url });
      } catch {
        // The share sheet was closed: nothing to say.
      }
    } else void copy(url, "Link copied");
  };
  const menu = useEarnMenu({ extra: url ? [{ label: "Share link", icon: Share08Icon, onSelect: () => void share() }] : [] });

  const generate = () => {
    if (!id) return;
    const r = generateLink(readReferralData(), readWallet(), id, Date.now());
    if (!r.ok) return toast({ title: r.error, lead: "error" });
    if (!writeReferralData(r.value)) return toast({ title: STORAGE, lead: "error" });
    toast({ title: "Your link is ready" });
  };
  const onGenerate = () => (connected ? generate() : setAsking(true));

  const rows = data && id ? referralRowsOf(data, wallet, id) : [];
  const state = link ? campaignStateOf(link, wallet, now) : null;
  const campaign = link ? campaignOf(link.campaign) : null;
  const stats = link ? campaignStatsOf(rows, link.campaign) : null;
  const claimBlock = state && stats ? referralClaimBlockOf(state, stats.points) : "Generate your link first.";

  const claimAll = async () => {
    if (!id || !campaign || !stats || claimBlock) return;
    const points = stats.points;
    const r = await sheet.request(claimReferralRequestOf(id, campaign, points), {
      recheck: () => {
        const fresh = currentLinkOf(readReferralData(), id);
        if (!fresh || fresh.campaign !== campaign.id) return "This campaign isn't yours to claim any more.";
        return referralClaimBlockOf(campaignStateOf(fresh, readWallet(), Date.now()), points);
      },
    });
    if (r.ok) toast({ title: `${formatAmount(points, "IDZ")} added to your balance` });
  };

  const next = data && id ? nextCampaignOf(data, wallet, id) : null;

  return (
    <Screen top={<TopBar back="/m/earn" title="Earn Coin" actions={[menu.action]} />} className="px-8 pb-8">
      <div className="flex flex-col gap-12">
        <EarnTabs />
        {!data || !wallet ? (
          <Skeleton shape="block" className="h-[240px] w-full" />
        ) : !link || !state || !campaign || !stats || !url ? (
          <div className={cn(CARD, "flex flex-col items-center gap-8 p-8 text-center")}>
            <p className="text-2xl font-medium leading-2xl text-text-primary">Refer and Earn with IDEEZA</p>
            {next && (
              <p className="text-md leading-md text-text-secondary">
                Join {next.name}: you earn {next.percent}% of the IDZ the creators you bring buy, in points you claim as IDZ.
              </p>
            )}
            <Button size="xl" className="w-full" onClick={onGenerate}>
              Generate Link
            </Button>
          </div>
        ) : (
          <CampaignCard
            link={link}
            state={state}
            stats={stats}
            url={url}
            connected={connected}
            id={link.identity}
            now={now}
            onConnect={() => setAsking(true)}
            next={next?.name ?? null}
            onNext={onGenerate}
          />
        )}

        {link && state?.phase === "running" && (
          <div className="flex flex-col gap-6 rounded-xl border-[length:var(--border-width-1)] border-dashed border-border p-8">
            <div className="flex items-center gap-4">
              <Badge tone="warning">Demo</Badge>
              <span className="text-sm leading-sm text-text-secondary">Prototype only</span>
            </div>
            <p className="text-md leading-md text-text-primary">Nobody else opens a link in the demo. Play a demo creator who comes through yours and buys IDZ.</p>
            <Button hierarchy="secondary" size="lg" className="self-start" onClick={() => setDemo(true)}>
              Simulate a referral
            </Button>
          </div>
        )}

        <section className="flex flex-col gap-8" aria-labelledby="refer-activity">
          <h2 id="refer-activity" className={SECTION_TITLE}>
            Activity
          </h2>
          {rows.length === 0 ? (
            <EmptyCard lines={["No data found."]} />
          ) : (
            <ReferralActivity rows={rows} now={now} claimBlock={claimBlock} busy={sheet.busy} onClaim={claimAll} />
          )}
        </section>
      </div>
      <ConnectSheet
        open={asking}
        onClose={() => setAsking(false)}
        onConnected={() => !link && generate()}
        description="Your referral rewards go to this wallet, so the link needs it. You can change the wallet until the lock-up ends."
      />
      {id && link && <DemoReferralSheet open={demo} onClose={() => setDemo(false)} identity={id} percent={campaign?.percent ?? 0} />}
      {sheet.sheet}
      {menu.node}
    </Screen>
  );
}

function PhasePill({ state, now }: { state: CampaignState; now: number }) {
  const text =
    state.phase === "running"
      ? `Lock-up ends in ${clockOf(state.lockEndsAt - now)}`
      : state.phase === "approval"
        ? "Wait for admin approval"
        : state.phase === "claimable"
          ? "Approved · ready to claim"
          : "Claimed";
  return (
    <p role={state.phase === "running" ? "timer" : "status"} className="flex h-[36px] items-center justify-center gap-3 rounded-full bg-bg-brand-subtle text-md font-medium leading-md tabular-nums text-text-brand">
      <Icon icon={state.phase === "claimed" ? Tick02Icon : Clock01Icon} size={16} />
      {text}
    </p>
  );
}

function CampaignCard({
  link,
  state,
  stats,
  url,
  connected,
  id,
  now,
  onConnect,
  next,
  onNext,
}: {
  link: ReferralLink;
  state: CampaignState;
  stats: { users: number; earned: string; points: string };
  url: string;
  connected: boolean;
  id: IdentityId;
  now: number;
  onConnect: () => void;
  next: string | null;
  onNext: () => void;
}) {
  const copy = useCopy();
  const toast = useToast();
  const [walletMenu, setWalletMenu] = React.useState(false);
  const campaign = campaignOf(link.campaign);
  const address = demoAddress(id);
  const disconnect = () => {
    if (persistWallet(walletDisconnect(readWallet(), id))) toast({ title: "Wallet disconnected" });
    else toast({ title: STORAGE, lead: "error" });
  };
  const tiles = [
    { value: String(stats.users), label: "Referred Users" },
    { value: formatAmount(stats.earned, "IDZ").replace(/ IDZ$/, ""), label: "$IDZ Earned" },
    { value: formatAmount(stats.points, "IDZ").replace(/ IDZ$/, ""), label: "Points" },
  ];
  return (
    <div className={cn(CARD, "flex flex-col gap-6 p-8")}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="min-w-0 text-3xl font-medium leading-3xl text-text-primary">{campaign?.name ?? link.campaign}</h2>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={connected ? () => setWalletMenu(true) : onConnect}
          className="inline-flex h-[28px] shrink-0 items-center gap-2 rounded-full bg-bg-brand-subtle px-4 text-sm leading-xs text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {connected ? shortAddress(address) : "Connect wallet"}
          <Icon icon={ArrowDown01Icon} size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-3 font-mono text-md leading-md text-text-primary">
        <p>Publisher: {shortAddress(REFERRAL_PUBLISHER)}</p>
        <p className="flex items-center justify-between gap-4">
          <span>Chain ID: {chainIdOf(REFERRAL_NETWORK)}</span>
          <Link href="/m/earn/history" className="font-sans text-lg leading-lg text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
            History
          </Link>
        </p>
      </div>
      <div className="flex h-[40px] items-center justify-between gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border pl-6 pr-2">
        <span className="flex min-w-0 items-center gap-3 text-md leading-md text-text-primary">
          <span aria-hidden className="shrink-0 text-[color:var(--color-icon-secondary)]">
            <Icon icon={LinkSquare02Icon} size={16} />
          </span>
          <span className="truncate">{url}</span>
        </span>
        <button
          type="button"
          aria-label="Copy your referral link"
          onClick={() => copy(url, "Link copied")}
          className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Copy01Icon} size={18} />
        </button>
      </div>
      <dl className="grid grid-cols-3 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-subtle p-4">
            <dt className="order-2 text-xs leading-xs text-text-secondary">{t.label}</dt>
            <dd className="order-1 truncate text-2xl font-medium leading-2xl tabular-nums text-text-primary">{t.value}</dd>
          </div>
        ))}
      </dl>
      <p className="-mt-2 flex items-center gap-4 text-sm leading-sm text-text-secondary">
        <TestnetDemoBadge />1 point = 1 IDZ when it’s claimed.
      </p>
      <PhasePill state={state} now={now} />
      {state.phase === "claimed" &&
        (next ? (
          <Button size="xl" className="w-full" onClick={onNext}>
            Join {next}
          </Button>
        ) : (
          <p className="text-center text-md leading-md text-text-secondary">You’ve joined every campaign.</p>
        ))}
      <ActionSheet
        open={walletMenu}
        onClose={() => setWalletMenu(false)}
        title={`${shortAddress(address)} · Connected`}
        items={[{ label: "Disconnect", icon: Logout02Icon, destructive: true, onSelect: disconnect }]}
      />
    </div>
  );
}

/** One referral (Figma 229066's card): its campaign and Claimed / Not Claimed, then the referred creator's purchase and what it earned. */
export function ReferralCard({ r, title = true }: { r: ReferralRow; title?: boolean }) {
  return (
    <li className={cn(CARD, "flex flex-col gap-6 p-8")}>
      {title && (
        <div className="flex items-center justify-between gap-6">
          <p className="truncate text-2xl font-medium leading-2xl text-text-primary">{r.campaignName}</p>
          {r.claimed ? (
            <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
              Claimed
            </Badge>
          ) : (
            <Badge tone="error">Not Claimed</Badge>
          )}
        </div>
      )}
      <dl className="flex flex-col gap-3">
        <InfoRow label="Referred User">{r.name}</InfoRow>
        <InfoRow label="Total Purchase">
          <IdzCoin height={18} />
          {formatAmount(r.bought, "IDZ")}
        </InfoRow>
        <InfoRow label="Refer Token Earn">
          <IdzCoin height={18} />
          {formatAmount(r.earned, "IDZ")}
        </InfoRow>
        <InfoRow label="Refer Point Earn">{formatAmount(r.points, "IDZ").replace(/ IDZ$/, "")} Points</InfoRow>
        <InfoRow label="Last Purchase Time">{whenOf(r.at)}</InfoRow>
      </dl>
    </li>
  );
}

function ReferralActivity({
  rows,
  now,
  claimBlock,
  busy,
  onClaim,
}: {
  rows: ReferralRow[];
  now: number;
  claimBlock: string | null;
  busy: boolean;
  onClaim: () => void;
}) {
  const [campaign, setCampaign] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const shown = filterReferrals(rows, { campaign, search, range: "all" }, now);
  const joined = CAMPAIGNS.filter((c) => rows.some((r) => r.campaign === c.id));
  return (
    <>
      <div className="flex items-center gap-6">
        <FilterButton
          label="By Campaign"
          value={campaign}
          onChange={setCampaign}
          options={[{ value: "all", label: "Every campaign" }, ...joined.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Button size="xl" className="shrink-0 px-6" disabled={!!claimBlock || busy} aria-describedby={claimBlock ? "claim-points-why" : undefined} onClick={onClaim}>
          Claim all points
        </Button>
      </div>
      {claimBlock && (
        <p id="claim-points-why" className="-mt-4 text-sm leading-sm text-text-secondary">
          {claimBlock}
        </p>
      )}
      <SearchInput value={search} onValueChange={setSearch} onClear={() => setSearch("")} placeholder="Search by user name" aria-label="Search by user name" />
      {shown.length === 0 ? (
        <EmptyCard lines={["No referral matches."]} />
      ) : (
        <ul className="flex flex-col gap-8">
          {shown.map((r) => (
            <ReferralCard key={r.id} r={r} />
          ))}
        </ul>
      )}
    </>
  );
}

/** Prototype only: a demo creator opens the link and buys IDZ, so the campaign has a referral to count. */
function DemoReferralSheet({ open, onClose, identity, percent }: { open: boolean; onClose: () => void; identity: IdentityId; percent: number }) {
  const toast = useToast();
  const [who, setWho] = React.useState<DemoBuyerId>(REFERRED[0]);
  const [text, setText] = React.useState("1000");
  const [error, setError] = React.useState<string | null>(null);
  const check = demoReferralCheckOf(text);
  const close = () => {
    setError(null);
    onClose();
  };
  const add = () => {
    if (!check.ok) return setError(check.error);
    const r = addReferral(readReferralData(), readWallet(), { id: `ref_${nonce()}`, identity, who, bought: check.value, at: Date.now() });
    if (!r.ok) return setError(r.error);
    if (!writeReferralData(r.value)) return setError(STORAGE);
    toast({ title: `${referredNameOf(who)} bought ${formatAmount(check.value, "IDZ")} through your link` });
    setWho(REFERRED[(REFERRED.indexOf(who) + 1) % REFERRED.length]);
    close();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Demo: someone uses your link"
      description="Prototype only. Plays a demo creator who opens your link and buys IDZ in the presale."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={add}>
            Add referral
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-md font-medium leading-md text-text-primary">Who</legend>
        {REFERRED.map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={b === who}
            onClick={() => setWho(b)}
            className="flex h-[44px] w-full items-center justify-between rounded-lg px-6 text-left text-lg leading-lg text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {referredNameOf(b)}
            {b === who && (
              <span className="text-[color:var(--color-icon-brand)]">
                <Icon icon={Tick02Icon} size={16} />
              </span>
            )}
          </button>
        ))}
      </fieldset>
      <label className="flex flex-col gap-2">
        <span className="text-md font-medium leading-md text-text-primary">IDZ they buy</span>
        <TextInput
          size="xl"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onValueChange={(v) => {
            setText(v);
            setError(null);
          }}
          invalid={!!error}
        />
      </label>
      {error ? (
        <p className="text-sm leading-sm text-text-error">{error}</p>
      ) : (
        check.ok && (
          <p className="text-md leading-md text-text-secondary">
            You earn {formatAmount(earnOf(check.value, percent), "IDZ").replace(/ IDZ$/, "")} points ({percent}%).
          </p>
        )
      )}
    </Sheet>
  );
}
