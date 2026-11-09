"use client";

// Settings › Privacy & safety (mobile Figma "Settings · 2026 update" 10688:2):
// ST-30 the page — Your profile (View as public, Lock your profile, Show my
// location and local time, Search engines), Who can reach you (Who can
// message you, Who can comment on your shared projects, Take a break) and
// Safety (Blocked people, Hidden words, Your reports with their counts);
// ST-31 / 31b / 31c the three choice sheets; ST-32 the lock confirm and
// ST-32b its "Profile locked" toast; ST-91 / 92 / 93 through the kit.
// The records and words are the web's (components/settings/privacy-page.tsx):
// `ideeza:settings` audience and privacy, and Who can message you in
// Messages' own store (`ideeza:messages` settings, D13). Toggles save as they
// change (ST-92 when refused); sheets save on Done. Turning the lock off asks
// nothing: it only puts back what people saw before.

import * as React from "react";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { setAllowNewFor } from "@/lib/messages/actions";
import { allowNewOf } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { ME, type AllowNew } from "@/lib/messages/types";
import { useMyProfile } from "@/lib/people/profile-store";
import { quietUntilFor, type QuietChoice } from "@/lib/settings/audience";
import { quietModeOn, updateSettings, type Reach } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { ChoiceSheet, SaveFailed, SettingsGroup, SettingsRow, SettingsScreen, useSaver, type ChoiceOption } from "./kit";
import { useReportsYouMade } from "./privacy-reports";

const noSubscribe = () => () => {};
const useRunning = () => React.useSyncExternalStore(noSubscribe, () => true, () => false);

// A clock that moves every half minute, so "On until …" reads Off once the break ends.
const TICK_MS = 30_000;
const subscribeTick = (onChange: () => void) => {
  const id = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(id);
};
const tickNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const useNow = () => React.useSyncExternalStore(subscribeTick, tickNow, () => 0);

const MESSAGE_OPTIONS: ChoiceOption<AllowNew>[] = [
  { value: "everyone", label: "Anyone", hint: "People you haven’t worked with land in your Requests." },
  {
    value: "known",
    label: "People you work with or who own a copy or hold a share",
    hint: "No one else can start a conversation with you. Questions about your listings still reach you.",
  },
  { value: "nobody", label: "No one new", hint: "Only people you already have a conversation with can write to you." },
];

const COMMENT_OPTIONS: ChoiceOption<Reach>[] = [
  { value: "everyone", label: "Anyone", hint: "Anyone on IDEEZA can comment" },
  { value: "work", label: "People you work with", hint: "Only people on your project teams can comment" },
  { value: "nobody", label: "Only me", hint: "Only you can comment" },
];

type BreakPick = QuietChoice | "keep";

type Open = null | "lock" | "message" | "comment" | "break";

/** A choice short enough for the row's right side; a longer one reads under the label. */
const fitsRight = (label: string) => label.length <= 20;

