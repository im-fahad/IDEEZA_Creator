"use client";

// Every mobile popup rises from the bottom, in one style (owner rule,
// Shared kit KIT-RB / KIT-CF):
//
// · Sheet — the detached M09 Bottom Sheet: bg/surface, modal/border, radius/xl
//   on top, Elevation/3 — Modal. A 36 × 4 drag handle (icon/default) 12 from
//   the top, then _Modal header (Inline-left: Heading/H4 title, Body/SM
//   description, a 44 round ✕; 24 padding), the content (24 to the sides, 12
//   apart; it scrolls inside the sheet), and _Modal actions (Stacked, XL,
//   full width, the action on top; a border/subtle line above, 16 / 24 / 24
//   padding), then the home indicator. Pick-one sheets have no actions.
// · ActionSheet — M12 Action Sheet: the same surface, radius/xl all round,
//   floating on the 35 px sheet safe area. Handle, a centred Body/SM Medium
//   title in text/secondary, 40 px rows (_Select item MD: a 16 px icon, Body/MD
//   label, radius/md), then Cancel (A01 Secondary LG). The destructive row
//   (Block, Delete) is the one red row.
//
// One scrim behind every layer: color/modal/overlay at opacity/overlay (the
// --color-modal-scrim token), no blur. The scrim and Escape close the layer,
// Tab stays inside it, and the app behind is inert. Dragging the handle down
// closes it too.

import * as React from "react";
import { createPortal } from "react-dom";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { cn } from "@/lib/utils";
import { useFramed } from "../device";
import { HomeIndicator } from "../home-indicator";

const APP_ID = "m-app";

/** Open layers, oldest first: only the top one answers Escape. */
const layers: number[] = [];
let nextLayer = 0;

function useLayer(open: boolean, onClose: () => void) {
  const close = React.useRef(onClose);
  React.useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    const id = ++nextLayer;
    layers.push(id);
    const app = document.getElementById(APP_ID);
    if (layers.length === 1) app?.setAttribute("inert", "");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layers[layers.length - 1] === id) {
        e.stopPropagation();
        close.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      layers.splice(layers.indexOf(id), 1);
      if (layers.length === 0) app?.removeAttribute("inert");
    };
  }, [open]);
}

/** Pulling the handle down: the panel follows the finger, and past a third of
 *  its height (or a flick) it closes. */
function useDragToClose(panel: React.RefObject<HTMLElement | null>, onClose: () => void) {
  const start = React.useRef<{ y: number; t: number } | null>(null);
  const [dy, setDy] = React.useState(0);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { y: e.clientY, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDy(Math.max(0, e.clientY - start.current.y));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const moved = Math.max(0, e.clientY - start.current.y);
    const fast = moved / Math.max(1, performance.now() - start.current.t) > 0.6;
    const height = panel.current?.offsetHeight ?? 0;
    start.current = null;
    setDy(0);
    if (moved > height / 3 || (fast && moved > 24)) onClose();
  };
  return {
    offset: dy,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}

function Layer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: (panel: React.RefObject<HTMLDivElement | null>) => React.ReactNode;
}) {
  const panel = React.useRef<HTMLDivElement>(null);
  useLayer(open, onClose);
  useDialogFocus(open, panel);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-sheet flex flex-col justify-end font-sans">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-[var(--color-modal-scrim)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal"
        onClick={onClose}
      />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className="relative flex max-h-full flex-col">
        {children(panel)}
      </div>
    </div>,
    document.body,
  );
}

const RISE = "motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-normal motion-safe:ease-decelerate";
const SURFACE = "border-[length:var(--border-width-1)] border-solid border-[color:var(--color-modal-border)] bg-bg-surface shadow-modal";

