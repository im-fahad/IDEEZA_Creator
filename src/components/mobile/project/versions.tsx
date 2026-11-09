"use client";

// 05 · Versions (M6) and 05d · Review version n. The web's Versions rail
// block as its own screen, opened from Overview › Versions or the stage
// line's version: per chat "From chat “…”" (it opens the chat on the AI tab),
// then each saved version newest first — "Version n · current", "Saved …",
// the pieces, and Added / Dropped / Changed (Products for version 1), each
// product name opening that product at that version. More than 5: Show all
// versions.
//
// Review version n (05d), opened by the Overview's notice: what changed per
// product, then Save version n — the web's version save (`saveBuild`, kind
// "version") behind the edit gate (a live listing pauses first) — or Not now.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { productsOf, useCreateHistory } from "@/lib/create/history";
import { piecesOf } from "@/lib/manual/project-read";
import { formatDateTime } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { VERSIONS_SHOWN, firstVersions, versionCountOf, versionGroupsOf } from "@/lib/manual/rail-rows";
import { saveModeOf, versionChangesOf } from "@/lib/manual/save-step";
import { changeLinesOf, phoneHrefOf, phoneProjectHref, phoneProjectPath } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { LIST_CARD, LIST_ROW, ListCard, ProductRow, TapLink } from "./parts";
import { ProjectLoading } from "./project-screen";
import { usePhoneWriteGate } from "./write-gate";

function Missing({ back }: { back: string }) {
  return (
    <Screen top={<TopBar back={back} />} className="px-8">
      <p className="pt-8 text-lg font-semibold leading-lg text-text-primary">We couldn&apos;t find this project</p>
    </Screen>
  );
}

