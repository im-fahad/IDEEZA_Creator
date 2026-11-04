"use client";

// Feed · "Share a clip to your Feed" (mobile Figma): the M09 sheet "Share to
// your Feed" — you (A16 Avatar SM and your name) with the audience under your
// name (Public ⌄, a pick-one sheet "Post audience": Public or Only me; no
// Friends, D-1), the caption ("Say something about this post..."), then Share
// now and Cancel. Sharing is kept on this phone with the clip, its caption and
// its audience; a write the phone refuses keeps the caption and says so.

import * as React from "react";
import { ArrowDown01Icon, Globe02Icon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Textarea } from "@/components/ideeza/text-input";
import { AUDIENCES, CAPTION_MAX, captionProblem, withShare, type ShareAudience } from "@/lib/innovations/feed-prefs";
import type { FeedClip } from "@/lib/innovations/clips";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { PickSheet } from "./pick-sheet";
import { newId, useFeedPrefs } from "./use-feed";

const AUDIENCE_ICON = { public: Globe02Icon, "only-me": LockIcon } as const;

export function ClipShare({ clip, open, onClose }: { clip: FeedClip; open: boolean; onClose: () => void }) {
  const me = useMe();
  const photo = useMyPhoto();
  const toast = useToast();
  const { update } = useFeedPrefs();
  const [caption, setCaption] = React.useState("");
  const [audience, setAudience] = React.useState<ShareAudience>("public");
  const [picking, setPicking] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const problem = captionProblem(caption);

  const close = () => {
    setCaption("");
    setAudience("public");
    setFailed(false);
    onClose();
  };

  const share = () => {
    if (problem) return;
    const ok = update((p) => withShare(p, { id: newId("share"), clipId: clip.id, caption, audience, at: Date.now() }));
    if (!ok) {
      setFailed(true);
      return;
    }
    toast({ title: audience === "public" ? "Shared to your Feed" : "Shared to your Feed. Only you can see it." });
    close();
  };

  const label = AUDIENCES.find((a) => a.id === audience)?.label ?? "Public";

  return (
    <>
      <Sheet
        open={open && !picking}
        onClose={close}
        title="Share to your Feed"
        actions={
          <>
            <Button size="xl" className="w-full" disabled={!!problem} onClick={share}>
              {failed ? "Try again" : "Share now"}
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
              Cancel
            </Button>
          </>
        }
      >
        {failed && (
          <Banner tone="error" title="Couldn’t share it">
            This phone couldn’t save it. Your words are kept.
          </Banner>
        )}
        <div className="flex items-center gap-4">
          <Avatar size="sm" initials={me.initials} src={photo.url ?? undefined} />
          <div className="flex flex-col">
            <span className="text-md font-medium leading-md text-text-primary">{me.name}</span>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Post audience: ${label}`}
              onClick={() => setPicking(true)}
              className="flex items-center gap-2 self-start rounded-sm text-sm leading-sm text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {label}
              <Icon icon={ArrowDown01Icon} size={16} />
            </button>
          </div>
        </div>
        <p className="text-sm leading-sm text-text-secondary">{clip.title}</p>
        <label className="flex flex-col gap-2">
          <span className="sr-only">Caption</span>
          <Textarea value={caption} onValueChange={setCaption} placeholder="Say something about this post..." rows={3} invalid={!!problem} />
          {(caption.length > CAPTION_MAX - 100 || problem) && (
            <span className={problem ? "text-sm leading-sm text-text-error" : "self-end text-sm leading-sm text-text-tertiary tabular-nums"}>
              {problem ?? `${caption.length}/${CAPTION_MAX}`}
            </span>
          )}
        </label>
      </Sheet>
      <PickSheet
        open={open && picking}
        onClose={() => setPicking(false)}
        title="Post audience"
        options={AUDIENCES.map((a) => ({ value: a.id, label: a.label, icon: AUDIENCE_ICON[a.id] }))}
        value={audience}
        onPick={setAudience}
      />
    </>
  );
}
