"use client";

// What every Message tab screen reads, once: the web's Messages view (the
// stored messages, the people, a clock) for you — the phone has no "Acting
// as" — plus what the web's sidebar and shell do for Messages on the way in:
// the demo conversations a first visit finds, and the old support requests
// turned into conversations. Where a conversation's things open on the phone:
// a person's profile, a project or a post.

import * as React from "react";
import { MessagesViewProvider, useMessagesView } from "@/components/messages/messages-context";
import { PROJECTS } from "@/lib/feed";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useCreateHistory } from "@/lib/create/history";
import { useMarket } from "@/lib/market/market-store";
import { migrateSupportOnce } from "@/lib/messages/actions";
import { phoneHrefOf } from "@/lib/messages/phone";
import { subjectNameOf } from "@/lib/messages/rules";
import { ME, type Subject } from "@/lib/messages/types";
import { useDemoMessagesSeed } from "@/lib/messages/use-demo-seed";
import { profileHrefOf } from "@/lib/people/ids";
import { useMyProfile } from "@/lib/people/profile-store";

function useSupportMigration() {
  const { ready, people } = useMessagesView();
  const { projects, hydrated: projectsRead } = useManualProjects();
  const { data: market, hydrated: marketRead } = useMarket();
  React.useEffect(() => {
    if (!ready || !projectsRead || !marketRead) return;
    migrateSupportOnce(market.support, {
      buyerName: people.nameOf,
      projectName: (id) => projects.find((p) => p.id === id)?.name.trim() || "Untitled project",
    });
  }, [ready, projectsRead, marketRead, market.support, people.nameOf, projects]);
}

function OnTheWayIn({ children }: { children: React.ReactNode }) {
  useDemoMessagesSeed();
  useSupportMigration();
  return <>{children}</>;
}

export function PhoneMessages({ children }: { children: React.ReactNode }) {
  return (
    <MessagesViewProvider acting={ME}>
      <OnTheWayIn>{children}</OnTheWayIn>
    </MessagesViewProvider>
  );
}

/** True once `ms` have passed: bones show only for a wait you'd notice (Shared kit SK, 300 ms). */
export function useAfter(ms: number): boolean {
  const [past, setPast] = React.useState(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => setPast(true), ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return past;
}

/** A person's profile on the phone, or null for a name that belongs to nobody yet. */
export function useProfileHref(): (id: string) => string | null {
  const { fields } = useMyProfile();
  return React.useCallback(
    (id: string) => {
      const href = profileHrefOf(id, "messages", fields.handle);
      return href ? phoneHrefOf(href) : null;
    },
    [fields.handle],
  );
}

/** What a conversation is about, as its card draws it: the cover, the name, where Open goes,
 *  or why there's nothing to open (Kit / Context card: Expanded, Ended). */
export type SubjectAccess = {
  name: string;
  cover: string | null;
  gradient: string | null;
  href: string | null;
  /** The project or post is gone: the card ends ("Project deleted", "Post removed"). */
  ended: string | null;
};

export function useSubjectAccess(subject: Subject): SubjectAccess {
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  return React.useMemo<SubjectAccess>(() => {
    if (subject.kind === "post") {
      const post = PROJECTS.find((p) => p.slug === subject.slug);
      return post
        ? { name: subject.title, cover: post.image ?? null, gradient: post.gradient ?? null, href: `/m/projects/${post.slug}`, ended: null }
        : { name: subject.title, cover: null, gradient: null, href: null, ended: "Post removed" };
    }
    const project = projects.find((p) => p.id === subject.projectId);
    if (!project) return { name: subjectNameOf(subject), cover: null, gradient: null, href: null, ended: "Project deleted" };
    // Every project in this browser is yours (the web's rule), so its own page always opens.
    return {
      name: project.name.trim() || "Untitled project",
      cover: coverOf(project, buildsOf(project, builds)),
      gradient: null,
      href: `/m/projects/${project.id}`,
      ended: null,
    };
  }, [subject, projects, builds]);
}
