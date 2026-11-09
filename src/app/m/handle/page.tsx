"use client";

// AU-13 · Name and handle, after the email is verified (or a provider made the
// account). The name is any script; the handle follows the web's rules and
// words (lib/people/handle.ts, ids.ts): Checking… (13), Available (13b), taken
// with three suggestions (13c), the format error (13d). Continue saves both
// to the account and the profile, then the optional profile steps.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { Spinner } from "@/components/ideeza/spinner";
import { Tag } from "@/components/ideeza/tag";
import { TextInput } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountHeading, AccountAlert } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { saveAccountName, useAuth } from "@/lib/account/auth";
import { handleBaseOf, handleSuggestions, mobileNext } from "@/lib/account/phone";
import { NAME_MAX } from "@/lib/people/fields";
import { HANDLE_MAX, cleanHandle } from "@/lib/people/handle";
import { handleProblem } from "@/lib/people/ids";
import { readProfileFields, saveProfile } from "@/lib/people/profile-store";

const CHECK_MS = 400;
const PREFIX = "ideeza.com/creators/";

export default function HandlePage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const { account } = useAuth();
  const ids = useFieldIds(["name", "handle"] as const);
  const [name, setName] = React.useState(() => {
    const fromAccount = account ? `${account.firstName} ${account.lastName}`.trim() : "";
    return fromAccount || readProfileFields().name;
  });
  // Follows the name (rafi-ahmed) until they type a handle of their own.
  const [own, setOwn] = React.useState<string | null>(() => readProfileFields().handle || null);
  const handle = own ?? handleBaseOf(name);
  const setHandle = (h: string) => setOwn(h);
  const [checked, setChecked] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  // "Checking…" while typing settles, then the answer.
  React.useEffect(() => {
    const id = window.setTimeout(() => setChecked(cleanHandle(handle)), CHECK_MS);
    return () => window.clearTimeout(id);
  }, [handle]);

  const clean = cleanHandle(handle);
  const checking = checked !== clean;
  // Nothing typed yet is not an error (errors show once there is something to judge).
  const problem = checking || !clean ? null : handleProblem(clean);
  const taken = problem === "Another creator has this handle. Try another.";
  const ok = !checking && !!clean && !problem && !!name.trim();

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const [first = "", ...rest] = name.trim().split(/\s+/);
    const saved = saveAccountName(first, rest.join(" ")).ok && saveProfile({ name: name.trim(), handle: clean }).ok;
    if (!saved) return setFailed(true);
    router.push(`/m/setup?step=1${next === "/m" ? "" : `&next=${encodeURIComponent(next)}`}`);
  };

  return (
    <Screen
      top={<TopBar back title="Name and handle" />}
      footer={
        <BottomBar>
          <Button type="submit" form="handle" size="xl" className="w-full" disabled={!ok}>
            Continue
          </Button>
        </BottomBar>
      }
    >
      <form id="handle" noValidate onSubmit={go} className={ACCOUNT_CONTENT}>
        <AccountHeading title="Choose your handle">Your profile’s address. You can change it later in Settings.</AccountHeading>
        <AccountAlert alert={failed ? { tone: "error", title: "Couldn’t save", body: "Your name and handle are kept. Try again." } : null} />
        <div className="flex flex-col gap-4">
          <Field label="Name" htmlFor={ids.name.id}>
            <TextInput
              id={ids.name.id}
              size="xl"
              autoComplete="name"
              maxLength={NAME_MAX}
              value={name}
              onValueChange={setName}
              aria-describedby={`${ids.name.id}-help`}
            />
            <p id={`${ids.name.id}-help`} className="text-sm leading-sm text-text-tertiary">
              Any script. This is the name other creators see.
            </p>
          </Field>
          <div className="flex flex-col gap-2">
            <Field label="Handle" htmlFor={ids.handle.id}>
              <TextInput
                id={ids.handle.id}
                size="xl"
                prefixText={PREFIX}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={HANDLE_MAX + 5}
                value={handle}
                onValueChange={setHandle}
                invalid={!!problem}
                aria-invalid={!!problem || undefined}
                aria-describedby={ids.handle.errorId}
              />
            </Field>
            <p id={ids.handle.errorId} aria-live="polite" className="flex min-h-[18px] items-center gap-4 text-sm leading-sm">
              {!clean ? null : checking ? (
                <>
                  <Spinner size={16} />
                  <span className="text-text-secondary">Checking…</span>
                </>
              ) : problem ? (
                <span className="text-text-error">{problem}</span>
              ) : (
                <>
                  <span className="text-[color:var(--color-icon-success)]">
                    <Icon icon={CheckmarkCircle02Icon} size={16} />
                  </span>
                  <span className="text-text-success">
                    Available: {PREFIX}
                    {clean}
                  </span>
                </>
              )}
            </p>
          </div>
          {taken && (
            <div className="flex flex-wrap gap-4" aria-label="Free handles">
              {handleSuggestions(name, clean).map((s) => (
                <Tag key={s} size="md" onClick={() => setHandle(s)}>
                  {s}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </form>
    </Screen>
  );
}
