"use client";

// Buy IDEEZA Coin (Figma "Buy IDEEZA Coin" 229538, 229602–229902, 230004–
// 230129; the web's presale dialog, components/balance/presale-dialog.tsx):
// one screen, three steps, each its own address so Back walks them:
// - the presale card: Buy $IDZ Token, In Presale Now! with the round, the
//   countdown to the round's real end, UNTIL PRICE INCREASE with the next
//   price, TOTAL USD RAISED (the demo purchases), the one price; Buy With
//   Crypto and Don't have a wallet? — or, with a wallet connected, the buy
//   form in the card (You get ⇅ You pay, the coin sheet, the whitelist, the
//   gas line, Max, every check from lib/wallet/presale.ts);
// - Connect Wallet (`?step=connect`): the Demo wallet first and on, the four
//   real wallets Soon (web D9), I don't have a wallet;
// - Need a wallet? (`?step=wallet`): the IDEEZA Wallet app's steps, its QR
//   Coming soon, Use the Demo wallet.
// Buy $IDZ goes through the wallet sheet (purpose `buyIdz`); once it
// confirms, the Buy $IDZ tab shows the purchase and its success sheet.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDataTransferVerticalIcon, ArrowDown01Icon, Download04Icon, QrCodeIcon, Tick02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { IdzCoin } from "@/components/balance/idz-coin";
import { PayCoinGlyph } from "@/components/balance/pay-coin-glyph";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";
import { availableOf } from "@/lib/wallet/balances";
import { demoAddress, makerId, readWallet, walletConnect } from "@/lib/wallet/demo-wallet";
import { formatWhen } from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import {
  PAY_COINS,
  PRESALE,
  buyCheckOf,
  buyRequestOf,
  coinRateOf,
  countdownOf,
  formatPrice,
  formatUsd,
  gasReserveOf,
  maxPayOf,
  presaleOpenAt,
  presalePriceOf,
  type PayCoin,
} from "@/lib/wallet/presale";
import { totalRaisedOf } from "@/lib/wallet/presale-records";
import { TIMING } from "@/lib/wallet/request";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { Amount, DemoWallet, IdentityId } from "@/lib/wallet/types";
import type { MarketData } from "@/lib/market/types";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { CARD, useEarnState } from "./parts";
import { useWalletSheet } from "./wallet-sheet";

const SOON_WALLETS = ["IDEEZA Wallet", "MetaMask", "Wallet Connect", "Coinbase Wallet"] as const;
const STORAGE = "This browser couldn’t save it — storage is full or blocked.";
const pad = (n: number) => String(n).padStart(2, "0");

export function PresaleScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const step = params.get("step");
  const { wallet, market, now, id, connected } = useEarnState();
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const toast = useToast();
  const timer = React.useRef<number | null>(null);
  React.useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  /** Connects the Demo wallet, then back to the card, where the form now is. */
  const connect = () => {
    if (connecting) return;
    if (connected) return router.replace("/m/earn/presale");
    setConnecting(true);
    setError(null);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const w = readWallet();
      const ok = persistWallet(walletConnect(w, makerId(w.account)));
      setConnecting(false);
      if (!ok) return setError(STORAGE);
      toast({ title: "Wallet connected" });
      router.replace("/m/earn/presale");
    }, TIMING.connect);
  };

  let body: React.ReactNode;
  if (step === "connect") body = <ConnectStep connecting={connecting} error={error} onDemo={connect} onNoWallet={() => router.push("/m/earn/presale?step=wallet")} />;
  else if (step === "wallet") body = <NeedWalletStep connecting={connecting} error={error} onDemo={connect} />;
  else
    body = (
      <div className="flex flex-col gap-12">
        <div className={cn(CARD, "flex flex-col gap-8 p-8 text-center")}>
          <PresaleHead now={now} raised={totalRaisedOf(wallet)} />
          {wallet && id && connected ? (
            <BuyForm wallet={wallet} id={id} market={market} now={now} />
          ) : (
            <>
              <RateLine price={PRESALE.price} />
              <Button
                size="xl"
                className="w-full"
                disabled={!presaleOpenAt(now)}
                onClick={() => router.push("/m/earn/presale?step=connect")}
              >
                Buy With Crypto
              </Button>
              <button
                type="button"
                onClick={() => router.push("/m/earn/presale?step=wallet")}
                className="self-center rounded-xs text-lg leading-lg text-text-secondary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Don’t have a wallet?
              </button>
            </>
          )}
        </div>
        <WhitePaper />
        <p className="text-center text-sm leading-sm text-text-secondary">
          Testnet demo, no real money. IDZ can lose value; this isn’t investment advice.
        </p>
      </div>
    );

  return (
    <Screen top={<TopBar back title="Buy IDEEZA Coin" />} className="px-8 pb-8 pt-4">
      {body}
    </Screen>
  );
}

