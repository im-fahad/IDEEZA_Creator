"use client";

// Feed · Clip ⋯ menu (mobile Figma 01–08): the M12 action sheet titled with
// the clip — Interested, Not interested, Save video, Copy link, Playback
// speed, Video quality, Hide video, Report — and the sheets it opens:
// - Interested / Not interested reorder the Feed (more or fewer like it; Not
//   interested takes the clip away), Hide video takes just this one away; each
//   says so with Undo;
// - Save video is the web's Save (the same list the web's Saved shows), and
//   the phone notes when, for Saved › "Saved on";
// - Copy link copies the clip's own address ("Link to post copied to clipboard");
// - Playback speed and Video quality are pick-one sheets (quality offers what
//   the clip really has, and Data saver, which waits for a tap before playing);
// - Report is the kit's Report sheet: "Tell us more" opens under Something else,
//   and a reported post's row reads Reported (the web's reported list).
// Guests are asked in before saving or reporting.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark01Icon,
  BookmarkRemove01Icon,
  DashboardSpeed01Icon,
  Flag02Icon,
  Link01Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Video01Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Toggle } from "@/components/ideeza/toggle";
import { useReportedPost } from "@/components/innovations/post-bits";
import { clipHref, type FeedClip } from "@/lib/innovations/clips";
import { qualityOptions, SPEEDS, withChoice, withSavedAt, withoutChoice, type ClipChoice } from "@/lib/innovations/feed-prefs";
import { useReactions } from "@/lib/innovations/reactions";
import { ActionSheet, type ActionSheetItem } from "../kit/sheet";
import { ReportSheet, type ReportReason } from "../kit/report-sheet";
import { useToast } from "../kit/toast";
import { PickSheet } from "./pick-sheet";
import { useFeedPrefs } from "./use-feed";
import type { Guard } from "./use-guest";

/** The web's reasons for reporting a post (report-dialog.tsx), so a report reads the same everywhere. */
export const VIDEO_REPORT_REASONS: readonly ReportReason[] = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or hate" },
  { id: "stolen", label: "Stolen design" },
  { id: "misleading", label: "Misleading" },
  { id: "other", label: "Something else" },
];

const CHOICE_TOAST: Record<ClipChoice, string> = {
  interested: "We’ll show you more like this",
  notInterested: "We’ll show you fewer like this",
  hidden: "Video hidden",
};

/** Copies a clip's address and says so. */
export function useCopyClipLink(): (clipId: string) => void {
  const toast = useToast();
  return React.useCallback(
    (clipId: string) => {
      const url = new URL(clipHref(clipId), window.location.origin).toString();
      const done = () => toast({ title: "Link to post copied to clipboard" });
      const failed = () => toast({ title: "Couldn’t copy the link", lead: "error" });
      if (!navigator.clipboard) return failed();
      navigator.clipboard.writeText(url).then(done, failed);
    },
    [toast],
  );
}

export function ClipMenu({
  clip,
  open,
  onClose,
  speed,
  onSpeed,
  height,
  guard,
}: {
  clip: FeedClip;
  open: boolean;
  onClose: () => void;
  speed: number;
  onSpeed: (s: number) => void;
  /** The clip's own height, once its video has loaded. */
  height: number | null;
  guard: Guard;
}) {
  const toast = useToast();
  const router = useRouter();
  const { prefs, update } = useFeedPrefs();
  const { reactions, toggle } = useReactions();
  const { reported, markReported } = useReportedPost(clip.postId);
  const copy = useCopyClipLink();
  const [sheet, setSheet] = React.useState<"speed" | "quality" | "report" | null>(null);

  const saved = reactions.saved.includes(clip.postId);
  const failed = () => toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });

  const choose = (choice: ClipChoice) => {
    const was = prefs[choice].includes(clip.id);
    if (!update((p) => withChoice(p, choice, clip.id))) return failed();
    if (was) {
      toast({ title: choice === "interested" ? "Interested taken back" : "Taken back" });
      return;
    }
    toast({
      title: CHOICE_TOAST[choice],
      action: { label: "Undo", onClick: () => update((p) => withoutChoice(p, choice, clip.id)) },
    });
  };

  const save = () =>
    guard("Sign in to save this video", () => {
      if (!toggle("saved", clip.postId)) return failed();
      update((p) => withSavedAt(p, clip.postId, saved ? null : Date.now()));
      toast(saved ? { title: "Removed from Saved" } : { title: "Saved", action: { label: "View Saved", onClick: () => router.push("/m/saved") } });
    });

  const items: ActionSheetItem[] = [
    {
      label: prefs.interested.includes(clip.id) ? "Take back Interested" : "Interested",
      icon: ThumbsUpIcon,
      onSelect: () => choose("interested"),
    },
    {
      label: prefs.notInterested.includes(clip.id) ? "Take back Not interested" : "Not interested",
      icon: ThumbsDownIcon,
      onSelect: () => choose("notInterested"),
    },
    { label: saved ? "Unsave video" : "Save video", icon: saved ? BookmarkRemove01Icon : Bookmark01Icon, onSelect: save },
    { label: "Copy link", icon: Link01Icon, onSelect: () => copy(clip.id) },
    { label: "Playback speed", icon: DashboardSpeed01Icon, onSelect: () => setSheet("speed") },
    { label: "Video quality", icon: Video01Icon, onSelect: () => setSheet("quality") },
    { label: "Hide video", icon: ViewOffSlashIcon, onSelect: () => choose("hidden") },
    {
      label: reported ? "Reported" : "Report",
      icon: Flag02Icon,
      onSelect: () => {
        if (reported) return toast({ title: "You reported this video. We’re looking into it." });
        guard("Sign in to report this video", () => setSheet("report"));
      },
    },
  ];

  const firstName = clip.creator.name.split(" ")[0];

  return (
    <>
      <ActionSheet open={open} onClose={onClose} title={clip.title} items={items} />
      <PickSheet
        open={sheet === "speed"}
        onClose={() => setSheet(null)}
        title="Playback speed"
        options={SPEEDS.map((s) => ({ value: s.value, label: s.label }))}
        value={speed}
        onPick={onSpeed}
      />
      <PickSheet
        open={sheet === "quality"}
        onClose={() => setSheet(null)}
        title="Video quality"
        options={qualityOptions(height)}
        value={prefs.quality}
        onPick={(q) => {
          if (!update((p) => ({ ...p, quality: q }))) failed();
        }}
      >
        <div className="-mx-4 flex min-h-[48px] items-center justify-between gap-6 px-4">
          <span className="flex flex-col">
            <span className="text-lg leading-lg text-text-primary">Data saver</span>
            <span className="text-sm leading-sm text-text-tertiary">Clips wait for a tap before they play.</span>
          </span>
          <Toggle
            aria-label="Data saver"
            checked={prefs.dataSaver}
            onChange={() => {
              if (!update((p) => ({ ...p, dataSaver: !p.dataSaver }))) failed();
            }}
          />
        </div>
      </PickSheet>
      <ReportSheet
        open={sheet === "report"}
        onClose={() => setSheet(null)}
        title="Report this video"
        description={`${firstName} won’t know who reported.`}
        question="Why are you reporting this video?"
        reasons={VIDEO_REPORT_REASONS}
        note={{ label: "Tell us more", placeholder: "What happened in this video?", onlyFor: "other" }}
        onSend={async () => {
          if (!markReported()) throw new Error("not saved");
        }}
      />
    </>
  );
}