function Handle({ drag }: { drag: ReturnType<typeof useDragToClose> }) {
  return (
    <div className="flex shrink-0 touch-none justify-center pb-6" {...drag.handlers}>
      <span aria-hidden className="h-[4px] w-[36px] rounded-full bg-[var(--color-icon-default)]" />
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  actions,
  hideClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  /** _Modal actions: XL buttons, stacked, the action first. Left out on pick-one sheets. */
  actions?: React.ReactNode;
  /** No ✕: a step that can't be left (a submitted transaction confirming). */
  hideClose?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Layer open={open} onClose={onClose} label={title}>
      {(panel) => <SheetPanel panel={panel} {...{ onClose, title, description, actions, hideClose, children }} />}
    </Layer>
  );
}

function SheetPanel({
  panel,
  onClose,
  title,
  description,
  actions,
  hideClose,
  children,
}: {
  panel: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  hideClose?: boolean;
  children?: React.ReactNode;
}) {
  const framed = useFramed();
  const drag = useDragToClose(panel, onClose);
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-t-xl border-b-0 pt-6",
        SURFACE,
        RISE,
        // Clear of the status bar: Figma's tallest sheet stops 61 under the top (8 under the bar).
        framed ? "max-h-[calc(100dvh_-_61px)]" : "max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_var(--spacing-4))]",
      )}
      style={drag.offset ? { transform: `translateY(${drag.offset}px)` } : undefined}
    >
      <Handle drag={drag} />
      <div className="shrink-0 pb-4">
        <div className="flex items-start gap-8 p-16">
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-5">
            <h2 className="text-3xl font-semibold leading-3xl text-text-primary">{title}</h2>
            {description && <p className="text-md leading-md text-text-secondary">{description}</p>}
          </div>
          {!hideClose && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={Cancel01Icon} size={24} />
            </button>
          )}
        </div>
      </div>
      {children != null && (
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-16 pb-4">{children}</div>
      )}
      {actions && (
        <div className="shrink-0 pb-5 pt-4">
          <div className="flex flex-col gap-6 border-t-[length:var(--border-width-1)] border-solid border-border-subtle px-16 pb-16 pt-8">
            {actions}
          </div>
        </div>
      )}
      <HomeIndicator className="shrink-0" />
    </div>
  );
}

export type ActionSheetItem = {
  label: string;
  icon: IconValue;
  onSelect: () => void;
  /** The one red row (Block, Delete) — always last, above Cancel. */
  destructive?: boolean;
};

export function ActionSheet({
  open,
  onClose,
  title,
  items,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
}) {
  return (
    <Layer open={open} onClose={onClose} label={title ?? "Actions"}>
      {(panel) => <ActionPanel panel={panel} onClose={onClose} title={title} items={items} />}
    </Layer>
  );
}

function ActionPanel({
  panel,
  onClose,
  title,
  items,
}: {
  panel: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
}) {
  const framed = useFramed();
  const drag = useDragToClose(panel, onClose);
  return (
    <div className={cn("flex flex-col", RISE)} style={drag.offset ? { transform: `translateY(${drag.offset}px)` } : undefined}>
      <div className={cn("flex flex-col rounded-xl pb-4 pt-6", SURFACE)}>
        <Handle drag={drag} />
        {title && (
          <div className="px-4 pb-3 pt-4">
            <p className="truncate text-center text-md font-medium leading-md text-text-secondary">{title}</p>
          </div>
        )}
        <ul className="flex flex-col px-2">
          {items.map((it) => (
            <li key={it.label}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  it.onSelect();
                }}
                className={cn(
                  "flex h-[40px] w-full items-center gap-4 rounded-md px-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
                  it.destructive ? "text-text-error" : "text-text-primary",
                )}
              >
                <span className={it.destructive ? "text-[color:var(--color-icon-error)]" : undefined}>
                  <Icon icon={it.icon} size={16} />
                </span>
                <span className="text-lg leading-lg">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 pt-2">
          <Button hierarchy="secondary" size="lg" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
      {/* The 35 px sheet safe area the menu floats on, the home indicator at its foot. */}
      <div className={cn("flex shrink-0 flex-col justify-end", framed ? "h-[35px]" : "pb-4")}>
        <HomeIndicator />
      </div>
    </div>
  );
}
