// What the phone keeps about its Feed, beside the web's reactions (which hold
// appreciate, save and follow): the clip ⋯ menu's Interested, Not interested
// and Hide video; when each clip was saved (Saved lists "Saved on"); the clips
// shared to your Feed with a caption and an audience (D-1: Public or Only me);
// and the playback choices (Data saver, Video quality). One key,
// `ideeza:m:feed`. Pure, relative imports only.

export const FEED_PREFS_KEY = "ideeza:m:feed";

export const CAPTION_MAX = 500;

export type ShareAudience = "public" | "only-me";

export const AUDIENCES: readonly { id: ShareAudience; label: string }[] = [
  { id: "public", label: "Public" },
  { id: "only-me", label: "Only me" },
];

export type FeedShare = { id: string; clipId: string; caption: string; audience: ShareAudience; at: number };

/** "auto" or a height the clip may be drawn at ("720"). */
export type VideoQuality = string;

export type FeedPrefs = {
  v: 1;
  interested: string[];
  notInterested: string[];
  hidden: string[];
  /** Clip id → when it was saved here. */
  savedAt: Record<string, number>;
  shares: FeedShare[];
  dataSaver: boolean;
  quality: VideoQuality;
};

export const NO_FEED_PREFS: FeedPrefs = {
  v: 1,
  interested: [],
  notInterested: [],
  hidden: [],
  savedAt: {},
  shares: [],
  dataSaver: false,
  quality: "auto",
};

const ids = (x: unknown): string[] =>
  Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === "string" && s.length > 0 && s.length <= 120))] : [];

function sharesIn(x: unknown): FeedShare[] {
  if (!Array.isArray(x)) return [];
  const out: FeedShare[] = [];
  for (const r of x) {
    if (typeof r !== "object" || r === null) continue;
    const s = r as Record<string, unknown>;
    if (typeof s.id !== "string" || typeof s.clipId !== "string" || typeof s.at !== "number") continue;
    out.push({
      id: s.id,
      clipId: s.clipId,
      caption: typeof s.caption === "string" ? s.caption.slice(0, CAPTION_MAX) : "",
      audience: s.audience === "only-me" ? "only-me" : "public",
      at: s.at,
    });
  }
  return out;
}

/** A stored value, shape-checked: anything unreadable reads as nothing chosen. */
export function feedPrefsIn(value: unknown): FeedPrefs {
  if (typeof value !== "object" || value === null) return NO_FEED_PREFS;
  const r = value as Record<string, unknown>;
  const savedAt: Record<string, number> = {};
  if (typeof r.savedAt === "object" && r.savedAt !== null) {
    for (const [k, v] of Object.entries(r.savedAt as Record<string, unknown>)) if (typeof v === "number" && Number.isFinite(v)) savedAt[k] = v;
  }
  return {
    v: 1,
    interested: ids(r.interested),
    notInterested: ids(r.notInterested),
    hidden: ids(r.hidden),
    savedAt,
    shares: sharesIn(r.shares),
    dataSaver: r.dataSaver === true,
    quality: typeof r.quality === "string" && /^(auto|\d{3,4})$/.test(r.quality) ? r.quality : "auto",
  };
}

export type ClipChoice = "interested" | "notInterested" | "hidden";

/** Interested and Not interested exclude each other; choosing one again takes it back. */
export function withChoice(p: FeedPrefs, choice: ClipChoice, clipId: string): FeedPrefs {
  const has = p[choice].includes(clipId);
  const next: FeedPrefs = { ...p, [choice]: has ? p[choice].filter((x) => x !== clipId) : [...p[choice], clipId] };
  if (!has && choice === "interested") next.notInterested = p.notInterested.filter((x) => x !== clipId);
  if (!has && choice === "notInterested") next.interested = p.interested.filter((x) => x !== clipId);
  return next;
}

export function withoutChoice(p: FeedPrefs, choice: ClipChoice, clipId: string): FeedPrefs {
  return { ...p, [choice]: p[choice].filter((x) => x !== clipId) };
}

export function withSavedAt(p: FeedPrefs, clipId: string, at: number | null): FeedPrefs {
  const savedAt = { ...p.savedAt };
  if (at === null) delete savedAt[clipId];
  else savedAt[clipId] = at;
  return { ...p, savedAt };
}

/** Why a caption can't be shared; null when it can (a caption is optional). */
export function captionProblem(caption: string): string | null {
  return caption.trim().length > CAPTION_MAX ? `Keep it under ${CAPTION_MAX} characters.` : null;
}

export function withShare(p: FeedPrefs, share: FeedShare): FeedPrefs {
  return { ...p, shares: [...p.shares, { ...share, caption: share.caption.trim().slice(0, CAPTION_MAX) }] };
}

/** How many times this phone shared a clip to its Feed. */
export const sharesOf = (p: FeedPrefs, clipId: string) => p.shares.filter((s) => s.clipId === clipId).length;

export const SPEEDS: readonly { value: number; label: string }[] = [
  { value: 0.5, label: "0.5" },
  { value: 0.75, label: "0.75" },
  { value: 1, label: "1 (Normal)" },
  { value: 1.25, label: "1.25" },
  { value: 1.5, label: "1.5" },
  { value: 1.75, label: "1.75" },
  { value: 2, label: "2" },
];

/** The Figma's quality ladder, top down. */
export const QUALITY_HEIGHTS: readonly number[] = [1080, 720, 640, 540, 480, 360];

/** The qualities a clip can really be drawn at: it comes as one file, so Auto and its own
 *  height are real; a height it doesn't have says so. `own` is null until the clip has loaded. */
export function qualityOptions(own: number | null): { value: VideoQuality; label: string; reason: string | null }[] {
  const near = own === null ? null : QUALITY_HEIGHTS.reduce((a, b) => (Math.abs(b - own) < Math.abs(a - own) ? b : a));
  return [
    { value: "auto", label: "Auto", reason: null },
    ...QUALITY_HEIGHTS.map((h) => ({
      value: String(h),
      label: `${h}p`,
      reason: near === h ? null : own === null ? "Loading the clip…" : `This clip comes in ${near}p only`,
    })),
  ];
}
