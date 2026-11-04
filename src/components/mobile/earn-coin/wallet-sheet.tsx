"use client";

// The demo wallet's request, as a bottom sheet (Shared kit KIT-WS-01…05): the
// web's wallet popup (components/wallet/wallet-provider.tsx) is a centred
// dialog, and every mobile popup rises from the bottom, so the phone walks the
// same phases with the same rules and the same pure helpers
// (lib/wallet/request*.ts), in kit sheets:
//   connect → (wrong network → switch) → review (WS-01, the risk line lives
//   here) → waiting for the wallet (WS-02) → confirmed: the sheet closes and the
//   flow shows its own success, or a toast (WS-05);
//   cancelled (WS-03) and didn't go through (WS-04) say "Nothing changed." and
//   offer Try again.
// The wallet is read fresh at every step; a change of account, network or
// connection under the request ends it; funds are checked at review, at
// Confirm and just before confirming; then the caller's `recheck` and
// `commit`, then the activity line (the debit or credit) is the last write.
//
// `useWalletSheet()` returns `request` and the `sheet` to render; each screen
// that signs renders its own.

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { Banner } from "@/components/ideeza/banner";
import { Spinner } from "@/components/ideeza/spinner";
import { useSecondClock } from "@/components/balance/use-second-clock";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { estimateGas } from "@/lib/commerce/gas";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { pushActivity, readWallet, walletConnect, walletSwitchNetwork } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { TIMING, failureOf } from "@/lib/wallet/request";
import {
  activityOf,
  balanceChangedLine,
  demoSignatureOf,
  demoTxHashOf,
  networkLabelOf,
  proofOf,
  requestGateOf,
  requestIdentityOf,
  shortfallOf,
  testCoin,
} from "@/lib/wallet/request-view";
import type {
  DemoWallet,
  FailReason,
  IdentityId,
  RequestOptions,
  RequestResult,
  SummaryRow,
  WalletRequest,
} from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { Sheet } from "../kit/sheet";

type Phase = "connect" | "connecting" | "wrongNetwork" | "switching" | "review" | "signing" | "pending" | "rejected" | "failed";

type Flight = {
  req: WalletRequest;
  opts: RequestOptions;
  resolve: (r: RequestResult) => void;
  identity: IdentityId;
  before: DemoWallet | null;
  outcome: { reason: "rejected" | FailReason; message?: string } | null;
};

type View = { phase: Phase; req: WalletRequest; identity: IdentityId; reason: FailReason | null; message: string | null };

const FAIL_LINE: Record<FailReason, string> = {
  walletDisconnected: "Your wallet disconnected before it confirmed.",
  networkChanged: "Your wallet switched network before it confirmed.",
  accountChanged: "Your wallet switched account before it confirmed.",
  insufficientFunds: "Your balance changed before it confirmed.",
  storageFailed: "This browser couldn't save it — storage is full or blocked.",
  recheck: "It didn't go through.",
};

const nonce = () => Math.random().toString(36).slice(2, 10);

/** The review rows: what the request says, then the network fee in its test coin. */
function rowsOf(req: WalletRequest): SummaryRow[] {
  const rows = [...req.summary];
  if (req.kind === "transaction" && req.charge) {
    const gas = estimateGas(req.charge.network);
    const paid = req.charge.lines.filter((l) => l.coin !== "IDZ" && !(l.coin === gas.native && Number(l.amount) === gas.fee));
    for (const l of paid) rows.push({ label: "You pay", value: formatAmount(l.amount, l.coin) });
    rows.push({ label: "Network fee", value: testCoin(String(gas.fee), gas.native) });
  } else rows.push({ label: "Fee", value: "No fee" });
  return rows;
}

