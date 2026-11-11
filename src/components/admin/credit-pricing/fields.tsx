// AI credit pricing's building blocks: a section card with its H4, and a
// labelled amount field whose error sits under it and is read with it.

import * as React from "react";
import { TextInput } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  return (
    <section
      aria-labelledby={id}
      className={cn("flex flex-col gap-8 rounded-xl border border-solid border-border bg-bg-surface p-8", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-1 basis-[18rem] flex-col gap-2">
          <h2 id={id} className="m-0 text-2xl font-semibold leading-2xl text-text-primary">
            {title}
          </h2>
          {description != null && <p className="m-0 max-w-[72ch] text-md leading-md text-text-secondary">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** A typed amount: decimal keyboard, its unit in the field, its error under it. */
export function AmountField({
  label,
  hint,
  value,
  onValueChange,
  error,
  prefix,
  suffix,
  placeholder,
  size = "md",
  hideLabel = false,
  className,
  inputClassName,
}: {
  label: string;
  hint?: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  error?: string | null;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  size?: "sm" | "md";
  /** In a table row the column names the field; the label is still read. */
  hideLabel?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint != null ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium leading-sm text-text-primary"}>
        {label}
      </label>
      <TextInput
        id={id}
        size={size}
        value={value}
        onValueChange={onValueChange}
        invalid={!!error}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        prefixText={prefix}
        suffix={suffix}
        containerClassName={inputClassName}
      />
      {error ? (
        <p id={errorId} className="m-0 text-sm leading-sm text-text-error">
          {error}
        </p>
      ) : null}
      {hint != null && !hideLabel ? (
        <p id={hintId} className="m-0 text-sm leading-sm text-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** "Current … → Next …": what makers pay now beside what Publish would make it. */
export function TodayNext({ today, next }: { today: string; next: string | null }) {
  const changed = next !== null && next !== today;
  return (
    <p className="m-0 text-sm leading-sm text-text-secondary">
      Current {today}
      {changed ? (
        <>
          {" → "}
          <span className="font-medium text-text-brand">{next}</span>
        </>
      ) : (
        <span className="text-text-tertiary"> · no change</span>
      )}
    </p>
  );
}
