// One example of a maker's screen inside the admin's Maker preview: a dashed
// frame on the page colour, so it reads as the maker's app and not as one of
// the admin's own controls, with where in the app the maker meets it.

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { cn } from "@/lib/utils";

export function PreviewFrame({ where, children, className }: { where: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={cn("m-0 flex min-w-0 flex-col gap-8 rounded-xl border border-dashed border-border-strong bg-bg-page p-8", className)}>
      <figcaption className="flex flex-wrap items-center gap-4">
        <Badge tone="info">Makers see</Badge>
        <span className="text-sm leading-sm text-text-tertiary">{where}</span>
      </figcaption>
      {children}
    </figure>
  );
}

/** A line for the admin under an example: what makers don't see. */
export function AdminNote({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-sm leading-sm text-text-tertiary">{children}</p>;
}
