"use client";

// IDEEZA pay · Get Paid (/m/settings/idz-pay; mobile Figma "Genarel > IDEEZA
// pay"), on the web's Get paid record and arithmetic (lib/account/payout.ts,
// use-payout.ts, components/settings/get-paid): the available balance in
// dollars at the demo rates with Withdraw money, the identity check, the
// tax rows (held: the web keeps no tax data until real payouts, V7), the
// withdrawal methods (⋮ Make default — signed in the wallet sheet — or Remove,
// asked first), Add withdrawal method (a crypto wallet; bank, Payoneer and
// PayPal aren't in the app), and Get paid in (USDT or IDZ). The header's
// history button opens the withdrawal history.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BankIcon,
  Clock01Icon,
  Delete02Icon,
  Download04Icon,
  MoreVerticalIcon,
  PaypalIcon,
  PlusSignIcon,
  StarIcon,
  Wallet02Icon,
  ArrowRight01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { methodRequest } from "@/components/settings/get-paid/method-dialog";
import { networkName, useGetPaidData } from "@/components/settings/get-paid/parts";
import {
  balanceOf,
  centsFloor,
  formatUsd,
  makeDefault,
  removeMethod,
  type PayoutStore,
  type PayoutToken,
  type WithdrawalMethod,
} from "@/lib/account/payout";
import { scrubPayout, updatePayout, usePayout } from "@/lib/account/use-payout";
import { levelDueOf, LEVEL_AT } from "@/lib/commerce/kyc-levels";
import { useKyc } from "@/lib/commerce/use-commerce";
import { useKycLevels } from "@/lib/commerce/use-kyc-levels";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { compareAmounts } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ActionSheet, Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { BulletList, CARD, SECTION_TITLE, n } from "./parts";

export const SAVE_FAILED = "This browser couldn’t save it (storage is full or blocked). Nothing changed.";

/** Get paid's record, your earnings and identity, read together. */
export function useGetPaid() {
  const store = usePayout();
  const kyc = useKyc();
  const levels = useKycLevels();
  const data = useGetPaidData();
  const loaded = store !== undefined && kyc !== undefined && levels !== undefined && data.ready;
  const balance = store ? balanceOf(data.earnings, store.withdrawals) : null;
  return { store, kyc: kyc ?? null, levels, data, loaded, balance, verified: !!kyc };
}

const TOKENS: { value: PayoutToken; label: string }[] = [
  { value: "USDT", label: "USDT · 1 USDT = $1" },
  { value: "IDZ", label: "IDZ · demo rate 1 IDZ = $1" },
];

