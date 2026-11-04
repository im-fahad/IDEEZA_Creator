"use client";

// Shared kit Report sheet (KIT-RB-10…19b, MFR-22): one reason list per target
// (profile, post, comment, conversation, message), an optional note (500),
// and "Also block" for a person or a conversation. Send report stays off
// until a reason is picked. States: sending ("Sending…"), couldn't send (an
// M01 error alert, the note kept, Try again), offline (an M01 warning; the
// report waits until the phone is back online), then one "Report sent" done
// state for every target. The person reported never learns who reported.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { Textarea } from "@/components/ideeza/text-input";
import { Sheet } from "./sheet";
import { useOnline } from "./states";

export const REPORT_NOTE_MAX = 500;

export type ReportReason = { id: string; label: string };
export type ReportInput = { reason: string; note: string; alsoBlock: boolean };

type Phase = "form" | "sending" | "failed" | "sent";

export function ReportSheet({
  open,
  onClose,
  title,
  description,
  reasons,
  blockName,
  question = "What’s wrong?",
  note: noteCopy,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  /** "Report Philip’s profile", "Report post"… */
  title: string;
  /** "Philip won’t know who reported." / "The maker won’t know who reported." */
  description: string;
  reasons: readonly ReportReason[];
  /** Offers "Also block {name}" (profile and conversation reports). */
  blockName?: string;
  /** The reasons' heading (the Feed asks "Why are you reporting this video?"). */
  question?: string;
  /** The note's words, and the reason that opens it (the Feed's "Tell us more" shows under Others only). */
  note?: { label: string; placeholder: string; onlyFor?: string };
  /** Saves the report; a throw is "Couldn’t send your report". */
  onSend: (r: ReportInput) => Promise<void>;
}) {
  const online = useOnline();
  const [reason, setReason] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [alsoBlock, setAlsoBlock] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("form");
  const [blocked, setBlocked] = React.useState(false);

  const close = () => {
    onClose();
    setReason(null);
    setNote("");
    setAlsoBlock(false);
    setPhase("form");
    setBlocked(false);
  };

  const send = async () => {
    if (!reason || !online) return;
    setPhase("sending");
    try {
      const kept = !noteCopy?.onlyFor || reason === noteCopy.onlyFor ? note.trim() : "";
      await onSend({ reason, note: kept, alsoBlock: !!blockName && alsoBlock });
      setBlocked(!!blockName && alsoBlock);
      setPhase("sent");
    } catch {
      setPhase("failed");
    }
  };

  if (phase === "sent") {
    return (
      <Sheet
        open={open}
        onClose={close}
        title="Report sent"
        actions={
          <Button size="xl" className="w-full" onClick={close}>
            Done
          </Button>
        }
      >
        <p className="text-md leading-md text-text-secondary">
          Thanks for telling us. You can find it in Settings › Privacy &amp; safety › Your reports.
        </p>
        {blocked && <p className="text-md leading-md text-text-secondary">You blocked {blockName} too.</p>}
      </Sheet>
    );
  }

  const sending = phase === "sending";
  const showNote = !noteCopy?.onlyFor || reason === noteCopy.onlyFor;
  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      description={description}
      actions={
        <>
          <Button size="xl" className="w-full" disabled={!reason || !online || sending} onClick={send}>
            {sending ? "Sending…" : phase === "failed" ? "Try again" : "Send report"}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      {phase === "failed" && (
        <Banner tone="error" title="Couldn’t send your report">
          Your note is kept. Try again.
        </Banner>
      )}
      {!online && (
        <Banner tone="attention" title="You’re offline">
          Your report is kept here. Send it when you’re back online.
        </Banner>
      )}
      <fieldset className="flex flex-col gap-6" disabled={sending}>
        <legend className="pb-6 text-md font-medium leading-md text-text-primary">{question}</legend>
        <div role="radiogroup" className="flex flex-col">
          {reasons.map((r) => (
            <label key={r.id} className="relative flex min-h-[44px] cursor-pointer items-center gap-8 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
              <input
                type="radio"
                name="report-reason"
                className="sr-only"
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
              />
              <Radio checked={reason === r.id} decorative />
              <span className="text-lg leading-lg text-text-primary">{r.label}</span>
            </label>
          ))}
        </div>
        {showNote && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium leading-sm text-text-primary">{noteCopy?.label ?? "Note (optional)"}</span>
            <Textarea
              value={note}
              onValueChange={(v) => setNote(v.slice(0, REPORT_NOTE_MAX))}
              placeholder={noteCopy?.placeholder ?? "Tell us what happened"}
              rows={4}
              maxLength={REPORT_NOTE_MAX}
            />
            <span className="self-end text-sm leading-sm text-text-tertiary tabular-nums">
              {note.length}/{REPORT_NOTE_MAX}
            </span>
          </label>
        )}
        {blockName && (
          <label className="relative flex cursor-pointer items-center gap-4 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
            <input
              type="checkbox"
              className="sr-only"
              checked={alsoBlock}
              onChange={() => setAlsoBlock((v) => !v)}
            />
            <Checkbox checked={alsoBlock} decorative />
            <span className="text-md leading-md text-text-primary">Also block {blockName}</span>
          </label>
        )}
      </fieldset>
    </Sheet>
  );
}
