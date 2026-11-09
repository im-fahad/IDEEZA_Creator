"use client";

// AU-06 · Link accounts: the provider's email already has an account. Sign in
// to it once — with its password, or the way it signed in before — and the
// provider is linked, so either works from then on.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading } from "@/components/mobile/account/parts";
import { WayButton } from "@/components/mobile/account/ways-in";
import { BottomBar, TEXT_LINK } from "@/components/mobile/kit/bottom-bar";
import { useOnline } from "@/components/mobile/kit/states";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { providerSignIn, signIn } from "@/lib/account/auth";
import {
  PROVIDER_WORDS,
  afterPhoneSignIn,
  linkProvider,
  phoneAccountOf,
  readPhoneAccounts,
  readProviderAnswer,
  saveProviderAnswer,
  type Provider,
} from "@/lib/account/phone";

/** The time of an action (kept out of render, where reading the clock is impure). */
const clockNow = () => Date.now();

export default function LinkAccountsPage() {
  const router = useRouter();
  const online = useOnline();
  const [answer] = React.useState(readProviderAnswer);
  const ids = useFieldIds(["email", "password"] as const);
  const [password, setPassword] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [wrong, setWrong] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!answer) router.replace("/m/welcome");
  }, [answer, router]);
  if (!answer) return null;

  const before = phoneAccountOf(readPhoneAccounts(), answer.email);
  const done = (also?: Provider) => {
    linkProvider(answer.email, answer.provider);
    if (also) linkProvider(answer.email, also);
    afterPhoneSignIn();
    saveProviderAnswer(null);
    // Signed in with the account's own work: start the page again.
    window.location.replace(answer.next);
  };

  const linkWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!password || !online) return;
    setBusy(true);
    const result = await signIn(answer.email, password, clockNow());
    if (result === "ok") return done();
    setBusy(false);
    setWrong(true);
  };

  const linkWithProvider = async (p: Provider) => {
    if ((await providerSignIn(answer.email, { first: "", last: "" }, clockNow())) !== "refused") done(p);
  };

  const passwordError = tried && !password ? "Enter your password." : "";
  return (
    <Screen
      top={<TopBar back={answer.from} title="Link accounts" />}
      footer={
        before.passwordless ? undefined : (
          <BottomBar>
            <Button type="submit" form="link" size="xl" className="w-full" loading={busy} disabled={!online}>
              Link and sign in
            </Button>
          </BottomBar>
        )
      }
    >
      <form id="link" noValidate onSubmit={linkWithPassword} className={ACCOUNT_CONTENT}>
        <AccountHeading title="This email already has an account">
          Sign in once to link {PROVIDER_WORDS[answer.provider]}. Then you can use either.
        </AccountHeading>
        <AccountAlert
          alert={
            !online
              ? { tone: "attention", title: "You’re offline", body: "Your details are kept. Sign in when you’re back online." }
              : wrong
                ? { tone: "error", title: "Email or password is wrong", body: "Try again, or reset your password." }
                : null
          }
        />
        <div className="flex flex-col gap-4">
          <Field label="Email" htmlFor={ids.email.id}>
            <TextInput id={ids.email.id} size="xl" value={answer.email} readOnly />
          </Field>
          {!before.passwordless && (
            <>
              <Field label="Password" htmlFor={ids.password.id} error={passwordError} errorId={ids.password.errorId}>
                <PasswordInput
                  id={ids.password.id}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onValueChange={(v) => {
                    setPassword(v);
                    setWrong(false);
                  }}
                  {...errorProps(passwordError, ids.password.errorId)}
                />
              </Field>
              <div className="flex justify-end">
                <Link href={`/m/reset?email=${encodeURIComponent(answer.email)}`} className={TEXT_LINK}>
                  Forgot password?
                </Link>
              </div>
            </>
          )}
        </div>
        {before.providers.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-md font-medium leading-md text-text-secondary">Or sign in the way you did before</p>
            {before.providers.map((p) => (
              <WayButton key={p} way={p} onClick={() => void linkWithProvider(p)} />
            ))}
          </div>
        )}
      </form>
    </Screen>
  );
}
