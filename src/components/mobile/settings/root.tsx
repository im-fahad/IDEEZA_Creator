"use client";

// ST-01 · Settings, in the web registry's order: Find a setting, the account
// card, Preferences (each page with its state as the row's value), Money
// (entry rows into Plan & pricing, Get paid, Balance — and Verify your
// identity, which the master page's Profile settings draws as Creator
// Verification), Support (Help), the neutral Sign out (AU-50) and the version.
// ST-02: the rows wait as bones until the stores are read. ST-03 / 03b: what
// Find a setting finds ("Page › Row", opening the page at the row), or none.

import * as React from "react";
import {
  AiBrain01Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  CreditCardIcon,
  HelpCircleIcon,
  LanguageSkillIcon,
  Logout01Icon,
  Notification01Icon,
  PaintBoardIcon,
  Shield01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Icon } from "@/components/dashboard/icon";
import { useMakerIdz } from "@/components/balance/use-maker-idz";
import { Avatar } from "@/components/ideeza/avatar";
import { SearchInput } from "@/components/ideeza/search-input";
import { useGetPaidData } from "@/components/settings/get-paid/parts";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/account/auth";
import { balanceOf, formatUsd } from "@/lib/account/payout";
import { creditTotals } from "@/lib/account/summary";
import { usePayout } from "@/lib/account/use-payout";
import { useKyc } from "@/lib/commerce/use-commerce";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { popupModeOf } from "@/lib/notifications/filter";
import { displayNameOf, initialsOf, ownHandleOf } from "@/lib/people/ids";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import { searchSettings, type SettingsHit } from "@/lib/settings/search";
import { useSettings } from "@/lib/settings/use-settings";
import { useDataRowValue } from "./data";
import { SettingsGroup, SettingsRow, SettingsScreen } from "./kit";
import { SignOutSheet } from "./sign-out";

/** The app's version as the Figma prints it under the list. */
const VERSION = "1.1.5.451";

const POPUP_WORDS = { now: "Right away", daily: "Once a day", paused: "Paused" } as const;
const THEME_WORDS = { light: "Light", dark: "Dark", system: "Match system" } as const;

/** Where a web settings row lives on the phone. */
export function mobileSettingsHref(hit: SettingsHit): string {
  const row = hit.rowId;
  const at = (path: string) => (row ? `${path}#${row}` : path);
  switch (hit.page) {
    case "account":
      return row === "sign-in" ? "/m/settings/security" : row === "handle" ? "/m/settings/account/handle" : at("/m/settings/account");
    case "privacy":
      if (row === "blocked") return "/m/settings/privacy/blocked";
      if (row === "hidden-words") return "/m/settings/privacy/hidden-words";
      if (row === "reports") return "/m/settings/privacy/reports";
      return at("/m/settings/privacy");
    case "data":
      if (row === "activity") return "/m/settings/data/search-history";
      if (row === "blog-reuse") return "/m/settings/data/blog-reuse";
      if (row === "download") return "/m/settings/data/download";
      if (row === "restore") return "/m/settings/data/restore";
      return at("/m/settings/data");
    case "notifications":
    case "language":
    case "appearance":
      return at(`/m/settings/${hit.page}`);
    case "plan":
      return "/m/plans";
    case "get-paid":
      return row === "identity" ? "/m/settings/kyc" : "/m/settings/payments";
    default:
      return "/m/settings";
  }
}

export function SettingsRoot() {
  const [query, setQuery] = React.useState("");
  const [signOut, setSignOut] = React.useState(false);
  const hits = React.useMemo(() => searchSettings(query), [query]);
  const searching = query.trim().length > 0;
  const profileRead = useMyProfile().hydrated;
  const planRead = useCreatePlan().hydrated;
  const creditsRead = useCredits().hydrated;

  return (
    <SettingsScreen title="Settings" offlineNote={false} loading={!(profileRead && planRead && creditsRead)}>
      <SearchInput
        value={query}
        onValueChange={setQuery}
        onClear={() => setQuery("")}
        placeholder="Find a setting"
        aria-label="Find a setting"
        enterKeyHint="search"
        containerClassName="h-[44px]"
      />
      {searching ? (
        <SearchResults query={query} hits={hits} />
      ) : (
        <>
          <AccountCard />
          <Preferences />
          <Money />
          <SettingsGroup label="Support">
            <SettingsRow icon={HelpCircleIcon} label="Help" href="/m/help" />
          </SettingsGroup>
          <SettingsGroup>
            <SettingsRow id="sign-out" icon={Logout01Icon} label="Sign out" onClick={() => setSignOut(true)} />
          </SettingsGroup>
          <p className="text-center text-sm leading-sm text-text-tertiary">Version {VERSION}</p>
        </>
      )}
      <SignOutSheet open={signOut} onClose={() => setSignOut(false)} />
    </SettingsScreen>
  );
}