export function PrivacySettings() {
  const settings = useSettings();
  const a = settings.audience;
  const messages = useMessages();
  const { hydrated: profileRead, fields } = useMyProfile();
  const reports = useReportsYouMade();
  const dates = useDates();
  const now = useNow();
  const online = useOnline();
  const running = useRunning();
  const toast = useToast();
  const saver = useSaver();
  const [open, setOpen] = React.useState<Open>(null);
  const close = React.useCallback(() => setOpen(null), []);
  const off = !online;

  const until = now && quietModeOn(settings, now) ? a.quietUntil : null;
  const end = (at: number) => dates.dateTime(at, { style: "weekday" });
  const breakOptions: ChoiceOption<BreakPick>[] = [
    ...(until !== null ? [{ value: "keep" as const, label: "Keep the break", hint: `Until ${end(until)}` }] : []),
    { value: "24h", label: "24 hours", hint: `Until ${end(quietUntilFor("24h", now) ?? now)}` },
    { value: "7d", label: "7 days", hint: `Until ${end(quietUntilFor("7d", now) ?? now)}` },
    { value: "off", label: "Off", hint: "Requests and comments follow your rules above." },
  ];

  const allowNew = allowNewOf(messages.data, ME);
  const messageLabel = MESSAGE_OPTIONS.find((o) => o.value === allowNew)?.label ?? "";
  const commentLabel = COMMENT_OPTIONS.find((o) => o.value === a.comment)?.label ?? "";
  const blocked = messages.data.blocks.filter((b) => b.by === ME).length;
  const hidden = settings.blocking.hiddenWords.length;
  const count = (n: number | undefined) => (n ? String(n) : undefined);
  const noCity = profileRead && !fields.location.trim();

  const toggleLock = () => {
    if (!a.locked) return setOpen("lock");
    saver.run("profile", () => updateSettings("audience", { locked: false }));
  };

  return (
    <SettingsScreen title="Privacy & safety" loading={!running || !messages.hydrated}>
      <SettingsGroup label="Your profile">
        <SettingsRow id="view-public" label="View as public" href="/m/creators/me?view=public" />
        <SettingsRow
          id="lock"
          label="Lock your profile"
          helper="Only your project teams see your projects and activity"
          toggle={{ checked: a.locked, onChange: toggleLock }}
          disabled={off}
        />
        <SettingsRow
          id="local-time"
          label="Show my location and local time"
          helper={noCity ? "Add your city first with Edit profile on your profile." : undefined}
          toggle={{ checked: a.showLocalTime, onChange: () => saver.run("profile", () => updateSettings("audience", { showLocalTime: !a.showLocalTime })) }}
          disabled={off}
        />
        <SettingsRow
          id="search-engines"
          label="Search engines"
          helper="Let search engines link to your profile"
          toggle={{
            checked: settings.privacy.searchEngines,
            onChange: () => saver.run("profile", () => updateSettings("privacy", { searchEngines: !settings.privacy.searchEngines })),
          }}
          disabled={off}
        />
      </SettingsGroup>
      <SaveFailed saver={saver} group="profile" />

      <SettingsGroup label="Who can reach you">
        <SettingsRow
          id="message"
          label="Who can message you"
          value={fitsRight(messageLabel) ? messageLabel : undefined}
          helper={fitsRight(messageLabel) ? undefined : messageLabel}
          onClick={() => setOpen("message")}
          disabled={off || messages.unreadable}
          reason={messages.unreadable ? "This browser’s messages can’t be read, so this can’t change." : undefined}
        />
        <SettingsRow id="comment" label="Who can comment on your shared projects" helper={commentLabel} onClick={() => setOpen("comment")} disabled={off} />
        <SettingsRow
          id="take-a-break"
          label="Take a break"
          value={until !== null ? "On" : "Off"}
          helper={until !== null ? `Until ${end(until)}` : undefined}
          onClick={() => setOpen("break")}
          disabled={off}
        />
      </SettingsGroup>

      <SettingsGroup label="Safety">
        <SettingsRow id="blocked" label="Blocked people" value={count(blocked)} href="/m/settings/privacy/blocked" />
        <SettingsRow id="hidden-words" label="Hidden words" value={count(hidden)} href="/m/settings/privacy/hidden-words" />
        <SettingsRow id="reports" label="Your reports" value={count(reports?.length)} href="/m/settings/privacy/reports" />
      </SettingsGroup>

      <ConfirmSheet
        open={open === "lock"}
        onClose={close}
        title="Lock your profile?"
        body={
          <div className="flex flex-col gap-4">
            <p>
              People who don’t work with you on a project see only your name, your photo and “This profile is locked”. Your project teams still see
              all of it.
            </p>
            <p>
              Still public while it’s locked: the projects you shared on Innovations, your marketplace listings and your comments. People can still
              message you if your message rule lets them.
            </p>
          </div>
        }
        verb="Lock profile"
        onConfirm={() => {
          if (saver.run("profile", () => updateSettings("audience", { locked: true }))) toast({ title: "Profile locked" });
        }}
      />
      <ChoiceSheet
        open={open === "message"}
        onClose={close}
        title="Who can message you"
        description="Who can start a new conversation with you. People you already talk to can always reply."
        options={MESSAGE_OPTIONS}
        value={allowNew}
        onSave={(v) => setAllowNewFor(ME, v).ok}
      />
      <ChoiceSheet
        open={open === "comment"}
        onClose={close}
        title="Who can comment on your shared projects"
        description="On the projects you share on Innovations. A comment from someone this leaves out is held off your post, and comes back if you change this."
        options={COMMENT_OPTIONS}
        value={a.comment}
        onSave={(v) => updateSettings("audience", { comment: v })}
      />
      <ChoiceSheet<BreakPick>
        open={open === "break"}
        onClose={close}
        title="Take a break"
        description="For a while, no new message requests reach you, and comments on your shared projects from people you don’t work with are held. People you work with or already talk to, and questions about your listings, still reach you."
        options={breakOptions}
        value={until !== null ? "keep" : "off"}
        onSave={(v) => (v === "keep" ? true : updateSettings("audience", { quietUntil: quietUntilFor(v, Date.now()) }))}
      />
    </SettingsScreen>
  );
}
