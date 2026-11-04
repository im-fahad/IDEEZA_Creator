"use client";

// A thread (Figma MS-10…51, Shared kit KIT-RB-04…25, SK-04, OF-03, KB-02…02c):
// the top bar ("Name · how they stand to it", or "Team · 5 people"; tap it
// for the profile or the Members sheet) with ⋯, the context card (it folds to
// one line while you read back), the timeline, and at the foot the request
// bar above the composer — or, when you can't write, the Composer notice
// that says why (you blocked them · they blocked you · the project was
// deleted). /m/messages/new resolves an entry point's address like the web
// (`?to=…&project=…&about=…`, `?to=feed:…&post=…`, `?team=…`) into the thread
// or a draft whose first Send creates it, or one card saying why it can't.
// Every action is the web's (lib/messages/actions); a message that can't go
// stays on this phone as Not sent (phone.ts outbox).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircleIcon,
  ArchiveIcon,
  Copy01Icon,
  Delete02Icon,
  InboxIcon,
  LockIcon,
  MoreHorizontalIcon,
  Notification01Icon,
  NotificationOff01Icon,
  PencilEdit01Icon,
  RefreshIcon,
  UserBlock01Icon,
  UserIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { useContextInfo } from "@/components/messages/context-card";
import { useMessagesView } from "@/components/messages/messages-context";
import { PROJECTS } from "@/lib/feed";
import { useManualProjects } from "@/lib/manual/projects";
import {
  blockPerson,
  deleteMessage,
  editMessage,
  keyOfNew,
  markConversationRead,
  reportConversation,
  sendMessage,
  setMember,
  unblockPerson,
  type NewConversation,
} from "@/lib/messages/actions";
import { aboutIn, parseStart } from "@/lib/messages/links";
import {
  askedListingOf,
  firstNameOf,
  M_MESSAGES_HREF,
  M_REQUESTS_HREF,
  mThreadHref,
  outboxOf,
  phoneContextLineOf,
  phoneContextSentenceOf,
  photosOf,
  quoteLineOf,
  type OutboxItem,
} from "@/lib/messages/phone";
import {
  blockStateOf,
  canEdit,
  canStart,
  conversationByKey,
  conversationOf,
  entriesOf,
  isUnread,
  latestContextOf,
  otherOf,
  sameContext,
  startRefusalOf,
  stateOf,
  subjectNameOf,
  visibleTo,
} from "@/lib/messages/rules";
import { newMessagesId } from "@/lib/messages/store";
import { ME, type ContextRef, type Conversation, type MessageEntry, type Participant, type ReportReason, type Subject } from "@/lib/messages/types";
import { forgetUnsent, filesOfUnsent, keepUnsent, updateUnsent, useOutbox } from "@/lib/messages/use-outbox";
import { useAuth } from "@/lib/account/auth";
import { useMyProfile } from "@/lib/people/profile-store";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ReportSheet, type ReportReason as SheetReason } from "../kit/report-sheet";
import { ActionSheet, type ActionSheetItem } from "../kit/sheet";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { Composer, type ComposerMode, type Draft } from "./composer";
import { ComposerNotice, ContextCard, NoteCard, RequestBar, ThreadBones, type NoteTone } from "./kit";
import { MembersSheet, PhotoViewer, type Member } from "./sheets";
import { Timeline, type SendingItem } from "./timeline";
import { PhoneMessages, useAfter, useProfileHref, useSubjectAccess } from "./view";

const REASONS: SheetReason[] = [
  { id: "scam", label: "Scam or asks to pay outside IDEEZA" },
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or hate" },
  { id: "other", label: "Something else" },
];

const EMPTY: never[] = [];

// ── Routes ──────────────────────────────────────────────────────────────

export function ThreadPage({ id }: { id: string }) {
  return (
    <PhoneMessages>
      <ThreadRoute id={id} />
    </PhoneMessages>
  );
}

export function StartPage() {
  return (
    <PhoneMessages>
      <StartRoute />
    </PhoneMessages>
  );
}