export function useWalletSheet() {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useSecondClock();
  const [view, setView] = React.useState<View | null>(null);
  const flight = React.useRef<Flight | null>(null);
  const timer = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  React.useEffect(() => clearTimer, [clearTimer]);

  const show = React.useCallback((phase: Phase, extra: { reason?: FailReason; message?: string } = {}) => {
    const f = flight.current;
    if (!f) return;
    setView({ phase, req: f.req, identity: f.identity, reason: extra.reason ?? null, message: extra.message ?? null });
  }, []);

  const later = React.useCallback(
    (ms: number, fn: () => void) => {
      clearTimer();
      const mine = flight.current;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (flight.current === mine) fn();
      }, ms);
    },
    [clearTimer],
  );

  const end = React.useCallback(
    (result: RequestResult) => {
      const f = flight.current;
      flight.current = null;
      clearTimer();
      setView(null);
      f?.resolve(result);
    },
    [clearTimer],
  );

  const fail = React.useCallback(
    (reason: FailReason, message?: string) => {
      const f = flight.current;
      if (!f) return;
      clearTimer();
      f.outcome = { reason, message };
      show("failed", { reason, message });
    },
    [clearTimer, show],
  );

  const gate = React.useCallback(() => {
    const f = flight.current;
    if (!f) return;
    clearTimer();
    const w = readWallet();
    const g = requestGateOf(f.req, w);
    f.identity = requestIdentityOf(f.req, w);
    f.outcome = null;
    if (g === "accountChanged") return fail("accountChanged");
    if (g === "review") f.before = w;
    show(g);
  }, [clearTimer, fail, show]);

  const request = React.useCallback(
    (req: WalletRequest, opts: RequestOptions = {}): Promise<RequestResult> => {
      if (flight.current) return Promise.resolve({ ok: false, reason: "rejected", message: "Another wallet request is open." });
      return new Promise<RequestResult>((resolve) => {
        flight.current = { req, opts, resolve, identity: requestIdentityOf(req, readWallet()), before: null, outcome: null };
        gate();
      });
    },
    [gate],
  );

  const connect = () => {
    const f = flight.current;
    if (!f) return;
    show("connecting");
    later(TIMING.connect, () => {
      const w = readWallet();
      if (!persistWallet(walletConnect(w, requestIdentityOf(f.req, w)))) return fail("storageFailed");
      gate();
    });
  };

  const switchNetwork = () => {
    const f = flight.current;
    if (!f) return;
    show("switching");
    later(TIMING.switch, () => {
      const w = readWallet();
      if (!persistWallet(walletSwitchNetwork(w, requestIdentityOf(f.req, w), f.req.network))) return fail("storageFailed");
      gate();
    });
  };

  const finish = (hash: string) => {
    const f = flight.current;
    if (!f || !f.before) return;
    const now = readWallet();
    const failure = failureOf(f.before, now, f.identity);
    if (failure) return fail(failure);
    const short = shortfallOf(f.req, f.identity, { wallet: now, market: readMarketNow(), now: Date.now() });
    if (short) return fail("insufficientFunds", balanceChangedLine(short));
    const recheck = f.opts.recheck?.() ?? null;
    if (recheck) return fail("recheck", recheck);
    const proof = proofOf(f.req, f.identity, Date.now(), hash);
    let committed: ReturnType<NonNullable<RequestOptions["commit"]>>;
    try {
      committed = f.opts.commit ? f.opts.commit(proof) : { ok: true };
    } catch {
      committed = { ok: false, message: "" };
    }
    if (!committed.ok) return committed.conflict && committed.message ? fail("recheck", committed.message) : fail("storageFailed", committed.message || undefined);
    // The activity line — the debit or the credit — is the last write.
    if (!persistWallet(pushActivity(readWallet(), activityOf(f.req, proof, `act_${nonce()}`)))) return fail("storageFailed");
    end({ ok: true, proof });
  };

  const approve = () => {
    const f = flight.current;
    if (!f || !f.before) return;
    const now = readWallet();
    const failure = failureOf(f.before, now, f.identity);
    if (failure) return fail(failure);
    const short = shortfallOf(f.req, f.identity, { wallet: now, market: readMarketNow(), now: Date.now() });
    if (short) return fail("insufficientFunds", balanceChangedLine(short));
    const seed = `${f.identity}:${f.req.purpose}:${Date.now()}:${nonce()}`;
    if (f.req.kind === "signature") {
      show("signing");
      later(TIMING.sign, () => finish(demoSignatureOf(seed)));
      return;
    }
    show("signing");
    // Signed in the wallet app, then submitted: it can't be cancelled while it confirms.
    later(TIMING.sign, () => {
      show("pending");
      later(TIMING.confirm, () => finish(demoTxHashOf(seed)));
    });
  };

  const reject = () => {
    const f = flight.current;
    if (!f) return;
    clearTimer();
    f.outcome = { reason: "rejected" };
    show("rejected");
  };

  /** ✕, the scrim, Escape and Close, by phase. */
  const dismiss = () => {
    const f = flight.current;
    if (!view || !f) return;
    switch (view.phase) {
      case "pending":
        return;
      case "review":
      case "signing":
        return reject();
      case "rejected":
      case "failed":
        return end(f.outcome ? { ok: false, reason: f.outcome.reason, message: f.outcome.message } : { ok: false, reason: "rejected" });
      default:
        return end({ ok: false, reason: "rejected" });
    }
  };

  // A wallet change while signing or confirming ends the request.
  React.useEffect(() => {
    if (!view || (view.phase !== "signing" && view.phase !== "pending") || !wallet) return;
    const f = flight.current;
    if (!f?.before) return;
    const failure = failureOf(f.before, wallet, f.identity);
    if (failure) fail(failure);
  }, [wallet, view, fail]);

  const short =
    view && view.phase === "review" && wallet ? shortfallOf(view.req, view.identity, { wallet, market, now }) : null;

  const sheet = view ? (
    <RequestSheet view={view} on={wallet?.identities[view.identity]?.network ?? view.req.network} short={short?.text ?? null} onClose={dismiss} actions={{ connect, switchNetwork, approve, retry: gate, close: dismiss }} />
  ) : null;

  return { request, sheet, busy: view !== null };
}

