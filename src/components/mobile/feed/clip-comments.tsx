"use client";

// Feed · "Comments on a clip" (mobile Figma 01–03, note MFR-17): the DS M100
// Comments block inside the tall M09 sheet, its title the count ("12
// comments"). The sort (Top ⌄, a pick-one sheet), then the threads: a comment
// (A16 MD avatar), its replies under it (SM), "View n more replies"; Reply ·
// ♥ n · ⋯ on each. The composer (_Comment input) is pinned at the foot:
// "Add a comment…" with Link · Image · @ and Post; Reply mode says "Replying
// to @Name" with Cancel and Reply; Edit mode Cancel and Save.
//
// Every rule is the web's (lib/innovations/comments.ts) and every write goes to
// the post's comment store, so the count on the clip, the web's post and the
// project page move together: three levels, Top · Newest · Oldest, ten
// comments a page, three replies a step, the ⋯ by role (your own: Edit · Copy
// link · Delete; someone else's: Copy link · Report), "Comment deleted" when a
// thread must hold, blocked people's words hidden. A write the phone refuses
// keeps the words and says so. Guests read; writing asks them in.

import * as React from "react";
import {
  ArrowDown01Icon,
  AtIcon,
  Cancel01Icon,
  Copy01Icon,
  Delete02Icon,
  FavouriteIcon,
  Flag02Icon,
  Image01Icon,
  Link01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { downscalePhoto } from "@/components/innovations/comments/comment-dom";
import { clipHref, type FeedClip } from "@/lib/innovations/clips";
import {
  actionsFor,
  addComment,
  agoLabel,
  bodyProblem,
  childrenOf,
  clampBody,
  commentCount,
  COMMENT_MAX,
  COMMENTS_PAGE,
  deleteComment,
  depthOf,
  editComment,
  likesOf,
  mentionablesOf,
  mentionMatches,
  mentionQueryAt,
  placeholderOf,
  REPLIES_STEP,
  SORTS,
  toggleLike,
  topLevelOf,
  writeRefusalOf,
  type CommentSort,
  type CommentViewer,
  type PostComment,
} from "@/lib/innovations/comments";
import { useBlockWith, useBlockedAuthors, useMakerRulesFor, usePostComments } from "@/lib/innovations/comments-store";
import { personOf } from "@/lib/innovations/people";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import { ME_ID } from "@/lib/innovations/types";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ReportSheet } from "../kit/report-sheet";
import { ActionSheet, Sheet, type ActionSheetItem } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { VIDEO_REPORT_REASONS } from "./clip-menu";
import { PickSheet } from "./pick-sheet";
import { newId, useMinuteNow } from "./use-feed";
import type { Guard } from "./use-guest";

type Mode = { kind: "comment" } | { kind: "reply"; target: PostComment } | { kind: "edit"; target: PostComment };

type Photo = { src: string; name: string };

/** "12 comments" — the sheet's title. */
export const commentsTitle = (n: number) => `${n} ${n === 1 ? "comment" : "comments"}`;