function Loading({ title }: { title?: string }) {
  const show = useAfter(300);
  return (
    <Screen
      top={<TopBar back title={title} />}
      className="flex flex-col justify-end px-8 pb-6"
      footer={
        <div className="flex items-end gap-4 border-t-[length:var(--border-width-1)] border-solid border-border bg-bg-surface py-6 pl-8 pr-8">
          <p aria-hidden className="flex h-[44px] flex-1 items-center rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-6 text-lg leading-lg text-[color:var(--color-input-placeholder)]">
            Write a message
          </p>
        </div>
      }
    >
      {show && <ThreadBones />}
    </Screen>
  );
}

function Cant({ tone, icon, title, body }: { tone: NoteTone; icon: typeof InboxIcon; title: string; body: string }) {
  const router = useRouter();
  return (
    <Screen top={<TopBar back title="Message" />} className="flex flex-col justify-center px-8 pb-16">
      <NoteCard
        tone={tone}
        icon={<Icon icon={icon} size={32} />}
        title={title}
        body={body}
        titleAs="h2"
        action={
          <Button
            hierarchy="secondary"
            size="md"
            onClick={() => (window.history.length > 1 ? router.back() : router.push(M_MESSAGES_HREF))}
          >
            Back
          </Button>
        }
      />
    </Screen>
  );
}

function ThreadRoute({ id }: { id: string }) {
  const { ready, data, me, people } = useMessagesView();
  const params = useSearchParams();
  const router = useRouter();
  const aboutRaw = params.get("about");
  const about = React.useMemo(() => aboutIn(aboutRaw), [aboutRaw]);

  if (!ready) return <Loading />;
  const conversation = conversationOf(data, id);
  const teamIds = conversation?.kind === "team" && conversation.subject.kind === "project" ? people.teamIdsOf(conversation.subject.projectId) : [];
  if (!conversation || !visibleTo(conversation, me, teamIds)) {
    return <Cant tone="missing" icon={AlertCircleIcon} title="This conversation isn’t available" body="It may have been deleted." />;
  }
  return (
    <ThreadView
      key={conversation.id}
      conversation={conversation}
      subject={conversation.subject}
      kind={conversation.kind}
      other={otherOf(conversation, me)}
      pending={about}
      onSent={() => {
        if (aboutRaw) router.replace(mThreadHref(conversation.id));
      }}
    />
  );
}

type Resolved =
  | { ok: false; tone: NoteTone; icon: typeof InboxIcon; title: string; body: string }
  | { ok: true; create: NewConversation; subject: Subject; other: Participant | null; context: ContextRef };

function StartRoute() {
  const { ready, data, me, people } = useMessagesView();
  const { projects } = useManualProjects();
  const params = useSearchParams();
  const router = useRouter();
  const start = React.useMemo(() => parseStart(params), [params]);

  const resolved = React.useMemo<Resolved | null>(() => {
    if (!ready) return null;
    if (!start) return { ok: false, tone: "empty", icon: InboxIcon, title: "Nothing to start", body: "This link doesn't say who to message or what about." };
    if (start.kind === "post") {
      const post = PROJECTS.find((p) => p.slug === start.slug);
      // The phone has no Innovations (Feed), so the Figma's words.
      if (!post) return { ok: false, tone: "missing", icon: AlertCircleIcon, title: "Post not found", body: "It may have been removed." };
      const subject: Subject = { kind: "post", slug: post.slug, title: post.title };
      const to = { id: start.to, name: people.nameOf(start.to) };
      return { ok: true, create: { kind: "direct", subject, to }, subject, other: to, context: { kind: "post" } };
    }
    const project = projects.find((p) => p.id === start.projectId);
    if (!project) return { ok: false, tone: "missing", icon: AlertCircleIcon, title: "Project not found", body: "This project no longer exists." };
    const name = project.name.trim() || "Untitled project";
    const subject: Subject = { kind: "project", projectId: project.id, name };
    if (start.kind === "team") {
      if (me !== ME && !people.teamIdsOf(project.id).includes(me)) {
        return { ok: false, tone: "locked", icon: LockIcon, title: "Not your team", body: `Only ${name}'s creator and its team can open its team conversation.` };
      }
      return { ok: true, create: { kind: "team", projectId: project.id, projectName: name }, subject, other: null, context: { kind: "team" } };
    }
    const to = { id: start.to, name: people.nameOf(start.to) };
    return { ok: true, create: { kind: "direct", subject, to }, subject, other: to, context: start.about };
  }, [ready, start, projects, people, me]);

  const existing = resolved?.ok ? conversationByKey(data, keyOfNew(resolved.create, me)) : null;
  const existingId = existing?.id ?? null;
  const declined = existing ? stateOf(existing, me).declined : false;
  const context = resolved?.ok && existingId && !sameContext(latestContextOf(data, existingId), resolved.context) ? resolved.context : null;
  React.useEffect(() => {
    if (!existingId) return;
    if (declined) setMember(existingId, me, { declined: false, folder: "inbox" });
    router.replace(mThreadHref(existingId, context));
  }, [existingId, declined, me, context, router]);

  if (!resolved || existingId) return <Loading />;
  if (!resolved.ok) return <Cant tone={resolved.tone} icon={resolved.icon} title={resolved.title} body={resolved.body} />;
  if (resolved.other) {
    const check = canStart(data, me, resolved.other.id, resolved.context, people.policy);
    if (!check.ok) return <Cant tone="locked" icon={LockIcon} title="Can’t start this conversation" body={startRefusalOf(check.reason, resolved.other.name)} />;
  }
  return (
    <ThreadView
      key={`draft|${me}`}
      conversation={null}
      subject={resolved.subject}
      kind={resolved.create.kind}
      other={resolved.other}
      create={resolved.create}
      pending={resolved.context}
      onSent={(id) => router.replace(mThreadHref(id))}
    />
  );
}

