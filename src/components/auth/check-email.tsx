"use client";

// Check your email: the Demo email stands in for the inbox. Verifying signs
// you in at once (Notion Part 1: no second sign-in), then the one question
// when the link didn't say where you came from, else Home. "Wrong email?"
// drops the unverified account and goes back to Sign up with the names and
// the email filled in, to fix it.

import * as React from "react";
import { useRouter } from "next/navigation";
import { MailOpen01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { discardUnverified, needsSourceQuestion, signedOutHome, useAuth, verifyEmail } from "@/lib/account/auth";
import { AuthHeading, DemoEmail, FIELD_ERROR } from "./auth-parts";

export function CheckEmail() {
  const router = useRouter();
  const { hydrated, accounts, waiting, signedIn } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const [resent, setResent] = React.useState(0);

  React.useEffect(() => {
    if (!hydrated || busy || waiting) return;
    router.replace(signedIn ? "/" : signedOutHome(accounts));
  }, [hydrated, waiting, signedIn, accounts, busy, router]);

  if (!hydrated || !waiting) return null;

  const verify = () => {
    setBusy(true);
    if (!verifyEmail(Date.now()).ok) {
      setBusy(false);
      setRefused(true);
      return;
    }
    router.replace(needsSourceQuestion(waiting) ? "/sign-up/welcome" : "/");
  };

  const changeEmail = () => {
    setBusy(true);
    const back = new URLSearchParams({ email: waiting.email, first: waiting.firstName, last: waiting.lastName });
    if (!discardUnverified().ok) {
      setBusy(false);
      setRefused(true);
      return;
    }
    router.replace(`/sign-up?${back.toString()}`);
  };

  return (
    <>
      <AuthHeading title="Check your email" icon={MailOpen01Icon}>
        We sent a link to <strong className="font-semibold text-text-primary">{waiting.email}</strong>. Open it to verify your
        email, and you&apos;re in.
      </AuthHeading>
      <DemoEmail
        key={resent}
        subject="Verify your email"
        action={
          <Button hierarchy="ai" size="xl" loading={busy} onClick={verify} className="w-full">
            Verify email
          </Button>
        }
      >
        Hi {waiting.firstName}, confirm this is your email to finish creating your IDEEZA account.
      </DemoEmail>
      {refused ? (
        <p role="alert" className={FIELD_ERROR}>
          This browser wouldn&apos;t save that. Check that it allows this site to store data, then try again.
        </p>
      ) : null}
      <div className="flex flex-col gap-[4px]">
        <div className="flex flex-wrap items-center gap-x-[4px]">
          <p className="m-0 text-md leading-md text-text-secondary">Didn&apos;t get it?</p>
          <Button hierarchy="ghost" size="md" onClick={() => setResent((n) => n + 1)}>
            Send it again
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-[4px]">
          <p className="m-0 text-md leading-md text-text-secondary">Wrong email?</p>
          <Button hierarchy="ghost" size="md" onClick={changeEmail} disabled={busy}>
            Change it
          </Button>
        </div>
        <p aria-live="polite" className="m-0 text-sm leading-sm text-text-tertiary">
          {resent ? "Sent again. It's the email above." : ""}
        </p>
      </div>
    </>
  );
}
