"use client";

// Shared kit confirms (KIT-CF-01…03, MFR-28): a Sheet whose title is a question
// naming the thing and whose button is the verb — never Yes / OK / Confirm.
// Stacked, the action on top: Primary for a neutral confirm, Danger for a
// destructive one. A typed confirm keeps the action off until the name is
// typed exactly. ("Can't yet" sends you where to fix it: build that with
// Sheet and a Primary that goes there.)

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { Sheet } from "./sheet";

export function ConfirmSheet({
  open,
  onClose,
  title,
  body,
  verb,
  destructive,
  typed,
  typedLabel = "Type the name to confirm",
  cancelLabel = "Cancel",
  onConfirm,
}: {
  /** KIT-CF-01 keeps the way back in words: "Keep editing". */
  cancelLabel?: string;
  open: boolean;
  onClose: () => void;
  title: string;
  body?: React.ReactNode;
  verb: string;
  destructive?: boolean;
  /** The name to type before the action turns on (delete a project, the account). */
  typed?: string;
  /** The typed field's label (KIT-CF-03: "Type the project name to confirm"). */
  typedLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const matches = !typed || text.trim() === typed;
  // Kit rule: a field error shows on blur or submit, never while typing.
  const mismatch = !!typed && checked && text.trim() !== "" && !matches;

  const close = () => {
    setText("");
    setChecked(false);
    onClose();
  };
  const confirm = async () => {
    if (!matches || busy) return;
    setBusy(true);
    try {
      await onConfirm();
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      actions={
        <>
          <Button
            hierarchy={destructive ? "danger" : "primary"}
            size="xl"
            className="w-full"
            disabled={!matches}
            loading={busy}
            onClick={confirm}
          >
            {verb}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      {body && <div className="text-md leading-md text-text-secondary">{body}</div>}
      {typed && (
        <label className="flex flex-col gap-2">
          <span className="text-md font-medium leading-md text-text-primary">{typedLabel}</span>
          <TextInput
            size="xl"
            value={text}
            onValueChange={(v) => {
              setText(v);
              setChecked(false);
            }}
            onBlur={() => setChecked(true)}
            invalid={mismatch}
            autoComplete="off"
            autoCapitalize="off"
          />
          {mismatch && (
            <span className="text-sm leading-sm text-text-error">That doesn’t match “{typed}”.</span>
          )}
        </label>
      )}
    </Sheet>
  );
}
