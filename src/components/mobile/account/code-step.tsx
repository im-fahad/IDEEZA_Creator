"use client";

// The six-digit code step, shared by Verify email (AU-12…12h) and Reset
// (AU-31…31e). No Verify button: the 6th digit sends it. Checking the code…,
// then the next step — or one line under the cells: the code didn't work, or
// it expired (Resend code). Five wrong codes lock the step for 10 minutes
// (an M01 alert counts down). Offline keeps the code and checks it on Try
// again. Resend waits 30 s after each code. The code itself comes from the
// prototype's Demo email (Open email app), as the web's Demo email does.

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Spinner } from "@/components/ideeza/spinner";
import { accountOf, normalizeEmail, readAccounts } from "@/lib/account/auth";
import { checkCode, clockOf, issueCode, readCode, resendWait, saveCode, useCode, type CodePurpose } from "@/lib/account/phone";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { CodeCells } from "../kit/code-cells";
import { Sheet } from "../kit/sheet";
import { useOnline } from "../kit/states";
import { AccountAlert, AccountHeading, type AlertSpec } from "./parts";
import { TEXT_LINK } from "../kit/bottom-bar";

type Phase = "typing" | "checking" | "wrong" | "expired" | "offline" | "done";

/** Now, ticking every second while something counts down. */
function useNow(ticking: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);
  return now;
}

const CHECK_MS = 700;

export function CodeStep({
  purpose,
  email,
  title,
  intro,
  change,
  doneLabel,
  offlineBody,
  onDone,
  inbox,
}: {
  purpose: CodePurpose;
  email: string;
  title: string;
  intro: React.ReactNode;
  /** "Wrong email? Change it" / "Use another email". */
  change: { label: string; onClick: () => void };
  /** The success line once the code is right ("Email verified"); none goes straight on. */
  doneLabel?: string;
  offlineBody: string;
  /** The code was right: go on. */
  onDone: () => void | Promise<void>;
  /** Opens the Demo email (the bar's "Open email app"). */
  inbox: { open: boolean; onClose: () => void };
}) {
  const e = normalizeEmail(email);
  const { hydrated, code } = useCode();
  const online = useOnline();
  const record = code && code.purpose === purpose && code.email === e ? code : null;
  const [value, setValue] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("typing");
  const now = useNow(true);

  // A code is sent on arrival when this step has none yet.
  React.useEffect(() => {
    if (hydrated && !record && e) issueCode(purpose, e, Date.now());
  }, [hydrated, record, e, purpose]);

  const locked = !!record && now < record.lockedUntil;
  const wait = record ? resendWait(record, now) : 0;

  const submit = (typed: string) => {
    if (!navigator.onLine) {
      setPhase("offline");
      return;
    }
    setPhase("checking");
    window.setTimeout(() => {
      const r = readCode();
      if (!r || r.purpose !== purpose || r.email !== e) {
        setPhase("wrong");
        return;
      }
      const out = checkCode(r, typed, Date.now());
      saveCode(out.record);
      if (out.result === "ok") {
        setPhase("done");
        void onDone();
      } else if (out.result === "locked") {
        setValue("");
        setPhase("typing");
      } else setPhase(out.result);
    }, CHECK_MS);
  };

  const change_ = (v: string) => {
    setValue(v);
    if (phase === "wrong" || phase === "expired" || phase === "offline") setPhase("typing");
    if (v.length === 6) submit(v);
  };

  const resend = () => {
    issueCode(purpose, e, Date.now());
    setValue("");
    setPhase("typing");
  };

  const alert: AlertSpec | null = locked
    ? { tone: "error", title: "Too many tries", body: `Try again in ${clockOf(record!.lockedUntil - now)}.` }
    : phase === "offline" || (!online && value.length === 6 && phase !== "done")
      ? {
          tone: "attention",
          title: "You’re offline",
          body: offlineBody,
          action: (
            <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => submit(value)}>
              Try again
            </button>
          ),
        }
      : null;

  const busy = phase === "checking" || phase === "done";
  return (
    <div className="flex flex-col gap-6">
      <AccountHeading title={title}>{intro}</AccountHeading>
      <AccountAlert alert={alert} />
      <div className="flex flex-col gap-2">
        <CodeCells
          value={locked ? "" : value}
          onChange={change_}
          invalid={phase === "wrong" || phase === "expired"}
          disabled={busy || locked}
          autoFocus
        />
        <p aria-live="polite" className="flex min-h-[18px] items-center gap-4 text-sm leading-sm">
          {phase === "checking" ? (
            <>
              <Spinner size={16} />
              <span className="text-text-secondary">Checking the code…</span>
            </>
          ) : phase === "done" && doneLabel ? (
            <>
              <span className="text-[color:var(--color-icon-success)]">
                <Icon icon={CheckmarkCircle02Icon} size={16} />
              </span>
              <span className="text-text-success">{doneLabel}</span>
            </>
          ) : phase === "wrong" ? (
            <span className="text-text-error">That code didn’t work. Check it and try again.</span>
          ) : phase === "expired" ? (
            <span className="text-text-error">This code has expired. Send a new one.</span>
          ) : null}
        </p>
      </div>
      {phase !== "done" && (
        <div className="flex flex-col items-start gap-2">
          {wait > 0 ? (
            <p className="text-sm leading-sm text-text-tertiary">Resend in {clockOf(wait)}</p>
          ) : (
            <button type="button" className={TEXT_LINK} onClick={resend}>
              Resend code
            </button>
          )}
          <button type="button" className={TEXT_LINK} onClick={change.onClick}>
            {change.label}
          </button>
        </div>
      )}
      <DemoInbox
        open={inbox.open}
        onClose={inbox.onClose}
        email={e}
        code={record && (purpose === "verify" || accountOf(readAccounts(), e)) ? record.code : null}
        onUse={(c) => {
          inbox.onClose();
          change_(c);
        }}
      />
    </div>
  );
}

/** Prototype only: the email the code would arrive in ("Open email app"). */
function DemoInbox({
  open,
  onClose,
  email,
  code,
  onUse,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
  code: string | null;
  onUse: (code: string) => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Demo email"
      description={`What ${email} would get. A real phone opens its email app.`}
      actions={
        code ? (
          <Button size="xl" className="w-full" onClick={() => onUse(code)}>
            Use this code
          </Button>
        ) : undefined
      }
    >
      <Badge tone="warning" className="self-start">
        Demo
      </Badge>
      {code ? (
        <div className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface-raised p-8">
          <p className="text-sm leading-sm text-text-tertiary">From IDEEZA · just now</p>
          <p className="text-lg font-semibold leading-lg text-text-primary">Your IDEEZA code</p>
          <p className="text-md leading-md text-text-secondary">Enter this code in the app. It works for 10 minutes.</p>
          <p className="text-4xl font-semibold leading-4xl tracking-widest text-text-primary tabular-nums">{code}</p>
        </div>
      ) : (
        <p className="text-md leading-md text-text-secondary">No email came. If an account exists for this address, the code is on its way.</p>
      )}
    </Sheet>
  );
}
