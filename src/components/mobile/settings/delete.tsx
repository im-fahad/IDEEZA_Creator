"use client";

// Delete account, in four steps (Account · 2026 update, AU-60…64):
// 1 why you're leaving (optional, Continue always on; "Need a pause? Take a
//   break instead");
// 2 what you'll lose, with this account's real counts (projects and how many
//   are shared, minted NFTs, live listings, IDZ, plan and credits, messages);
//   AU-61b: blocked while money is moving (a withdrawal not complete yet, a
//   bid on a live auction);
// 3 keep a copy (Download your information, made at once on the phone);
// 4 confirm it's you (the password; Apple, Google or Facebook once more for
//   an account with no password) — wrong, deleting, couldn't (offline).
// Then AU-64: deletion scheduled for 30 days; live listings come down now;
// Done signs out to Welcome. Signing in before the date offers Restore
// (AU-65, restore.tsx).

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { useMakerIdz } from "@/components/balance/use-maker-idz";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Textarea } from "@/components/ideeza/text-input";
import { isCurrentPassword, useAuth } from "@/lib/account/auth";
import { PROVIDER_WORDS, phoneAccountOf, usePhoneAccounts, type Provider } from "@/lib/account/phone";
import { usePayout } from "@/lib/account/use-payout";
import { creditTotals } from "@/lib/account/summary";
import { DELETE_GRACE_MS, LEAVE_NOTE_MAX, LEAVE_REASONS, scheduleDeletion, updateSecurity, useSecurity } from "@/lib/account/security";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { removeListing } from "@/lib/market/listing";
import { readMarketNow, useMarket, writeListings } from "@/lib/market/market-store";
import type { Listing } from "@/lib/market/types";
import { useManualProjects } from "@/lib/manual/projects";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading } from "../account/parts";
import { WayButton } from "../account/ways-in";
import { BottomBar, TEXT_LINK } from "../kit/bottom-bar";
import { Sheet } from "../kit/sheet";
import { useOnline } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { DownloadStatus, useDownload } from "./data-download";
import { useSessionAt } from "./security";
import { signOutToWelcome } from "./sign-out";

const STEPS = ["Why you’re leaving", "What you’ll lose", "Keep a copy", "Confirm it’s you"] as const;
const OPEN = new Set<Listing["status"]>(["live", "paused"]);

/** What deleting takes away, and what has to settle first. */
function useWhatYouLose() {
  const { hydrated: projectsRead, projects } = useManualProjects();
  const { hydrated: marketRead, data } = useMarket();
  const { hydrated: planRead, plan, sub } = useCreatePlan();
  const { hydrated: creditsRead, ledger } = useCredits();
  const payout = usePayout();
  const idz = useMakerIdz();
  return React.useMemo(() => {
    const mine = new Map(projects.map((p) => [p.id, p]));
    const listings = data.listings.filter((l) => mine.has(l.projectId) && OPEN.has(l.status));
    const bidOn = listings.filter((l) => l.type === "auction" && data.bids.some((b) => b.listingId === l.id));
    const moving = [
      ...(payout?.withdrawals ?? [])
        .filter((w) => w.status !== "complete")
        .map((w) => ({ label: "Pending payout", value: `${Number(w.amount).toLocaleString("en-US")} ${w.token}` })),
      ...bidOn.map((l) => ({ label: "Open bid", value: mine.get(l.projectId)?.name.trim() || "Untitled project" })),
    ];
    return {
      ready: projectsRead && marketRead && planRead && creditsRead && payout !== undefined && idz.read,
      projects: projects.length,
      shared: projects.filter((p) => typeof p.showcasedAt === "number").length,
      minted: projects.filter((p) => p.mint).length,
      listings,
      idz: idz.connected && idz.idz !== null ? Number(idz.idz) : null,
      plan: plan.name,
      paid: sub.tier !== "free",
      credits: creditTotals(ledger).remaining,
      moving,
    };
  }, [projects, data, plan, sub.tier, ledger, payout, idz, projectsRead, marketRead, planRead, creditsRead]);
}

/** Live and paused listings of the account's projects come down now (AU-64 "listings taken down"). */
function takeDownListings(ids: string[]): void {
  let all = readMarketNow().listings;
  const now = Date.now();
  for (const id of ids) {
    const r = removeListing(all, id, now);
    if (r.ok) all = r.listings;
  }
  writeListings(all);
}

