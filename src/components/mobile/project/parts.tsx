"use client";

// The project page's local components (Figma "Local components · mobile
// shell" 10325:2 on Project Details · 2026 update):
// · SectionHeading — Heading/H6 with an A03 Link MD Brand ("See all") on a
//   44 px tap area, or an action beside it (+ Add);
// · ListCard — radius/xl, border/default, the rows divided by border/subtle;
// · ProductRow — Mobile / Product row: a 56 thumbnail (radius/md), the name
//   (Label/LG) with its stage badge (A17 Subtle Neutral MD), a Body/XS
//   secondary line and a tertiary one, the chevron; 12 padding, 12 apart;
// · InfoRow — Mobile / Info row: Body/SM label (secondary) and value
//   (primary), a chevron when it opens something; 12 padding;
// · Thumb — the 56 thumbnail, its placeholder icon when there is no image.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, Image02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

export const LINK_MD = "text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:underline";

/** A03 Link on the kit's 44 px tap area. */
export function TapLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("-my-6 inline-flex min-h-[44px] items-center", LINK_MD, className)}>
      {children}
    </Link>
  );
}

export function SectionHeading({
  title,
  link,
  action,
  id,
}: {
  title: string;
  link?: { href: string; label: string; aria?: string };
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex min-h-[32px] items-center justify-between gap-4">
      <h2 id={id} className="text-lg font-semibold leading-lg text-text-primary">
        {title}
      </h2>
      {link && (
        <TapLink href={link.href}>
          <span aria-hidden={link.aria ? true : undefined}>{link.label}</span>
          {link.aria && <span className="sr-only">{link.aria}</span>}
        </TapLink>
      )}
      {action}
    </div>
  );
}

export const LIST_CARD =
  "flex shrink-0 flex-col overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface";
/** A row inside a ListCard: the line under every row but the last. */
export const LIST_ROW = "border-b-[length:var(--border-width-1)] border-solid border-border-subtle last:border-b-0";

export function ListCard({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <ul aria-label={label} className={cn(LIST_CARD, className)}>
      {children}
    </ul>
  );
}

export function Chevron({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("shrink-0 text-[color:var(--color-icon-default)]", className)}>
      <Icon icon={ArrowRight01Icon} size={20} />
    </span>
  );
}

export function Thumb({
  url,
  icon = Image02Icon,
  className,
  children,
}: {
  url: string | null | undefined;
  icon?: IconValue;
  className?: string;
  children?: React.ReactNode;
}) {
  const [failed, setFailed] = React.useState<string | null>(null);
  const ok = !!url && failed !== url;
  return (
    <span className={cn("relative flex size-[56px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised", className)}>
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element -- a concept image from the build store
        <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden className="text-[color:var(--color-icon-secondary)]">
          <Icon icon={icon} size={24} />
        </span>
      )}
      {children}
    </span>
  );
}

const ROW = "flex w-full items-center gap-6 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle";

export function ProductRow({
  href,
  thumb,
  thumbIcon,
  name,
  stage,
  meta,
  facts,
  onClick,
}: {
  href?: string;
  thumb: string | null;
  thumbIcon?: IconValue;
  name: string;
  stage?: { short: string; ariaLabel: string } | null;
  meta?: React.ReactNode;
  facts?: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <Thumb url={thumb} icon={thumbIcon} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-4">
          <span className="min-w-0 truncate text-md font-semibold leading-md text-text-primary">{name}</span>
          {stage && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-bg-subtle px-4 py-2 text-sm leading-xs text-text-secondary">
              <span aria-hidden>{stage.short}</span>
              <span className="sr-only">{stage.ariaLabel}</span>
            </span>
          )}
        </span>
        {meta && <span className="truncate text-sm leading-sm text-text-secondary">{meta}</span>}
        {facts && <span className="truncate text-sm leading-sm text-text-tertiary">{facts}</span>}
      </span>
      {(href || onClick) && <Chevron />}
    </>
  );
  return (
    <li className={LIST_ROW}>
      {href ? (
        <Link href={href} className={ROW}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={ROW}>
          {body}
        </button>
      ) : (
        <div className={cn(ROW, "hover:bg-transparent")}>{body}</div>
      )}
    </li>
  );
}

export function InfoRow({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className="shrink-0 text-md leading-md text-text-secondary">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-md leading-md text-text-primary">{value}</span>
      {href && <Chevron />}
    </>
  );
  return (
    <li className={LIST_ROW}>
      {href ? (
        <Link href={href} className={cn(ROW, "min-h-[44px] gap-4")}>
          {body}
        </Link>
      ) : (
        <div className="flex min-h-[44px] w-full items-center gap-4 p-6">{body}</div>
      )}
    </li>
  );
}

/** A Body/XS line under a section heading: "3 products · 18 of 18 pieces ready". */
export function SubLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-sm text-text-secondary">{children}</p>;
}