/** "31 Dec 2026, 11:59 PM GMT+6" */
function whenWithZone(at: number): string {
  const zone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${formatWhen(at)} ${zone}` : formatWhen(at);
}

const ROUND_UNITS = [
  { key: "days", name: "Days" },
  { key: "hours", name: "Hours" },
  { key: "minutes", name: "Minutes" },
  { key: "seconds", name: "Seconds" },
] as const;

function PresaleHead({ now, raised }: { now: number; raised: Amount }) {
  const open = presaleOpenAt(now);
  const c = countdownOf(PRESALE.endsAt - now);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-semibold leading-3xl text-text-brand">Buy $IDZ Token</h2>
        <p className="text-lg font-medium leading-lg text-text-primary">{open ? `In Presale Now! · ${PRESALE.round}` : `${PRESALE.round} has ended`}</p>
      </div>
      <div role="timer" aria-label={`${c.days} days ${c.hours} hours ${c.minutes} minutes until the price increase`} className="grid grid-cols-4 gap-6">
        {ROUND_UNITS.map((u) => (
          <div key={u.key} aria-hidden className="flex flex-col items-center gap-1 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface py-5">
            <span className="text-3xl font-semibold leading-3xl tabular-nums text-text-primary">{pad(c[u.key])}</span>
            <span className="font-mono text-sm leading-sm text-text-secondary">{u.name}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-subtle py-3 font-mono text-md uppercase leading-md text-text-primary">
          Until price increase
        </p>
        <p className="text-sm leading-sm text-text-secondary">
          {open
            ? `Then 1 $IDZ = ${formatPrice(PRESALE.nextPrice)}. ${PRESALE.round} ends ${whenWithZone(PRESALE.endsAt)}.`
            : `It ended ${whenWithZone(PRESALE.endsAt)}. The next round opens at 1 $IDZ = ${formatPrice(PRESALE.nextPrice)}.`}
        </p>
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-md uppercase leading-md text-text-brand">
        <span className="tabular-nums">Total USD raised: {formatUsd(raised)}</span>
        <TestnetDemoBadge className="normal-case" />
      </p>
    </div>
  );
}

function RateLine({ price, whitelisted, coin }: { price: Amount; whitelisted?: boolean; coin?: PayCoin }) {
  return (
    <div className="flex items-center gap-6">
      <span aria-hidden className="h-[1px] flex-1 bg-border-subtle" />
      <p className="font-mono text-md leading-md tabular-nums text-text-primary">
        1 $IDZ ={" "}
        {whitelisted && (
          <>
            <s className="text-text-tertiary">{formatPrice(PRESALE.price)}</s>
            <span className="sr-only"> now </span>{" "}
          </>
        )}
        {formatPrice(price)}
        {coin === "ETH" && <span className="block text-sm leading-sm text-text-secondary">1 ETH = {formatPrice(coinRateOf("ETH"))} (demo rate)</span>}
      </p>
      <span aria-hidden className="h-[1px] flex-1 bg-border-subtle" />
    </div>
  );
}

/** No white paper exists yet (web C2f): it says Soon instead of downloading nothing. */
function WhitePaper() {
  return (
    <p className="flex items-center justify-center gap-6 text-lg leading-lg text-text-disabled" aria-disabled>
      <span aria-hidden className="inline-flex size-[36px] items-center justify-center rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface">
        <Icon icon={Download04Icon} size={20} />
      </span>
      Download White Paper
      <span className="text-sm leading-sm text-text-tertiary">Soon</span>
    </p>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cn(CARD, "flex flex-col gap-8 p-8 text-center")}>
      <h2 className="flex items-center justify-center gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-subtle pb-8 text-4xl font-semibold leading-4xl text-text-primary">
        <span aria-hidden className="text-[color:var(--color-icon-secondary)]">
          <Icon icon={Wallet01Icon} size={24} />
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function ConnectStep({ connecting, error, onDemo, onNoWallet }: { connecting: boolean; error: string | null; onDemo: () => void; onNoWallet: () => void }) {
  return (
    <StepCard title="Connect Wallet">
      <div className="flex flex-col gap-6 text-md leading-md text-text-secondary">
        <p>To buy into this token sale, connect a wallet so you can receive your $IDZ.</p>
        <p>
          If you already have a wallet, choose it below. If you don’t, the <span className="font-medium text-text-brand">IDEEZA Wallet</span> app is on its way; until then the Demo wallet works here on testnet.
        </p>
      </div>
      <ul className="flex flex-col gap-6">
        <li>
          <Button size="xl" className="w-full justify-between" loading={connecting} onClick={onDemo}>
            <span>{connecting ? "Connecting…" : "Demo wallet"}</span>
            {!connecting && <TestnetDemoBadge />}
          </Button>
        </li>
        {SOON_WALLETS.map((w) => (
          <li key={w}>
            <Button hierarchy="secondary" size="xl" disabled className="w-full justify-between" title="Opens once real wallets can connect">
              <span className="inline-flex items-center gap-4">
                {w === "IDEEZA Wallet" && <IdeezaLogo mark height={20} decorative />}
                {w}
              </span>
              <span className="text-sm leading-sm">Soon</span>
            </Button>
          </li>
        ))}
        <li>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onNoWallet}>
            I don’t have a wallet
          </Button>
        </li>
      </ul>
      {error && <Banner tone="error">{error}</Banner>}
    </StepCard>
  );
}

function NeedWalletStep({ connecting, error, onDemo }: { connecting: boolean; error: string | null; onDemo: () => void }) {
  return (
    <StepCard title="Need a wallet?">
      <div className="flex items-start gap-6 text-left">
        <IdeezaLogo mark height={48} decorative className="shrink-0" />
        <p className="text-lg leading-lg text-text-primary">
          IDEEZA Wallet is a beginner-friendly app that makes it easy to buy our presale token. Follow the steps below to get started.
        </p>
      </div>
      <div className="flex items-center justify-between gap-6 rounded-xl bg-bg-subtle p-6 text-left">
        <ol className="flex list-decimal flex-col gap-1 pl-8 text-md leading-md text-text-primary">
          <li>Download the IDEEZA Wallet app</li>
          <li>Create your account</li>
          <li>Buy in-app with card or crypto</li>
        </ol>
        <div className="flex size-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface text-text-tertiary">
          <Icon icon={QrCodeIcon} size={24} />
          <span className="text-xs leading-xs">Coming soon</span>
        </div>
      </div>
      <p className="text-md leading-md text-text-secondary">The app isn’t out yet, so there is no code to scan. Until it is, buy with the Demo wallet here on testnet.</p>
      {error && <Banner tone="error">{error}</Banner>}
      <Button size="xl" className="w-full" loading={connecting} onClick={onDemo}>
        {connecting ? "Connecting…" : "Use the Demo wallet"}
      </Button>
    </StepCard>
  );
}

// ── the buy form (Figma 229701 empty, 229801 filled, 229902 the coin list) ──

const BOX = "flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface px-8 py-6 text-left focus-within:ring-2 focus-within:ring-border-focus";
const INPUT = "min-w-0 flex-1 bg-transparent text-lg leading-lg tabular-nums text-text-primary outline-none placeholder:text-text-tertiary";

function BuyForm({ wallet, id, market, now }: { wallet: DemoWallet; id: IdentityId; market: MarketData; now: number }) {
  const router = useRouter();
  const sheet = useWalletSheet();
  const [driver, setDriver] = React.useState<"get" | "pay">("get");
  const [text, setText] = React.useState("");
  const [coin, setCoin] = React.useState<PayCoin>("ETH");
  const [payFirst, setPayFirst] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [coins, setCoins] = React.useState(false);
  const [whyWhitelist, setWhyWhitelist] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const getRef = React.useRef<HTMLInputElement>(null);
  const payRef = React.useRef<HTMLInputElement>(null);
  const ids = { get: React.useId(), pay: React.useId(), getErr: React.useId(), payErr: React.useId(), gas: React.useId() };

  const { price, whitelisted } = presalePriceOf(demoAddress(id));
  const ctx = { wallet, market, now };
  const reserve = gasReserveOf(PRESALE.network);
  const have = { coin: availableOf(id, coin, PRESALE.network, ctx), gas: availableOf(id, reserve.coin, PRESALE.network, ctx) };
  const check = buyCheckOf({ driver, text, coin }, { price, have, now });
  const getValue = driver === "get" ? text : (check.idz ?? "");
  const payValue = driver === "pay" ? text : (check.pay ?? "");
  const shown = touched || check.error?.field === "form" ? check.error : null;
  const getErr = shown?.field === "get" ? shown.text : null;
  const payErr = shown?.field === "pay" ? shown.text : null;
  const walletNetwork = wallet.identities[id]?.network ?? PRESALE.network;

  const type = (field: "get" | "pay") => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDriver(field);
    setText(e.target.value);
    setTouched(true);
  };
  const chooseCoin = (next: PayCoin) => {
    setCoins(false);
    if (next === coin) return;
    if (driver === "pay") {
      setDriver("get");
      setText(check.idz ?? "");
    }
    setCoin(next);
  };
  const useMax = () => {
    const max = maxPayOf(coin, have);
    setDriver("pay");
    setText(max === "0" ? "" : max);
    setTouched(true);
  };
  const buy = async () => {
    if (sheet.busy) return;
    if (check.error || !check.idz || !check.pay) {
      setTouched(true);
      (check.error?.field === "pay" ? payRef : getRef).current?.focus();
      return;
    }
    setNote(null);
    const result = await sheet.request(buyRequestOf({ idz: check.idz, pay: check.pay, coin, price, whitelisted }), {
      recheck: () => (presaleOpenAt(Date.now()) ? null : `${PRESALE.round} ended before the purchase confirmed. Nothing was charged.`),
    });
    if (result.ok) router.replace(`/m/earn/buy?bought=${result.proof.txHash ?? ""}`);
    else setNote(result.reason === "rejected" ? "Purchase cancelled in the wallet. Nothing was charged." : (result.message ?? "The purchase didn’t go through. Nothing was charged."));
  };

  const getBox = (
    <div key="get" className="flex flex-col gap-2">
      <div className={BOX}>
        <label htmlFor={ids.get} className="font-mono text-md leading-md text-text-primary">
          You get
        </label>
        <div className="flex items-center gap-4">
          <IdzCoin height={24} />
          <input
            ref={getRef}
            id={ids.get}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Enter purchase amount"
            value={getValue}
            onChange={type("get")}
            aria-invalid={getErr ? true : undefined}
            aria-describedby={getErr ? ids.getErr : undefined}
            className={INPUT}
          />
          <span className="shrink-0 text-md leading-md text-text-secondary">IDZ</span>
        </div>
      </div>
      {getErr && (
        <p id={ids.getErr} className="text-left text-sm leading-sm text-text-error">
          {getErr}
        </p>
      )}
    </div>
  );

  const payBox = (
    <div key="pay" className="flex flex-col gap-2">
      <div className={BOX}>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={ids.pay} className="font-mono text-md leading-md text-text-primary">
            You pay
          </label>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`Pay with ${coin}, change`}
            onClick={() => setCoins(true)}
            className="inline-flex h-[28px] items-center gap-2 rounded-md bg-bg-subtle px-3 text-md leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <PayCoinGlyph coin={coin} className="size-[20px]" />
            {coin}
            <Icon icon={ArrowDown01Icon} size={14} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PayCoinGlyph coin={coin} />
          <input
            ref={payRef}
            id={ids.pay}
            inputMode="decimal"
            autoComplete="off"
            placeholder="--"
            value={payValue}
            onChange={type("pay")}
            aria-invalid={payErr ? true : undefined}
            aria-describedby={[payErr ? ids.payErr : null, ids.gas].filter(Boolean).join(" ")}
            className={INPUT}
          />
          {whitelisted ? (
            <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
              Whitelist price −{PRESALE.whitelist.percentOff}%
            </Badge>
          ) : (
            <button
              type="button"
              aria-expanded={whyWhitelist}
              onClick={() => setWhyWhitelist((v) => !v)}
              className="inline-flex min-h-[28px] shrink-0 items-center rounded-xs text-sm leading-sm text-text-success underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Discount for whitelist
            </button>
          )}
        </div>
      </div>
      {payErr && (
        <p id={ids.payErr} className="text-left text-sm leading-sm text-text-error">
          {payErr}
        </p>
      )}
      {!whitelisted && whyWhitelist && (
        <p className="text-left text-sm leading-sm text-text-secondary">
          Wallets on the presale whitelist pay {PRESALE.whitelist.percentOff}% less. This wallet isn’t on it; on the demo whitelist is Demo account{" "}
          {PRESALE.whitelist.accounts.join(", ")} (switch account in the Demo wallet to try it).
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <RateLine price={price} whitelisted={whitelisted} coin={coin} />
      <div className="flex flex-col">
        {payFirst ? payBox : getBox}
        <div className="relative z-[1] -my-3 flex justify-center">
          <button
            type="button"
            onClick={() => setPayFirst((v) => !v)}
            aria-label={payFirst ? "Swap: type the IDZ you get first" : "Swap: type what you pay first"}
            className="inline-flex size-[32px] items-center justify-center rounded-full border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-subtle text-[color:var(--color-icon-default)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={ArrowDataTransferVerticalIcon} size={16} />
          </button>
        </div>
        {payFirst ? getBox : payBox}
      </div>
      <p id={ids.gas} className="font-mono text-sm leading-sm text-text-secondary">
        {coin === reserve.coin
          ? `${formatAmount(reserve.amount, reserve.coin)} is reserved for gas: this purchase and its claim. The actual amount depends on the network.`
          : `Gas is paid in test ${reserve.coin}: ${formatAmount(reserve.amount, reserve.coin)} stays for this purchase and its claim. The actual amount depends on the network.`}
      </p>
      {walletNetwork !== PRESALE.network && (
        <p className="text-sm leading-sm text-text-secondary">
          Your wallet is on {networkLabelOf(walletNetwork)}. The presale is on {networkLabelOf(PRESALE.network)} — the wallet asks to switch when you buy.
        </p>
      )}
      {note && <Banner tone="info">{note}</Banner>}
      {shown?.field === "form" && <p className="text-sm leading-sm text-text-error">{shown.text}</p>}
      <Button size="xl" className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-60" aria-disabled={!!check.error || undefined} loading={sheet.busy} onClick={buy}>
        Buy $IDZ
      </Button>
      <p className="flex flex-wrap items-center justify-center gap-x-4 text-md leading-md text-text-secondary">
        <span className="uppercase tabular-nums">Available balance = {formatAmount(have.coin, coin)}</span>
        <Button hierarchy="ghost" size="sm" onClick={useMax}>
          Max
        </Button>
      </p>
      <Sheet open={coins} onClose={() => setCoins(false)} title="Pay with" description={`On ${networkLabelOf(PRESALE.network)}`}>
        <ul role="listbox" aria-label="Pay with" className="-mx-8 flex flex-col">
          {PAY_COINS.map((c) => (
            <li key={c}>
              <button
                type="button"
                role="option"
                aria-selected={c === coin}
                onClick={() => chooseCoin(c)}
                className={cn(
                  "flex min-h-[56px] w-full items-center gap-6 px-8 py-3 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
                  c === coin && "bg-bg-brand-subtle",
                )}
              >
                <PayCoinGlyph coin={c} className="size-[36px]" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-lg font-medium leading-lg text-text-primary">{c}</span>
                  <span className="text-sm leading-sm text-text-secondary">{networkLabelOf(PRESALE.network)}</span>
                </span>
                <span className="text-md leading-md tabular-nums text-text-primary">{formatAmount(availableOf(id, c, PRESALE.network, ctx), c)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      {sheet.sheet}
    </div>
  );
}
