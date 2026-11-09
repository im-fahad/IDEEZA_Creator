"use client";

// The web's notices (components/notifications/use-notices.ts, the bell's one
// list) as the phone lists them: without what this phone cleared, and the
// count its bell carries (unread, heard, never messages — the web's rule).

import * as React from "react";
import { useNotices } from "@/components/notifications/use-notices";
import { countsOnBell } from "@/lib/notifications/filter";
import { isCleared } from "@/lib/notifications/phone";
import type { Notice } from "@/lib/notifications/types";
import { useClearedNotices } from "./use-feed";

export function usePhoneNotices() {
  const feed = useNotices();
  const { hydrated, cleared, update } = useClearedNotices();
  return React.useMemo(() => {
    const list = feed.list.filter((n) => !isCleared(n, cleared));
    const unread = list.filter((n) => !feed.isRead(n));
    return {
      hydrated: feed.hydrated && hydrated,
      feed,
      list,
      unread,
      badge: unread.filter((n: Notice) => countsOnBell(n, feed.settings)).length,
      updateCleared: update,
    };
  }, [feed, hydrated, cleared, update]);
}
