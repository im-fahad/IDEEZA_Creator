"use client";

// Campaign History (Figma "Refer & Earn" 229289, Date range 229327): the
// current campaign's referrals, searched by the referred creator's name and
// filtered by Last week, Last month or a year (a pick-one sheet).

import * as React from "react";
import { SearchInput } from "@/components/ideeza/search-input";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { cn } from "@/lib/utils";
import { campaignOf, currentLinkOf, filterReferrals, referralRowsOf, referralYearsOf, type DateRange } from "@/lib/wallet/referral";
import { useReferralData } from "@/lib/wallet/use-earn-stores";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { EmptyCard, FilterButton, SECTION_TITLE, useEarnState } from "./parts";
import { ReferralCard } from "./refer-tab";

export function CampaignHistory() {
  const { wallet, now, id } = useEarnState();
  const data = useReferralData();
  const [search, setSearch] = React.useState("");
  const [range, setRange] = React.useState("all");
  const link = data && id ? currentLinkOf(data, id) : null;
  const rows = data && id && link ? referralRowsOf(data, wallet, id).filter((r) => r.campaign === link.campaign) : [];
  const picked: DateRange = range === "all" || range === "week" || range === "month" ? range : Number(range);
  const shown = filterReferrals(rows, { campaign: "all", search, range: picked }, now);
  const campaign = link ? campaignOf(link.campaign) : null;

  return (
    <Screen top={<TopBar back title="Campaign History" />} className="px-8 pb-8 pt-4">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-6">
          <h2 className={cn(SECTION_TITLE, "min-w-0")}>History{campaign ? ` · ${campaign.name}` : ""}</h2>
          <TestnetDemoBadge />
        </div>
        <div className="flex items-center gap-6">
          <SearchInput value={search} onValueChange={setSearch} onClear={() => setSearch("")} placeholder="Search by user name" aria-label="Search by user name" containerClassName="min-w-0 flex-[1.4]" />
          <FilterButton
            label="Date Range"
            value={range}
            onChange={setRange}
            options={[
              { value: "all", label: "All time" },
              { value: "week", label: "Last Week" },
              { value: "month", label: "Last Month" },
              ...referralYearsOf(rows, now).map((y) => ({ value: String(y), label: String(y) })),
            ]}
          />
        </div>
        {!data ? (
          <Skeleton shape="block" className="h-[200px] w-full" />
        ) : !link ? (
          <EmptyCard lines={["No campaign yet.", "Generate your link on Refer & Earn."]} />
        ) : shown.length === 0 ? (
          <EmptyCard lines={rows.length ? ["No referral matches."] : ["No data found."]} />
        ) : (
          <ul className="flex flex-col gap-8">
            {shown.map((r) => (
              <ReferralCard key={r.id} r={r} title={false} />
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}