function SearchResults({ query, hits }: { query: string; hits: SettingsHit[] }) {
  if (!hits.length) {
    return <p className="py-8 text-center text-md leading-md text-text-secondary">No setting matches “{query.trim()}”.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p aria-live="polite" className="text-sm leading-sm text-text-tertiary">
        {hits.length === 1 ? "1 result" : `${hits.length} results`}
      </p>
      <SettingsGroup>
        {hits.map((h) => (
          <SettingsRow
            key={h.href}
            label={h.label}
            helper={h.rowId ? `${h.pageLabel} › ${h.label}` : "Settings page"}
            href={mobileSettingsHref(h)}
          />
        ))}
      </SettingsGroup>
    </div>
  );
}

function AccountCard() {
  const { account } = useAuth();
  const { hydrated, fields } = useMyProfile();
  const photo = useMyPhoto();
  const name = displayNameOf(fields.name || `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim());
  const handle = ownHandleOf(fields.handle);
  return (
    <Link
      href="/m/settings/account"
      className="flex items-center gap-6 rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-8 py-6 outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Avatar size="lg" initials={initialsOf(name, fields.latinName || null)} src={photo.url ?? undefined} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-md font-semibold leading-md text-text-primary">{hydrated ? name : " "}</span>
        <span className="truncate text-sm leading-sm text-text-secondary">{fields.handle ? `Account · @${handle}` : "Account"}</span>
      </span>
      <span className="shrink-0 text-[color:var(--color-icon-default)]">
        <Icon icon={ArrowRight01Icon} size={24} />
      </span>
    </Link>
  );
}

function Preferences() {
  const settings = useSettings();
  const { theme } = useTheme();
  const data = useDataRowValue();
  return (
    <SettingsGroup label="Preferences">
      <SettingsRow icon={Notification01Icon} label="Notifications" value={POPUP_WORDS[popupModeOf(settings)]} href="/m/settings/notifications" />
      <SettingsRow
        icon={Shield01Icon}
        label="Privacy & safety"
        value={settings.audience.locked ? "Profile locked" : "Profile open"}
        href="/m/settings/privacy"
      />
      <SettingsRow icon={LanguageSkillIcon} label="Language & region" value="English" href="/m/settings/language" />
      <SettingsRow icon={PaintBoardIcon} label="Appearance & accessibility" helper={THEME_WORDS[theme]} href="/m/settings/appearance" />
      <SettingsRow icon={AiBrain01Icon} label="AI & your data" value={data.value} badge={data.badge} href="/m/settings/data" />
    </SettingsGroup>
  );
}

function Money() {
  const { hydrated: planReady, plan } = useCreatePlan();
  const { hydrated: creditsReady, ledger } = useCredits();
  const idz = useMakerIdz();
  const payout = usePayout();
  const getPaid = useGetPaidData();
  const kyc = useKyc();
  const credits = creditTotals(ledger).remaining;
  const getPaidValue =
    !payout || !getPaid.ready
      ? ""
      : getPaid.stageOf(payout) === "setup"
        ? "Set up when you sell"
        : formatUsd(balanceOf(getPaid.earnings, payout.withdrawals).available);
  return (
    <SettingsGroup label="Money">
      <SettingsRow
        icon={CreditCardIcon}
        label="Plan & pricing"
        helper={planReady ? `${plan.name} plan` : undefined}
        value={creditsReady ? `${credits.toLocaleString("en-US")} ${credits === 1 ? "credit" : "credits"}` : ""}
        href="/m/plans"
      />
      <SettingsRow icon={Wallet01Icon} label="Get paid" value={getPaidValue} href="/m/settings/payments" />
      <SettingsRow
        icon={Coins01Icon}
        label="Balance"
        value={idz.read ? (idz.connected && idz.idz !== null ? `${Number(idz.idz).toLocaleString("en-US")} IDZ` : "Wallet not connected") : ""}
        href="/m/settings/idz-pay"
      />
      <SettingsRow
        icon={CheckmarkBadge01Icon}
        label="Verify your identity"
        value={kyc === undefined ? "" : kyc ? "Verified" : "Not yet"}
        href="/m/settings/kyc"
      />
    </SettingsGroup>
  );
}
