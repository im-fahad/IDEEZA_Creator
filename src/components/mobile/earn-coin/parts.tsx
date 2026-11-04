"use client";

// Earn Coin's shared parts (mobile Figma "Design - Light Mode (Current)":
// Wallet Balance, Buy IDEEZA Coin, Stacking, Refer & Earn). Layout from the
// Figma, data and words from the web's Balance (components/balance,
// lib/wallet): the balance card (the IDZ figure, its dollars at the one IDZ
// price, the holdings line, the demo IDZ contract), the Buy $IDZ · Stake ·
// Refer & Earn tabs (M14), the copy chips, the info rows, the Figma's white
// filter buttons (each a pick-one sheet), the empty card, and the sheets every
// screen shares: Connect your wallet, the Demo wallet, Import IDZ token.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDown01Icon,
  Copy01Icon,
  Download04Icon,
  MoneyBag01Icon,
  Note01Icon,
  ShoppingBasket02Icon,
  Tick02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { IdzCoin } from "@/components/balance/idz-coin";
import { useSecondClock } from "@/components/balance/use-second-clock";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { useMarket } from "@/lib/market/market-store";
import { cn } from "@/lib/utils";
import { demoAddress, makerId, readWallet, shortAddress, walletConnect, walletDisconnect, walletSwitchAccount, walletSwitchNetwork } from "@/lib/wallet/demo-wallet";
import { DEMO_ACCOUNTS } from "@/lib/wallet/identities";
import { IDZ_TOKEN, idzContractOf, idzHoldingsOf, idzUsdOf, type IdzHoldings } from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import { TIMING } from "@/lib/wallet/request";
import { balanceLineOf, networkLabelOf } from "@/lib/wallet/request-view";
import type { AccountIndex } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";

export const CARD = "rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface";
export const SECTION_TITLE = "text-2xl font-medium leading-2xl text-text-primary";

/** The current demo account, its wallet, and its IDZ, live to the second. */
export function useEarnState() {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useSecondClock();
  const id = wallet ? makerId(wallet.account) : null;
  const state = wallet && id ? wallet.identities[id] : undefined;
  const connected = !!state?.connected;
  const network: Network = state?.network ?? "baseSepolia";
  const holdings: IdzHoldings | null = wallet && id && connected ? idzHoldingsOf(wallet, id, { wallet, market, now }) : null;
  return { wallet, market, now, id, connected, network, holdings };
}

/** The older way to copy, for a browser that refuses the Clipboard API. */
function copyByCommand(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.className = "fixed left-0 top-0 opacity-0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Copies `value` and says so in a toast. */
export function useCopy() {
  const toast = useToast();
  return React.useCallback(
    async (value: string, done: string) => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch {
        ok = copyByCommand(value);
      }
      toast(ok ? { title: done } : { title: "Couldn’t copy. Select it and copy instead.", lead: "error" });
    },
    [toast],
  );
}

