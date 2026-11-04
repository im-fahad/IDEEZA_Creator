"use client";

// Contact support (/m/help/contact; mobile Figma "Contact support · Live
// chat"). IDEEZA has no live agents, so nobody pretends to type: each message
// goes to the IDEEZA team as a report (/api/reports, kind "other", with up
// to 3 screenshots), and the thread answers with its reference and that the
// team replies by email (lib/support/support-chat.ts keeps the thread in
// this browser). A message that didn't arrive says so and can be sent again.
// The Figma's voice notes aren't built: the app sends no audio anywhere.

import * as React from "react";
import { Cancel01Icon, Image01Icon, SentIcon, Tick02Icon, TickDouble02Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Textarea } from "@/components/ideeza/text-input";
import { useAuth } from "@/lib/account/auth";
import { rememberSentReport } from "@/lib/data/reports";
import { IMAGES_MAX, admitImages, titleOf } from "@/lib/support/problem-report";
import { imageFilesOf, shrinkFile, type ReportImage } from "@/lib/support/report-images";
import { MESSAGE_MAX, putMessage, readChat, writeChat, type ChatMessage } from "@/lib/support/support-chat";
import { cn } from "@/lib/utils";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { newReportId, phoneContext, postReport } from "./report-screen";

const time = (ts: number) => new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const day = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? "Today" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

type Shot = ReportImage & { url: string };

