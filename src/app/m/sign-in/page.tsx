"use client";

// AU-05 · Sign in, with its states: empty fields on submit (05d), the email's
// form on leaving it (05e), one alert for wrong details (05f — never two
// errors at once), too many tries with a countdown (05g), email not verified
// → Send code (05h), offline with the input kept (05k). Suspended (05i) and
// session expired (05j) have no cause in this demo: `?demo=suspended|expired`
// shows them (the Shared kit links there). No Remember me; Face ID is offered
// once after the first sign-in (AU-08).

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading, type AlertSpec } from "@/components/mobile/account/parts";
import { TermsSheet } from "@/components/mobile/account/terms-sheet";
import { WayButton, useProviderSheet } from "@/components/mobile/account/ways-in";
import { BottomBar, SwitchLine, TEXT_LINK } from "@/components/mobile/kit/bottom-bar";
import { useOnline } from "@/components/mobile/kit/states";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { isEmail, signIn } from "@/lib/account/auth";
import {
  afterPhoneSignIn,
  afterRightSignIn,
  afterWrongSignIn,
  clockOf,
  issueCode,
  mobileNext,
  phoneAccountOf,
  readPhoneAccounts,
  readTries,
  saveTries,
  signInLockedFor,
} from "@/lib/account/phone";

type Outcome = null | "wrong" | "unverified" | "suspended";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const demo = params.get("demo");
  const ids = useFieldIds(["email", "password"] as const);
  const online = useOnline();
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [password, setPassword] = React.useState("");
  const [touched, setTouched] = React.useState({ email: false, submit: false });
  const [busy, setBusy] = React.useState(false);
  const [outcome, setOutcome] = React.useState<Outcome>(demo === "suspended" ? "suspended" : null);
  const [rules, setRules] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const { start, sheet } = useProviderSheet({ from: `/m/sign-in${next === "/m" ? "" : `?next=${encodeURIComponent(next)}`}`, next });

  // AU-05j: "the way you did last time" — the provider linked to this email, Apple when none is.
  const lastWay = (isEmail(email) && phoneAccountOf(readPhoneAccounts(), email).providers[0]) || "apple";
  const lockedFor = isEmail(email) ? signInLockedFor(readTries(), email, now) : 0;
  React.useEffect(() => {
    if (!lockedFor) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockedFor]);

  const emailError =
    touched.submit && !email.trim()
      ? "Enter your email."
      : (touched.email || touched.submit) && email.trim() && !isEmail(email)
        ? "Enter an email like name@example.com."
        : "";
  const passwordError = touched.submit && !password ? "Enter your password." : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, submit: true });
    if (!email.trim() || !isEmail(email) || !password || !online || lockedFor) return;
    if (demo === "suspended") return setOutcome("suspended");
    setBusy(true);
    const result = await signIn(email, password, Date.now(), next);
    if (result === "ok") {
      saveTries(afterRightSignIn(readTries(), email));
      afterPhoneSignIn();
      // Signing in brings the account's own work back: start the page again.
      window.location.replace(next);
      return;
    }
    setBusy(false);
    if (result === "wrong") {
      saveTries(afterWrongSignIn(readTries(), email, Date.now()));
      setNow(Date.now());
    }
    setOutcome(result === "unverified" ? "unverified" : result === "wrong" ? "wrong" : null);
  };

  const sendCode = () => {
    issueCode("verify", email, Date.now());
    router.push(`/m/verify${next === "/m" ? "" : `?next=${encodeURIComponent(next)}`}`);
  };

  const alert: AlertSpec | null = !online
    ? { tone: "attention", title: "You’re offline", body: "Your details are kept. Sign in when you’re back online." }
    : lockedFor
      ? { tone: "error", title: "Too many tries", body: `Try again in ${clockOf(lockedFor)}, or reset your password.` }
      : outcome === "wrong"
        ? { tone: "error", title: "Email or password is wrong", body: "Try again, or reset your password." }
        : outcome === "unverified"
          ? {
              tone: "attention",
              title: "Verify your email first",
              body: `We’ll send a 6-digit code to ${email.trim().toLowerCase()}.`,
              action: (
                <button type="button" className="font-medium hover:underline" onClick={sendCode}>
                  Send code
                </button>
              ),
            }
          : outcome === "suspended"
            ? {
                tone: "error",
                title: "This account is suspended",
                body: "It broke the community rules. If you think this is a mistake, write to support@ideeza.com.",
                action: (
                  <a href="mailto:support@ideeza.com" className="font-medium hover:underline">
                    Contact support
                  </a>
                ),
              }
            : demo === "expired"
              ? { tone: "info", title: "Your session expired", body: "Sign in again to go back where you were." }
              : null;

  const resetHref = `/m/reset?${new URLSearchParams({ ...(isEmail(email) ? { email: email.trim() } : {}), ...(next === "/m" ? {} : { next }) })}`;

  return (
    <Screen
      top={<TopBar back title="Sign in" />}
      footer={
        <BottomBar>
          <Button type="submit" form="sign-in" size="xl" className="w-full" loading={busy} disabled={!online || !!lockedFor}>
            Sign in
          </Button>
          <SwitchLine text="New to IDEEZA?" link="Create account" href={next === "/m" ? "/m/sign-up" : `/m/sign-up?next=${encodeURIComponent(next)}`} />
        </BottomBar>
      }
    >
      <form id="sign-in" noValidate onSubmit={submit} className={ACCOUNT_CONTENT}>
        <AccountHeading title="Welcome back" />
        <AccountAlert alert={alert} />
        <div className="flex flex-col gap-4">
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
              onValueChange={(v) => {
                setEmail(v);
                setOutcome(demo === "suspended" ? "suspended" : null);
              }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              {...errorProps(emailError, ids.email.errorId)}
            />
          </Field>
          <Field label="Password" htmlFor={ids.password.id} error={passwordError} errorId={ids.password.errorId}>
            <PasswordInput
              id={ids.password.id}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onValueChange={(v) => {
                setPassword(v);
                if (outcome === "wrong") setOutcome(null);
              }}
              {...errorProps(passwordError, ids.password.errorId)}
            />
          </Field>
          <div className="flex items-center justify-between">
            {outcome === "suspended" ? (
              <button type="button" className={TEXT_LINK} onClick={() => setRules(true)}>
                Read the rules
              </button>
            ) : (
              <span />
            )}
            <Link href={resetHref} className={TEXT_LINK}>
              Forgot password?
            </Link>
          </div>
        </div>
        {demo === "expired" && (
          <div className="flex flex-col gap-4">
            <p className="text-md font-medium leading-md text-text-secondary">Or continue the way you did last time</p>
            <WayButton way={lastWay} onClick={() => start(lastWay)} />
          </div>
        )}
      </form>
      <TermsSheet open={rules} onClose={() => setRules(false)} />
      {sheet}
    </Screen>
  );
}
