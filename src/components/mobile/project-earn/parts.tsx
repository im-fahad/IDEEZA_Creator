"use client";

// Earn's shared phone parts (Figma 12–17 at 375 px, the web's Earn surface):
// · EARN_CARD — the one card: radius/xl, border/default, 16 padding, 12 apart;
//   EarnH2 / EARN_LEAD — the card's heading and its plain sentence;
// · FactRows — label and value rows in a ListCard (Price, Copies sold, …);
// · StepFix — a missing ladder step's one-tap fix, as the phone does it: Open
//   products (the Products tab), Make videos (the Media tab), Go to mint (Earn ›
//   Sell), Connect wallet (the Demo wallet sheet), Confirm ownership (writes
//   it at once), Choose a license (LicenseSheet), Verify identity
//   (IdentitySheet); each secondary, so the screen's one primary stays its own;
// · MissingSteps / LevelCheck — "Before you can {verb}" with those steps.

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { LICENSES, type License } from "@/lib/brief/types";
import type { LadderStep, LevelCheck as Check } from "@/lib/commerce/ladder";
import { saveDraftLicense } from "@/lib/commerce/license";
import { kycFormProblems } from "@/lib/commerce/kyc";
import { verifyKycDemo } from "@/lib/commerce/use-commerce";
import { useManualProjects } from "@/lib/manual/projects";
import { phoneEarnHref } from "@/lib/manual/phone-earn";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { useToast } from "../kit/toast";
import { LIST_ROW, ListCard } from "../project/parts";

export const EARN_CARD =
  "flex flex-col gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-default bg-bg-surface p-8";
export const EARN_STACK = "flex flex-col gap-12";
export const EARN_H2_CLASS = "text-lg font-semibold leading-lg text-text-primary";
export const EARN_H3_CLASS = "text-md font-semibold leading-md text-text-primary";
export const EARN_LEAD = "text-md leading-md text-text-secondary";
export const EARN_NOTE = "text-sm leading-sm text-text-secondary";
/** A fix or a row's one quiet button, on the phone's 44 px. */
export const FIX_BUTTON = cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full");

export function EarnH2({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn(EARN_H2_CLASS, className)}>
      {children}
    </h2>
  );
}

/** Label · value rows (Mobile / Info row) in a ListCard. */
export function FactRows({ rows, label }: { rows: readonly { label: string; value: React.ReactNode }[]; label?: string }) {
  return (
    <ListCard label={label}>
      {rows.map((r) => (
        <li key={r.label} className={cn(LIST_ROW, "flex min-h-[44px] items-start justify-between gap-6 p-6")}>
          <span className="shrink-0 text-md leading-md text-text-secondary">{r.label}</span>
          <span className="min-w-0 break-words text-right text-md leading-md text-text-primary">{r.value}</span>
        </li>
      ))}
    </ListCard>
  );
}

type FixProps = {
  step: LadderStep;
  projectId: string;
  /** The project's chosen license, for the license sheet. */
  license: License | null;
  announce?: (message: string) => void;
  describedBy?: string;
};

/** One missing step's fix. */
export function StepFix({ step, projectId, license, announce, describedBy }: FixProps) {
  const { openManage } = useWalletRequest();
  const { setOwnerConfirmed } = useManualProjects();
  const toast = useToast();
  const [sheet, setSheet] = React.useState<"license" | "identity" | null>(null);
  const label = step.fix.label;
  const said = (m: string) => {
    toast({ title: m });
    announce?.(m);
  };
  switch (step.fix.kind) {
    case "products":
      return (
        <Link href={phoneProjectHref(projectId, "products")} className={FIX_BUTTON} aria-describedby={describedBy}>
          {label}
        </Link>
      );
    case "media":
      return (
        <Link href={phoneProjectHref(projectId, "media")} className={FIX_BUTTON} aria-describedby={describedBy}>
          {label}
        </Link>
      );
    case "mint":
      return (
        <Link href={phoneEarnHref(projectId, "sell")} className={FIX_BUTTON} aria-describedby={describedBy}>
          {label}
        </Link>
      );
    case "wallet":
      return (
        <Button hierarchy="secondary" size="xl" className="w-full" aria-describedby={describedBy} onClick={openManage}>
          {label}
        </Button>
      );
    case "ownership":
      return (
        <Button
          hierarchy="secondary"
          size="xl"
          className="w-full"
          aria-describedby={describedBy}
          onClick={() => {
            setOwnerConfirmed(projectId, Date.now());
            said("Ownership confirmed.");
          }}
        >
          {label}
        </Button>
      );
    case "license":
      return (
        <>
          <Button hierarchy="secondary" size="xl" className="w-full" aria-describedby={describedBy} onClick={() => setSheet("license")}>
            {label}
          </Button>
          <LicenseSheet open={sheet === "license"} projectId={projectId} current={license} onClose={() => setSheet(null)} onSaved={said} />
        </>
      );
    case "identity":
      return (
        <>
          <Button hierarchy="secondary" size="xl" className="w-full" aria-describedby={describedBy} onClick={() => setSheet("identity")}>
            {label}
          </Button>
          <IdentitySheet open={sheet === "identity"} onClose={() => setSheet(null)} onDone={said} />
        </>
      );
  }
}

