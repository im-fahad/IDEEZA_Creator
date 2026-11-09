"use client";

// What Global Search looks through, from the stores the web already keeps:
// People (the creator directory, lib/people/ids.ts), Post (the Feed's clips),
// Projects (the feed's projects and yours), Parts & Agile Module (the part
// catalogue and the Agile Modules, lib/pcb/part-catalog.ts), Marketplace (the
// clips with something on sale) and Blog (your blogs that readers can open).

import * as React from "react";
import { CATALOGUES } from "@/lib/manual/journey";
import { useManualProjects } from "@/lib/manual/projects";
import { useBlog } from "@/lib/blog/store";
import { slugOf } from "@/lib/blog/slug";
import type { BlogCover } from "@/lib/blog/types";
import { PROJECTS } from "@/lib/feed";
import { FEED_CLIPS, type ClipOffer, type FeedClip } from "@/lib/innovations/clips";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import type { SearchEntry } from "@/lib/innovations/search";
import { directory, profileHref, type Person } from "@/lib/people/ids";
import { useMyProfile } from "@/lib/people/profile-store";
import { SAMPLE_PROFILES } from "@/lib/people/sample-profiles";
import { MODULE_CATALOG, PART_CATALOG } from "@/lib/pcb/part-catalog";

export type SearchItem =
  | { type: "person"; person: Person; subtitle: string; followKey: string | null; href: string }
  | { type: "post"; clip: FeedClip }
  | { type: "project"; id: string; name: string; image: string | null; by: string; href: string }
  | { type: "part"; title: string; tag: "Part" | "Agile Module"; meta: string }
  | { type: "market"; clip: FeedClip; offer: ClipOffer; stage: string | null }
  | { type: "blog"; id: string; title: string; by: string; at: number; cover: BlogCover | null; href: string };

const stageLabel = (id: string | null) => (id ? (CATALOGUES.project.find((t) => t.id === id)?.label ?? null) : null);

/** What a person does, in a line: their headline, else what they are here. */
function subtitleOf(p: Person): string {
  if (p.kind === "feed") {
    const key = p.id.slice("feed:".length);
    return SAMPLE_PROFILES[key]?.headline ?? "Creator";
  }
  return p.kind === "demo" ? "Demo creator" : "You";
}

export function useSearchIndex(): { hydrated: boolean; entries: SearchEntry<SearchItem>[] } {
  const { hydrated: profileRead, fields } = useMyProfile();
  const { hydrated: projectsRead, projects } = useManualProjects();
  const blog = useBlog();

  const entries = React.useMemo(() => {
    const out: SearchEntry<SearchItem>[] = [];
    for (const p of directory({ name: fields.name, latinName: fields.latinName, handle: fields.handle })) {
      if (p.kind === "me") continue;
      const subtitle = subtitleOf(p);
      out.push({
        kind: "people",
        id: p.id,
        title: p.name,
        words: [subtitle, p.handle],
        ref: { type: "person", person: p, subtitle, followKey: p.kind === "feed" ? p.id.slice("feed:".length) : null, href: `/m${profileHref(p)}` },
      });
    }
    for (const c of FEED_CLIPS) {
      out.push({ kind: "post", id: c.id, title: c.title, words: [c.creator.name, c.description, c.category ?? ""], ref: { type: "post", clip: c } });
    }
    for (const p of PROJECTS) {
      out.push({
        kind: "projects",
        id: p.id,
        title: p.title,
        words: [p.creator.name, p.category],
        ref: { type: "project", id: p.id, name: p.title, image: p.image ?? null, by: p.creator.name, href: `/m/projects/${p.id}` },
      });
    }
    for (const p of projects) {
      const name = p.name.trim() || "Untitled project";
      out.push({
        kind: "projects",
        id: p.id,
        title: name,
        words: [p.description ?? ""],
        ref: { type: "project", id: p.id, name, image: null, by: "You", href: `/m/projects/${encodeURIComponent(p.id)}` },
      });
    }
    for (const m of MODULE_CATALOG) {
      out.push({ kind: "parts", id: m.id, title: m.name, words: [m.summary, ...m.features, ...m.parts], ref: { type: "part", title: m.name, tag: "Agile Module", meta: m.summary } });
    }
    for (const p of PART_CATALOG) {
      out.push({
        kind: "parts",
        id: p.id,
        title: p.part,
        words: [p.mfr, p.pkg, ...p.features],
        ref: { type: "part", title: p.part, tag: "Part", meta: `${p.mfr} · ${p.pkg} · ${p.price}` },
      });
    }
    for (const c of FEED_CLIPS) {
      if (c.kind !== "project" || !c.offers.length) continue;
      const post = SAMPLE_POSTS.find((p) => p.id === c.postId);
      out.push({
        kind: "marketplace",
        id: c.id,
        title: c.title,
        words: [c.creator.name, c.description],
        ref: { type: "market", clip: c, offer: c.offers[0], stage: stageLabel(post?.stage ?? null) },
      });
    }
    for (const a of blog.data.articles) {
      if (!a.live || a.takenDown) continue;
      const title = a.live.title.trim() || "Untitled blog";
      out.push({
        kind: "blog",
        id: a.id,
        title,
        words: a.live.topics,
        ref: { type: "blog", id: a.id, title, by: fields.name.trim() || "You", at: a.live.approvedAt, cover: a.live.cover, href: `/m/blog/${slugOf(a)}` },
      });
    }
    return out;
  }, [fields.name, fields.latinName, fields.handle, projects, blog.data.articles]);

  return { hydrated: profileRead && projectsRead && blog.hydrated, entries };
}
