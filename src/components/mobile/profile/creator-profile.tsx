"use client";

// /m/creators/[handle] — a creator's profile on the phone ("People · 2026
// update", MFR-20): one layout for every viewer. Your own (PR-02/03: Share
// and ⋯ in the top bar, Change cover, the prompts, Only you see this, pins,
// Edit profile in the bar; brand-new PR-04; ⋯ PR-05; View as public PR-21/22),
// someone else's (PR-10/11: the tie only you see, Follow + Message in the bar,
// ⋯ Share · Report · Block; Following PR-13; Message's reason PR-14; blocked
// PR-15), a locked profile (PR-17), not found (PR-18), loading (PR-19) and
// couldn't load / offline (PR-20). The facts are the web profile's
// (use-profile.ts); `me` is always you, as on the web.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert01Icon,
  Edit02Icon,
  ImageAdd01Icon,
  InboxIcon,
  Mail01Icon,
  PinIcon,
  PinOffIcon,
  Share08Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useFollowing } from "@/components/profile/following-dialog";
import { useBlocked } from "@/components/profile/person-actions";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { cn } from "@/lib/utils";
import { storedUnreadable } from "@/lib/key-store";
import { OPEN_TO_WORDS, PROFILE_KEY, type ProfileFields } from "@/lib/people/fields";
import { unblockPerson } from "@/lib/messages/actions";
import { ME, directory, personByHandle, type Person } from "@/lib/people/ids";
import type { MadeItem } from "@/lib/people/made";
import {
  firstNameOf,
  linkRowsOf,
  metaLineOf,
  moreAboutSummaryOf,
  phoneProjectHref,
  profileStatsOf,
  type MoreAbout,
} from "@/lib/people/phone-profile";
import { useMyCover, useMyPhoto } from "@/lib/people/photo-store";
import { featuredOf, localTimeOf } from "@/lib/people/portfolio";
import { useMyProfile } from "@/lib/people/profile-store";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { BottomBar } from "../kit/bottom-bar";
import { ActionSheet } from "../kit/sheet";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { MORE_ICON, TopBar, type TopBarAction } from "../top-bar";
import { useFollow } from "./follow";
import { FollowingSheet } from "./following-sheet";
import { MoreAboutSheet } from "./more-about-sheet";
import { About, CoverAndAvatar, Identity, InfoRow, ProfileBones, Prompt, Stats, Work, type Maker } from "./parts";
import { PersonMenu, messageHrefOf, useShareProfile } from "./person-sheets";
import { useOtherData, useOwnData } from "./use-profile";

const CONTENT = "flex flex-col gap-6 px-8 pb-12 pt-4";
const EDIT_HREF = "/m/profile/edit?from=profile";
const PRIVACY_HREF = "/m/settings/privacy";

const isProfileShape = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);

// ─────────────────────────── states ───────────────────────────

function StateScreen({ children }: { children: React.ReactNode }) {
  return (
    <Screen top={<TopBar back />}>
      <div className="flex min-h-full flex-col justify-center px-8 pb-24">{children}</div>
    </Screen>
  );
}

function NotFound() {
  const router = useRouter();
  return (
    <StateScreen>
      <StateCard
        tone="error"
        titleAs="h1"
        className="w-full"
        icon={<Icon icon={Alert01Icon} size={32} />}
        title="This creator isn’t here"
        body="The link may be old, or the name may have changed."
        action={
          <Button hierarchy="secondary" size="lg" onClick={() => router.push("/m")}>
            Go to Feed
          </Button>
        }
      />
    </StateScreen>
  );
}

