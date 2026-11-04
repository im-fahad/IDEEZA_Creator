"use client";

// The pieces every sign-up and sign-in page shares: the heading, a labelled
// field, the password field with its show toggle, and the Demo email — the
// card that stands in for a real email, since nothing here leaves the browser.

import * as React from "react";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Badge } from "@/components/ideeza/badge";
import { IconButton } from "@/components/ideeza/icon-button";
import { TextInput, type TextInputProps } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";

export const FIELD_LABEL = "text-sm font-medium leading-sm text-text-primary";
export const FIELD_ERROR = "m-0 text-sm leading-sm text-text-error";

export function AuthHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-[8px] text-center">
      <h1 className="m-0 text-4xl font-bold leading-4xl tracking-close text-text-primary [text-wrap:balance]">{title}</h1>
      {children ? <p className="m-0 max-w-[40ch] text-md leading-relaxed text-text-secondary">{children}</p> : null}
    </div>
  );
}

/** Label above, the control, then why it is wrong under it. */
export function Field({
  label,
  htmlFor,
  error,
  errorId,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  errorId?: string;
  /** Something on the label's row, at its end (Forgot password?). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <div className="flex items-baseline justify-between gap-[8px]">
        <label htmlFor={htmlFor} className={FIELD_LABEL}>
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={errorId} className={FIELD_ERROR}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<TextInputProps, "type" | "action">>(
  function PasswordInput(props, ref) {
    const [shown, setShown] = React.useState(false);
    return (
      <TextInput
        ref={ref}
        size="xl"
        type={shown ? "text" : "password"}
        spellCheck={false}
        autoCapitalize="none"
        {...props}
        action={
          <IconButton
            type="button"
            size="md"
            aria-label="Show password"
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
            icon={<Icon icon={shown ? ViewOffIcon : ViewIcon} size={18} />}
          />
        }
      />
    );
  },
);

/** Stands in for the email a real service would send: who it's from, the
 *  subject, a line, and the button the email's link would be. */
export function DemoEmail({
  subject,
  children,
  action,
  className,
}: {
  subject: string;
  children: React.ReactNode;
  action: React.ReactNode;
  className?: string;
}) {
  const titleId = React.useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-[16px] rounded-xl border border-solid border-border bg-bg-surface p-[20px] shadow-1", className)}
    >
      <div className="flex items-center gap-[10px]">
        <IdeezaLogo mark height={24} decorative />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold leading-sm text-text-primary">IDEEZA</p>
          <p className="m-0 text-sm leading-sm text-text-tertiary">Demo email, shown here instead of your inbox</p>
        </div>
        <Badge tone="warning">Demo</Badge>
      </div>
      <div className="flex flex-col gap-[6px]">
        <h2 id={titleId} className="m-0 text-lg font-semibold leading-lg text-text-primary">
          {subject}
        </h2>
        <p className="m-0 text-md leading-md text-text-secondary">{children}</p>
      </div>
      {action}
    </section>
  );
}

/** Ids for a field and its error, and its aria wiring when an error shows. */
export function useFieldIds<K extends string>(keys: readonly K[]): Record<K, { id: string; errorId: string }> {
  const base = React.useId();
  return React.useMemo(
    () => Object.fromEntries(keys.map((k) => [k, { id: `${base}-${k}`, errorId: `${base}-${k}-error` }])) as Record<K, { id: string; errorId: string }>,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the keys are a constant per form
    [base],
  );
}

export function errorProps(error: string | undefined, errorId: string) {
  return error ? { invalid: true, "aria-invalid": true as const, "aria-describedby": errorId } : {};
}