export function DeleteAccount() {
  const router = useRouter();
  const params = useSearchParams();
  const online = useOnline();
  const dates = useDates();
  const { account } = useAuth();
  const email = account?.email ?? "";
  const phone = phoneAccountOf(usePhoneAccounts(), email);
  const { security } = useSecurity(email);
  const sessionAt = useSessionAt();
  const lose = useWhatYouLose();
  const dl = useDownload();
  const ids = useFieldIds(["note", "password"] as const);
  // Each step is its own address, so Back goes to the step before; a step not reached yet opens step 1.
  const [reached, setReached] = React.useState(1);
  const step = Math.min(reached, Math.max(1, Math.min(4, Number(params.get("step")) || 1)));
  const go = (n: number) => {
    setReached((r) => Math.max(r, n));
    router.push(`/m/settings/delete?step=${n}`);
  };
  const [reason, setReason] = React.useState("");
  const [note, setNote] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [wrong, setWrong] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [reauth, setReauth] = React.useState(false);
  const [vouched, setVouched] = React.useState(false);
  const [now] = React.useState(() => Date.now());
  const scheduled = security.deletion && security.deletion.at >= sessionAt ? security.deletion : null;
  const until = dates.date((scheduled?.until ?? now + DELETE_GRACE_MS), { style: "medium" });
  const provider: Provider | undefined = phone.passwordless ? phone.providers[0] : undefined;

  if (scheduled) {
    const day = dates.date(scheduled.until, { style: "day" });
    const rows: [string, string][] = [
      ["Now", lose.listings.length ? "Hidden · listings taken down" : "Hidden"],
      [`Until ${day}`, "Sign in to restore it"],
      [`After ${day}`, "Deleted for good"],
    ];
    return (
      <Screen
        footer={
          <BottomBar>
            <Button size="xl" className="w-full" onClick={() => void signOutToWelcome()}>
              Done
            </Button>
          </BottomBar>
        }
      >
        <div className={`${ACCOUNT_CONTENT} pt-12`}>
          <AccountHeading title={`Your account will be deleted on ${until}`}>
            Signing in as {email} before then restores it.
          </AccountHeading>
          <dl className="flex flex-col">
            {rows.map(([term, value]) => (
              <div key={term} className="flex items-center justify-between gap-6 px-6 py-6">
                <dt className="text-md leading-md text-text-secondary">{term}</dt>
                <dd className="text-right text-md leading-md text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Screen>
    );
  }

  const confirmable = provider ? vouched : !!password;

  const remove = async () => {
    if (!online) return setFailed(true);
    if (!confirmable || busy) return;
    setBusy(true);
    setFailed(false);
    if (!provider && !(await isCurrentPassword(email, password))) {
      setBusy(false);
      return setWrong(true);
    }
    const why = [LEAVE_REASONS.find((r) => r.id === reason)?.label, note.trim()].filter(Boolean).join(" · ");
    if (!updateSecurity(email, (s) => scheduleDeletion(s, Date.now(), why)).ok) {
      setBusy(false);
      return setFailed(true);
    }
    takeDownListings(lose.listings.map((l) => l.id));
    setBusy(false);
  };

  const footer =
    step === 4 ? (
      <BottomBar>
        <Button hierarchy="danger" size="xl" className="w-full" loading={busy} disabled={!confirmable} onClick={remove}>
          Delete account
        </Button>
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => router.replace("/m/settings/security")}>
          Keep my account
        </Button>
      </BottomBar>
    ) : (
      <BottomBar>
        <Button
          size="xl"
          className="w-full"
          disabled={(step === 2 && (!lose.ready || lose.moving.length > 0)) || (step === 3 && !!dl.busy)}
          onClick={() => go(step + 1)}
        >
          {step === 3 && !dl.made ? "Continue without a copy" : "Continue"}
        </Button>
      </BottomBar>
    );

  return (
    <Screen top={<TopBar back={step === 1 ? "/m/settings/security" : true} title="Delete account" />} footer={footer}>
      <div className={ACCOUNT_CONTENT}>
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-sm text-text-secondary">
            Step {step} of 4 · {STEPS[step - 1]}
          </p>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <ProgressBar key={s} value={i < step ? 100 : 0} label={`Step ${i + 1}: ${s}`} className="flex-1" />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <AccountHeading title="Why are you leaving?">Optional. It helps us make IDEEZA better.</AccountHeading>
            <div role="radiogroup" aria-label="Why are you leaving?" className="flex flex-col">
              {LEAVE_REASONS.map((r) => (
                <label key={r.id} className="relative flex min-h-[44px] cursor-pointer items-center gap-8 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
                  <input type="radio" name="leave" className="sr-only" checked={reason === r.id} onChange={() => setReason(r.id)} />
                  <Radio checked={reason === r.id} decorative />
                  <span className="text-lg leading-lg text-text-primary">{r.label}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.note.id} className="sr-only">
                Tell us more (optional)
              </label>
              <Textarea
                id={ids.note.id}
                rows={3}
                value={note}
                onValueChange={(v) => setNote(v.slice(0, LEAVE_NOTE_MAX))}
                placeholder="Tell us more (optional)"
                maxLength={LEAVE_NOTE_MAX}
              />
              <p className="text-sm leading-sm text-text-tertiary tabular-nums">
                {note.length}/{LEAVE_NOTE_MAX}
              </p>
            </div>
            <Link href="/m/settings/privacy#take-a-break" className={`${TEXT_LINK} self-start`}>
              Need a pause? Take a break instead
            </Link>
          </>
        )}

        {step === 2 && (
          <>
            <AccountHeading title="What you’ll lose">After 30 days this can’t be undone.</AccountHeading>
            {lose.moving.length > 0 && (
              <div className="flex flex-col gap-4">
                <AccountAlert alert={{ tone: "error", title: "Finish these first", body: "Money that’s still moving has to settle before you can delete." }} />
                <dl className="flex flex-col">
                  {lose.moving.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-6 px-6 py-6">
                      <dt className="text-md leading-md text-text-secondary">{m.label}</dt>
                      <dd className="text-right text-md font-medium leading-md text-text-primary">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {lose.ready && (
              <dl className="flex flex-col">
                {(
                  [
                    ["Projects", `${lose.projects} · ${lose.shared} shared`],
                    ["Minted NFTs", `${lose.minted} · stay with holders`],
                    ["Live listings", lose.listings.length ? `${lose.listings.length} · taken down today` : "None"],
                    ["IDZ balance", lose.idz === null ? "Wallet not connected" : `${lose.idz.toLocaleString("en-US")} IDZ`],
                    ["Plan & credits", `${lose.paid ? `${lose.plan} ends` : lose.plan} · ${lose.credits} credits`],
                    ["Messages", "Stay with the people you sent them to"],
                  ] as const
                ).map(([term, value]) => (
                  <div key={term} className="flex items-center justify-between gap-6 px-6 py-6">
                    <dt className="shrink-0 text-md leading-md text-text-secondary">{term}</dt>
                    <dd className="text-right text-md leading-md text-text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {lose.idz !== null && lose.idz > 0 && (
              <Link href="/m/settings/payments" className={`${TEXT_LINK} self-start`}>
                Withdraw IDZ in Get paid first
              </Link>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <AccountHeading title="Keep a copy">Download your projects, files and activity before you go.</AccountHeading>
            <div className="flex flex-col gap-6 rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-8">
              <div className="flex flex-col gap-1">
                <p className="text-md font-semibold leading-md text-text-primary">Download your information</p>
                <p className="text-sm leading-sm text-text-secondary">A .zip of your projects, files, messages and activity, made on this phone now.</p>
              </div>
              <DownloadStatus dl={dl} />
              <Button hierarchy="secondary" size="xl" className="w-full" loading={!!dl.busy} onClick={() => void dl.start()}>
                {dl.made ? "Download again" : "Download your information"}
              </Button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <AccountHeading title="Confirm it’s you">
              {provider ? `Sign in with ${PROVIDER_WORDS[provider]} once more to delete your account.` : "Enter your password to delete your account."}
            </AccountHeading>
            <AccountAlert
              alert={
                failed || !online
                  ? {
                      tone: "error",
                      title: "Couldn’t delete your account",
                      body: "Check your connection and try again.",
                      action: (
                        <button type="button" className="font-medium hover:underline" onClick={() => void remove()}>
                          Try again
                        </button>
                      ),
                    }
                  : null
              }
            />
            {provider ? (
              vouched ? (
                <p className="text-md leading-md text-text-success">{PROVIDER_WORDS[provider]} confirmed it’s you.</p>
              ) : (
                <WayButton way={provider} onClick={() => setReauth(true)} />
              )
            ) : (
              <Field label="Password" htmlFor={ids.password.id} error={wrong ? "That’s not your password." : ""} errorId={ids.password.errorId}>
                <PasswordInput
                  id={ids.password.id}
                  autoComplete="current-password"
                  value={password}
                  onValueChange={(v) => {
                    setPassword(v);
                    setWrong(false);
                  }}
                  {...errorProps(wrong ? "wrong" : "", ids.password.errorId)}
                />
              </Field>
            )}
            <div className={cn("flex flex-col gap-1 rounded-md bg-bg-subtle p-6")}>
              <p className="text-md font-semibold leading-md text-text-primary">Deleted on {until}</p>
              <p className="text-sm leading-sm text-text-secondary">Until then your account is hidden. Sign in before then to restore it.</p>
            </div>
          </>
        )}
      </div>
      {provider && (
        <ReauthSheet
          open={reauth}
          provider={provider}
          email={email}
          onClose={() => setReauth(false)}
          onDone={() => {
            setReauth(false);
            setVouched(true);
          }}
        />
      )}
    </Screen>
  );
}

/** The Demo stand-in for the provider asking once more (AU-63e). */
function ReauthSheet({
  open,
  provider,
  email,
  onClose,
  onDone,
}: {
  open: boolean;
  provider: Provider;
  email: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const words = PROVIDER_WORDS[provider];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Continue with ${words}`}
      description={`On a phone, ${words} asks you to confirm with Face ID or your ${words} password. This demo asks you to confirm.`}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={onDone}>
            Confirm as {email}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Badge tone="warning" className="self-start">
        Demo
      </Badge>
    </Sheet>
  );
}
