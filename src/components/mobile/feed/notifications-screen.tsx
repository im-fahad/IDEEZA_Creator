"use client";

// Notification (mobile Figma, Design - Light Mode › Notification): Back,
// "Notification" and ⋮ (Mark all as read · Notification settings · Clear all
// notifications); the All and Unread tabs (Unread with its count); the list
// under New, Today, Yesterday and the date; each notice with its button and
// its own ⋮ (Turn off notifications like this · Mute this project · Delete
// this notification). Popups are the kit's bottom sheets, so the Figma's
// dropdowns rise from the bottom (owner rule), and the two deletes ask first.
//
// The notices are the web bell's (use-notices.ts): builds, sales and bids,
// messages, comments, coin and plan, videos, blog reviews. Opening one marks
// it read where the bell keeps it; turning a kind off and muting a project are
// the web's Notification settings; Delete and Clear all take notices off this
// phone's list only (the web bell keeps every record).

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Comment01Icon,
  Delete02Icon,
  Message01Icon,
  MoreVerticalIcon,
  Notification01Icon,
  NotificationOff01Icon,
  Settings02Icon,
  Store01Icon,
  TickDouble02Icon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { markRead, muteProject, unmuteProject } from "@/components/notifications/use-notices";
import { actionLabelOf, phoneGroups, phoneHrefOf, withAllCleared, withClearedId, type PhoneTab } from "@/lib/notifications/phone";
import { KIND_LABELS } from "@/lib/notifications/types";
import type { Notice, NoticeKind } from "@/lib/notifications/types";
import { formatDate, formatDateTime } from "@/lib/settings/dates";
import { readSettings, updateSettings } from "@/lib/settings/prefs";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ActionSheet, type ActionSheetItem } from "../kit/sheet";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useMinuteNow } from "./use-feed";
import { usePhoneNotices } from "./use-phone-notices";

/** Notices about something a person did carry a picture of it, as the Figma's avatar rows do. */
const KIND_ICON: Partial<Record<NoticeKind, IconValue>> = {
  message: Message01Icon,
  teams: Message01Icon,
  comments: Comment01Icon,
  marketplace: Store01Icon,
};

const kindLabel = (k: NoticeKind) => (KIND_LABELS as Record<string, string>)[k] ?? "These notifications";

/** Turns a kind off in the app and on the phone (email stays as it was); returns how to undo it. */
function turnOff(kind: NoticeKind): (() => void) | null {
  const channels = readSettings().notifications.channels;
  const was = channels[kind];
  if (!updateSettings("notifications", { channels: { ...channels, [kind]: { ...was, web: false, mobile: false } } })) return null;
  return () => {
    const now = readSettings().notifications.channels;
    updateSettings("notifications", { channels: { ...now, [kind]: was } });
  };
}