export function ContactScreen() {
  const { account } = useAuth();
  const online = useOnline();
  const toast = useToast();
  const [thread, setThread] = React.useState<ChatMessage[] | null>(null);
  const [text, setText] = React.useState("");
  const [shots, setShots] = React.useState<Shot[]>([]);
  const [busy, setBusy] = React.useState(false);
  const pending = React.useRef(new Map<string, Shot[]>());
  const fileRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const [context] = React.useState(() => phoneContext("/m/help/contact"));

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of localStorage after mount
    setThread(readChat());
  }, []);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.length]);

  const save = (m: ChatMessage) =>
    setThread((t) => {
      const next = putMessage(t ?? [], m);
      if (!writeChat(next)) toast({ title: "This browser couldn’t keep the conversation (storage is full or blocked).", lead: "error" });
      return next;
    });

  const deliver = async (m: ChatMessage, images: readonly Shot[]) => {
    save({ ...m, state: "sending" });
    try {
      const details = m.text.trim() || "(screenshots only)";
      const r = await postReport(
        { id: m.id, kind: "other", impact: "fyi", details, title: `Support: ${titleOf(details, "other")}`, context, images: images.map((s) => ({ width: s.width, height: s.height })) },
        images,
      );
      if (!r.ref) throw new Error(String(r.status));
      rememberSentReport({ ref: r.ref, kind: "other", title: `Support: ${titleOf(details, "other")}`, at: Date.now() });
      pending.current.delete(m.id);
      save({ ...m, state: "sent", ref: r.ref });
    } catch {
      save({ ...m, state: "failed" });
    }
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !shots.length) || busy) return;
    if (!online) {
      toast({ title: "You’re offline. Your message is kept here; send it when you’re back online.", lead: "error" });
      return;
    }
    setBusy(true);
    const m: ChatMessage = { id: newReportId(), text: body.slice(0, MESSAGE_MAX), at: Date.now(), state: "sending", ...(shots.length ? { images: shots.length } : {}) };
    const images = shots;
    pending.current.set(m.id, images);
    setText("");
    setShots([]);
    await deliver(m, images);
    setBusy(false);
  };

  const addFiles = async (files: File[]) => {
    const { take, note } = admitImages(shots.length, files.length);
    if (note) toast({ title: note });
    for (const file of files.slice(0, take)) {
      const r = await shrinkFile(file, newReportId());
      if (r.ok) setShots((s) => [...s, { ...r.image, url: URL.createObjectURL(r.image.blob) }].slice(0, IMAGES_MAX));
      else toast({ title: r.reason, lead: "error" });
    }
  };

  const email = account?.email ?? "your account’s email";
  return (
    <Screen
      top={<TopBar back title="Contact support" />}
      className="px-8 pb-8 pt-4"
      footer={
        <div className="flex flex-col gap-4 border-t-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface px-8 pb-4 pt-5">
          {shots.length > 0 && (
            <ul className="flex gap-3">
              {shots.map((s) => (
                <li key={s.key} className="relative size-[56px] overflow-hidden rounded-lg bg-bg-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
                  <img src={s.url} alt={s.name} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => setShots((xs) => xs.filter((x) => x.key !== s.key))}
                    className="absolute right-0 top-0 inline-flex size-[24px] items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]"
                  >
                    <Icon icon={Cancel01Icon} size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                void addFiles(imageFilesOf(e.target.files));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              aria-label="Add a screenshot"
              disabled={shots.length >= IMAGES_MAX}
              onClick={() => fileRef.current?.click()}
              className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:text-text-disabled"
            >
              <Icon icon={Image01Icon} size={22} />
            </button>
            <Textarea
              aria-label="Your message"
              rows={1}
              value={text}
              maxLength={MESSAGE_MAX}
              onValueChange={setText}
              placeholder="Send a message…"
              containerClassName="flex-1"
              className="max-h-[120px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="button"
              aria-label="Send"
              disabled={busy || (!text.trim() && !shots.length)}
              onClick={send}
              className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-button-primary-bg)] text-[color:var(--color-button-primary-text)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:bg-bg-subtle disabled:text-text-disabled"
            >
              <Icon icon={SentIcon} size={20} />
            </button>
          </div>
        </div>
      }
    >
      <ol className="flex flex-col gap-6" aria-live="polite">
        <TeamBubble>
          Hi, this is IDEEZA support. Tell us what you need: each message goes to the team, and we answer by email at {email}.
        </TeamBubble>
        {(thread ?? []).map((m, i, all) => (
          <React.Fragment key={m.id}>
            {(i === 0 || day(all[i - 1].at) !== day(m.at)) && (
              <li className="flex items-center gap-4 text-xs leading-xs text-text-tertiary">
                <span aria-hidden className="h-[1px] flex-1 bg-border-subtle" />
                {day(m.at)}
                <span aria-hidden className="h-[1px] flex-1 bg-border-subtle" />
              </li>
            )}
            <li className="flex flex-col items-end gap-1">
              <div className="max-w-[85%] rounded-xl rounded-br-sm bg-bg-brand-subtle px-6 py-4 text-md leading-md text-text-primary [overflow-wrap:anywhere]">
                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                {m.images ? <p className="text-sm leading-sm text-text-secondary">{m.images} {m.images === 1 ? "screenshot" : "screenshots"}</p> : null}
                <p className="flex items-center justify-end gap-2 pt-1 text-xs leading-xs text-text-tertiary">
                  {time(m.at)}
                  {m.state === "sent" ? <Icon icon={TickDouble02Icon} size={14} aria-label="Sent" /> : m.state === "sending" ? <Icon icon={Tick02Icon} size={14} aria-label="Sending" /> : null}
                </p>
              </div>
              {m.state === "failed" && (
                <p role="alert" className="flex items-center gap-2 text-sm leading-sm text-text-error">
                  <Icon icon={Alert02Icon} size={14} />
                  Didn’t send.{" "}
                  <button type="button" className="font-medium underline" onClick={() => void deliver(m, pending.current.get(m.id) ?? [])}>
                    Try again
                  </button>
                </p>
              )}
            </li>
            {m.state === "sent" && m.ref && (
              <TeamBubble at={m.at}>
                Got it: it’s with the IDEEZA team as <span className="font-mono">{m.ref}</span>. We’ll answer by email at {email}. Settings › Your reports keeps it.
              </TeamBubble>
            )}
          </React.Fragment>
        ))}
      </ol>
      <div ref={endRef} />
    </Screen>
  );
}

function TeamBubble({ children, at }: { children: React.ReactNode; at?: number }) {
  return (
    <li className="flex items-end gap-3">
      <span aria-hidden className="inline-flex size-[28px] shrink-0 items-center justify-center rounded-full bg-bg-surface ring-[length:var(--border-width-1)] ring-border-subtle">
        <IdeezaLogo mark height={14} decorative />
      </span>
      <div className={cn("max-w-[85%] rounded-xl rounded-bl-sm bg-bg-surface px-6 py-4 text-md leading-md text-text-primary ring-[length:var(--border-width-1)] ring-border-subtle")}>
        <p>{children}</p>
        {at !== undefined && <p className="pt-1 text-right text-xs leading-xs text-text-tertiary">{time(at)}</p>}
      </div>
    </li>
  );
}
