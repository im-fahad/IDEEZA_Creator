"use client";

// Payment method (/m/settings/payments; mobile Figma "Payment Method": the
// Credit Card · PayPal · Wallet Connect tabs, `?tab=card|paypal|wallet`).
// The web decides what can be saved (components/credits/payment-method-
// panel.tsx, lib/account/payment.ts): card and PayPal payments aren't on, so
// those tabs keep the Figma's empty state with Add held and its reason (no
// card or PayPal details are ever asked for); the one method is Crypto from
// the Demo wallet. Wallet Connect lists the providers — the Demo wallet
// connects (the method is added, as the default), the real wallets are Soon
// — and the saved method's ⋮ picks the token you pay with, manages the
// wallet, or removes the method (disconnects the demo wallet, asked first).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCardIcon, MoreVerticalIcon, PaypalIcon, Settings02Icon, Delete02Icon, Wallet01Icon, Wallet02Icon, Tick02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { CoinGlyph, useWalletStatus } from "@/components/credits/payment-picker";
import { setDefaultToken, useDefaultToken, type PayToken } from "@/lib/account/payment";
import { makerId, readWallet, walletDisconnect } from "@/lib/wallet/demo-wallet";
import { cn } from "@/lib/utils";
import { ConnectSheet, DemoWalletSheet } from "../earn-coin/parts";
import { ActionSheet } from "../kit/sheet";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { CARD } from "./parts";

type Tab = "card" | "paypal" | "wallet";
const TABS: { id: Tab; label: string }[] = [
  { id: "card", label: "Credit card" },
  { id: "paypal", label: "PayPal" },
  { id: "wallet", label: "Wallet Connect" },
];

/** The real wallets the Figma lists: none connects yet (web D9), so each says Soon. */
const SOON_WALLETS = ["MetaMask", "Coinbase", "Fantom", "Trust", "Portis"] as const;

export function PaymentsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const t = params.get("tab");
  const tab: Tab = t === "card" || t === "paypal" ? t : "wallet";
  return (
    <Screen top={<TopBar back title="Payment method" />} className="pb-12">
      <nav aria-label="Payment method" className="flex border-b-[length:var(--border-width-1)] border-solid border-border-subtle px-8">
        {TABS.map((x) => {
          const on = x.id === tab;
          return (
            <button
              key={x.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => router.replace(`/m/settings/payments?tab=${x.id}`)}
              className={cn(
                "-mb-[var(--border-width-1)] flex h-[44px] flex-1 items-center justify-center border-b-[length:var(--border-width-2)] border-solid text-md leading-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "border-border-brand font-medium text-text-brand" : "border-transparent text-text-secondary",
              )}
            >
              {x.label}
            </button>
          );
        })}
      </nav>
      <div className="px-8 pt-8">{tab === "wallet" ? <WalletTab /> : <NotYetTab kind={tab} onWallet={() => router.replace("/m/settings/payments?tab=wallet")} />}</div>
    </Screen>
  );
}

function NotYetTab({ kind, onWallet }: { kind: "card" | "paypal"; onWallet: () => void }) {
  const card = kind === "card";
  return (
    <div className="flex flex-col gap-8">
      <div className={cn(CARD, "flex flex-col items-center gap-4 px-8 py-16 text-center")}>
        <span aria-hidden className="text-[color:var(--color-icon-default)]">
          <Icon icon={card ? CreditCardIcon : PaypalIcon} size={24} />
        </span>
        <p className="text-lg leading-lg text-text-primary">No saved payment method</p>
      </div>
      <div className="flex flex-col gap-3">
        <Button size="xl" className="w-full" disabled aria-describedby="not-yet">
          {card ? "Add new card" : "Add PayPal"}
        </Button>
        <p id="not-yet" className="text-sm leading-sm text-text-secondary">
          {card ? "Card payments aren’t available yet." : "PayPal isn’t available yet."} You pay with test USDT or IDZ from the Demo wallet.
        </p>
      </div>
      <Button hierarchy="secondary" size="xl" className="w-full" onClick={onWallet}>
        Use Wallet Connect
      </Button>
    </div>
  );
}