export function ClipComments({ clip, open, onClose, guard }: { clip: FeedClip; open: boolean; onClose: () => void; guard: Guard }) {
  const toast = useToast();
  const me = useMe();
  const myPhoto = useMyPhoto();
  const { hydrated, comments, reported, write } = usePostComments(clip.postId, sampleSeedOf(clip.postId));
  const rules = useMakerRulesFor(clip.postId);
  const blocked = useBlockedAuthors();
  const refusal = writeRefusalOf(useBlockWith(clip.creator.id), clip.creator.name);
  const viewer = React.useMemo<CommentViewer>(() => ({ meId: ME_ID, isPostOwner: false, makerRules: rules, blocked }), [rules, blocked]);

  const [sort, setSort] = React.useState<CommentSort>("top");
  const [sorting, setSorting] = React.useState(false);
  const [pinned, setPinned] = React.useState<string[]>([]);
  const [pages, setPages] = React.useState(1);
  const [replies, setReplies] = React.useState<Record<string, number>>({});
  const [mode, setMode] = React.useState<Mode>({ kind: "comment" });
  const [text, setText] = React.useState("");
  const [photo, setPhoto] = React.useState<Photo | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [menu, setMenu] = React.useState<PostComment | null>(null);
  const [deleting, setDeleting] = React.useState<PostComment | null>(null);
  const [reporting, setReporting] = React.useState<PostComment | null>(null);
  const field = React.useRef<HTMLTextAreaElement>(null);
  const file = React.useRef<HTMLInputElement>(null);
  const [caret, setCaret] = React.useState(0);
  // Reply and Edit bring the field into focus once the composer shows their words.
  const [focusAsk, setFocusAsk] = React.useState(0);
  React.useEffect(() => {
    if (focusAsk) field.current?.focus();
  }, [focusAsk]);

  const count = commentCount(comments, rules);
  const tops = topLevelOf(comments, sort, pinned);
  const shownTops = tops.slice(0, pages * COMMENTS_PAGE);

  const save = (next: PostComment[], nextReported = reported) => write({ comments: next, reported: nextReported }).ok;

  const nameOf = (id: string) => (id === ME_ID ? me.name : personOf(id).name);

  const resetComposer = () => {
    setMode({ kind: "comment" });
    setText("");
    setPhoto(null);
    setFailed(false);
  };

  const send = () => {
    const problem = bodyProblem(text);
    if (problem) {
      toast({ title: problem, lead: "error" });
      return;
    }
    guard("Sign in to comment", () => {
      const now = Date.now();
      let next: PostComment[];
      let id: string | null = null;
      if (mode.kind === "edit") next = editComment(comments, mode.target.id, text, now);
      else {
        id = newId("m");
        next = addComment(
          comments,
          { id, postId: clip.postId, authorId: ME_ID, body: text, image: mode.kind === "comment" ? photo?.src ?? null : null, target: mode.kind === "reply" ? mode.target : undefined },
          now,
        );
      }
      if (!save(next)) {
        setFailed(true);
        return;
      }
      if (id && mode.kind === "comment") setPinned((p) => [id as string, ...p]);
      if (id && mode.kind === "reply") {
        const root = rootIdOf(mode.target, comments);
        setReplies((r) => ({ ...r, [root]: Math.max(r[root] ?? 0, 999) }));
      }
      resetComposer();
    });
  };

  const like = (c: PostComment) =>
    guard("Sign in to like this comment", () => {
      if (!save(toggleLike(comments, c.id))) toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
    });

  const reply = (c: PostComment) =>
    guard("Sign in to reply", () => {
      setMode({ kind: "reply", target: c });
      setText(c.authorId === ME_ID ? "" : `@${nameOf(c.authorId)} `);
      setPhoto(null);
      setFocusAsk((n) => n + 1);
    });

  const copyLink = (c: PostComment) => {
    const url = new URL(`${clipHref(clip.id)}?comment=${encodeURIComponent(c.id)}`, window.location.origin).toString();
    const ok = () => toast({ title: "Link to comment copied to clipboard" });
    const no = () => toast({ title: "Couldn’t copy the link", lead: "error" });
    if (!navigator.clipboard) return no();
    navigator.clipboard.writeText(url).then(ok, no);
  };

  const menuItems = (c: PostComment): ActionSheetItem[] =>
    actionsFor(c, viewer, reported).flatMap((a): ActionSheetItem[] => {
      switch (a) {
        case "edit":
          return [
            {
              label: "Edit",
              icon: PencilEdit02Icon,
              onSelect: () => {
                setMode({ kind: "edit", target: c });
                setText(c.body);
                setPhoto(null);
                setFocusAsk((n) => n + 1);
              },
            },
          ];
        case "copy":
          return [{ label: "Copy link", icon: Copy01Icon, onSelect: () => copyLink(c) }];
        case "report":
          return [{ label: "Report", icon: Flag02Icon, onSelect: () => guard("Sign in to report this comment", () => setReporting(c)) }];
        case "reported":
          return [{ label: "Reported", icon: Flag02Icon, onSelect: () => toast({ title: "You reported this comment. We’re looking into it." }) }];
        case "delete":
          return [{ label: "Delete", icon: Delete02Icon, destructive: true, onSelect: () => setDeleting(c) }];
        default:
          return [];
      }
    });

  const mentionAt = mentionQueryAt(text, caret);
  const people = mentionablesOf(comments, ME_ID, blocked).map((id) => ({ id, name: personOf(id).name }));
  const matches = mentionAt ? mentionMatches(people, mentionAt.query, 4) : [];
  const pickMention = (name: string) => {
    if (!mentionAt) return;
    const next = `${text.slice(0, mentionAt.start)}@${name} ${text.slice(caret)}`;
    setText(next.slice(0, COMMENT_MAX));
    const at = mentionAt.start + name.length + 2;
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(at, at);
      setCaret(at);
    });
  };
  const insert = (s: string) => {
    const el = field.current;
    const at = el ? el.selectionStart : text.length;
    const lead = at > 0 && !/\s/.test(text[at - 1]) ? " " : "";
    const next = `${text.slice(0, at)}${lead}${s}${text.slice(at)}`;
    setText(next.slice(0, COMMENT_MAX));
    const pos = at + lead.length + s.length;
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast({ title: "Choose an image: a JPEG, PNG, WebP or GIF.", lead: "error" });
    try {
      setPhoto({ src: await downscalePhoto(f), name: f.name });
    } catch {
      toast({ title: "Couldn’t read that image. Try a JPEG or PNG.", lead: "error" });
    }
  };

  const verb = mode.kind === "edit" ? "Save" : mode.kind === "reply" ? "Reply" : "Post";
  const problem = bodyProblem(text);

  const composer = refusal ? (
    <p className="px-2 py-4 text-md leading-md text-text-secondary">{refusal}</p>
  ) : (
    <div className="flex items-start gap-6 rounded-lg p-4">
      <Avatar size={mode.kind === "comment" ? "md" : "sm"} initials={me.initials} src={myPhoto.url ?? undefined} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {mode.kind === "reply" && <p className="text-md leading-md text-text-tertiary">Replying to @{nameOf(mode.target.authorId)}</p>}
        {mode.kind === "edit" && <p className="text-md leading-md text-text-tertiary">Editing your comment</p>}
        {matches.length > 0 && (
          <ul aria-label="People in this conversation" className="flex flex-col rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface py-2">
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pickMention(p.name)}
                  className="flex min-h-[40px] w-full items-center gap-4 px-6 text-left text-md leading-md text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <Avatar size="xs" initials={personOf(p.id).initials} color={personOf(p.id).color} />
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col overflow-hidden rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border)] bg-[var(--color-input-bg)] focus-within:border-[var(--color-input-border-focus)] focus-within:shadow-focus-brand">
          <label className="sr-only" htmlFor={`compose-${clip.id}`}>
            {mode.kind === "reply" ? "Your reply" : mode.kind === "edit" ? "Your comment" : "Add a comment"}
          </label>
          <textarea
            id={`compose-${clip.id}`}
            ref={field}
            value={text}
            maxLength={COMMENT_MAX}
            placeholder="Add a comment…"
            onChange={(e) => {
              setText(e.target.value);
              setCaret(e.target.selectionStart);
              setFailed(false);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && mode.kind !== "comment") {
                e.stopPropagation();
                resetComposer();
              }
            }}
            className="h-[80px] resize-none bg-transparent px-6 pb-4 pt-5 text-md leading-md text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)]"
          />
          {photo && (
            <div className="flex items-center gap-4 px-6 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- the photo going with the comment */}
              <img src={photo.src} alt={`Photo: ${photo.name}`} className="size-[48px] rounded-md object-cover" />
              <button
                type="button"
                aria-label="Remove the photo"
                onClick={() => setPhoto(null)}
                className="inline-flex size-[32px] items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            </div>
          )}
        </div>
        {failed && <p className="text-sm leading-sm text-text-error">This phone couldn’t save it. Your words are kept; try again.</p>}
        <div className="flex items-center gap-2">
          <ToolButton label="Add a link" icon={Link01Icon} onClick={() => insert("https://")} />
          <ToolButton
            label={photo ? "Replace the photo" : "Add a photo"}
            icon={Image01Icon}
            disabledReason={mode.kind !== "comment" ? "Photos go with a comment, not a reply" : null}
            onClick={() => file.current?.click()}
          />
          <ToolButton label="Mention someone" icon={AtIcon} onClick={() => insert("@")} />
          <input ref={file} type="file" accept="image/*" tabIndex={-1} aria-hidden className="sr-only" onChange={pickPhoto} />
          <span className="flex-1" />
          {mode.kind !== "comment" && (
            <Button hierarchy="ghost" size="sm" onClick={resetComposer}>
              Cancel
            </Button>
          )}
          <Button size="sm" disabled={!!problem} onClick={send}>
            {failed ? "Try again" : verb}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title={hydrated ? commentsTitle(count) : "Comments"} fill footer={composer}>
        {!hydrated ? (
          <div role="status" aria-label="Loading comments" className="flex flex-col gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-6 p-4">
                <Skeleton shape="circle" size="lg" />
                <div className="flex flex-1 flex-col gap-4">
                  <Skeleton shape="text" size="md" />
                  <Skeleton shape="text" size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : tops.length === 0 ? (
          <p className="py-8 text-center text-md leading-md text-text-secondary">Be the first to comment.</p>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex justify-end">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Sort comments: ${SORTS.find((s) => s.id === sort)?.label}`}
                onClick={() => setSorting(true)}
                className="flex items-center gap-2 rounded-sm text-sm font-medium leading-xs text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {SORTS.find((s) => s.id === sort)?.label}
                <Icon icon={ArrowDown01Icon} size={16} />
              </button>
            </div>
            <ul className="flex flex-col gap-8">
              {shownTops.map((c) => (
                <li key={c.id}>
                  <Thread
                    root={c}
                    comments={comments}
                    viewer={viewer}
                    makerId={clip.creator.id}
                    shown={replies[c.id] ?? 0}
                    onMore={(n) => setReplies((r) => ({ ...r, [c.id]: (r[c.id] ?? 0) + n }))}
                    nameOf={nameOf}
                    me={{ initials: me.initials, photo: myPhoto.url }}
                    onReply={reply}
                    onLike={like}
                    onMenu={(x) => setMenu(x)}
                  />
                </li>
              ))}
            </ul>
            {tops.length > shownTops.length && (
              <Button hierarchy="secondary" size="md" className="self-center" onClick={() => setPages((p) => p + 1)}>
                View more comments ({tops.length - shownTops.length})
              </Button>
            )}
          </div>
        )}
      </Sheet>
      <PickSheet
        open={sorting}
        onClose={() => setSorting(false)}
        title="Sort comments"
        options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
        value={sort}
        onPick={(s) => {
          setSort(s);
          setPinned([]);
        }}
      />
      <ActionSheet open={!!menu} onClose={() => setMenu(null)} title={menu ? `${nameOf(menu.authorId)}’s comment` : undefined} items={menu ? menuItems(menu) : []} />
      <ConfirmSheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this comment?"
        body="It can’t be brought back."
        verb="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          if (!save(deleteComment(comments, deleting.id, Date.now()))) toast({ title: "This phone couldn’t delete it. Nothing changed.", lead: "error" });
          else if (mode.kind !== "comment" && mode.target.id === deleting.id) resetComposer();
        }}
      />
      <ReportSheet
        open={!!reporting}
        onClose={() => setReporting(null)}
        title="Report this comment"
        description={`${reporting ? nameOf(reporting.authorId).split(" ")[0] : "They"} won’t know who reported.`}
        reasons={VIDEO_REPORT_REASONS}
        note={{ label: "Tell us more", placeholder: "What happened in this comment?", onlyFor: "other" }}
        onSend={async () => {
          if (!reporting || !save(comments, [...reported, reporting.id])) throw new Error("not saved");
        }}
      />
    </>
  );
}