export function GetPaidScreen() {
  const router = useRouter();
  const toast = useToast();
  const { store, kyc, levels, data, loaded, balance, verified } = useGetPaid();
  const { request, sheet } = useWalletSheet();
  const [adding, setAdding] = React.useState(false);
  const [menuFor, setMenuFor] = React.useState<WithdrawalMethod | null>(null);
  const [removing, setRemoving] = React.useState<WithdrawalMethod | null>(null);
  const [higher, setHigher] = React.useState(false);

  // Tax data an older version kept goes the first time the page is opened (V7).
  React.useEffect(() => {
    scrubPayout();
  }, []);

  const available = balance ? centsFloor(balance.available) : "0";
  const hasMoney = compareAmounts(available, "0") > 0;
  const due = levels ? levelDueOf(levels, data.salesUsd) : null;

  const makeDefaultSigned = async (m: WithdrawalMethod) => {
    const result = await request(methodRequest("default", m, true), {
      commit: (proof) => (updatePayout((s) => makeDefault(s, m.id, proof.at, proof.signature)) ? { ok: true } : { ok: false, message: SAVE_FAILED }),
    });
    if (result.ok) toast({ title: `${m.label} is your default withdrawal method`, lead: "success" });
  };

  return (
    <Screen
      top={<TopBar back title="Get Paid" actions={[{ icon: Clock01Icon, label: "Withdrawal history", onClick: () => router.push("/m/settings/idz-pay/history") }]} />}
      className="px-8 pb-12 pt-4"
    >
      {!loaded || !store || !balance ? (
        <div className="flex flex-col gap-8" aria-label="Loading" role="status">
          <Skeleton shape="block" className="h-[160px] w-full" />
          <Skeleton shape="block" className="h-[64px] w-full" />
          <Skeleton shape="block" className="h-[64px] w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <section aria-label="Available balance" className={cn(CARD, "flex flex-col items-center gap-6 p-8 text-center")}>
            <span className="text-md leading-md text-text-primary">Available balance</span>
            <span className="flex items-baseline gap-2">
              <span className="text-6xl font-semibold leading-6xl tabular-nums text-text-brand">{formatUsd(available)}</span>
              <span className="text-sm leading-sm text-text-primary">USD</span>
            </span>
            <span className="flex flex-wrap items-center justify-center gap-3 text-sm leading-sm text-text-secondary">
              <TestnetDemoBadge />
              At demo rates. Withdrawn so far: {formatUsd(balance.withdrawn)}
            </span>
            <Button size="xl" className="w-full" disabled={!hasMoney} onClick={() => router.push("/m/settings/idz-pay/withdraw")}>
              <Icon icon={Download04Icon} size={20} />
              Withdraw money
            </Button>
            {!hasMoney && (
              <p className="text-sm leading-sm text-text-secondary">
                {data.stageOf(store) === "setup"
                  ? "Nothing to withdraw yet. Once something of yours is listed or sold, your share of each sale lands here."
                  : "Nothing to withdraw right now. Your share of each sale lands here, after the 2.5% IDEEZA fee and any splits."}
              </p>
            )}
          </section>

          {!verified ? (
            <Banner
              tone="attention"
              title="Verify your identity"
              action={
                <button type="button" onClick={() => router.push("/m/settings/kyc/1?next=/m/settings/idz-pay")} className="font-medium hover:underline">
                  Verify now
                </button>
              }
            >
              Your first withdrawal asks for it, and so does selling physical copies.
            </Banner>
          ) : due ? (
            <Banner
              tone="info"
              title={due === "intermediate" ? "Identity check required" : "Enhanced verification needed"}
              action={
                <button type="button" onClick={() => setHigher(true)} className="font-medium hover:underline">
                  See what’s needed
                </button>
              }
            >
              Your sales passed ${n(LEVEL_AT[due])}. Nothing is limited in this demo.
            </Banner>
          ) : null}

          <section aria-labelledby="tax" className="flex flex-col gap-4">
            <h2 id="tax" className={SECTION_TITLE}>
              Tax information
            </h2>
            {[
              { label: "Tax residence", help: "Update your tax details" },
              { label: "Tax identification", help: "Whether IDEEZA needs to withhold taxes from your earnings" },
            ].map((r) => (
              <div key={r.label} aria-disabled className={cn(CARD, "flex items-center gap-4 px-6 py-5")}>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-md leading-md text-text-disabled">{r.label}</span>
                  <span className="text-sm leading-sm text-text-disabled">{r.help}</span>
                </span>
                <span className="text-sm leading-sm text-text-tertiary">Later</span>
              </div>
            ))}
            <p className="text-sm leading-sm text-text-secondary">Tax forms come with real payouts. Nothing is withheld and no tax details are kept in this demo.</p>
          </section>

          <section aria-labelledby="methods" className="flex flex-col gap-4">
            <h2 id="methods" className={SECTION_TITLE}>
              Withdrawal methods
            </h2>
            {store.methods.length === 0 ? (
              <p className="text-md leading-md text-text-secondary">None yet. Your first withdrawal asks where the money goes, or add a method now.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {store.methods.map((m) => (
                  <li key={m.id} className={cn(CARD, "flex items-center gap-5 px-6 py-5")}>
                    <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
                      <Icon icon={Wallet02Icon} size={22} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-3">
                        <span className="truncate text-md font-medium leading-md text-text-primary">{m.label}</span>
                        {m.id === store.defaultMethodId && <Badge tone="success">Default</Badge>}
                      </span>
                      <span className="truncate text-sm leading-sm text-text-secondary">
                        <span className="font-mono">{shortAddress(m.address)}</span> · {networkName(m.network)}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`More for ${m.label}`}
                      onClick={() => setMenuFor(m)}
                      className="-mr-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <Icon icon={MoreVerticalIcon} size={20} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setAdding(true)}>
              <Icon icon={PlusSignIcon} size={18} />
              Add withdrawal method
            </Button>
          </section>

          <section aria-labelledby="get-paid-in" className="flex flex-col gap-4">
            <h2 id="get-paid-in" className={SECTION_TITLE}>
              Get paid in
            </h2>
            <SheetSelect
              title="Get paid in"
              value={store.getPaidIn}
              options={TOKENS}
              onChange={(v) => {
                const token = v as PayoutToken;
                if (updatePayout((s) => ({ ...s, getPaidIn: token }))) toast({ title: `You’re paid in ${token}` });
                else toast({ title: SAVE_FAILED, lead: "error" });
              }}
            />
            <p className="text-sm leading-sm text-text-secondary">Withdrawals pay out in this token. The balance is the same either way.</p>
          </section>

          <button
            type="button"
            onClick={() => router.push("/m/settings/kyc")}
            className={cn(CARD, "flex min-h-[64px] items-center gap-5 px-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
          >
            <span aria-hidden className="text-text-brand">
              <Icon icon={Shield01Icon} size={22} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-md font-medium leading-md text-text-primary">KYC verification</span>
              <span className="text-sm leading-sm text-text-secondary">{kyc ? "Level 1 approved" : "Not verified yet"}</span>
            </span>
            <Icon icon={ArrowRight01Icon} size={16} />
          </button>
        </div>
      )}

      <AddMethodSheet open={adding} onClose={() => setAdding(false)} onCrypto={() => router.push("/m/settings/idz-pay/method")} />
      <ActionSheet
        open={menuFor !== null}
        onClose={() => setMenuFor(null)}
        title={menuFor?.label}
        items={
          menuFor && store
            ? [
                ...(menuFor.id !== store.defaultMethodId ? [{ label: "Make default", icon: StarIcon, onSelect: () => void makeDefaultSigned(menuFor) }] : []),
                { label: "Remove", icon: Delete02Icon, destructive: true, onSelect: () => setRemoving(menuFor) },
              ]
            : []
        }
      />
      {store && (
        <ConfirmSheet
          open={removing !== null}
          onClose={() => setRemoving(null)}
          title="Remove withdrawal method?"
          body={removing ? <RemoveWords method={removing} store={store} /> : null}
          verb="Remove method"
          onConfirm={() => {
            const m = removing;
            if (!m) return;
            if (updatePayout((s) => removeMethod(s, m.id, Date.now()))) toast({ title: `${m.label} removed` });
            else toast({ title: SAVE_FAILED, lead: "error" });
          }}
        />
      )}
      <HigherCheckSheet open={higher} onClose={() => setHigher(false)} level={due} />
      {sheet}
    </Screen>
  );
}

function RemoveWords({ method, store }: { method: WithdrawalMethod; store: PayoutStore }) {
  const next = removeMethod(store, method.id, 0);
  const heir = method.id === store.defaultMethodId ? next.methods.find((m) => m.id === next.defaultMethodId) : null;
  return (
    <>
      {`If you remove ${method.label} (${shortAddress(method.address)} on ${networkName(method.network)}), it won’t receive withdrawals any more. `}
      {heir ? `${heir.label} becomes your preferred method.` : next.methods.length === 0 ? "Your next withdrawal will ask where the money goes." : "Your default stays as it is."} Past withdrawals keep their record.
    </>
  );
}

/** Add withdrawal method (Figma "Get Paid - withdrawal methods" modal): the web takes a crypto wallet only. */
function AddMethodSheet({ open, onClose, onCrypto }: { open: boolean; onClose: () => void; onCrypto: () => void }) {
  const row = "flex min-h-[64px] items-center gap-5 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-6 py-4 text-left";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add withdrawal method"
      description="Choose where your withdrawals go."
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              onClose();
              onCrypto();
            }}
          >
            Continue
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Withdrawal method" className="flex flex-col gap-4">
        <div role="radio" aria-checked className={cn(row, "border-border-brand bg-bg-brand-subtle")}>
          <span aria-hidden className="text-text-brand">
            <Icon icon={Wallet02Icon} size={24} />
          </span>
          <span className="flex flex-col">
            <span className="text-md font-medium leading-md text-text-primary">Crypto wallet</span>
            <span className="text-sm leading-sm text-text-secondary">USDT or IDZ to a wallet address, on testnet</span>
          </span>
        </div>
        {[
          { label: "Direct bank", line: "Deposits to your local bank in your currency", icon: BankIcon },
          { label: "Payoneer", line: "To your Payoneer account", icon: Wallet02Icon },
          { label: "PayPal", line: "To your PayPal account", icon: PaypalIcon },
        ].map((m) => (
          <div key={m.label} role="radio" aria-checked={false} aria-disabled className={cn(row, "border-border-subtle text-text-disabled")}>
            <Icon icon={m.icon} size={24} />
            <span className="flex flex-1 flex-col">
              <span className="text-md leading-md">{m.label}</span>
              <span className="text-sm leading-sm">{m.line}</span>
            </span>
            <span className="text-sm leading-sm text-text-tertiary">Not available yet</span>
          </div>
        ))}
      </div>
      <p className="text-sm leading-sm text-text-secondary">Bank, Payoneer and PayPal payouts aren’t in the app yet, so no bank details are asked for.</p>
    </Sheet>
  );
}

export const LEVEL_NEEDS: Record<"intermediate" | "advanced", string[]> = {
  intermediate: ["All Level 1 data (already collected)", "A government-issued photo ID (passport, national ID or driver’s licence)", "Your date of birth", "Your full residential address", "Your tax residency country"],
  advanced: [
    "All Level 1 and Level 2 data (already collected)",
    "Proof of address (a utility bill or bank statement, at most 3 months old)",
    "A liveness check (selfie, blink, head turn)",
    "Where your funds come from (employment, business, savings, investment, other)",
    "Your tax identification number, where your country has one",
  ],
};

/** Identity check required / Enhanced verification needed (Figma Level 2 and Level 3 modals). */
export function HigherCheckSheet({ open, onClose, level }: { open: boolean; onClose: () => void; level: "intermediate" | "advanced" | null }) {
  const router = useRouter();
  if (!level) return null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={level === "intermediate" ? "Identity check required" : "Enhanced verification needed"}
      description={
        level === "intermediate"
          ? `Your sales passed $${n(LEVEL_AT.intermediate)}, where a fuller check with an ID document is asked. Nothing is limited in this demo.`
          : `You reached the $${n(LEVEL_AT.advanced)} milestone, where a deeper identity check is asked. Nothing is limited in this demo.`
      }
      actions={
        <Button size="xl" className="w-full" onClick={() => router.push(`/m/settings/kyc/${level === "intermediate" ? 2 : 3}`)}>
          Continue to verification
        </Button>
      }
    >
      <p className="text-md font-medium leading-md text-text-primary">What you’ll need:</p>
      <BulletList items={LEVEL_NEEDS[level]} />
    </Sheet>
  );
}