/** Steps as rows: done or not, the step, and — while missing — why and its fix. */
export function MissingSteps({ steps, ...fix }: Omit<FixProps, "step" | "describedBy"> & { steps: readonly (LadderStep & { ok?: boolean })[] }) {
  const base = React.useId();
  return (
    <ul className="flex flex-col">
      {steps.map((s) => {
        const done = s.ok === true;
        const reasonId = `${base}-${s.id}`;
        return (
          <li key={s.id} className="flex items-start gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-subtle py-6 first:pt-0 last:border-b-0 last:pb-0">
            <span aria-hidden className={cn("mt-px inline-flex shrink-0", done ? "text-text-success" : "text-text-tertiary")}>
              <Icon icon={done ? CheckmarkCircle02Icon : CircleIcon} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-3">
              <span className="text-md font-medium leading-md text-text-primary">
                {s.label}
                <span className="sr-only">{done ? ", done" : ", not done yet"}</span>
              </span>
              {!done && (
                <>
                  <span id={reasonId} className={EARN_LEAD}>
                    {s.reason}
                  </span>
                  <StepFix step={s} describedBy={reasonId} {...fix} />
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Before you can {what}" and the missing steps, or nothing once the check passes. */
export function LevelCheck({ check, what, id, ...fix }: Omit<FixProps, "step" | "describedBy"> & { check: Check; what: string; id?: string }) {
  const headingId = React.useId();
  if (check.ok) return null;
  return (
    <section id={id} aria-labelledby={headingId} className="flex flex-col gap-4">
      <h3 id={headingId} className={EARN_H3_CLASS}>
        {`Before you can ${what}`}
      </h3>
      <MissingSteps steps={check.missing} {...fix} />
    </section>
  );
}

const LICENSE_OPTIONS = LICENSES.map((l) => ({ value: l.value, label: l.label }));

/** Choose a license (the web's dialog as a sheet): the Brief's list; Save license writes the draft's license. */
export function LicenseSheet({
  open,
  projectId,
  current,
  onClose,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  current: License | null;
  onClose: () => void;
  onSaved?: (message: string) => void;
}) {
  const [value, setValue] = React.useState<License | null>(current);
  const [problem, setProblem] = React.useState<string | null>(null);
  const ids = useFieldIds(["license"] as const);
  const [was, setWas] = React.useState(open);
  if (was !== open) {
    setWas(open);
    if (open) {
      setValue(current);
      setProblem(null);
    }
  }
  const info = LICENSES.find((l) => l.value === value)?.info;
  const save = () => {
    if (!value) return setProblem("Choose a license.");
    const r = saveDraftLicense(projectId, value);
    if (r === "unreadable") return setProblem("This project's Brief can't be read, so the license wasn't saved.");
    if (r === "refused") return setProblem("This browser couldn't save it (storage is full or blocked). Nothing changed.");
    onSaved?.(`License set: ${LICENSES.find((l) => l.value === value)?.label ?? value}.`);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Choose a license"
      description="The terms your project is sold under."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={save}>
            Save license
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="License" htmlFor={ids.license.id} error={problem} errorId={ids.license.errorId}>
        <SheetSelect
          id={ids.license.id}
          title="License"
          placeholder="Select a license"
          value={value ?? ""}
          options={LICENSE_OPTIONS}
          invalid={!!problem}
          onChange={(v) => {
            setValue(v as License);
            setProblem(null);
          }}
        />
      </Field>
      {info && <p className={EARN_NOTE}>{info}</p>}
    </Sheet>
  );
}

/** Verify identity (Settings › Get paid's Level 1, demo): the legal name and country, then Verify (demo).
 *  Only the outcome is stored (`ideeza:commerce:kyc`). */
export function IdentitySheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: (message: string) => void }) {
  const [name, setName] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const ids = useFieldIds(["name", "country"] as const);
  const problems = kycFormProblems({ name, country });
  const shown = tried ? problems : {};
  const verify = () => {
    setTried(true);
    if (problems.name || problems.country) return;
    if (!verifyKycDemo()) return setFailed(true);
    onDone?.("Identity verified.");
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Verify your identity"
      description="Physical copies and withdrawals need it. Demo: nothing is sent anywhere, and only the outcome is kept."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={verify}>
            Verify (demo)
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
          {failed && <p className="text-sm leading-sm text-text-error">This browser couldn&apos;t save it — storage is full or blocked.</p>}
        </>
      }
    >
      <Field label="Full legal name" htmlFor={ids.name.id} error={shown.name} errorId={ids.name.errorId}>
        <TextInput id={ids.name.id} size="xl" value={name} onValueChange={setName} autoComplete="name" {...errorProps(shown.name, ids.name.errorId)} />
      </Field>
      <Field label="Country of residence" htmlFor={ids.country.id} error={shown.country} errorId={ids.country.errorId}>
        <TextInput id={ids.country.id} size="xl" value={country} onValueChange={setCountry} autoComplete="country-name" {...errorProps(shown.country, ids.country.errorId)} />
      </Field>
    </Sheet>
  );
}