export function VersionsScreen({ projectId }: { projectId: string }) {
  const data = useProjectPageData(projectId, "project");
  const [all, setAll] = React.useState(false);
  if (data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") return <Missing back="/m/projects" />;
  const { project, view } = data;
  const groups = versionGroupsOf(view.versions, view.lineages, project.id);
  const total = versionCountOf(groups);
  const shown = all ? groups : firstVersions(groups, VERSIONS_SHOWN);
  return (
    <Screen top={<TopBar back={phoneProjectHref(project.id)} title="Versions" />} className="px-8 pb-12">
      <div className="flex flex-col gap-8">
        <p className="text-sm leading-sm text-text-secondary">{project.name}</p>
        {groups.length === 0 && <p className="text-md leading-md text-text-secondary">Made by hand — there are no saved versions to compare.</p>}
        {shown.map((g) => (
          <section key={g.key} aria-label={g.heading} className="flex flex-col gap-4">
            {g.chatHref ? (
              <TapLink href={phoneHrefOf(g.chatHref) ?? "/m/ai"}>{g.heading}</TapLink>
            ) : (
              <p className="text-md font-medium leading-md text-text-secondary">{g.heading}</p>
            )}
            <ul className={LIST_CARD}>
              {g.rows.map((r) => (
                <li key={r.key} className={cn(LIST_ROW, "flex flex-col gap-2 p-6")}>
                  <span className="text-md font-semibold leading-md text-text-primary">{r.title}</span>
                  <span className="text-sm leading-sm text-text-secondary">
                    {[r.saved?.map((m) => (m.kind === "time" ? m.time.text : m.text)).join(""), r.pieces, r.gone ? "Its build isn't in this browser any more." : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {r.lines.map((l) => (
                    <p key={l.label} className="text-sm leading-sm text-text-secondary">
                      <span className="text-text-primary">{l.label}: </span>
                      {l.items.map((it, i) => (
                        <React.Fragment key={`${it.name}-${i}`}>
                          {i > 0 && ", "}
                          {it.href ? (
                            <Link href={phoneHrefOf(it.href) ?? "#"} className="font-medium text-text-brand outline-none hover:underline focus-visible:underline">
                              {it.name}
                            </Link>
                          ) : (
                            it.name
                          )}
                        </React.Fragment>
                      ))}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {total > VERSIONS_SHOWN && (
          <div>
            <Button hierarchy="secondary" size="xl" onClick={() => setAll((v) => !v)}>
              {all ? "Show fewer versions" : "Show all versions"}
            </Button>
          </div>
        )}
      </div>
    </Screen>
  );
}

// ─────────────────────────── 05d · Review version n ───────────────────────────

export function ReviewVersionScreen({ projectId }: { projectId: string }) {
  const data = useProjectPageData(projectId, "project");
  const params = useSearchParams();
  const buildId = params.get("build");
  if (data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") return <Missing back="/m/projects" />;
  return <ReviewVersion projectId={data.project.id} buildId={buildId} />;
}

function ReviewVersion({ projectId, buildId }: { projectId: string; buildId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const { projects, saveBuild } = useManualProjects();
  const { builds, chats } = useCreateHistory();
  const gate = usePhoneWriteGate(projectId);
  const [refused, setRefused] = React.useState<string | null>(null);
  const project = projects.find((p) => p.id === projectId) ?? null;
  const job = builds.find((b) => b.id === buildId) ?? null;
  const back = phoneProjectHref(projectId);
  const [now] = React.useState(() => Date.now());

  const review = React.useMemo(() => {
    if (!project || !job) return null;
    const lineage = builds.filter((b) => b.chatId === job.chatId && b.id !== job.id);
    const mode = saveModeOf(job, lineage, projects, builds, chats);
    if (mode.kind === "saved") return { saved: true as const };
    const version = mode.kind === "version" ? mode.version : 1;
    const changes = versionChangesOf(project, job, lineage, builds, chats, now);
    const products = productsOf(job);
    const pieces = Object.fromEntries(products.map((p) => [p.name, p.items.filter((i) => i.status !== "skipped").length]));
    const lines = changeLinesOf({ version, ...changes, products: products.map((p) => p.name), pieces });
    const thumbs = new Map(products.map((p) => [p.name, p.conceptImageUrl]));
    const p = piecesOf(job);
    return { saved: false as const, lineage, version, lines, thumbs, pieces: p, mode };
  }, [project, job, builds, chats, projects, now]);

  if (!project || !job || !review) {
    return (
      <Screen top={<TopBar back={back} title="Review version" />} className="px-8">
        <p className="pt-8 text-md leading-md text-text-secondary">This build isn&apos;t in this browser any more.</p>
      </Screen>
    );
  }
  if (review.saved) {
    return (
      <Screen top={<TopBar back={back} title="Review version" />} className="px-8">
        <p className="pt-8 text-md leading-md text-text-secondary">This version is saved already. It&apos;s in Versions.</p>
        <TapLink href={phoneProjectPath(projectId, "versions")}>Open Versions</TapLink>
      </Screen>
    );
  }

  const v = review.version;
  const save = () => {
    setRefused(null);
    const out = gate.guard("addProduct", (undo) => {
      const result = saveBuild(job, review.lineage, { kind: "version", projectId });
      if (!result) {
        undo();
        return setRefused("That project isn't in this browser any more.");
      }
      toast({ title: `Version ${v} saved` });
      router.replace(back);
    });
    if (out.kind === "refused") setRefused(out.reason);
  };

  return (
    <Screen
      top={<TopBar back={back} title={`Review version ${v}`} />}
      footer={
        <BottomBar className="gap-6 pt-8">
          <Button size="xl" className="w-full" onClick={save}>
            Save version {v}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => router.push(back)}>
            Not now
          </Button>
        </BottomBar>
      }
      className="px-8 pb-12"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold leading-2xl text-text-primary">Version {v} is ready</h2>
          <p className="text-sm leading-sm text-text-secondary">
            Built from the chat on {formatDateTime(job.endedAt ?? job.updatedAt)} ·{" "}
            {review.pieces.ready === review.pieces.total ? `All ${review.pieces.total} pieces ready` : `${review.pieces.ready} of ${review.pieces.total} pieces ready`}
          </p>
        </div>
        <h3 className="text-md font-medium leading-md text-text-primary">What changed</h3>
        <ListCard label="What changed">
          {review.lines.map((l) => (
            <ProductRow key={`${l.tone}-${l.name}`} thumb={review.thumbs.get(l.name) ?? null} name={l.name} meta={l.line} />
          ))}
        </ListCard>
        <p className="text-sm leading-sm text-text-secondary">
          Saving makes version {v} the current one. Version {Math.max(1, v - 1)} stays in Versions, and you can open it any time.
        </p>
        {(refused || gate.reasonOf("addProduct")) && <Banner tone="attention">{refused ?? gate.reasonOf("addProduct")}</Banner>}
      </div>
      {gate.sheet}
    </Screen>
  );
}