// ── The thread ──────────────────────────────────────────────────────────

type Menu = null | { kind: "thread" } | { kind: "message"; entry: MessageEntry; at: number } | { kind: "unsent"; item: OutboxItem };
type Layer = null | { kind: "members" } | { kind: "report"; entryId?: string; blockName?: string } | { kind: "block" } | { kind: "delete"; entry: MessageEntry } | { kind: "photo"; index: number };
type Mode = { kind: "reply"; entryId: string } | { kind: "edit"; entryId: string } | null;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "fixed left-0 top-0 opacity-0";
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

function ThreadView({
  conversation,
  subject,
  kind,
  other,
  create,
  pending,
  onSent,
}: {
  /** Null for a draft: nothing is stored until the first Send. */
  conversation: Conversation | null;
  subject: Subject;
  kind: "direct" | "team";
  other: Participant | null;
  create?: NewConversation;
  /** The entry point's context (`?about=`), sent before the next message when it differs. */
  pending: ContextRef | null;
  onSent: (conversationId: string) => void;
}) {
  const { data, me, meAs, people, unreadable } = useMessagesView();
  const { projects } = useManualProjects();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const profileHref = useProfileHref();
  const { fields: myProfile } = useMyProfile();
  const { account } = useAuth();
  // The Members sheet names you as others see you: your profile name, else your account's.
  const myName = myProfile.name.trim() || (account ? `${account.firstName} ${account.lastName}`.trim() : "") || "You";
  const outbox = useOutbox();
  const access = useSubjectAccess(subject);
  const [menu, setMenu] = React.useState<Menu>(null);
  const [layer, setLayer] = React.useState<Layer>(null);
  const [mode, setMode] = React.useState<Mode>(null);
  const [sending, setSending] = React.useState<SendingItem[]>([]);
  const [away, setAway] = React.useState(false);
  const [announced, setAnnounced] = React.useState({ text: "", n: 0 });

  const team = kind === "team";
  const projectId = subject.kind === "project" ? subject.projectId : null;
  const projectTeam = projectId ? people.teamIdsOf(projectId) : EMPTY;
  const teamIds = team ? projectTeam : EMPTY;
  const conversationId = conversation?.id ?? null;
  const snapshots = React.useMemo(() => conversation?.participants ?? (other ? [other] : EMPTY), [conversation, other]);
  const entries = React.useMemo(() => (conversationId ? entriesOf(data, conversationId) : EMPTY), [data, conversationId]);
  const unsent = React.useMemo(() => (conversationId ? outboxOf(outbox, conversationId) : EMPTY), [outbox, conversationId]);
  const photos = React.useMemo(() => photosOf(entries), [entries]);
  const latest = conversationId ? latestContextOf(data, conversationId) : null;
  const pendingShown = pending && !sameContext(latest, pending) ? pending : null;
  const cardContext = latest ?? pending;
  const otherPerson = other ? people.personOf(other.id, snapshots) : null;
  const first = otherPerson ? firstNameOf(otherPerson.name) : "";
  const teamMemberId = [other?.id, me].find((id): id is string => !!id && projectTeam.includes(id)) ?? null;
  const infoOf = useContextInfo(teamMemberId, subject);
  const subjectName = subjectNameOf(subject);
  const memberCount = 1 + teamIds.length;
  const askedListing = (conversationId ? askedListingOf(data, conversationId) : false) || pending?.kind === "listing";
  const relation = other ? people.relationOf(me, other.id, subject, { askedListing }) : null;
  const relationWord = relation?.short ?? (relation?.long ? relation.long.charAt(0).toLowerCase() + relation.long.slice(1) : null);
  const title = team ? `Team · ${memberCount} ${memberCount === 1 ? "person" : "people"}` : `${otherPerson?.name ?? "Someone"}${relationWord ? ` · ${relationWord}` : ""}`;
  const recipientName = team ? `${subjectName} team` : (otherPerson?.name ?? "Someone");
  const block = other ? blockStateOf(data, me, other.id) : "none";
  const state = conversation ? stateOf(conversation, me) : null;
  const inRequests = !!conversation && !team && state?.folder === "requests";
  const projectGone = projectId !== null && !projects.some((p) => p.id === projectId);
  const otherHref = other ? profileHref(other.id) : null;
  // Also block, for a person you haven't blocked: fixed when the report opens, so "You blocked … too" can name them.
  const alsoBlockName = otherPerson && block !== "byMe" ? first : undefined;

  // Read on open, on each new message from someone else, and on coming back to the app.
  const unread = conversation ? isUnread(data, conversation, me) : false;
  React.useEffect(() => {
    if (!conversationId || !unread) return;
    const mark = () => {
      if (document.visibilityState === "visible") markConversationRead(conversationId, me);
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [conversationId, me, unread]);

  const lastFromOthers = React.useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.kind === "message" && e.from !== me) return e;
    }
    return null;
  }, [entries, me]);
  const seen = React.useRef<string | null | undefined>(undefined);
  React.useEffect(() => {
    const prev = seen.current;
    seen.current = lastFromOthers?.id ?? null;
    if (prev === undefined || !lastFromOthers || prev === lastFromOthers.id) return;
    setAnnounced((a) => ({ text: `New message from ${people.personOf(lastFromOthers.from, snapshots).name}`, n: a.n + 1 }));
  }, [lastFromOthers, people, snapshots]);

  const fail = (reason: string) => toast({ title: reason, lead: "error" });
  // After a change that swaps the foot (the composer for a notice), so the toast stands above the new one.
  const toastAfterFoot = (t: Parameters<typeof toast>[0]) => requestAnimationFrame(() => toast(t));

  // ── sending ──

  const deliver = async (d: Draft, replyTo?: string): Promise<string | null> => {
    const from = { id: me, name: meAs.name };
    if (!conversationId) {
      // A draft: its first Send creates the conversation, so a refusal keeps the draft and says why.
      if (!online) return "You’re offline. Your message is kept here until you’re back online.";
      const r = await sendMessage({ conversationId: null, create, from, text: d.text, files: d.files, cards: d.cards, context: pendingShown, teamIds, policy: people.policy });
      if (!r.ok) return r.reason;
      onSent(r.value.conversationId);
      return null;
    }
    const at = Date.now();
    const id = newMessagesId("out_");
    const keep = (reason: string) =>
      keepUnsent({ id, conversationId, text: d.text.trim(), cards: d.cards, context: pendingShown, ...(replyTo ? { replyTo } : {}), at, reason }, d.files);
    if (!online) {
      if (!(await keep("You’re offline."))) return "This phone’s storage is full — your message wasn’t kept.";
      return null;
    }
    // On its way: the field clears at once and the bubble reads Sending… until the store has it.
    setSending((s) => [...s, { id, text: d.text.trim(), fileNames: d.files.map((f) => f.name), cards: d.cards, at }]);
    void (async () => {
      const r = await sendMessage({ conversationId, from, text: d.text, files: d.files, cards: d.cards, context: pendingShown, teamIds, policy: people.policy, replyTo });
      if (!r.ok) {
        const kept = await keep(r.reason);
        fail(kept ? r.reason : `${r.reason} It couldn’t be kept on this phone either.`);
      }
      setSending((s) => s.filter((x) => x.id !== id));
      if (r.ok) onSent(r.value.conversationId);
    })();
    return null;
  };

  const retry = async (item: OutboxItem) => {
    if (!online) {
      fail("You’re still offline. Try again when you’re back online.");
      return;
    }
    const files = await filesOfUnsent(item);
    if (!files) {
      fail("A file in this message isn’t on this phone any more. Delete it and send it again.");
      return;
    }
    const r = await sendMessage({
      conversationId: item.conversationId,
      from: { id: me, name: meAs.name },
      text: item.text,
      files,
      cards: item.cards,
      context: item.context,
      teamIds,
      policy: people.policy,
      replyTo: item.replyTo,
    });
    if (r.ok) await forgetUnsent(item);
    else {
      updateUnsent({ ...item, reason: r.reason });
      fail(r.reason);
    }
  };

  const onSend = async (d: Draft) => {
    const replyTo = mode?.kind === "reply" ? mode.entryId : undefined;
    const why = await deliver(d, replyTo);
    if (!why && replyTo) setMode(null);
    return why;
  };

  const onSaveEdit = (text: string): string | null => {
    if (mode?.kind !== "edit") return null;
    const r = editMessage(mode.entryId, me, text);
    if (!r.ok) return r.reason;
    setMode(null);
    return null;
  };

  // ── people actions ──

  const doBlock = () => {
    if (!otherPerson) return;
    const r = blockPerson(me, otherPerson.id);
    if (!r.ok) return fail(r.reason);
    toastAfterFoot({
      title: `You blocked ${first}`,
      action: {
        label: "Undo",
        onClick: () => {
          const u = unblockPerson(me, otherPerson.id);
          if (u.ok) toastAfterFoot({ title: `You unblocked ${first}` });
        },
      },
    });
  };
  const doUnblock = () => {
    if (!otherPerson) return;
    const r = unblockPerson(me, otherPerson.id);
    if (r.ok) toastAfterFoot({ title: `You unblocked ${first}` });
    else fail(r.reason);
  };
  const toggle = (patch: "muted" | "archived") => {
    if (!conversation || !state) return;
    const value = !state[patch];
    const r = setMember(conversation.id, me, { [patch]: value });
    if (!r.ok) return fail(r.reason);
    const words = patch === "muted" ? (value ? "Muted" : "Unmuted") : value ? "Archived" : "Moved back to your list";
    toast({ title: words, action: { label: "Undo", onClick: () => setMember(conversation.id, me, { [patch]: !value }) } });
  };

  // ── menus ──

  const threadItems: ActionSheetItem[] =
    conversation && state
      ? [
          ...(team
            ? [{ label: "Members", icon: UserMultipleIcon, onSelect: () => setLayer({ kind: "members" }) }]
            : otherHref
              ? [{ label: "View profile", icon: UserIcon, onSelect: () => router.push(otherHref) }]
              : []),
          { label: state.muted ? "Unmute" : "Mute", icon: state.muted ? Notification01Icon : NotificationOff01Icon, onSelect: () => toggle("muted") },
          { label: state.archived ? "Unarchive" : "Archive", icon: ArchiveIcon, onSelect: () => toggle("archived") },
          { label: "Report conversation", icon: AlertCircleIcon, onSelect: () => setLayer({ kind: "report", blockName: alsoBlockName }) },
          ...(otherPerson
            ? block === "byMe"
              ? [{ label: `Unblock ${first}`, icon: UserBlock01Icon, onSelect: doUnblock }]
              : [{ label: `Block ${first}`, icon: UserBlock01Icon, destructive: true, onSelect: () => setLayer({ kind: "block" }) }]
            : []),
        ]
      : [];

  /** `at`: when the menu opened, for the 15 minutes Edit and Delete have. */
  const messageMenu = (e: MessageEntry, at: number): { title: string; items: ActionSheetItem[] } => {
    const mine = e.from === me;
    const items: ActionSheetItem[] = [];
    if (e.deletedAt === undefined && e.text) {
      items.push({
        label: "Copy",
        icon: Copy01Icon,
        onSelect: () => void copyText(e.text).then((ok) => toast(ok ? { title: "Copied" } : { title: "Couldn’t copy.", lead: "error" })),
      });
    }
    if (mine && canEdit(e, me, at)) {
      if (e.text) items.push({ label: "Edit", icon: PencilEdit01Icon, onSelect: () => setMode({ kind: "edit", entryId: e.id }) });
      items.push({ label: "Delete", icon: Delete02Icon, destructive: true, onSelect: () => setLayer({ kind: "delete", entry: e }) });
    }
    if (!mine && e.deletedAt === undefined) items.push({ label: "Report message", icon: AlertCircleIcon, onSelect: () => setLayer({ kind: "report", entryId: e.id, blockName: alsoBlockName }) });
    const sender = mine ? null : firstNameOf(people.personOf(e.from, snapshots).name);
    return { title: sender ? `Message from ${sender}` : "Your message", items };
  };

  const shownMenu =
    menu?.kind === "thread"
      ? { title: team ? `${subjectName} team` : (otherPerson?.name ?? ""), items: threadItems }
      : menu?.kind === "message"
        ? messageMenu(menu.entry, menu.at)
        : menu?.kind === "unsent"
          ? {
              title: "Message not sent",
              items: [
                { label: "Retry", icon: RefreshIcon, onSelect: () => void retry(menu.item) },
                { label: "Delete", icon: Delete02Icon, destructive: true, onSelect: () => void forgetUnsent(menu.item) },
              ],
            }
          : null;

  // ── the composer's mode ──

  const modeEntry = mode ? (entries.find((e) => e.id === mode.entryId && e.kind === "message") as MessageEntry | undefined) : undefined;
  const composerMode = React.useMemo<ComposerMode>(() => {
    if (!mode || !modeEntry) return null;
    if (mode.kind === "edit") return { kind: "edit", text: modeEntry.text };
    const who = modeEntry.from === me ? "yourself" : firstNameOf(people.personOf(modeEntry.from, snapshots).name);
    return { kind: "reply", line: `Replying to ${who} · ${quoteLineOf(modeEntry)}` };
    // The edited message's text is read when editing starts, not on every change to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, modeEntry?.id]);

  const teamMembers = React.useMemo<Member[]>(() => {
    if (!team || !projectId) return [];
    const t = people.sources.teams.find((x) => x.projectId === projectId);
    return [
      { id: ME, name: myName, role: "Creator", you: true, href: profileHref(ME) },
      ...(t?.members ?? []).map((m) => ({ id: m.id, name: m.name, role: m.role, you: m.id === me, href: profileHref(m.id) })),
    ];
  }, [team, projectId, people.sources.teams, myName, me, profileHref]);

  // ── the foot ──

  const foot = (() => {
    if (block === "byMe" && otherPerson) return <ComposerNotice action={{ label: "Unblock", onClick: doUnblock }}>You blocked {first}.</ComposerNotice>;
    if (block === "byThem") return <ComposerNotice>You can’t reply to this conversation.</ComposerNotice>;
    if (team && projectGone) return <ComposerNotice>This project was deleted.</ComposerNotice>;
    return (
      <Composer
        key={`${conversationId ?? "draft"}|${me}`}
        recipientName={recipientName}
        mode={composerMode}
        onCloseMode={() => setMode(null)}
        contextLine={pendingShown ? phoneContextSentenceOf(pendingShown, infoOf(pendingShown)) : null}
        canAddProject={me === ME}
        disabled={unreadable}
        autoFocus={!conversation}
        onSend={onSend}
        onSaveEdit={onSaveEdit}
      />
    );
  })();

  const titleNode =
    team || otherHref ? (
      <button
        type="button"
        onClick={() => (team ? setLayer({ kind: "members" }) : otherHref && router.push(otherHref))}
        aria-label={team ? `${title}. Show members` : `${title}. View profile`}
        className="max-w-full truncate rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {title}
      </button>
    ) : (
      title
    );

  return (
    <Screen
      top={
        <TopBar
          back
          title={titleNode}
          actions={threadItems.length ? [{ icon: MoreHorizontalIcon, label: "Conversation actions", onClick: () => setMenu({ kind: "thread" }) }] : []}
        />
      }
      className="flex flex-col overflow-hidden"
      footer={
        <>
          {inRequests && conversation && otherPerson && (
            <RequestBar
              onAccept={() => {
                const r = setMember(conversation.id, me, { folder: "inbox" });
                if (r.ok) toastAfterFoot({ title: "Moved to your Inbox." });
                else fail(r.reason);
              }}
              onDelete={() => {
                const r = setMember(conversation.id, me, { declined: true });
                if (!r.ok) return fail(r.reason);
                router.replace(M_REQUESTS_HREF);
                toast({ title: "Request deleted." });
              }}
              onBlock={block === "byMe" ? null : () => setLayer({ kind: "block" })}
            />
          )}
          {foot}
        </>
      }
    >
      <div className="flex shrink-0 flex-col gap-4 px-8 pb-4">
        <OfflineBanner />
        <ContextCard
          access={access}
          caption={cardContext ? phoneContextLineOf(cardContext, infoOf(cardContext)) : null}
          label={conversation ? "About this conversation" : "About"}
          collapsed={away}
        />
      </div>
      <Timeline
        conversationId={conversationId}
        entries={entries}
        team={team}
        subject={subject}
        snapshots={snapshots}
        teamMemberId={teamMemberId}
        label={`Conversation with ${recipientName}`}
        readOnly={!conversation}
        sending={sending}
        unsent={unsent}
        onAway={setAway}
        handlers={{
          onHold: (e) => setMenu({ kind: "message", entry: e, at: Date.now() }),
          onReply: (e) => setMode({ kind: "reply", entryId: e.id }),
          onOpenPhoto: (key) => {
            const index = photos.findIndex((p) => p.file.key === key);
            if (index >= 0) setLayer({ kind: "photo", index });
          },
          onRetry: (item) => void retry(item),
          onUnsentMenu: (item) => setMenu({ kind: "unsent", item }),
        }}
      />
      <p aria-live="polite" className="sr-only">
        {announced.text}
        {announced.n % 2 ? " " : ""}
      </p>

      <ActionSheet open={!!shownMenu && shownMenu.items.length > 0} onClose={() => setMenu(null)} title={shownMenu?.title} items={shownMenu?.items ?? []} />
      {team && (
        <MembersSheet
          open={layer?.kind === "members"}
          onClose={() => setLayer(null)}
          teamName={`${subjectName} team`}
          members={teamMembers}
          teamHref={projectGone || !projectId ? null : `/m/projects/${projectId}?tab=team`}
        />
      )}
      {conversation && (
        <ReportSheet
          open={layer?.kind === "report"}
          onClose={() => setLayer(null)}
          title={layer?.kind === "report" && layer.entryId ? "Report message" : "Report conversation"}
          description={otherPerson ? `${first} won’t know who reported.` : "They won’t know who reported."}
          reasons={REASONS}
          blockName={layer?.kind === "report" ? layer.blockName : undefined}
          onSend={async (input) => {
            const r = reportConversation({
              by: me,
              conversationId: conversation.id,
              ...(layer?.kind === "report" && layer.entryId ? { entryId: layer.entryId } : {}),
              reason: input.reason as ReportReason,
              note: input.note,
              alsoBlock: input.alsoBlock && otherPerson ? otherPerson.id : null,
            });
            if (!r.ok) throw new Error(r.reason);
          }}
        />
      )}
      <ConfirmSheet
        open={layer?.kind === "block"}
        onClose={() => setLayer(null)}
        title={`Block ${first}?`}
        body={`${first} won’t be able to message you, and their comments on your shared projects are held. They won’t be told. You can unblock them in Settings › Privacy & safety.`}
        verb="Block"
        destructive
        onConfirm={doBlock}
      />
      <ConfirmSheet
        open={layer?.kind === "delete"}
        onClose={() => setLayer(null)}
        title="Delete this message?"
        body="It shows as “Message deleted” for everyone in this conversation."
        verb="Delete"
        destructive
        onConfirm={async () => {
          if (layer?.kind !== "delete") return;
          const r = await deleteMessage(layer.entry.id, me);
          if (!r.ok) fail(r.reason);
          else {
            if (mode?.entryId === layer.entry.id) setMode(null);
            toast({ title: "Message deleted" });
          }
        }}
      />
      {layer?.kind === "photo" && <PhotoViewer photos={photos} start={layer.index} onClose={() => setLayer(null)} />}
    </Screen>
  );
}
