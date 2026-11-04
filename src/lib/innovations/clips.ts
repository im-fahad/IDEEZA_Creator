// The phone's Home: the Feed (mobile Figma "Feed · 2026 update" 10646:2, owner
// 2026-10-31: the app has no Innovations; Home is full-screen clips of the
// projects and products shared on the marketplace). A clip is read from an
// Innovations post (sample-posts.ts), so the phone and the web show the same
// project, the same video, the same heart and the same comments:
// - every post is a Project clip, playing its first video;
// - every further product with its own video is a Product clip;
// - the post's listing rows are the clip's offers: a project offers its Main
//   NFT and copies, a product only copies ("a product has no Main NFT").
// Reactions and comments are the post's, so a Product clip's heart is its
// project's (one count everywhere, plan §7).
//
// What the viewer told the Feed (Interested, Not interested, Hide) reorders
// and filters it here. Pure, relative imports only.

import { CREATORS, PROJECTS, type ProjectCategory } from "../feed";
import { follows, type Reactions } from "./reactions";
import { SAMPLE_POSTS } from "./sample-posts";
import type { InnovationPost, PostPerson } from "./types";

export type ClipKind = "project" | "product";
export type ClipOfferKind = "main" | "physical" | "virtual";

export type ClipOffer = {
  kind: ClipOfferKind;
  /** "0.25 ETH". */
  price: string;
  /** A copy's license in the Sell flow's words ("Personal use", "Business use"); null for Main. */
  use: string | null;
  /** "6 of 50 sold", when the listing says. */
  sold: { count: number; of: number } | null;
};

export type FeedClip = {
  /** "p1" for a Project clip, "p1~remote" for a Product clip. */
  id: string;
  /** The post behind it ("sample:p1"): reactions and comments are keyed by it. */
  postId: string;
  kind: ClipKind;
  /** The feed project's id, the address of its details. */
  projectId: string;
  productId: string | null;
  title: string;
  description: string;
  category: ProjectCategory | null;
  creator: PostPerson;
  /** What the sample dataset says about following this creator, before the viewer's own choice. */
  followedByDataset: boolean;
  video: { src: string; label: string };
  poster: string | null;
  offers: ClipOffer[];
  base: { appreciations: number; views: number };
  sharedAt: number;
};

const PRODUCT_SEP = "~";

/** The license words of the web's Sell flow (sell-flow.ts USE_LABEL); a sample's "Commercial use" is Business use. */
export function licenseWordOf(license: string | null): string | null {
  if (!license) return null;
  return /commercial|business/i.test(license) ? "Business use" : "Personal use";
}

/** One listing row ("Whole project (Main NFT)", "Physical copy · 6 of 50 sold", "Virtual copy") as an offer. */
export function offerOf(row: { label: string; price: string }, license: string | null): ClipOffer | null {
  const use = licenseWordOf(license);
  if (/main nft/i.test(row.label)) return { kind: "main", price: row.price, use: null, sold: null };
  if (/^physical/i.test(row.label)) {
    const m = /(\d+)\s+of\s+(\d+)\s+sold/i.exec(row.label);
    return { kind: "physical", price: row.price, use, sold: m ? { count: Number(m[1]), of: Number(m[2]) } : null };
  }
  if (/^virtual/i.test(row.label)) return { kind: "virtual", price: row.price, use, sold: null };
  return null;
}

function offersOf(post: InnovationPost, kind: ClipKind): ClipOffer[] {
  if (!post.listing) return [];
  return post.listing.rows
    .map((r) => offerOf(r, post.license))
    .filter((o): o is ClipOffer => o !== null && (kind === "project" || o.kind !== "main"));
}

