"use client";

// Profile tab root (master page "Ideeza-Main Profile" 10702:230343 and its
// open-Settings state 10702:230445): the top bar with settings and search,
// your card (photo, name, headline) that opens your profile, then Wallet with
// your IDZ, Refer and Earn, Projects, Saved Items, Settings (opens in place on
// General · Payments · $IDZ Pay · Security · Help and Support · Others) and
// Log Out. No Friends row (D-1).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AllBookmarkIcon,
  ArrowDown01Icon,
  CreditCardIcon,
  Globe02Icon,
  HelpCircleIcon,
  MenuSquareIcon,
  Note03Icon,
  Search01Icon,
  SecurityPasswordIcon,
  Settings01Icon,
  Share01Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { useMakerIdz } from "@/components/balance/use-maker-idz";
import { Avatar } from "@/components/ideeza/avatar";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { cn } from "@/lib/utils";
import { displayNameOf, initialsOf, ownHandleOf } from "@/lib/people/ids";
import { phoneProfileHref } from "@/lib/people/phone-profile";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import { idzCompactOf } from "@/lib/wallet/idz";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { LogOutSheet } from "./log-out-sheet";

const ROW =
  "flex h-[44px] w-full items-center gap-8 rounded-md bg-bg-surface px-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";
const LABEL = "min-w-0 flex-1 truncate text-lg font-semibold leading-lg text-text-primary";

function HubRow({ href, icon, label, value }: { href: string; icon: IconValue; label: string; value?: React.ReactNode }) {
  return (
    <Link href={href} className={ROW}>
      <span className="shrink-0 text-[color:var(--color-icon-default)]">
        <Icon icon={icon} size={24} />
      </span>
      <span className={LABEL}>{label}</span>
      {value}
    </Link>
  );
}

const SETTINGS: readonly { href: string; icon: IconValue; label: string }[] = [
  { href: "/m/settings/general", icon: Globe02Icon, label: "General" },
  { href: "/m/settings/payments", icon: CreditCardIcon, label: "Payments" },
  { href: "/m/settings/idz-pay", icon: CreditCardIcon, label: "$IDZ Pay" },
  { href: "/m/settings/security", icon: SecurityPasswordIcon, label: "Security" },
  { href: "/m/help", icon: HelpCircleIcon, label: "Help and Support" },
  { href: "/m/settings/others", icon: MenuSquareIcon, label: "Others" },
];

/** The Wallet row's figure: your IDZ while the demo wallet is connected. */
function WalletValue() {
  const idz = useMakerIdz();
  if (!idz.read) return <Skeleton shape="text" size="md" className="w-[64px]" />;
  if (!idz.connected || idz.idz === null) return <span className="shrink-0 text-md leading-md text-text-secondary">Not connected</span>;
  return (
    <span className="flex shrink-0 items-center gap-4">
      <TestnetDemoBadge />
      <span className="text-lg font-semibold leading-lg tabular-nums text-text-brand">{idzCompactOf(idz.idz).replace(/ IDZ$/, " $IDZ")}</span>
    </span>
  );
}

export function ProfileHub() {
  const router = useRouter();
  const { hydrated, fields } = useMyProfile();
  const photo = useMyPhoto();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [signOut, setSignOut] = React.useState(false);
  const settingsId = React.useId();

  const name = displayNameOf(fields.name);
  const me = phoneProfileHref(ownHandleOf(fields.handle));

  return (
    <Screen
      top={
        <TopBar
          back
          title="Profile"
          actions={[
            { icon: Settings01Icon, label: "Settings", onClick: () => router.push("/m/settings") },
            { icon: Search01Icon, label: "Search", onClick: () => router.push("/m/profile/search") },
          ]}
        />
      }
    >
      <div className="flex flex-col gap-12 px-8 pb-12 pt-2">
        {hydrated && photo.hydrated ? (
          <Link
            href={me}
            aria-label={`${name}, view your profile`}
            className="flex items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface px-8 py-6 outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Avatar size="md" initials={initialsOf(name, fields.latinName || null)} src={photo.url ?? undefined} />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-lg font-medium leading-lg text-text-primary">{name}</span>
              <span className="truncate text-md leading-md text-text-secondary">{fields.headline || "View your profile"}</span>
            </span>
          </Link>
        ) : (
          <div aria-hidden className="flex items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface px-8 py-6">
            <Skeleton shape="circle" className="size-[40px]" />
            <div className="flex flex-col gap-4">
              <Skeleton shape="text" size="md" className="w-[120px]" />
              <Skeleton shape="text" size="sm" className="w-[160px]" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-12">
            <nav aria-label="Your account" className="flex flex-col gap-6">
              <HubRow href="/m/earn/wallet" icon={Wallet03Icon} label="Wallet" value={<WalletValue />} />
              <HubRow href="/m/earn/refer" icon={Share01Icon} label="Refer and Earn" />
              <HubRow href="/m/projects" icon={Note03Icon} label="Projects" />
              <HubRow href="/m/saved" icon={AllBookmarkIcon} label="Saved Items" />
            </nav>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                aria-expanded={settingsOpen}
                aria-controls={settingsId}
                onClick={() => setSettingsOpen((v) => !v)}
                className={cn(ROW, "px-8")}
              >
                <span className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={Settings01Icon} size={24} />
                </span>
                <span className={LABEL}>Settings</span>
                <span
                  className={cn(
                    "shrink-0 text-[color:var(--color-icon-default)] transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
                    settingsOpen && "rotate-180",
                  )}
                >
                  <Icon icon={ArrowDown01Icon} size={24} />
                </span>
              </button>
              {settingsOpen && (
                <ul id={settingsId} aria-label="Settings" className="flex flex-col gap-4">
                  {SETTINGS.map((s) => (
                    <li key={s.href}>
                      <HubRow href={s.href} icon={s.icon} label={s.label} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setSignOut(true)}>
            Log Out
          </Button>
        </div>
      </div>
      <LogOutSheet open={signOut} onClose={() => setSignOut(false)} />
    </Screen>
  );
}
