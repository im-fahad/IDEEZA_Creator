// Every publish, newest first: when, by whom, what it was worked out on and
// what changed. Kept in this browser with the rest (HISTORY_MAX of them).

import * as React from "react";
import type { HistoryEntry } from "@/lib/admin/credit-pricing";
import { Section } from "./fields";
import { formatWhen } from "./pricing-summary";

export function PriceHistory({ history }: { history: HistoryEntry[] }) {
  return (
    <Section title="Publish history" description="Every publish, newest first.">
      {history.length === 0 ? (
        <p className="m-0 rounded-lg bg-bg-subtle p-8 text-md leading-md text-text-secondary">
          Nothing published yet.
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-6 p-0">
          {history.map((entry) => (
            <li key={entry.at} className="rounded-lg border border-solid border-border">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-8 gap-y-2 rounded-lg p-8 outline-none focus-visible:ring-2 focus-visible:ring-border-focus [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className="text-md font-semibold leading-md text-text-primary">
                      {formatWhen(entry.at)}
                      {entry.by ? <span className="font-regular text-text-secondary"> · {entry.by}</span> : null}
                    </span>
                    <span className="text-sm leading-sm text-text-secondary">{entry.basis}</span>
                  </span>
                  <span className="text-sm font-medium leading-sm text-text-brand">
                    <span className="group-open:hidden">
                      Show {entry.changes.length === 1 ? "1 change" : `${entry.changes.length} changes`}
                    </span>
                    <span className="hidden group-open:inline">Hide changes</span>
                  </span>
                </summary>
                <ul className="m-0 flex list-none flex-col border-t border-solid border-border p-0">
                  {entry.changes.map((c) => (
                    <li
                      key={c.label}
                      className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-b border-solid border-border px-8 py-4 last:border-b-0"
                    >
                      <span className="text-md leading-md text-text-primary">{c.label}</span>
                      <span className="text-md leading-md text-text-secondary">
                        {c.from} → <span className="font-medium text-text-primary">{c.to}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
