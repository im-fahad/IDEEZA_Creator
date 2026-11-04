"use client";

// PR-08 · More about {First}: the profile's second half in one sheet — Skills,
// Top specialties, Languages, Built with (from the parts lists of their shared
// projects), Works on, and Links and social (each opens in the browser). A
// visitor sees only the groups with something in them; on your own profile an
// empty group says so, with the way to fill it in Edit profile.

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Tag } from "@/components/ideeza/tag";
import { specialityLabelOf, type MoreAbout } from "@/lib/people/phone-profile";
import { Sheet } from "../kit/sheet";

function Group({ title, empty, children }: { title: string; empty: React.ReactNode | null; children: React.ReactNode | null }) {
  if (!children && !empty) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <h3 className="text-md font-regular leading-md text-text-primary">{title}</h3>
      {children ?? <p className="text-md leading-md text-text-tertiary">{empty}</p>}
    </section>
  );
}

function Chips({ chips }: { chips: readonly string[] }) {
  if (!chips.length) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
      {chips.map((c) => (
        <li key={c}>
          <Tag size="md">{c}</Tag>
        </li>
      ))}
    </ul>
  );
}

export function MoreAboutSheet({
  open,
  onClose,
  title,
  more,
  builtWithNote,
  own,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  /** "More about Naim". */
  title: string;
  more: MoreAbout;
  /** "from the parts lists of 6 shared projects". */
  builtWithNote: string;
  own: boolean;
  /** Your own: opens Edit profile from an empty group. */
  onEdit?: () => void;
}) {
  const add = (what: string) =>
    own && onEdit ? (
      <>
        No {what} yet.{" "}
        <button
          type="button"
          onClick={() => {
            onClose();
            onEdit();
          }}
          className="font-medium text-text-brand outline-none hover:underline focus-visible:underline"
        >
          Add in Edit profile
        </button>
      </>
    ) : null;
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-8 pb-4">
        <Group title="Skills" empty={add("skills")}>
          {more.skills.length ? <Chips chips={more.skills} /> : null}
        </Group>
        <Group title="Top specialties" empty={add("top specialties")}>
          {more.specialities.length ? <Chips chips={more.specialities.map(specialityLabelOf)} /> : null}
        </Group>
        <Group title="Languages" empty={add("languages")}>
          {more.languages.length ? <Chips chips={more.languages} /> : null}
        </Group>
        <Group title="Built with" empty={own ? "Nothing yet. It fills in from the parts lists of the projects you share." : null}>
          {more.builtWith.length ? (
            <p className="text-sm leading-sm text-text-secondary">
              {more.builtWith.join(" · ")} — {builtWithNote}
            </p>
          ) : null}
        </Group>
        <Group title="Works on" empty={null}>
          {more.worksOn.length ? <Chips chips={more.worksOn} /> : null}
        </Group>
        <Group title="Links and social" empty={add("links")}>
          {more.links.length ? (
            <ul className="m-0 flex list-none flex-col p-0">
              {more.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="flex h-[44px] items-center gap-4 rounded-md p-6 outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <span className="shrink-0 text-md leading-md text-text-secondary">{l.label}</span>
                    <span className="min-w-0 flex-1 truncate text-right text-md leading-md text-text-primary">{l.value}</span>
                    <span className="shrink-0 text-[color:var(--color-icon-default)]">
                      <Icon icon={ArrowRight01Icon} size={20} />
                    </span>
                    <span className="sr-only">(opens in your browser)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </Group>
      </div>
    </Sheet>
  );
}