function Rows({ rows }: { rows: SummaryRow[] }) {
  return (
    <dl className="flex flex-col">
      {rows.map((r) => (
        <div key={r.label} className="flex items-start justify-between gap-8 px-6 py-8">
          <dt className="shrink-0 text-md leading-md text-text-secondary">{r.label}</dt>
          <dd className="min-w-0 text-right text-md leading-md text-text-primary">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RequestSheet({
  view,
  on: onNetwork,
  short,
  onClose,
  actions,
}: {
  view: View;
  /** The network the wallet is on now. */
  on: DemoWallet["identities"][IdentityId]["network"];
  short: string | null;
  onClose: () => void;
  actions: { connect: () => void; switchNetwork: () => void; approve: () => void; retry: () => void; close: () => void };
}) {
  const { req, phase } = view;
  const target = networkLabelOf(req.network);
  const xl = "w-full";
  const risk = <p className="text-sm leading-sm text-text-secondary">{req.note}</p>;

  if (phase === "connect" || phase === "connecting") {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Connect your wallet"
        description="The rewards and the coins go to it. This is the testnet demo wallet — test funds only, nothing is written to a real blockchain."
        actions={
          <>
            <Button size="xl" className={xl} loading={phase === "connecting"} onClick={actions.connect}>
              {phase === "connecting" ? "Connecting…" : "Connect demo wallet"}
            </Button>
            <Button hierarchy="secondary" size="xl" className={xl} onClick={onClose}>
              Cancel
            </Button>
          </>
        }
      />
    );
  }

  if (phase === "wrongNetwork" || phase === "switching") {
    const on = networkLabelOf(onNetwork);
    return (
      <Sheet
        open
        onClose={onClose}
        title="Switch network"
        description={`Your wallet is on ${on}. This is on ${target}.`}
        actions={
          <>
            <Button size="xl" className={xl} loading={phase === "switching"} onClick={actions.switchNetwork}>
              {phase === "switching" ? "Switching…" : `Switch to ${target}`}
            </Button>
            <Button hierarchy="secondary" size="xl" className={xl} onClick={onClose}>
              Cancel
            </Button>
          </>
        }
      />
    );
  }

  if (phase === "signing" || phase === "pending") {
    return (
      <Sheet
        open
        onClose={onClose}
        hideClose={phase === "pending"}
        title={phase === "signing" ? "Waiting for your wallet" : `Confirming on ${target}…`}
        description={phase === "signing" ? "Open your wallet app and sign." : "A submitted transaction can't be cancelled."}
        actions={
          phase === "signing" ? (
            <Button hierarchy="secondary" size="xl" className={xl} onClick={onClose}>
              Cancel
            </Button>
          ) : undefined
        }
      >
        <div className="flex justify-center py-8" role="status" aria-label={phase === "signing" ? "Waiting for your wallet" : "Confirming"}>
          <Spinner size={32} />
        </div>
      </Sheet>
    );
  }

  if (phase === "rejected" || phase === "failed") {
    const line = phase === "failed" ? (view.message ?? (view.reason ? FAIL_LINE[view.reason] : FAIL_LINE.recheck)) : null;
    return (
      <Sheet
        open
        onClose={onClose}
        title={phase === "rejected" ? "You cancelled in your wallet" : "That didn’t go through"}
        description={line ? `Nothing changed. ${line}` : "Nothing changed."}
        actions={
          <>
            {!(phase === "failed" && view.reason === "recheck") && (
              <Button size="xl" className={xl} onClick={actions.retry}>
                Try again
              </Button>
            )}
            <Button hierarchy="secondary" size="xl" className={xl} onClick={actions.close}>
              Close
            </Button>
          </>
        }
      >
        <Rows rows={rowsOf(req)} />
        {risk}
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={req.title}
      description={req.kind === "signature" ? "Your wallet asks you to sign. No fee." : `Your wallet asks you to confirm on ${target}.`}
      actions={
        <>
          <Button size="xl" className={xl} disabled={!!short} onClick={actions.approve}>
            {req.kind === "signature" ? "Sign" : "Confirm and pay"}
          </Button>
          <Button hierarchy="secondary" size="xl" className={xl} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Rows rows={rowsOf(req)} />
      {short && <Banner tone="error">{short}</Banner>}
      {risk}
    </Sheet>
  );
}