export function NotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const now = useMinuteNow();
  const { hydrated, feed, list, unread, updateCleared } = usePhoneNotices();
  const [tab, setTab] = React.useState<PhoneTab>("all");
  const [menu, setMenu] = React.useState(false);
  const [rowMenu, setRowMenu] = React.useState<Notice | null>(null);
  const [confirm, setConfirm] = React.useState<{ kind: "one"; notice: Notice } | { kind: "all" } | null>(null);
  const locale = feed.settings.language.dateLocale;

  const failed = () => toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
  const groups = now ? phoneGroups(list, feed.isRead, tab, now, (ms) => formatDate(ms, locale, { style: "long" })) : [];

  const openNotice = (n: Notice) => {
    markRead([n]);
    router.push(phoneHrefOf(n));
  };

  const headerItems: ActionSheetItem[] = [
    {
      label: "Mark all as read",
      icon: TickDouble02Icon,
      onSelect: () => {
        if (!unread.length) return toast({ title: "Nothing unread" });
        if (!markRead(unread)) failed();
        else toast({ title: "All marked as read" });
      },
    },
    { label: "Notification settings", icon: Settings02Icon, onSelect: () => router.push("/m/settings") },
    { label: "Clear all notifications", icon: Delete02Icon, destructive: true, onSelect: () => setConfirm({ kind: "all" }) },
  ];

  const rowItems = (n: Notice): ActionSheetItem[] => [
    {
      label: "Turn off notifications like this",
      icon: NotificationOff01Icon,
      onSelect: () => {
        const undo = turnOff(n.kind);
        if (!undo) return failed();
        toast({ title: `${kindLabel(n.kind)}: turned off`, action: { label: "Undo", onClick: undo } });
      },
    },
    ...(n.projectId
      ? [
          {
            label: "Mute this project",
            icon: VolumeOffIcon,
            onSelect: () => {
              const id = n.projectId as string;
              if (!muteProject(id)) return failed();
              toast({ title: `Notices about “${feed.projectName(id) ?? "this project"}” are muted.`, action: { label: "Undo", onClick: () => unmuteProject(id) } });
            },
          },
        ]
      : []),
    { label: "Delete this notification", icon: Delete02Icon, destructive: true, onSelect: () => setConfirm({ kind: "one", notice: n }) },
  ];

  return (
    <Screen top={<TopBar back title="Notification" actions={[{ icon: MoreVerticalIcon, label: "Notification actions", onClick: () => setMenu(true) }]} />}>
      <div role="tablist" aria-label="Notifications" className="mx-8 flex border-b-[length:var(--border-width-1)] border-solid border-border-subtle">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px flex h-[44px] flex-1 items-center justify-center gap-4 border-b-[length:var(--border-width-2)] border-solid text-md leading-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
              tab === t ? "border-[var(--color-border-brand)] text-text-brand" : "border-transparent text-text-secondary",
            )}
          >
            {t === "all" ? "All" : "Unread"}
            {t === "unread" && hydrated && unread.length > 0 && <Badge tone="neutral">{unread.length}</Badge>}
          </button>
        ))}
      </div>

      {!hydrated || !now ? (
        <div className="px-8 pt-6">
          <ListBones rows={6} />
        </div>
      ) : groups.length === 0 ? (
        <div className="px-8 pt-10">
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={Notification01Icon} size={32} />}
            title={tab === "unread" && list.length ? "You’re all caught up" : "No notifications yet"}
            body={
              tab === "unread" && list.length
                ? "Nothing unread. Everything you’ve opened is under All."
                : "Builds that need you, sales, messages and your Blog’s review results show up here."
            }
          />
        </div>
      ) : (
        <div className="flex flex-col pb-8">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label} className="flex flex-col">
              <h2 className="flex items-center gap-6 px-8 pb-2 pt-8 text-sm leading-sm text-text-tertiary">
                {g.label}
                <span aria-hidden className="h-px flex-1 bg-[var(--color-border-subtle)]" />
              </h2>
              <ul className="flex flex-col px-8">
                {g.notices.map((n) => (
                  <NoticeRow
                    key={n.id}
                    n={n}
                    read={feed.isRead(n)}
                    when={formatDateTime(n.at, locale, { style: "long" })}
                    onOpen={() => openNotice(n)}
                    onMenu={() => setRowMenu(n)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ActionSheet open={menu} onClose={() => setMenu(false)} title="Notification" items={headerItems} />
      <ActionSheet open={!!rowMenu} onClose={() => setRowMenu(null)} title={rowMenu?.tag} items={rowMenu ? rowItems(rowMenu) : []} />
      <ConfirmSheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "all" ? "Clear all notifications?" : "Delete this notification?"}
        body={
          confirm?.kind === "all"
            ? "They leave this phone’s list. New ones still arrive, and nothing they were about changes."
            : "It leaves this phone’s list. Nothing it was about changes."
        }
        verb={confirm?.kind === "all" ? "Clear all" : "Delete"}
        destructive
        onConfirm={() => {
          if (!confirm) return;
          const ok = updateCleared((c) => (confirm.kind === "all" ? withAllCleared(c, Date.now()) : withClearedId(c, confirm.notice.id)));
          if (!ok) failed();
          else toast({ title: confirm.kind === "all" ? "Notifications cleared" : "Notification deleted" });
        }}
      />
    </Screen>
  );
}

function NoticeRow({ n, read, when, onOpen, onMenu }: { n: Notice; read: boolean; when: string; onOpen: () => void; onMenu: () => void }) {
  const icon = KIND_ICON[n.kind];
  const error = n.id.startsWith("build:") && n.id.endsWith(":retry");
  return (
    <li className="flex items-start gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-subtle py-8">
      {icon && (
        <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-surface text-[color:var(--color-icon-default)]">
          <Icon icon={icon} size={20} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <button type="button" onClick={onOpen} className="flex flex-col gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
          {!read && <span className="sr-only">Unread: </span>}
          <span className="text-sm leading-sm text-text-tertiary">{n.tag}</span>
          <span className={cn("text-md leading-md", error ? "text-text-error" : "text-text-primary", !read && "font-medium")}>{n.title}</span>
          {n.body && <span className="text-md leading-md text-text-secondary">{n.body}</span>}
          <span className="text-sm leading-sm text-text-tertiary">{when}</span>
        </button>
        <Button size="sm" className="self-start" onClick={onOpen}>
          {actionLabelOf(n)}
        </Button>
      </div>
      <button
        type="button"
        aria-label={`More for: ${n.title}`}
        onClick={onMenu}
        className="-mr-4 inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={MoreVerticalIcon} size={20} />
      </button>
    </li>
  );
}

