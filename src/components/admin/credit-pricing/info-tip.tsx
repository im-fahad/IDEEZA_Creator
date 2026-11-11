"use client";

// The info icon beside a table's column heading or a row's name (owner,
// 2026-11-11: "add info icon and tooltip in all table headers and names"):
// what the thing is and what it does to the price (lib/admin/credit-help.ts).
// - The DS A19 Tooltip through useHoverTip: portalled and placed above its
//   icon (below when there's no room), so a table's scroll box never clips it,
//   and it sits over the Publish dialog (z-popover > z-modal).
// - It opens on hover, on keyboard focus and on a tap (a phone has no hover);
//   Escape, a scroll, leaving, moving focus on or a tap elsewhere closes it
//   (WCAG 1.4.13).
// - A screen reader hears it as the button's description, always in the page
//   (`hidden`, which aria-describedby still reads), not as part of the heading.

import * as React from "react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { useHoverTip } from "@/components/blog/list/hover-tip";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

export function InfoTip({ about, text, className }: { about: string; text: string; className?: string }) {
  const id = React.useId();
  const { shown, anchor, setAnchor, show, hide, node } = useHoverTip(text, "center", { wrap: true });

  // A tap anywhere else closes it: a tapped button isn't focused on every phone (Safari), so blur can't.
  React.useEffect(() => {
    if (!shown) return;
    const onDown = (e: PointerEvent) => {
      if (anchor && e.target instanceof Node && anchor.contains(e.target)) return;
      hide(true);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [shown, anchor, hide]);

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        aria-label={`About ${about}`}
        aria-describedby={id}
        // A touch's pointer leaves as the finger lifts: only a mouse or a pen opens it by hovering.
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") show();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch") hide();
        }}
        onFocus={show}
        onBlur={() => hide(true)}
        onClick={show}
        className={cn(
          "-my-2 ml-1 inline-flex h-[24px] w-[24px] shrink-0 cursor-help items-center justify-center rounded-full border-0 bg-transparent p-0 align-middle text-text-tertiary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus",
          className,
        )}
      >
        <Icon icon={InformationCircleIcon} size={16} />
      </button>
      <span id={id} hidden>
        {text}
      </span>
      {node}
    </>
  );
}

/** A label with its tip, the icon kept on the label's last line with its last word. */
export function LabelTip({ label, text }: { label: string; text: string }) {
  const cut = label.lastIndexOf(" ");
  return (
    <>
      {cut < 0 ? null : label.slice(0, cut + 1)}
      <span className="whitespace-nowrap">
        {label.slice(cut + 1)}
        <InfoTip about={label} text={text} />
      </span>
    </>
  );
}