function CouldntLoad({ onRetry }: { onRetry: () => void }) {
  return (
    <StateScreen>
      <StateCard
        tone="error"
        titleAs="h1"
        className="w-full"
        icon={<Icon icon={Alert01Icon} size={32} />}
        title="Couldn’t load this profile"
        body="Check your connection, or try again in a moment."
        action={
          <Button hierarchy="secondary" size="lg" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </StateScreen>
  );
}

function Loading() {
  return (
    <Screen top={<TopBar back />}>
      <ProfileBones />
    </Screen>
  );
}

/** PR-17 / PR-22: who they are, and nothing more. */
function LockedCard({ first }: { first: string | null }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-bg-subtle p-8">
      <p className="text-lg font-medium leading-lg text-text-primary">This profile is locked</p>
      <p className="text-md leading-md text-text-secondary">
        Only people who work with {first ?? "this creator"} on a project can see their projects and activity.
      </p>
    </div>
  );
}

// ─────────────────────────── the bar ───────────────────────────

/** Follow (primary) + Message (secondary) — PR-10's bar. `off` turns both off (View as public,
 *  offline); `reason` is the line above them when Message can't start (PR-14). */
function ViewerBar({
  person,
  messageHref,
  reason,
  off,
}: {
  person: Pick<Person, "id" | "kind" | "name">;
  messageHref: string | null;
  reason: string | null;
  off: boolean;
}) {
  const follow = useFollow();
  const reasonId = React.useId();
  const on = follow.isOn(person);
  return (
    <BottomBar>
      {reason && (
        <p id={reasonId} className="text-sm leading-sm text-text-secondary">
          {reason}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Button
          hierarchy={on ? "secondary" : "primary"}
          size="xl"
          aria-pressed={off ? undefined : on}
          disabled={off || !follow.hydrated}
          iconLeading={<Icon icon={on ? UserCheck01Icon : UserAdd01Icon} size={20} />}
          onClick={() => follow.toggle(person)}
          className="w-full"
        >
          {on ? "Following" : "Follow"}
        </Button>
        {messageHref && !off ? (
          <Link
            href={messageHref}
            aria-label={`Message ${person.name}`}
            className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}
          >
            <Icon icon={Mail01Icon} size={20} />
            Message
          </Link>
        ) : (
          <Button
            hierarchy="secondary"
            size="xl"
            disabled
            aria-describedby={reason ? reasonId : undefined}
            iconLeading={<Icon icon={Mail01Icon} size={20} />}
            className="w-full"
          >
            Message
          </Button>
        )}
      </div>
    </BottomBar>
  );
}

// ─────────────────────────── your own ───────────────────────────

function OwnProfile({
  person,
  fields,
  photoUrl,
  coverUrl,
  togglePin,
  publicView,
}: {
  person: Person;
  fields: ProfileFields;
  photoUrl: string | null;
  coverUrl: string | null;
  togglePin: (projectId: string, valid?: readonly string[]) => { ok: boolean; refused: boolean };
  publicView: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const settings = useSettings();
  const { locale } = useDates();
  const data = useOwnData(fields);
  const following = useFollowing();
  const share = useShareProfile();
  const [menu, setMenu] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [followingOpen, setFollowingOpen] = React.useState(false);
  const [pinFor, setPinFor] = React.useState<MadeItem | null>(null);

  if (!data.ready) return <Loading />;

  const owner = !publicView;
  const { audience } = settings;
  const named = fields.name.trim().length > 0;
  const shownName = publicView && !named ? "Unnamed creator" : person.name;
  const first = named ? firstNameOf(person.name) : null;
  const edit = () => router.push(EDIT_HREF);
  const avatar = { initials: person.initials, color: null, src: photoUrl, label: `${shownName}’s photo` };
  const banner = publicView && (
    <div className="px-8 pb-4">
      <Banner
        tone="info"
        action={
          <button type="button" className="font-medium hover:underline" onClick={() => router.replace(pathname)}>
            Back to your view
          </button>
        }
      >
        You’re seeing your profile as others see it
      </Banner>
    </div>
  );
  const top = (
    <TopBar
      back
      actions={[
        ...(owner
          ? [
              {
                icon: Share08Icon,
                label: "Share profile",
                // `/m/creators/me` opens whoever follows it, so your link needs your handle.
                onClick: () =>
                  person.handle === ME ? toast({ title: "Choose a handle in Settings first, so your link opens your profile.", lead: "error" }) : share(person),
              } satisfies TopBarAction,
            ]
          : []),
        { icon: MORE_ICON, label: "More actions for your profile", onClick: () => setMenu(true) },
      ]}
    />
  );
  const ownMenu = (
    <ActionSheet
      open={menu}
      onClose={() => setMenu(false)}
      title="Your profile"
      items={[
        publicView
          ? { label: "Back to your view", icon: UserIcon, onSelect: () => router.replace(pathname) }
          : { label: "View as public", icon: ViewIcon, onSelect: () => router.replace(`${pathname}?view=public`) },
        { label: "Privacy & safety", icon: ViewOffIcon, onSelect: () => router.push(PRIVACY_HREF) },
      ]}
    />
  );

  // Locked (Settings › Privacy & safety): someone you don't work with sees who you are, no more.
  if (publicView && audience.locked) {
    return (
      <Screen top={top} footer={<ViewerBar person={person} messageHref={null} reason={null} off />}>
        {banner}
        <CoverAndAvatar cover={undefined} avatar={avatar} />
        <div className={CONTENT}>
          <Identity name={shownName} latinName={person.latinName} demo={false} headline={null} meta={null} relation={null} openTo={null} />
          <LockedCard first={first} />
        </div>
        {ownMenu}
      </Screen>
    );
  }

  const made = data.made;
  const cover = coverUrl ?? data.fallbackCover;
  const more: MoreAbout = {
    skills: fields.skills,
    specialities: fields.specialities,
    languages: fields.languages,
    builtWith: data.builtWith,
    worksOn: [],
    links: linkRowsOf(fields.links, fields.social),
  };
  const summary = moreAboutSummaryOf(more);
  const meta = metaLineOf({
    // Settings › Privacy & safety › Show my location and local time: others see neither until
    // it's on; you always see the location you typed, and the time only when it's on.
    location: fields.location && (owner || audience.showLocalTime) ? fields.location : null,
    localTime: fields.location && audience.showLocalTime ? localTimeOf(fields.timeZone, data.now, locale) : null,
    since: data.since,
  });

  const onPin = (item: MadeItem) => {
    if (!item.projectId) return;
    const r = togglePin(item.projectId, made.flatMap((m) => (m.projectId ? [m.projectId] : [])));
    if (r.refused) toast({ title: "Up to 3 projects can be pinned. Unpin one first.", lead: "error" });
    else if (!r.ok) toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
    else toast({ title: item.pinned ? "Unpinned" : "Pinned to top" });
  };

  const followingCount = following.hydrated ? following.people.length : null;
  const ownerRows = owner && (
    <section aria-label="Only you see this" className="flex flex-col gap-2">
      {made.length > 0 && <h2 className="text-sm leading-sm text-text-tertiary">Only you see this</h2>}
      {made.length === 0 && <p className="text-sm leading-sm text-text-secondary">Others see your name and nothing else yet.</p>}
      <div className="-mx-6 flex flex-col">
        {made.length > 0 && (
          <InfoRow label={`${data.counts.shown} ${data.counts.shown === 1 ? "project is" : "projects are"} public`} href="/m/projects" />
        )}
        {data.counts.hidden > 0 && <InfoRow label={`${data.counts.hidden} private in My projects`} href="/m/projects" />}
        {followingCount !== null && (made.length > 0 || followingCount > 0) && (
          <InfoRow label={`You follow ${followingCount}`} onClick={() => setFollowingOpen(true)} />
        )}
        {audience.locked && <InfoRow label="Your profile is locked" value="Privacy & safety" href={PRIVACY_HREF} />}
      </div>
    </section>
  );

  const maker: Maker = { name: shownName, initials: person.initials, color: null, src: photoUrl };

  return (
    <Screen
      top={top}
      footer={
        owner ? (
          <BottomBar>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={edit}>
              Edit profile
            </Button>
          </BottomBar>
        ) : (
          <ViewerBar person={person} messageHref={null} reason={null} off />
        )
      }
    >
      {banner}
      <CoverAndAvatar
        cover={cover ?? (made.length ? null : undefined)}
        avatar={avatar}
        action={
          owner && (
            <Button hierarchy="secondary" size="sm" iconLeading={<Icon icon={ImageAdd01Icon} size={14} />} onClick={edit}>
              {coverUrl ? "Change cover" : "Add cover"}
            </Button>
          )
        }
      />
      <div className={CONTENT}>
        <Identity
          name={shownName}
          latinName={person.latinName}
          demo={false}
          headline={fields.headline || (owner && <Prompt onClick={edit}>{named ? "Add what you build" : "Add your name and what you build"}</Prompt>)}
          meta={meta}
          relation={null}
          openTo={fields.openTo ? OPEN_TO_WORDS[fields.openTo] : null}
        />
        <Stats stats={profileStatsOf(made, 0)} />
        <About text={fields.bio} prompt={owner ? <Prompt onClick={edit}>Add a few lines about your work</Prompt> : undefined} />
        {(summary || (owner && made.length > 0)) && (
          <div className="-mx-6">
            <InfoRow label={`More about ${first ?? "you"}`} value={summary ?? "Add skills and links"} onClick={() => setMoreOpen(true)} />
          </div>
        )}
        {ownerRows}
        {made.length > 0 ? (
          <Work
            items={made}
            activity={data.activity}
            maker={maker}
            pinnedBy={owner ? "you" : (first ?? "this creator")}
            now={data.now}
            onMore={owner ? setPinFor : undefined}
          />
        ) : (
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={InboxIcon} size={32} />}
            title="Nothing shared yet"
            body={owner ? "Share a project to the Feed and it shows here." : `${first ?? "This creator"} hasn’t shared a project yet.`}
            action={
              owner ? (
                <Button hierarchy="secondary" size="lg" onClick={() => router.push("/m/projects")}>
                  Share a project
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
      {ownMenu}
      <MoreAboutSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={`More about ${first ?? "you"}`}
        more={more}
        builtWithNote={`from the parts lists of ${made.length === 1 ? "1 shared project" : `${made.length} shared projects`}`}
        own={owner}
        onEdit={edit}
      />
      <FollowingSheet open={followingOpen} onClose={() => setFollowingOpen(false)} />
      <ActionSheet
        open={pinFor !== null}
        onClose={() => setPinFor(null)}
        title={pinFor?.title}
        items={
          pinFor
            ? [
                { label: pinFor.pinned ? "Unpin" : "Pin to top", icon: pinFor.pinned ? PinOffIcon : PinIcon, onSelect: () => onPin(pinFor) },
                { label: "Open project", icon: Edit02Icon, onSelect: () => router.push(phoneProjectHref(pinFor)) },
              ]
            : []
        }
      />
    </Screen>
  );
}

// ─────────────────────────── someone else's ───────────────────────────

function OtherProfile({ person }: { person: Person }) {
  const router = useRouter();
  const { locale } = useDates();
  const data = useOtherData(person);
  const blocks = useBlocked(person.id);
  const online = useOnline();
  const [menu, setMenu] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);

  if (!data.ready || !blocks.hydrated) return <Loading />;

  const first = firstNameOf(person.name);
  const blocked = blocks.blocked;
  const about = data.about;
  const more: MoreAbout = { skills: [], specialities: [], languages: [], builtWith: data.builtWith, worksOn: data.worksOn, links: [] };
  const summary = moreAboutSummaryOf(more);

  return (
    <Screen
      top={<TopBar back actions={[{ icon: MORE_ICON, label: `More actions for ${person.name}`, onClick: () => setMenu(true) }]} />}
      footer={
        blocked ? undefined : (
          <ViewerBar
            person={person}
            messageHref={data.start && !data.refusal ? messageHrefOf(data.start) : null}
            reason={!online ? "You’re offline. Follow and Message work again when you’re back online." : data.refusal}
            off={!online}
          />
        )
      }
    >
      {!online && (
        <div className="px-8 pb-4">
          <OfflineBanner />
        </div>
      )}
      <CoverAndAvatar
        cover={featuredOf(data.made)?.featured.cover ?? (data.made.length ? null : undefined)}
        avatar={{ initials: person.initials, color: person.color, src: null, label: `${person.name}’s photo` }}
      />
      <div className={CONTENT}>
        {blocked && <BlockedBanner person={person} />}
        <Identity
          name={person.name}
          latinName={person.latinName}
          demo
          headline={about?.headline ?? null}
          meta={metaLineOf({ location: about?.location ?? null, localTime: about ? localTimeOf(about.timeZone, data.now, locale) : null, since: data.since })}
          relation={blocked ? null : data.tie}
          openTo={!blocked && about?.openTo ? OPEN_TO_WORDS[about.openTo] : null}
        />
        <Stats stats={profileStatsOf(data.made, data.appreciations)} />
        <About text={about?.bio ?? ""} />
        {summary && (
          <div className="-mx-6">
            <InfoRow label={`More about ${first}`} value={summary} onClick={() => setMoreOpen(true)} />
          </div>
        )}
        {data.made.length > 0 ? (
          <Work items={data.made} activity={data.activity} maker={{ name: person.name, initials: person.initials, color: person.color, src: null }} pinnedBy={first} now={data.now} />
        ) : (
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={InboxIcon} size={32} />}
            title="Nothing shared yet"
            body={`${first} hasn’t shared a project yet.`}
            action={
              <Button hierarchy="secondary" size="lg" onClick={() => router.push("/m")}>
                Go to Feed
              </Button>
            }
          />
        )}
      </div>
      <PersonMenu person={person} open={menu} onClose={() => setMenu(false)} blocked={blocked} />
      <MoreAboutSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={`More about ${first}`}
        more={more}
        builtWithNote={`from the parts lists of ${data.made.length === 1 ? "1 shared project" : `${data.made.length} shared projects`}`}
        own={false}
      />
    </Screen>
  );
}

/** PR-15: You blocked … with Unblock, in place of the tie and the bar. */
function BlockedBanner({ person }: { person: Person }) {
  const toast = useToast();
  const first = firstNameOf(person.name);
  return (
    <Banner
      tone="info"
      title={`You blocked ${first}`}
      action={
        <button
          type="button"
          className="font-medium hover:underline"
          onClick={() => {
            if (!unblockPerson(ME, person.id).ok) toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
            else toast({ title: `You unblocked ${first}` });
          }}
        >
          Unblock
        </button>
      }
    >
      {`${first} can’t message you, and isn’t told.`}
    </Banner>
  );
}

// ─────────────────────────── the screen ───────────────────────────

export function CreatorProfileScreen({ handle }: { handle: string }) {
  const { hydrated, fields, togglePin } = useMyProfile();
  const photo = useMyPhoto();
  const cover = useMyCover();
  const params = useSearchParams();
  const publicView = params.get("view") === "public";
  const [tries, setTries] = React.useState(0);
  const dir = React.useMemo(
    () => directory({ name: fields.name, latinName: fields.latinName, handle: fields.handle }),
    [fields.name, fields.latinName, fields.handle],
  );
  // The stored profile can't be read (PR-20): your own profile waits for Try again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const unreadable = React.useMemo(() => hydrated && storedUnreadable(PROFILE_KEY, isProfileShape), [hydrated, tries]);

  if (!hydrated || !photo.hydrated || !cover.hydrated) return <Loading />;
  const person = personByHandle(dir, decodeURIComponent(handle));
  if (!person) return <NotFound />;
  if (person.kind === "me") {
    if (unreadable) return <CouldntLoad onRetry={() => setTries((n) => n + 1)} />;
    return <OwnProfile person={person} fields={fields} photoUrl={photo.url} coverUrl={cover.url} togglePin={togglePin} publicView={publicView} />;
  }
  return <OtherProfile person={person} />;
}