function rootIdOf(c: PostComment, list: readonly PostComment[]): string {
  let cur = c;
  for (let i = 0; i < 5 && cur.parentId; i++) {
    const parent = list.find((x) => x.id === cur.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur.id;
}

function ToolButton({
  label,
  icon,
  onClick,
  disabledReason = null,
}: {
  label: string;
  icon: typeof Link01Icon;
  onClick: () => void;
  disabledReason?: string | null;
}) {
  return (
    <button
      type="button"
      aria-label={disabledReason ? `${label}. ${disabledReason}` : label}
      title={disabledReason ?? undefined}
      disabled={!!disabledReason}
      onClick={onClick}
      className="inline-flex size-[32px] items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-[color:var(--color-icon-disabled)]"
    >
      <Icon icon={icon} size={16} />
    </button>
  );
}

type RowCtx = {
  comments: readonly PostComment[];
  viewer: CommentViewer;
  makerId: string;
  nameOf: (id: string) => string;
  me: { initials: string; photo: string | null };
  onReply: (c: PostComment) => void;
  onLike: (c: PostComment) => void;
  onMenu: (c: PostComment) => void;
};

/** A comment and the replies under it: the first `shown` of them, then "View n more replies". */
function Thread({ root, shown, onMore, ...ctx }: RowCtx & { root: PostComment; shown: number; onMore: (n: number) => void }) {
  const below = flatten(root, ctx.comments);
  const visible = below.slice(0, shown);
  const left = below.length - visible.length;
  return (
    <div className="flex flex-col">
      <CommentRow c={root} depth={0} {...ctx} />
      {visible.map((r) => (
        <div key={r.id} className={depthOf(r, ctx.comments) >= 2 ? "pl-[96px]" : "pl-[52px]"}>
          <CommentRow c={r} depth={depthOf(r, ctx.comments)} {...ctx} />
        </div>
      ))}
      {left > 0 && (
        <div className="pb-2 pl-[48px]">
          <button
            type="button"
            onClick={() => onMore(REPLIES_STEP)}
            className="flex min-h-[32px] items-center text-sm font-medium leading-xs text-text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            View {left} more {left === 1 ? "reply" : "replies"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Replies in reading order: each reply, then the nested replies under it. */
function flatten(root: PostComment, list: readonly PostComment[]): PostComment[] {
  return childrenOf(list, root.id).flatMap((r) => [r, ...childrenOf(list, r.id)]);
}

function CommentRow({ c, depth, viewer, makerId, nameOf, me, onReply, onLike, onMenu }: RowCtx & { c: PostComment; depth: number }) {
  const [open, setOpen] = React.useState(false);
  const instead = placeholderOf(c, viewer);
  const person = personOf(c.authorId);
  const mine = c.authorId === ME_ID;
  const { text, clamped } = clampBody(c.body, open);
  const menu = actionsFor(c, viewer, []).length > 0;
  const now = useMinuteNow();
  return (
    <div className="flex items-start gap-6 rounded-lg p-4">
      {mine ? (
        <Avatar size={depth === 0 ? "md" : "sm"} initials={me.initials} src={me.photo ?? undefined} />
      ) : (
        <Avatar size={depth === 0 ? "md" : "sm"} initials={person.initials} color={person.color} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {instead ? (
          <p className="py-2 text-md leading-md text-text-tertiary">{instead}</p>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2 text-md leading-md">
              <span className="font-semibold tracking-wide text-text-primary">{nameOf(c.authorId)}</span>
              {c.authorId === makerId && <Badge tone="brand">Maker</Badge>}
              <span aria-hidden className="text-text-tertiary">
                •
              </span>
              <span className="text-text-tertiary">{agoLabel(c.createdAt, now)}</span>
              {c.editedAt !== null && <span className="text-text-tertiary">• edited</span>}
            </p>
            {c.replyTo && <p className="text-sm leading-sm text-text-tertiary">Replying to @{nameOf(c.replyTo)}</p>}
            <p className="whitespace-pre-wrap break-words text-md leading-md text-text-primary">
              {text}
              {clamped && (
                <button type="button" onClick={() => setOpen(true)} className="ml-2 font-medium text-text-brand outline-none hover:underline focus-visible:underline">
                  See more
                </button>
              )}
            </p>
            {c.image && (
              // eslint-disable-next-line @next/next/no-img-element -- the photo that came with the comment
              <img src={c.image} alt={`Photo from ${nameOf(c.authorId)}`} className="mt-2 max-h-[200px] w-auto max-w-full rounded-md object-cover" />
            )}
          </>
        )}
        {c.deletedAt === null && (
          <div className="flex items-center pt-3">
            {!instead && (
              <>
                <button
                  type="button"
                  onClick={() => onReply(c)}
                  className="inline-flex items-center rounded-lg px-3 py-4 text-sm font-semibold leading-xs tracking-wide text-[color:var(--color-button-secondary-text)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Reply
                </button>
                <button
                  type="button"
                  aria-pressed={c.likedByMe}
                  aria-label={`${c.likedByMe ? "Liked" : "Like"}, ${likesOf(c)}`}
                  onClick={() => onLike(c)}
                  className="inline-flex items-center gap-3 rounded-lg px-3 py-4 text-sm font-semibold leading-xs tracking-wide text-text-secondary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <span className={cn(c.likedByMe && "text-[color:var(--color-icon-error)] [&_path]:fill-current")}>
                    <Icon icon={FavouriteIcon} size={14} />
                  </span>
                  {likesOf(c) > 0 && likesOf(c).toLocaleString("en-US")}
                </button>
              </>
            )}
            {menu && (
              <button
                type="button"
                aria-label={`More for ${nameOf(c.authorId)}’s comment`}
                onClick={() => onMenu(c)}
                className="inline-flex size-[32px] items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={MoreHorizontalIcon} size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
