"use client";

// The mobile prototype's root (/m). On a phone it is the app, full screen. On
// a desktop it draws a phone — the Figma frame's 375 × 812 — and runs the very
// same page inside it in an iframe (see device.tsx): the desktop then shows
// exactly what a phone shows. The iframe reports where it is, and the desktop
// page keeps its own address in step, so a reload or a copied link opens the
// same screen.

import * as React from "react";
import { usePathname } from "next/navigation";
import { FramedProvider, PATH_MESSAGE, useDeviceMode } from "./device";
import { MobileGate } from "./account/mobile-gate";
import { SplashBody } from "./account/parts";
import { BackOnlineToast } from "./kit/states";
import { PendingToast, ToastProvider } from "./kit/toast";

/** The app's root element: sheets mark it inert while they are open. */
export const MOBILE_APP_ID = "m-app";

export function MobileRoot({ children }: { children: React.ReactNode }) {
  const mode = useDeviceMode();
  if (mode === "pending")
    return (
      <div className="flex h-dvh flex-col bg-bg-page">
        <SplashBody />
      </div>
    );
  if (mode === "desktop") return <PhoneFrame />;
  return <MobileApp framed={mode === "framed"}>{children}</MobileApp>;
}

function PhoneFrame() {
  const [src] = React.useState(() => window.location.pathname + window.location.search);

  React.useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: unknown; path?: unknown } | null;
      if (data?.type !== PATH_MESSAGE || typeof data.path !== "string" || !data.path.startsWith("/m")) return;
      if (data.path !== window.location.pathname + window.location.search) {
        window.history.replaceState(window.history.state, "", data.path);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="flex h-dvh items-center justify-center overflow-auto bg-bg-subtle p-8">
      <div className="box-content h-[812px] max-h-[calc(100%_-_2_*_var(--border-width-1))] w-[375px] shrink-0 overflow-hidden rounded-3xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-page shadow-overlay">
        <iframe src={src} title="IDEEZA mobile" className="block size-full border-0" />
      </div>
    </div>
  );
}

function MobileApp({ framed, children }: { framed: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const keyboardHeight = useVisibleHeight();

  // After every render, so a new query (?step=2) is reported as well as a new page.
  React.useEffect(() => {
    if (!framed) return;
    window.parent.postMessage(
      { type: PATH_MESSAGE, path: pathname + window.location.search },
      window.location.origin,
    );
  });

  return (
    <FramedProvider value={framed}>
      <div
        id={MOBILE_APP_ID}
        className="relative h-dvh overflow-hidden bg-bg-page font-sans text-text-primary"
        style={keyboardHeight ? { height: keyboardHeight } : undefined}
      >
        <ToastProvider rootId={MOBILE_APP_ID}>
          {/* Pages read their query (useSearchParams); they only ever render in the browser. */}
          <React.Suspense fallback={null}>
            <MobileGate>{children}</MobileGate>
          </React.Suspense>
          <BackOnlineToast />
          <PendingToast />
        </ToastProvider>
      </div>
    </FramedProvider>
  );
}

function subscribeViewport(onChange: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onChange);
  return () => vv?.removeEventListener("resize", onChange);
}

/** The height left above the on-screen keyboard (iOS keeps the layout behind
 *  it), so the screen's foot — Sign in, Create account — rides on the keyboard
 *  (KIT-KB-01); null when no keyboard is up. */
function useVisibleHeight(): number | null {
  return React.useSyncExternalStore(
    subscribeViewport,
    () => {
      const vv = window.visualViewport;
      return vv && vv.height < window.innerHeight - 1 ? Math.round(vv.height) : null;
    },
    () => null,
  );
}
