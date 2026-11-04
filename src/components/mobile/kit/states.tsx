"use client";

// Shared kit states (KIT-SK / EM / ER / OF, MFR-28). Loading bones hold still
// with reduced motion (A21 Skeleton already does); the shells around them
// stay real. Empty and error are M48 / M49 (StateCard) at
// the content's full width; offline is an M01 Alert over what was loaded
// before, and coming back online says so in a toast.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useToast } from "./toast";

/** Kit / Skeleton / List row (10612:2704): a 48 circle, then 160 × 12 and 80 × 8 lines 8 apart. */
export function ListRowBones() {
  return (
    <div aria-hidden className="flex items-center gap-6 py-4">
      <Skeleton shape="circle" size="lg" />
      <div className="flex flex-col gap-4">
        <Skeleton shape="text" size="md" />
        <Skeleton shape="text" size="sm" />
      </div>
    </div>
  );
}

/** KIT-SK-01: list rows down the content. */
export function ListBones({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      {Array.from({ length: rows }, (_, i) => (
        <ListRowBones key={i} />
      ))}
    </div>
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Whether the phone is online; true until the browser says otherwise. */
export function useOnline(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** KIT-OF-01: over what was loaded before, while the phone is offline. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return <Banner tone="attention">You’re offline. Showing what was loaded before.</Banner>;
}

/** KIT-OF-01b: the "Back online" toast when the connection returns. Mounted once by the app. */
export function BackOnlineToast() {
  const online = useOnline();
  const toast = useToast();
  const was = React.useRef(online);
  React.useEffect(() => {
    if (online && !was.current) toast({ title: "Back online" });
    was.current = online;
  }, [online, toast]);
  return null;
}
