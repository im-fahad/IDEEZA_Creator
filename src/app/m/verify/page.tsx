"use client";

// AU-12 · Verify email: the 6-digit code for the account waiting for its
// email (Create account, or Sign in → Send code). Email verified (12h), then
// Name and handle (AU-13) unless the account already has a handle.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { CodeStep } from "@/components/mobile/account/code-step";
import { ACCOUNT_CONTENT } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { discardUnverified, useAuth, verifyEmail } from "@/lib/account/auth";
import { afterPhoneSignIn, mobileNext } from "@/lib/account/phone";
import { readProfileFields } from "@/lib/people/profile-store";

export default function VerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const { waiting } = useAuth();
  const [inbox, setInbox] = React.useState(false);
  // Kept once the code is right: verifying ends the wait, and the page must not
  // take that for "nothing to verify" while it goes on to Name and handle.
  const [email, setEmail] = React.useState<string | null>(null);
  const shown = waiting?.email ?? email;

  React.useEffect(() => {
    if (!waiting && !email) router.replace("/m/sign-up");
  }, [waiting, email, router]);
  if (!shown) return null;

  const verified = async () => {
    setEmail(shown);
    if (!(await verifyEmail(Date.now())).ok) return;
    afterPhoneSignIn();
    const after = readProfileFields().handle ? next : `/m/handle${next === "/m" ? "" : `?next=${encodeURIComponent(next)}`}`;
    // Verifying signs the account in with its own work: start the page again.
    window.setTimeout(() => window.location.replace(after), 600);
  };

  return (
    <Screen
      top={<TopBar back title="" />}
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
          purpose="verify"
          email={shown}
          title="Check your email"
          intro={`We sent a 6-digit code to ${shown}.`}
          change={{
            label: "Wrong email? Change it",
            onClick: () => {
              discardUnverified();
              router.replace(next === "/m" ? "/m/sign-up" : `/m/sign-up?next=${encodeURIComponent(next)}`);
            },
          }}
          doneLabel="Email verified"
          offlineBody="Check your connection. The code is kept."
          onDone={verified}
          inbox={{ open: inbox, onClose: () => setInbox(false) }}
        />
      </div>
    </Screen>
  );
}
