"use client";

// Figma M02 Toast as the Shared kit uses it (KIT-TO-01…04, KIT-RB-21/27):
// 16 in from each side, radius/xl, bg/surface-raised, border/subtle,
// Elevation/2; 14 / 14 / 14 / 16 padding, 12 between the lead and the text.
// The lead is a 20 px icon/success (or icon/error) disc with a 14 px glyph in
// text/inverse; the title is Body/MD Medium, and an action (A03 Link, brand)
// sits under it. Kit rules: one at a time, 8 px above whatever is at the foot
// (the tab bar, a bottom action bar, the home indicator), 4 s — 6 s with an
// action — and it never takes focus.

import * as React from "react";
import { Alert02Icon, CheckmarkCircle04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

export type ToastLead = "success" | "error" | "none";

export type ToastInput = {
  title: string;
  lead?: ToastLead;
  action?: { label: string; onClick: () => void };
};

type Shown = ToastInput & { id: number };

const ToastContext = React.createContext<(t: ToastInput) => void>(() => {});

/** Shows a toast, replacing the one on screen. */
export function useToast(): (t: ToastInput) => void {
  return React.useContext(ToastContext);
}

const PENDING_KEY = "ideeza:m:toast";

/** A toast for the next page, when this one reloads to get there (signing in
 *  swaps the account's work in, so the page starts again): "Password reset". */
export function toastAfterReload(title: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, title);
  } catch {
    // Storage refused: the toast is lost, nothing else is.
  }
}

/** Shows the toast a reload carried over, once. Mounted once by the app. */
export function PendingToast() {
  const toast = useToast();
  React.useEffect(() => {
    let title: string | null = null;
    try {
      title = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      return;
    }
    if (title) toast({ title });
  }, [toast]);
  return null;
}

/** What sits at the foot of the screen carries this, so the toast stands above it. */
export const FOOT_ATTR = "data-m-foot";

/** 8 px (spacing/4) above the highest thing marked as the foot. */
function bottomOffset(root: HTMLElement): number {
  const floor = root.getBoundingClientRect().bottom;
  let top = floor;
  root.querySelectorAll<HTMLElement>(`[${FOOT_ATTR}]`).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top < top) top = r.top;
  });
  const gap = parseFloat(getComputedStyle(root).getPropertyValue("--spacing-4")) || 0;
  return floor - top + gap;
}

export function ToastProvider({ rootId, children }: { rootId: string; children: React.ReactNode }) {
  const [toast, setToast] = React.useState<Shown | null>(null);
  const [bottom, setBottom] = React.useState(0);
  const seq = React.useRef(0);

  const show = React.useCallback(
    (t: ToastInput) => {
      const root = document.getElementById(rootId);
      if (root) setBottom(bottomOffset(root));
      seq.current += 1;
      setToast({ ...t, id: seq.current });
    },
    [rootId],
  );

  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), toast.action ? 6000 : 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-x-8 z-toast flex justify-center"
        style={{ bottom }}
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface-raised py-7 pl-8 pr-7 shadow-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-normal motion-safe:ease-decelerate"
          >
            {toast.lead !== "none" && (
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-[20px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-text-inverse)]",
                  toast.lead === "error" ? "bg-[var(--color-icon-error)]" : "bg-[var(--color-icon-success)]",
                )}
              >
                <Icon icon={toast.lead === "error" ? Alert02Icon : CheckmarkCircle04Icon} size={14} />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-lg font-medium leading-lg text-text-primary">{toast.title}</p>
              {toast.action && (
                <div className="flex pt-4">
                  <button
                    type="button"
                    className="text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
                    onClick={() => {
                      toast.action?.onClick();
                      setToast(null);
                    }}
                  >
                    {toast.action.label}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