/** The clips of one post: the project, then each further product that has its own video. */
export function clipsOfPost(post: InnovationPost): FeedClip[] {
  const feedId = post.id.replace(/^sample:/, "");
  const project = PROJECTS.find((p) => p.id === feedId);
  const creator = CREATORS.find((c) => c.id === post.creator.id);
  const first = post.products[0];
  const shared = {
    postId: post.id,
    projectId: feedId,
    category: project?.category ?? null,
    creator: post.creator,
    followedByDataset: creator?.following ?? false,
    base: post.base,
    sharedAt: post.sharedAt,
  };
  const out: FeedClip[] = [];
  if (first?.video?.kind === "video") {
    out.push({
      ...shared,
      id: feedId,
      kind: "project",
      productId: null,
      title: post.title,
      description: post.description,
      video: { src: first.video.src, label: first.video.label },
      poster: first.video.poster ?? first.image,
      offers: offersOf(post, "project"),
    });
  }
  for (const p of post.products.slice(1)) {
    if (p.video?.kind !== "video") continue;
    out.push({
      ...shared,
      id: `${feedId}${PRODUCT_SEP}${p.id}`,
      kind: "product",
      productId: p.id,
      title: p.name,
      description: p.summary,
      video: { src: p.video.src, label: p.video.label },
      poster: p.video.poster ?? p.image,
      offers: offersOf(post, "product"),
    });
  }
  return out;
}

/** Every clip on the Feed, in post order. */
export const FEED_CLIPS: readonly FeedClip[] = SAMPLE_POSTS.flatMap(clipsOfPost);

export function clipById(id: string): FeedClip | null {
  return FEED_CLIPS.find((c) => c.id === id) ?? null;
}

/** What the viewer told the Feed from a clip's ⋯ menu. */
export type ClipChoices = {
  interested: readonly string[];
  notInterested: readonly string[];
  hidden: readonly string[];
};

export const NO_CHOICES: ClipChoices = { interested: [], notInterested: [], hidden: [] };

const categoriesOf = (ids: readonly string[]) =>
  new Set(ids.map((id) => clipById(id)?.category).filter((c): c is ProjectCategory => !!c));

/** The Feed tab: hidden and not-interested clips left out; more like an Interested clip first,
 *  fewer like a Not interested one; the rest by appreciation and reach (the web's
 *  "New & noteworthy"). A Product clip trails its project a little. */
export function orderClips(clips: readonly FeedClip[], choices: ClipChoices = NO_CHOICES): FeedClip[] {
  const gone = new Set([...choices.hidden, ...choices.notInterested]);
  const more = categoriesOf(choices.interested);
  const fewer = categoriesOf(choices.notInterested);
  const score = (c: FeedClip) => {
    let s = c.base.appreciations + c.base.views / 12;
    if (c.kind === "product") s *= 0.8;
    if (c.category && more.has(c.category)) s *= 2;
    if (c.category && fewer.has(c.category)) s *= 0.4;
    return s;
  };
  return clips
    .filter((c) => !gone.has(c.id))
    .map((c, i) => ({ c, i, s: score(c) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}

/** The Following tab: the clips of the creators the viewer follows (their own choice, else the
 *  dataset's), newest first; hidden ones left out. */
export function followingClips(clips: readonly FeedClip[], reactions: Reactions, choices: ClipChoices = NO_CHOICES): FeedClip[] {
  const gone = new Set(choices.hidden);
  return clips
    .filter((c) => !gone.has(c.id) && follows(reactions, c.creator.id, c.followedByDataset))
    .slice()
    .sort((a, b) => b.sharedAt - a.sharedAt);
}

/** Where a clip's title opens: its project's details, or its product's. */
export function clipDetailsHref(c: Pick<FeedClip, "projectId" | "productId">): string {
  const project = `/m/projects/${encodeURIComponent(c.projectId)}`;
  return c.productId ? `${project}/products/${encodeURIComponent(c.productId)}` : project;
}

/** Where an offer's button goes: the marketplace of the project or product (buying has one home). */
export function clipBuyHref(c: Pick<FeedClip, "projectId" | "productId">): string {
  return `${clipDetailsHref(c)}?tab=marketplace`;
}

/** The address of one clip on its own (Copy link, Saved › View original post). */
export const clipHref = (id: string) => `/m/clip/${encodeURIComponent(id)}`;

/** "Make an offer (0.25 ETH)" for Main, "Buy Physical NFT (0.04 ETH)" for a copy. */
export function offerActionLabel(o: ClipOffer): string {
  if (o.kind === "main") return `Buy Main NFT (${o.price})`;
  return `Buy ${o.kind === "physical" ? "Physical" : "Virtual"} NFT (${o.price})`;
}

export const OFFER_NAME: Readonly<Record<ClipOfferKind, string>> = {
  main: "Main NFT",
  physical: "Physical NFT",
  virtual: "Virtual NFT",
};
