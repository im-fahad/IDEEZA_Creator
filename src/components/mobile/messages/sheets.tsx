"use client";

// The Message tab's own layers: Members (MS-31, the team thread's header —
// read-only, a row opens the profile, Open Team goes to the project), Share a
// project (MS-15, the composer's + › Project; one already on the message reads
// Added) and the photo viewer (MS-22: n of N, the photo, its name, ← → and
// Save photo; a PDF opens the phone's own preview instead).

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft02Icon, ArrowRight01Icon, ArrowRight02Icon, Cancel01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useMessageFileUrl } from "@/lib/messages/files";
import { initialsOfName } from "@/lib/messages/people";
import type { PhotoRef } from "@/lib/messages/phone";
import type { CardRef } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { HomeIndicator } from "../home-indicator";
import { Sheet } from "../kit/sheet";
import { StatusBar } from "../status-bar";
import { CoverTile, TEXT_ACTION } from "./kit";

// ── Members ─────────────────────────────────────────────────────────────

export type Member = { id: string; name: string; role: string; you: boolean; href: string | null };

export function MembersSheet({
  open,
  onClose,
  teamName,
  members,
  teamHref,
}: {
  open: boolean;
  onClose: () => void;
  teamName: string;
  members: Member[];
  /** The project's Team tab, while the project is there. */
  teamHref: string | null;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`Members (${members.length})`} description={teamName}>
      <ul role="list" className="-mx-8 flex flex-col">
        {members.map((m) => {
          const body = (
            <>
              <Avatar size="md" initials={initialsOfName(m.name)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-lg leading-lg text-text-primary">{m.name}</span>
                <span className="truncate text-md leading-md text-text-secondary">{m.role}</span>
              </span>
              {m.you && <Badge tone="neutral">You</Badge>}
            </>
          );
          const row = "flex min-h-[64px] w-full items-center gap-6 rounded-md px-8 py-3";
          return (
            <li key={m.id}>
              {m.href ? (
                <Link
                  href={m.href}
                  onClick={onClose}
                  className={cn(row, "outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
                >
                  {body}
                </Link>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 pb-4">
        <p className="text-sm leading-sm text-text-secondary">The team is managed in the project’s Team tab.</p>
        {teamHref && (
          <Link href={teamHref} onClick={onClose} className={cn(TEXT_ACTION, "self-start")}>
            Open Team
          </Link>
        )}
      </div>
    </Sheet>
  );
}

// ── Share a project ─────────────────────────────────────────────────────

export function ShareProjectSheet({
  open,
  onClose,
  attached,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** Project ids already on this message: each goes on once. */
  attached: readonly string[];
  onPick: (card: CardRef) => void;
}) {
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  return (
    <Sheet open={open} onClose={onClose} title="Share a project">
      {projects.length === 0 ? (
        <p className="pb-4 text-md leading-md text-text-secondary">You have no projects yet.</p>
      ) : (
        <ul role="list" className="-mx-8 flex flex-col">
          {projects.map((p) => {
            const name = p.name.trim() || "Untitled project";
            const added = attached.includes(p.id);
            const n = p.products?.length ?? 0;
            const line = added ? "Added" : n > 0 ? `${n} product${n === 1 ? "" : "s"}` : p.status === "draft" ? "Draft" : "Completed";
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={added}
                  aria-label={added ? `${name}, added` : `Share ${name}`}
                  onClick={() => onPick({ kind: "project", projectId: p.id, name })}
                  className="flex w-full items-center gap-8 rounded-md px-8 py-4 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <CoverTile access={{ name, cover: coverOf(p, buildsOf(p, builds)), gradient: null }} size={56} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-lg font-medium leading-lg text-text-primary">{name}</span>
                    <span className="truncate text-md leading-md text-text-secondary">{line}</span>
                  </span>
                  {!added && (
                    <span className="text-[color:var(--color-icon-default)]">
                      <Icon icon={ArrowRight01Icon} size={20} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

// ── Photo viewer ────────────────────────────────────────────────────────

const APP_ID = "m-app";

export function PhotoViewer({ photos, start, onClose }: { photos: PhotoRef[]; start: number; onClose: () => void }) {
  const [at, setAt] = React.useState(start);
  const panel = React.useRef<HTMLDivElement>(null);
  const swipe = React.useRef<number | null>(null);
  const photo = photos[Math.min(at, photos.length - 1)];
  const { url, missing } = useMessageFileUrl(photo?.file.key ?? null);
  useDialogFocus(true, panel);

  const go = React.useCallback((d: number) => setAt((i) => Math.min(photos.length - 1, Math.max(0, i + d))), [photos.length]);

  React.useEffect(() => {
    const app = document.getElementById(APP_ID);
    app?.setAttribute("inert", "");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      app?.removeAttribute("inert");
    };
  }, [onClose, go]);

  if (!photo) return null;
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${at + 1} of ${photos.length}`}
      data-theme="dark"
      className="fixed inset-0 z-sheet flex flex-col bg-bg-page font-sans text-text-primary motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal"
    >
      <StatusBar tone="media" />
      <header className="flex h-[56px] shrink-0 items-center justify-between gap-4 px-8">
        {/* The viewer's buttons stay light on the dark ground, as the Figma draws them. */}
        <span data-theme="light">
          <IconButton hierarchy="secondary" size="xl" aria-label="Close" icon={<Icon icon={Cancel01Icon} size={22} />} onClick={onClose} />
        </span>
        <p className="text-lg font-medium leading-lg" aria-live="polite">
          {at + 1} of {photos.length}
        </p>
        <span className="w-[44px]" aria-hidden />
      </header>
      <div
        className="flex min-h-0 flex-1 touch-pan-y flex-col items-center justify-center gap-6"
        onPointerDown={(e) => {
          swipe.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipe.current === null) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        }}
      >
        {missing ? (
          <p className="px-8 text-center text-md leading-md text-text-secondary">{photo.file.name} isn’t on this phone any more.</p>
        ) : url ? (
          // A blob URL from IndexedDB: next/image can't optimise it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={photo.file.name} draggable={false} className="max-h-full w-full select-none object-contain" />
        ) : null}
        <p className="max-w-full truncate px-8 text-md leading-md text-text-primary">{photo.file.name}</p>
      </div>
      <footer data-theme="light" className="flex shrink-0 items-center gap-6 px-8 pb-4 pt-8">
        <IconButton hierarchy="secondary" size="xl" aria-label="Previous photo" disabled={at === 0} icon={<Icon icon={ArrowLeft02Icon} size={22} />} onClick={() => go(-1)} />
        {url ? (
          <a
            href={url}
            download={photo.file.name}
            className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "flex-1")}
          >
            <Icon icon={Download04Icon} size={20} />
            Save photo
          </a>
        ) : (
          <Button hierarchy="secondary" size="xl" className="flex-1" disabled>
            Save photo
          </Button>
        )}
        <IconButton
          hierarchy="secondary"
          size="xl"
          aria-label="Next photo"
          disabled={at >= photos.length - 1}
          icon={<Icon icon={ArrowRight02Icon} size={22} />}
          onClick={() => go(1)}
        />
      </footer>
      <HomeIndicator tone="media" />
    </div>,
    document.body,
  );
}