function WalletTab() {
  const wallet = useWalletStatus();
  const token = useDefaultToken();
  const toast = useToast();
  const [connecting, setConnecting] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [manage, setManage] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const choose = (coin: PayToken) => {
    if (setDefaultToken(coin)) toast({ title: `You pay with ${coin}` });
    else toast({ title: "This browser couldn’t save the choice (storage is full or blocked).", lead: "error" });
  };

  return (
    <div className="flex flex-col gap-8">
      {wallet.connected && (
        <section aria-labelledby="saved" className="flex flex-col gap-4">
          <h2 id="saved" className="text-lg font-medium leading-lg text-text-primary">
            Saved
          </h2>
          <div className={cn(CARD, "flex items-center gap-6 p-6")}>
            <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
              <Icon icon={Wallet02Icon} size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-3">
                <span className="text-md font-medium leading-md text-text-primary">Demo wallet</span>
                <Badge tone="success">Default</Badge>
              </span>
              <span className="truncate text-sm leading-sm text-text-secondary">
                <span className="font-mono">{wallet.short}</span> · {wallet.detail}
              </span>
              <span className="flex items-center gap-2 text-sm leading-sm text-text-secondary">
                Pay with
                <span className="inline-flex items-center gap-1 text-text-primary">
                  <CoinGlyph coin={token} /> {token}
                </span>
              </span>
            </span>
            <button
              type="button"
              aria-label="More for the demo wallet"
              onClick={() => setMenu(true)}
              className="-mr-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={MoreVerticalIcon} size={20} />
            </button>
          </div>
          <p className="flex flex-wrap items-center gap-3 text-sm leading-sm text-text-secondary">
            <TestnetDemoBadge />
            Checkout opens on the token you pay with; you can pick the other one when you pay. A plan’s renewal isn’t charged on testnet.
          </p>
        </section>
      )}
      <section aria-labelledby="providers" className="flex flex-col gap-6">
        <h2 id="providers" className="text-center text-lg leading-lg text-text-primary">
          Connect with one of our available wallet providers.
        </h2>
        <ul className="flex flex-col divide-y divide-border-subtle">
          <li>
            <button
              type="button"
              onClick={() => (wallet.connected ? setManage(true) : setConnecting(true))}
              className="flex min-h-[56px] w-full items-center gap-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <IdeezaLogo mark height={22} decorative />
              <span className="flex-1 text-lg leading-lg text-text-primary">Demo wallet</span>
              {wallet.connected ? (
                <span className="inline-flex items-center gap-2 text-sm leading-sm text-text-success">
                  <Icon icon={Tick02Icon} size={14} />
                  Connected
                </span>
              ) : (
                <TestnetDemoBadge />
              )}
              <Icon icon={ArrowRight01Icon} size={16} />
            </button>
          </li>
          {SOON_WALLETS.map((w) => (
            <li key={w}>
              <div aria-disabled className="flex min-h-[56px] items-center gap-5 text-text-disabled" title="Opens once real wallets can connect">
                <Icon icon={Wallet01Icon} size={22} />
                <span className="flex-1 text-lg leading-lg">{w}</span>
                <span className="text-sm leading-sm">Soon</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm leading-sm text-text-tertiary">Real wallets open once they can connect. Until then the Demo wallet pays on testnet.</p>
      </section>

      <ConnectSheet
        open={connecting}
        onClose={() => setConnecting(false)}
        description="It becomes your payment method. This is the testnet demo wallet — test funds only, nothing is written to a real blockchain."
      />
      <DemoWalletSheet open={manage} onClose={() => setManage(false)} />
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title="Demo wallet"
        items={[
          { label: "Pay with IDZ", icon: token === "IDZ" ? Tick02Icon : Wallet02Icon, onSelect: () => choose("IDZ") },
          { label: "Pay with USDT", icon: token === "USDT" ? Tick02Icon : Wallet02Icon, onSelect: () => choose("USDT") },
          { label: "Manage wallet", icon: Settings02Icon, onSelect: () => setManage(true) },
          { label: "Remove", icon: Delete02Icon, destructive: true, onSelect: () => setRemoving(true) },
        ]}
      />
      <ConfirmSheet
        open={removing}
        onClose={() => setRemoving(false)}
        title="Remove the demo wallet?"
        body="It disconnects from IDEEZA, so checkout asks you to connect a wallet again. Your test coins and past payments stay as they are."
        verb="Remove"
        destructive
        onConfirm={() => {
          const w = readWallet();
          if (persistWallet(walletDisconnect(w, makerId(w.account)))) toast({ title: "Demo wallet removed" });
          else toast({ title: "This browser couldn’t save it — storage is full or blocked.", lead: "error" });
        }}
      />
    </div>
  );
}
