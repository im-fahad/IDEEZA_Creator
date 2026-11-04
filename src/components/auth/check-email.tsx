"use client";

// Check your email: the Demo email stands in for the inbox. Verifying signs
// you in at once (Notion Part 1: no second sign-in), then the one question
// when the link didn't say where you came from, else Home.

import * as React from "react";
import { useRouter } from "next/navigation";
import { MailOpen01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { needsSourceQuestion, useAuth, verifyEmail } from "@/lib/account/auth";
import { AuthHeading, DemoEmail, FIELD_ERROR } from "./auth-parts";

export function CheckEmail() {
  const router = useRouter();
  const { hydrated, account, signedIn } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const [resent, setResent] = React.useState(0);

  React.useEffect(() => {
    if (!hydrated || busy) return;
    if (!account) router.replace("/sign-up");
    else if (account.verifiedAt !== null) router.replace(signedIn ? "/" : "/sign-in");
  }, [hydrated, account, signedIn, busy, router]);

  if (!hydrated || !account || account.verifiedAt !== null) return null;

  const verify = () => {
    setBusy(true);
    if (!verifyEmail(Date.now()).ok) {
      setBusy(false);
      setRefused(true);
      return;
    }
    router.replace(needsSourceQuestion(account) ? "/sign-up/welcome" : "/");
  };

  return (
    <>
      <AuthHeading title="Check your email" icon={MailOpen01Icon}>
        We sent a link to <strong className="font-semibold text-text-primary">{account.email}</strong>. Open it to verify your
        email, and you&apos;re in.
      </AuthHeading>
      <DemoEmail
        key={resent}
        subject="Verify your email"
        action={
          <Button hierarchy="primary" size="xl" loading={busy} onClick={verify} className="w-full">
            Verify email
          </Button>
        }
      >
        Hi {account.firstName}, confirm this is your email to finish creating your IDEEZA account.
      </DemoEmail>
      {refused ? (
        <p role="alert" className={FIELD_ERROR}>
          This browser wouldn&apos;t save that. Check that it allows this site to store data, then try again.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-[4px] gap-y-[2px]">
        <p className="m-0 text-md leading-md text-text-secondary">Didn&apos;t get it?</p>
        <Button hierarchy="ghost" size="md" onClick={() => setResent((n) => n + 1)}>
          Send it again
        </Button>
        <p aria-live="polite" className="m-0 basis-full text-sm leading-sm text-text-tertiary">
          {resent ? "Sent again. It's the email above." : ""}
        </p>
      </div>
    </>
  );
}
