"use client";

// A blog, as Global Search opens it (mobile Figma "Blog" reader): Back,
// "Blog"; the title (H3), the writer and the date, the cover, then the body
// drawn by the web's reader (ArticleBody: the same type ladder and the same
// images). Only a blog readers can open is shown: one not on the IDEEZA Blog
// says so in the web's words.

import * as React from "react";
import { useRouter } from "next/navigation";
import { News01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { StateCard } from "@/components/ideeza/state-card";
import { ArticleBody, ArticleBodySkeleton } from "@/components/blog/article/article-body";
import { CoverImage } from "@/components/blog/cover-image";
import { dayDate } from "@/lib/blog/dates";
import { findBySlug } from "@/lib/blog/slug";
import { useBlog, useBody } from "@/lib/blog/store";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";

export function BlogArticleScreen({ slug }: { slug: string }) {
  const router = useRouter();
  const { hydrated, data } = useBlog();
  const article = hydrated ? findBySlug(data, slug) : null;
  const live = article?.live && !article.takenDown ? article.live : null;

  return (
    <Screen top={<TopBar back title="Blog" />}>
      {!hydrated ? (
        <div className="flex flex-col gap-6 px-8">
          <Skeleton shape="text" size="lg" />
          <Skeleton shape="block" className="aspect-[3/2] w-full" />
          <ArticleBodySkeleton />
        </div>
      ) : !article || !live ? (
        <div className="flex h-full items-center px-8">
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={News01Icon} size={32} />}
            title={article ? "This blog isn’t on the IDEEZA Blog yet" : "This blog isn’t here"}
            body={
              article
                ? "Readers can open it once the IDEEZA team approves it. Until then, only you can see it."
                : "It may have been deleted, or it was written in another browser."
            }
            action={
              <Button size="xl" className="w-full" onClick={() => router.push("/m/search?kind=blog")}>
                Search blogs
              </Button>
            }
          />
        </div>
      ) : (
        <Reader id={article.id} title={live.title.trim() || "Untitled blog"} at={live.approvedAt} cover={live.cover} />
      )}
    </Screen>
  );
}

function Reader({ id, title, at, cover }: { id: string; title: string; at: number; cover: Parameters<typeof CoverImage>[0]["cover"] }) {
  const body = useBody(id, "live");
  const me = useMe();
  const photo = useMyPhoto();
  return (
    <article className="flex flex-col gap-8 px-8 pb-10">
      <header className="flex flex-col gap-4">
        <h2 className="text-4xl font-semibold leading-4xl text-text-primary">{title}</h2>
        <p className="flex items-center gap-4 text-sm leading-sm text-text-secondary">
          <Avatar size="xs" initials={me.initials} src={photo.url ?? undefined} />
          {me.name}
          <span aria-hidden>•</span>
          {dayDate(at)}
        </p>
      </header>
      {cover && <CoverImage cover={cover} className="w-full rounded-lg" />}
      {!body.hydrated ? (
        <ArticleBodySkeleton />
      ) : body.unreadable ? (
        <Banner tone="error" title="Couldn’t read this blog">
          This browser’s copy of it can’t be read.
        </Banner>
      ) : (
        <ArticleBody doc={body.body.doc} />
      )}
    </article>
  );
}
