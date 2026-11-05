"use client";

// Earn › Money's phone parts (Figma 17 at 375 px): a section — Heading/H6,
// an aside on its row (the Testnet demo badge), the web's lead line under
// it — and the row a ListCard opens a sheet from (Mobile / Info row: 12
// padding, the value at its end, a chevron).

import * as React from "react";
import { EARN_H2_CLASS, EARN_LEAD } from "../parts";

export const ROW_BUTTON =
  "flex min-h-[44px] w-full items-center gap-4 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle";

export function MoneySection({
  id,
  title,
  lead,
  aside,
  children,
}: {
  id: string;
  title: string;
  lead: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-8 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 id={headingId} className={EARN_H2_CLASS}>
            {title}
          </h2>
          {aside}
        </div>
        <p className={EARN_LEAD}>{lead}</p>
      </div>
      {children}
    </section>
  );
}
