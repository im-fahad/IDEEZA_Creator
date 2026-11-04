"use client";

// Stake List (Figma "Stacking" 228684): search the demo staking contracts by
// name or address; each card (the Figma's dark card with the brand glow) has
// its name, address, chain ID and its best APR still open, and opens the
// contract's staking options. A paused or blocked contract says so.

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ideeza/badge";
import { SearchInput } from "@/components/ideeza/search-input";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { aprText, chainIdOf, contractStatusOf, searchContracts, topAprOf } from "@/lib/wallet/staking";
import { useStakeAdmin } from "@/lib/wallet/use-earn-stores";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { EmptyCard, useEarnState } from "./parts";

export function StakeList() {
  const [query, setQuery] = React.useState("");
  const { now } = useEarnState();
  const admin = useStakeAdmin();
  const shown = searchContracts(query);
  return (
    <Screen top={<TopBar back title="Stake List" />} className="px-8 pb-8 pt-4">
      <div className="flex flex-col gap-8">
        <SearchInput value={query} onValueChange={setQuery} onClear={() => setQuery("")} placeholder="Search" aria-label="Search contracts by name or address" />
        {shown.length === 0 ? (
          <EmptyCard lines={[`No contract matches “${query.trim()}”.`]} />
        ) : (
          <ul className="grid grid-cols-2 gap-6">
            {shown.map((c) => {
              const status = contractStatusOf(admin, c.id);
              return (
                <li key={c.id}>
                  <Link
                    href={`/m/earn/contract/${c.id}`}
                    data-theme="dark"
                    className="flex h-full min-h-[88px] flex-col justify-between gap-4 overflow-hidden rounded-lg bg-bg-page bg-[radial-gradient(circle_at_100%_70%,color-mix(in_srgb,var(--color-violet-600)_55%,transparent),transparent_55%)] p-5 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <span className="flex flex-col">
                      <span className="truncate text-lg font-medium leading-lg text-text-primary">{c.name}</span>
                      <span className="truncate text-md leading-md text-text-tertiary">{shortAddress(c.address)}</span>
                    </span>
                    <span className="flex items-end justify-between gap-4">
                      <span className="text-md leading-md text-text-tertiary">Chain ID {chainIdOf(c.network)}</span>
                      <span className="flex flex-col items-end text-sm leading-sm">
                        <span className="text-text-primary">APR</span>
                        <span className="font-medium text-text-warning">{aprText(topAprOf(c, now))}</span>
                      </span>
                    </span>
                    {status !== "active" && (
                      <Badge tone={status === "blocked" ? "error" : "warning"} className="self-start">
                        {status === "blocked" ? "Blocked" : "Paused"}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Screen>
  );
}