/** "02:10:00": hours, minutes and seconds of `ms`, never below zero. */
export function clockOf(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

/** "13 Aug 2024 • 2:08 PM" (the Figma's date row). */
export function whenOf(at: number): string {
  const d = new Date(at);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

// ── M14 Tabs: Buy $IDZ · Stake · Refer & Earn ───────────────────────────

const EARN_TABS = [
  { href: "/m/earn/buy", label: "Buy $IDZ" },
  { href: "/m/earn/stake", label: "Stake" },
  { href: "/m/earn/refer", label: "Refer & Earn" },
] as const;

export function EarnTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Earn Coin" className="flex border-b-[length:var(--border-width-1)] border-solid border-border-subtle">
      {EARN_TABS.map((t) => {
        const current = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            replace
            aria-current={current ? "page" : undefined}
            className={cn(
              "-mb-[var(--border-width-1)] flex h-[40px] flex-1 items-center justify-center border-b-[length:var(--border-width-2)] border-solid text-lg leading-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              current ? "border-border-brand font-medium text-text-brand" : "border-transparent text-text-secondary",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ── small pieces ────────────────────────────────────────────────────────

/** A purple chip with the short form of `value` and a copy button (Txn ID, Wallet Address, Contract). */
export function CopyChip({ value, what, tone = "brand", lead }: { value: string; what: string; tone?: "brand" | "error" | "warning"; lead?: React.ReactNode }) {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value, `${what} copied`)}
      aria-label={`Copy ${what.toLowerCase()} ${value}`}
      className={cn(
        "inline-flex h-[24px] max-w-full items-center gap-2 rounded-full px-4 text-sm leading-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        tone === "brand" && "bg-bg-brand-subtle text-text-brand",
        tone === "error" && "bg-bg-error-subtle text-text-error",
        tone === "warning" && "bg-badge-warning-bg text-badge-warning-text",
      )}
    >
      {lead}
      <span className="truncate">{shortAddress(value)}</span>
      <Icon icon={Copy01Icon} size={14} />
    </button>
  );
}

/** One "label … value" row of a card, the label in the Figma's mono face. */
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[24px] items-center justify-between gap-6">
      <dt className="shrink-0 font-mono text-sm leading-sm text-text-secondary">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-2 text-right text-lg leading-lg text-text-primary">{children}</dd>
    </div>
  );
}

/** "● Amoy Testnet (Polygon)": a card's chain. */
export function ChainTitle({ network, tone = "brand" }: { network: Network | null; tone?: "brand" | "error" }) {
  return (
    <p className="flex min-w-0 items-center gap-3 text-lg font-medium leading-lg text-text-primary">
      <span aria-hidden className={cn("size-[8px] shrink-0 rounded-full", tone === "brand" ? "bg-bg-brand" : "bg-bg-error")} />
      <span className="truncate">{network ? networkLabelOf(network) : "Every network"}</span>
    </p>
  );
}

/** "100 IDZ" with the coin: a card's amount. */
export function IdzFigure({ amount, sign = "" }: { amount: string; sign?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-2xl font-medium leading-2xl tabular-nums text-text-primary">
      <IdzCoin height={20} />
      {sign}
      {formatAmount(amount, "IDZ").replace(/ IDZ$/, "")}
      <span className="text-sm leading-sm text-text-brand">IDZ</span>
    </span>
  );
}

/** The Figma's empty card: a note icon and a line or two, with an optional way out. */
export function EmptyCard({ lines, action }: { lines: string[]; action?: React.ReactNode }) {
  return (
    <div role="status" className={cn(CARD, "flex flex-col items-center gap-6 px-8 py-12 text-center")}>
      <span aria-hidden className="text-[color:var(--color-icon-default)]">
        <Icon icon={Note01Icon} size={24} />
      </span>
      <p className="text-lg leading-lg text-text-primary">
        {lines.map((l, i) => (
          <React.Fragment key={l}>
            {i > 0 && <br />}
            {l}
          </React.Fragment>
        ))}
      </p>
      {action}
    </div>
  );
}

export type FilterOption = { value: string; label: string };

/** The Figma's white filter button ("Chain Type ⌄"): its list is a pick-one sheet. */
export function FilterButton({ label, value, options, onChange }: { label: string; value: string; options: FilterOption[]; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const picked = options.find((o) => o.value === value);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={picked ? `${label}: ${picked.label}` : label}
        onClick={() => setOpen(true)}
        className="flex h-[40px] min-w-0 flex-1 items-center justify-center gap-3 rounded-xl bg-bg-surface px-6 text-lg leading-lg text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span className="truncate">{picked && picked.value !== "all" ? picked.label : label}</span>
        <Icon icon={ArrowDown01Icon} size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <ul role="listbox" aria-label={label} className="-mx-8 flex flex-col">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex h-[40px] w-full items-center justify-between gap-4 rounded-md px-8 text-left text-lg leading-lg text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {o.label}
                {o.value === value && (
                  <span className="text-[color:var(--color-icon-brand)]">
                    <Icon icon={Tick02Icon} size={16} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

export const MONTH_OPTIONS: FilterOption[] = [
  { value: "all", label: "Every month" },
  ...["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => ({
    value: String(i),
    label: m,
  })),
];

// ── the network chip and the balance card ───────────────────────────────

/** The Figma's "Ethereum ⌄" chip: the demo wallet's own network, so choosing one switches the wallet. */
export function NetworkChip({ network }: { network: Network }) {
  const [open, setOpen] = React.useState(false);
  const toast = useToast();
  const pick = (n: Network) => {
    setOpen(false);
    if (n === network) return;
    const w = readWallet();
    if (persistWallet(walletSwitchNetwork(w, makerId(w.account), n))) toast({ title: `Wallet on ${networkLabelOf(n)}` });
    else toast({ title: "This browser couldn’t save it — storage is full or blocked.", lead: "error" });
  };
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Network: ${networkLabelOf(network)}, change`}
        onClick={() => setOpen(true)}
        className="inline-flex h-[32px] min-w-0 items-center gap-3 rounded-lg bg-bg-subtle px-5 text-md leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span className="truncate font-mono">{networkLabelOf(network).replace(/\s*\(.*\)$/, "")}</span>
        <Icon icon={ArrowDown01Icon} size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Network" description="Your demo wallet switches to it.">
        <ul role="listbox" aria-label="Network" className="-mx-8 flex flex-col">
          {NETWORKS.map((n) => (
            <li key={n.value}>
              <button
                type="button"
                role="option"
                aria-selected={n.value === network}
                onClick={() => pick(n.value)}
                className="flex h-[40px] w-full items-center justify-between gap-4 rounded-md px-8 text-left text-lg leading-lg text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {n.label}
                {n.value === network && (
                  <span className="text-[color:var(--color-icon-brand)]">
                    <Icon icon={Tick02Icon} size={16} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

/** The token address box with its copy button: the demo IDZ contract on the wallet's network. */
function TokenAddress({ network }: { network: Network }) {
  const copy = useCopy();
  const contract = idzContractOf(network);
  return (
    <div className="flex h-[32px] w-full items-center justify-between gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border px-5">
      <span className="min-w-0 truncate text-sm leading-sm text-text-primary">
        Token Address: <span aria-hidden>{shortAddress(contract)}</span>
        <span className="sr-only">{contract}</span>
      </span>
      <button
        type="button"
        aria-label="Copy token address"
        onClick={() => copy(contract, "Token address copied")}
        className="inline-flex size-[24px] shrink-0 items-center justify-center rounded-sm text-[color:var(--color-icon-default)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Copy01Icon} size={16} />
      </button>
    </div>
  );
}

/** The holdings under the figure (web N1): what is free, staked, ready to claim, pending. */
function HoldingsLine({ h }: { h: IdzHoldings }) {
  const parts = [
    { label: "Available", value: h.available },
    { label: "Staked", value: h.staked },
    { label: "Ready to claim", value: h.claimable },
    { label: "Pending", value: h.pending },
  ];
  return (
    <dl className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm leading-sm">
      {parts.map((p) => (
        <div key={p.label} className="flex items-center gap-2">
          <dt className="text-text-secondary">{p.label}</dt>
          <dd className="font-medium tabular-nums text-text-primary">{formatAmount(p.value, "IDZ")}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Current Balance" over the card, with the network chip once a wallet is connected. */
export function BalanceHeading({ network, connected, title = "Current Balance" }: { network: Network; connected: boolean; title?: string }) {
  return (
    <div className="flex min-h-[28px] items-center justify-between gap-6">
      <h2 className={cn(SECTION_TITLE, "shrink-0")}>{title}</h2>
      {connected && <NetworkChip network={network} />}
    </div>
  );
}

/** The connected card: the IDZ figure, "= $…", the holdings, the token address, the screen's actions. */
export function BalanceCard({ network, holdings, children }: { network: Network; holdings: IdzHoldings; children?: React.ReactNode }) {
  return (
    <div className={cn(CARD, "flex flex-col items-center gap-8 px-8 pb-8 pt-14")}>
      <div className="flex flex-col items-center gap-4">
        <p className="flex items-center gap-4">
          <IdzCoin height={44} />
          <span className="text-7xl font-semibold leading-7xl tabular-nums text-text-brand">{formatAmount(holdings.available, "IDZ")}</span>
        </p>
        <p className="flex flex-wrap items-center justify-center gap-4">
          <span className="text-lg font-semibold leading-lg tabular-nums text-text-primary">= {idzUsdOf(holdings.available)}</span>
          <TestnetDemoBadge />
        </p>
        <HoldingsLine h={holdings} />
      </div>
      <TokenAddress network={network} />
      {children}
    </div>
  );
}

/** Not connected (Figma 229495 / 247010): "No data found" and the screen's actions. */
export function NoBalanceCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(CARD, "flex flex-col items-center gap-8 px-6 pb-6 pt-12")}>
      <span aria-hidden className="text-[color:var(--color-icon-default)]">
        <Icon icon={Note01Icon} size={24} />
      </span>
      <p className="text-lg leading-lg text-text-primary">No data found</p>
      {children}
    </div>
  );
}

/** Two XL buttons side by side, as the Figma's card actions. */
export function CardActions({ children }: { children: React.ReactNode }) {
  return <div className="grid w-full grid-cols-2 gap-6">{children}</div>;
}

/** The wallet screen's three tiles (Figma 247010): Buy IDZ · Stake IDZ · Import IDZ. */
export function ActionTiles({ onImport }: { onImport: () => void }) {
  const router = useRouter();
  const tile = (label: string, icon: IconValue, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[72px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-subtle text-md leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span aria-hidden className="text-[color:var(--color-icon-brand)]">
        <Icon icon={icon} size={20} />
      </span>
      {label}
    </button>
  );
  return (
    <div className="flex w-full gap-6">
      {tile("Buy IDZ", ShoppingBasket02Icon, () => router.push("/m/earn/presale"))}
      {tile("Stake IDZ", MoneyBag01Icon, () => router.push("/m/earn/stake/contracts"))}
      {tile("Import IDZ", Download04Icon, onImport)}
    </div>
  );
}

// ── the sheets every screen shares ──────────────────────────────────────

/** Connect your wallet (the request's own first step, and the Refer & Earn ask, Figma 228900). */
export function ConnectSheet({
  open,
  onClose,
  onConnected,
  description = "This is the testnet demo wallet — test funds only, nothing is written to a real blockchain.",
}: {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
  description?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const toast = useToast();
  const timer = React.useRef<number | null>(null);
  React.useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  const close = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
    setError(null);
    onClose();
  };
  const connect = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const w = readWallet();
      const ok = persistWallet(walletConnect(w, makerId(w.account)));
      setBusy(false);
      if (!ok) return setError("This browser couldn’t save it — storage is full or blocked.");
      toast({ title: "Wallet connected" });
      onClose();
      onConnected?.();
    }, TIMING.connect);
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Connect your wallet"
      description={description}
      actions={
        <>
          <Button size="xl" className="w-full" loading={busy} onClick={connect}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      {error && <p className="text-md leading-md text-text-error">{error}</p>}
    </Sheet>
  );
}

/** The Demo wallet (the web's Demo wallet dialog, as a sheet): connect, the demo account, the network. */
export function DemoWalletSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallet, market, now } = useEarnState();
  const toast = useToast();
  if (!wallet) return null;
  const id = makerId(wallet.account);
  const state = wallet.identities[id];
  const network = state?.network ?? "baseSepolia";
  const save = (next: typeof wallet, done: string) => {
    if (persistWallet(next)) toast({ title: done });
    else toast({ title: "This browser couldn’t save it — storage is full or blocked.", lead: "error" });
  };
  const ctx = { wallet, market, now };
  const radio = "flex min-h-[44px] w-full items-center justify-between gap-6 rounded-lg px-6 py-3 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Demo wallet"
      description={state?.connected ? `Connected: ${shortAddress(demoAddress(id))}` : "Not connected"}
      actions={
        <>
          {state?.connected ? (
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => save(walletDisconnect(readWallet(), id), "Wallet disconnected")}>
              Disconnect
            </Button>
          ) : (
            <Button size="xl" className="w-full" onClick={() => save(walletConnect(readWallet(), id), "Wallet connected")}>
              Connect demo wallet
            </Button>
          )}
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <TestnetDemoBadge />
        <span className="text-sm leading-sm text-text-secondary">Test funds only. Nothing is written to a real blockchain.</span>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-md font-medium leading-md text-text-primary">Account</legend>
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.index}
            type="button"
            role="radio"
            aria-checked={a.index === wallet.account}
            onClick={() => a.index !== wallet.account && save(walletSwitchAccount(readWallet(), a.index as AccountIndex), `${a.label} chosen`)}
            className={radio}
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-lg leading-lg text-text-primary">{a.label}</span>
              <span className="truncate text-sm leading-sm text-text-secondary">
                {shortAddress(a.address)} · {balanceLineOf(makerId(a.index), network, ctx)}
              </span>
            </span>
            {a.index === wallet.account && (
              <span className="text-[color:var(--color-icon-brand)]">
                <Icon icon={Tick02Icon} size={16} />
              </span>
            )}
          </button>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-md font-medium leading-md text-text-primary">Network</legend>
        {NETWORKS.map((n) => (
          <button
            key={n.value}
            type="button"
            role="radio"
            aria-checked={n.value === network}
            onClick={() => n.value !== network && save(walletSwitchNetwork(readWallet(), id, n.value), `Wallet on ${n.label}`)}
            className={radio}
          >
            <span className="text-lg leading-lg text-text-primary">{n.label}</span>
            {n.value === network && (
              <span className="text-[color:var(--color-icon-brand)]">
                <Icon icon={Tick02Icon} size={16} />
              </span>
            )}
          </button>
        ))}
      </fieldset>
    </Sheet>
  );
}

/** Import IDZ token (web ImportTokenDialog, as a sheet): the contract, symbol and decimals to copy. */
export function ImportTokenSheet({ open, onClose, network }: { open: boolean; onClose: () => void; network: Network }) {
  const copy = useCopy();
  const contract = idzContractOf(network);
  const rows = [
    { label: "Token contract address", value: contract, mono: true },
    { label: "Token symbol", value: IDZ_TOKEN.symbol },
    { label: "Token decimals", value: String(IDZ_TOKEN.decimals) },
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Import IDZ token into Wallet"
      description="Add IDZ to your wallet app so it shows your balance there."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={onClose}>
            Done
          </Button>
          <p className="text-center text-sm leading-sm text-text-secondary">Adding it to MetaMask in one step opens once real wallets can connect.</p>
        </>
      }
    >
      <div className="flex items-center gap-6 rounded-xl bg-bg-subtle p-6">
        <IdzCoin height={32} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-lg font-semibold leading-lg text-text-primary">{IDZ_TOKEN.name}</span>
          <span className="text-sm leading-sm text-text-secondary">{networkLabelOf(network)}</span>
        </div>
        <TestnetDemoBadge />
      </div>
      <dl className="flex flex-col gap-6">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-2">
            <dt className="text-sm font-medium leading-sm text-text-secondary">{r.label}</dt>
            <dd className="flex items-center justify-between gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border py-2 pl-6 pr-2">
              <span className={cn("min-w-0 text-md leading-md text-text-primary", r.mono && "break-all font-mono")}>{r.value}</span>
              <button
                type="button"
                aria-label={`Copy ${r.label.toLowerCase()}`}
                onClick={() => copy(r.value, `${r.label} copied`)}
                className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Copy01Icon} size={18} />
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-md leading-md text-text-secondary">
        In your wallet app, choose Import tokens, pick {networkLabelOf(network)}, and paste the contract address. The symbol and decimals fill in from it.
      </p>
    </Sheet>
  );
}

/** The ⋯ menu's two rows every Earn screen has: the wallet balance and the Demo wallet. */
export const WALLET_ICON = Wallet01Icon;
