"use client";

// Sign in, and Forgot password on the same page: the reset link arrives as a
// Demo email, and setting the new password signs you in.

import * as React from "react";
import { useRouter } from "next/navigation";
import { MailOpen01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import {
  EMAIL_MAX,
  PASSWORD_MAX,
  isEmail,
  normalizeEmail,
  passwordProblem,
  resetPassword,
  signIn,
  useAuth,
} from "@/lib/account/auth";
import { AuthHeading, DemoEmail, FIELD_ERROR, Field, PasswordInput, errorProps, useFieldIds } from "./auth-parts";

type Mode = "sign-in" | "forgot" | "sent" | "new";

const REFUSED = "This browser wouldn't save that. Check that it allows this site to store data, then try again.";
const KEYS = ["email", "password", "confirm"] as const;

const textLink =
  "cursor-pointer rounded-sm border-0 bg-transparent p-0 text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:shadow-focus-brand";

export function SignInForm() {
  const router = useRouter();
  const { hydrated, account, signedIn } = useAuth();
  const ids = useFieldIds(KEYS);
  const [mode, setMode] = React.useState<Mode>("sign-in");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated || busy) return;
    if (signedIn) router.replace("/");
    else if (!account) router.replace("/sign-up");
  }, [hydrated, account, signedIn, busy, router]);

  if (!hydrated || signedIn || !account) return null;

  const go = (next: Mode) => {
    setMode(next);
    setPassword("");
    setConfirm("");
    setError("");
    setShown(false);
  };

  const emailError = shown && !isEmail(email) ? (email.trim() ? "Enter an email like name@example.com." : "Enter your email.") : undefined;

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setShown(true);
    setError("");
    if (!isEmail(email)) return document.getElementById(ids.email.id)?.focus();
    if (!password) return document.getElementById(ids.password.id)?.focus();
    setBusy(true);
    const result = await signIn(email, password, Date.now());
    if (result === "ok") return router.replace("/");
    setBusy(false);
    if (result === "unverified") return router.push("/sign-up/check-email");
    setError(result === "refused" ? REFUSED : "That email and password don't match.");
  };

  const submitForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setShown(true);
    if (!isEmail(email)) return document.getElementById(ids.email.id)?.focus();
    go("sent");
  };

  const pwError = shown ? passwordProblem(password) || undefined : undefined;
  const confirmError = shown ? (!confirm ? "Type the password again." : confirm !== password ? "The passwords don't match." : undefined) : undefined;

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setShown(true);
    if (passwordProblem(password)) return document.getElementById(ids.password.id)?.focus();
    if (confirm !== password) return document.getElementById(ids.confirm.id)?.focus();
    setBusy(true);
    if ((await resetPassword(password, Date.now())).ok) return router.replace("/");
    setBusy(false);
    setError(REFUSED);
  };

  const emailField = (
    <Field label="Email" htmlFor={ids.email.id} error={emailError} errorId={ids.email.errorId}>
      <TextInput
        id={ids.email.id}
        size="xl"
        type="email"
        inputMode="email"
        value={email}
        onValueChange={setEmail}
        maxLength={EMAIL_MAX}
        autoComplete="email"
        spellCheck={false}
        autoCapitalize="none"
        {...errorProps(emailError, ids.email.errorId)}
      />
    </Field>
  );

  const backToSignIn = (
    <div>
      <Button hierarchy="ghost" size="md" onClick={() => go("sign-in")}>
        Back to sign in
      </Button>
    </div>
  );

  if (mode === "forgot") {
    return (
      <>
        <AuthHeading title="Reset your password">Enter your account&apos;s email and we&apos;ll send you a link to set a new one.</AuthHeading>
        <form noValidate onSubmit={submitForgot} className="flex flex-col gap-[16px]">
          {emailField}
          <Button type="submit" hierarchy="primary" size="xl" className="mt-[8px] w-full">
            Send link
          </Button>
        </form>
        {backToSignIn}
      </>
    );
  }

  if (mode === "sent") {
    const match = normalizeEmail(email) === account.email;
    return (
      <>
        <AuthHeading title="Check your email" icon={MailOpen01Icon}>
          If an account uses <strong className="font-semibold text-text-primary">{normalizeEmail(email)}</strong>, a link to reset
          its password is on its way.
        </AuthHeading>
        {match ? (
          <DemoEmail
            subject="Reset your password"
            action={
              <Button hierarchy="primary" size="xl" onClick={() => go("new")} className="w-full">
                Set a new password
              </Button>
            }
          >
            Hi {account.firstName}, someone asked to reset your IDEEZA password. If it was you, set a new one.
          </DemoEmail>
        ) : null}
        {backToSignIn}
      </>
    );
  }

  if (mode === "new") {
    return (
      <>
        <AuthHeading title="Set a new password">You&apos;ll be signed in as soon as it&apos;s saved.</AuthHeading>
        <form noValidate onSubmit={submitNew} className="flex flex-col gap-[16px]">
          <Field label="New password" htmlFor={ids.password.id} error={pwError} errorId={ids.password.errorId}>
            <PasswordInput
              id={ids.password.id}
              value={password}
              onValueChange={setPassword}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...errorProps(pwError, ids.password.errorId)}
            />
          </Field>
          <Field label="Confirm password" htmlFor={ids.confirm.id} error={confirmError} errorId={ids.confirm.errorId}>
            <PasswordInput
              id={ids.confirm.id}
              value={confirm}
              onValueChange={setConfirm}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              {...errorProps(confirmError, ids.confirm.errorId)}
            />
          </Field>
          {error ? (
            <p role="alert" className={FIELD_ERROR}>
              {error}
            </p>
          ) : null}
          <Button type="submit" hierarchy="primary" size="xl" loading={busy} className="mt-[8px] w-full">
            Save and sign in
          </Button>
        </form>
      </>
    );
  }

  const pwMissing = shown && isEmail(email) && !password ? "Enter your password." : undefined;
  return (
    <>
      <AuthHeading title="Welcome back">Sign in to pick up where you left off.</AuthHeading>
      <form noValidate onSubmit={submitSignIn} className="flex flex-col gap-[16px]">
        {emailField}
        <Field
          label="Password"
          htmlFor={ids.password.id}
          error={pwMissing}
          errorId={ids.password.errorId}
          aside={
            <button type="button" className={textLink} onClick={() => go("forgot")}>
              Forgot password?
            </button>
          }
        >
          <PasswordInput
            id={ids.password.id}
            value={password}
            onValueChange={setPassword}
            maxLength={PASSWORD_MAX}
            autoComplete="current-password"
            {...errorProps(pwMissing, ids.password.errorId)}
          />
        </Field>
        {error ? (
          <p role="alert" className={FIELD_ERROR}>
            {error}
          </p>
        ) : null}
        <Button type="submit" hierarchy="primary" size="xl" loading={busy} className="mt-[8px] w-full">
          Sign in
        </Button>
      </form>
    </>
  );
}
