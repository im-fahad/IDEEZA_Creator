"use client";

// AU-04e · Add your email: Facebook shared none, and receipts and sign-in
// codes need one. Continue goes back to "Signing you in" with it.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountHeading } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { isEmail } from "@/lib/account/auth";
import { PROVIDER_WORDS, readProviderAnswer, saveProviderAnswer } from "@/lib/account/phone";

export default function AddEmailPage() {
  const router = useRouter();
  const [answer] = React.useState(readProviderAnswer);
  const ids = useFieldIds(["email"] as const);
  const [email, setEmail] = React.useState("");
  const [tried, setTried] = React.useState(false);

  React.useEffect(() => {
    if (!answer) router.replace("/m/welcome");
  }, [answer, router]);
  if (!answer) return null;

  const error = tried ? (!email.trim() ? "Enter your email." : !isEmail(email) ? "Enter an email like name@example.com." : "") : "";
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!isEmail(email)) return;
    saveProviderAnswer({ ...answer, email });
    router.replace("/m/signing-in");
  };

  return (
    <Screen
      top={<TopBar back={answer.from} title="" />}
      footer={
        <BottomBar>
          <Button type="submit" form="add-email" size="xl" className="w-full">
            Continue
          </Button>
        </BottomBar>
      }
    >
      <form id="add-email" noValidate onSubmit={go} className={ACCOUNT_CONTENT}>
        <AccountHeading title="Add your email">
          {PROVIDER_WORDS[answer.provider]} didn’t share one. We send receipts and sign-in codes here.
        </AccountHeading>
        <Field label="Email" htmlFor={ids.email.id} error={error} errorId={ids.email.errorId}>
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
            onBlur={() => email && setTried(true)}
            {...errorProps(error, ids.email.errorId)}
          />
        </Field>
      </form>
    </Screen>
  );
}
