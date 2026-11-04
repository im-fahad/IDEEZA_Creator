"use client";

// AU-30…33 · Reset password, one flow, email only (P2-AU-16):
// 1. the email (prefilled from Sign in), Send code — sending, offline, the
//    email's form (30–30d);
// 2. the code, in neutral words ("If an account exists…"), sent on to the
//    next step by its 6th digit (31–31e);
// 3. a new password with the checklist, not the current one, Sign out of
//    other devices on by default (32–32e);
// then signed in where they were, with "Password reset" (AU-33).

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { CodeStep } from "@/components/mobile/account/code-step";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading, PasswordChecklist } from "@/components/mobile/account/parts";
import { CheckRow } from "@/components/mobile/account/ways-in";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { useOnline } from "@/components/mobile/kit/states";
import { toastAfterReload } from "@/components/mobile/kit/toast";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { isCurrentPassword, isEmail, resetPassword } from "@/lib/account/auth";
import { afterPhoneSignIn, issueCode, mobileNext, phonePasswordProblem } from "@/lib/account/phone";

type Step = "email" | "code" | "password";
const SENDING_MS = 600;

export default function ResetPage() {
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const online = useOnline();
  const ids = useFieldIds(["email", "password", "confirm", "rules"] as const);
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [emailLeft, setEmailLeft] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [inbox, setInbox] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [confirmLeft, setConfirmLeft] = React.useState(false);
  const [same, setSame] = React.useState(false);
  const [signOutOthers, setSignOutOthers] = React.useState(true);

  const emailError = emailLeft && !isEmail(email) ? (email.trim() ? "Enter an email like name@example.com." : "Enter your email.") : "";

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLeft(true);
    if (!isEmail(email) || !online) return;
    setBusy(true);
    window.setTimeout(() => {
      // Sent whether or not an account has this email; only an account's owner gets it.
      issueCode("reset", email, Date.now());
      setBusy(false);
      setStep("code");
    }, SENDING_MS);
  };

  const confirmError = confirmLeft && confirm && confirm !== password ? "Passwords don’t match." : "";
  const valid = !phonePasswordProblem(password) && confirm === password;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !online || busy) return;
    setBusy(true);
    if (await isCurrentPassword(email, password)) {
      setBusy(false);
      return setSame(true);
    }
    if (!(await resetPassword(email, password, Date.now(), phonePasswordProblem)).ok) return setBusy(false);
    afterPhoneSignIn();
    toastAfterReload("Password reset");
    // Signed in with the account's own work: start the page again where they were.
    window.location.replace(next);
  };

  if (step === "code") {
    return (
      <Screen
        top={<TopBar back title="Reset password" />}
        footer={
          <BottomBar>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setInbox(true)}>
              Open email app
            </Button>
          </BottomBar>
        }
      >
        <div className={ACCOUNT_CONTENT}>
          <CodeStep
            purpose="reset"
            email={email}
            title="Enter the code"
            intro={`If an account exists for ${email.trim().toLowerCase()}, we sent a 6-digit code.`}
            change={{ label: "Use another email", onClick: () => setStep("email") }}
            offlineBody="The code is kept. We’ll check it when you’re back online."
            onDone={() => setStep("password")}
            inbox={{ open: inbox, onClose: () => setInbox(false) }}
          />
        </div>
      </Screen>
    );
  }

  if (step === "password") {
    return (
      <Screen
        top={<TopBar back title="Reset password" />}
        footer={
          <BottomBar>
            <Button type="submit" form="new-password" size="xl" className="w-full" loading={busy} disabled={!valid || !online}>
              Reset password
            </Button>
          </BottomBar>
        }
      >
        <form id="new-password" noValidate onSubmit={save} className={ACCOUNT_CONTENT}>
          <AccountHeading title="Create a new password">Use it the next time you sign in.</AccountHeading>
          <AccountAlert
            alert={online ? null : { tone: "attention", title: "You’re offline", body: "Your new password is kept. Reset it when you’re back online." }}
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Field
                label="New password"
                htmlFor={ids.password.id}
                error={same ? "That’s your current password. Choose a new one." : ""}
                errorId={ids.password.errorId}
              >
                <PasswordInput
                  id={ids.password.id}
                  autoComplete="new-password"
                  value={password}
                  onValueChange={(v) => {
                    setPassword(v);
                    setSame(false);
                  }}
                  aria-describedby={ids.rules.id}
                  {...errorProps(same ? "same" : "", ids.password.errorId)}
                />
              </Field>
              <PasswordChecklist password={password} id={ids.rules.id} />
            </div>
            <Field label="Re-type password" htmlFor={ids.confirm.id} error={confirmError} errorId={ids.confirm.errorId}>
              <PasswordInput
                id={ids.confirm.id}
                autoComplete="new-password"
                placeholder="Type it again"
                value={confirm}
                onValueChange={setConfirm}
                onBlur={() => setConfirmLeft(true)}
                {...errorProps(confirmError, ids.confirm.errorId)}
              />
            </Field>
          </div>
          <CheckRow checked={signOutOthers} onChange={() => setSignOutOthers((v) => !v)}>
            Sign out of other devices
          </CheckRow>
        </form>
      </Screen>
    );
  }

  return (
    <Screen
      top={<TopBar back title="Reset password" />}
      footer={
        <BottomBar>
          <Button type="submit" form="reset-email" size="xl" className="w-full" loading={busy} disabled={!online}>
            Send code
          </Button>
        </BottomBar>
      }
    >
      <form id="reset-email" noValidate onSubmit={send} className={ACCOUNT_CONTENT}>
        <AccountHeading title="Reset your password">Enter your account email. We’ll send a 6-digit code.</AccountHeading>
        <AccountAlert alert={online ? null : { tone: "attention", title: "You’re offline", body: "Send the code when you’re back online." }} />
        <Field label="Email" htmlFor={ids.email.id} error={emailError} errorId={ids.email.errorId}>
          <TextInput
            id={ids.email.id}
            size="xl"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="name@example.com"
            value={email}
            onValueChange={setEmail}
            onBlur={() => email && setEmailLeft(true)}
            {...errorProps(emailError, ids.email.errorId)}
          />
        </Field>
      </form>
    </Screen>
  );
}
