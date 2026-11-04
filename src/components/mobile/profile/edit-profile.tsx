"use client";

// PR-30…38c · Edit profile on the phone: one form, the web's fields and rules
// (components/profile/edit-profile-dialog.tsx, lib/people/fields.ts) — Photos
// (cover and photo, resized on the phone and kept where the web keeps them),
// About you (name in any script, the English-letters name, headline with
// Suggest from my work, About, location, Open to), Skills (the skills,
// top specialties and languages sheets), Links (up to 5) and Social accounts.
// Save profile stays off until something changes and rides on the keyboard;
// ✕ with changes asks "Discard changes?"; a refused write keeps every field
// and says so; saved, it goes back to your profile with "Profile saved".

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Add01Icon, Camera01Icon, Cancel01Icon, Delete02Icon, Image01Icon, ImageAdd01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, useFieldIds } from "@/components/auth/auth-parts";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { IconButton } from "@/components/ideeza/icon-button";
import { Spinner } from "@/components/ideeza/spinner";
import { Tag } from "@/components/ideeza/tag";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";
import { readPhone, updatePhone } from "@/lib/account/phone";
import {
  BIO_MAX,
  HEADLINE_MAX,
  LANGUAGES_MAX,
  LINKS_MAX,
  LOCATION_MAX,
  NAME_MAX,
  OPEN_TO_WORDS,
  SKILLS_MAX,
  SOCIAL_NETWORKS,
  SOCIAL_WORDS,
  SPECIALITIES_MAX,
  YEARS,
  YEARS_WORDS,
  cleanLanguages,
  cleanSkills,
  linkOf,
  socialNameOf,
  socialUrlOf,
  type OpenTo,
  type ProfileFields,
  type SocialNetwork,
  type Speciality,
  type Years,
} from "@/lib/people/fields";
import { displayNameOf, initialsOf, ownHandleOf } from "@/lib/people/ids";
import { spokenLanguageOptions } from "@/lib/people/languages";
import { phoneProfileHref } from "@/lib/people/phone-profile";
import { deleteCover, deletePhoto, putCover, putPhoto, resizeCover, resizePhoto, useMyCover, useMyPhoto } from "@/lib/people/photo-store";
import { readProfileFields, saveProfile, useMyProfile } from "@/lib/people/profile-store";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ActionSheet, Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { InfoRow } from "./parts";
import { useOwnData } from "./use-profile";

const HINT = "text-sm leading-sm text-text-tertiary";
const SECTION = "text-md font-medium leading-md text-text-primary";
const LINK_ERROR = "Enter a web address, like yoursite.com";

const SOCIAL_PREFIX: Record<SocialNetwork, string> = {
  facebook: "facebook.com/",
  x: "x.com/",
  instagram: "instagram.com/",
  linkedin: "linkedin.com/in/",
};

const OPEN_TO_OPTIONS: { value: OpenTo; label: string }[] = [
  ...(Object.entries(OPEN_TO_WORDS) as [Exclude<OpenTo, "">, string][]).map(([value, label]) => ({ value, label })),
  { value: "", label: "Don’t show this" },
];

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** This device's time zone, so others see your local time next to where you are (as the web). */
function deviceZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

type Picture = { kind: "keep" } | { kind: "new"; blob: Blob; url: string } | { kind: "remove" };
type Suggest = { kind: "idle" } | { kind: "running" } | { kind: "draft"; text: string } | { kind: "failed" };
type Draft = {
  name: string;
  latinName: string;
  headline: string;
  bio: string;
  location: string;
  openTo: OpenTo;
  skills: string[];
  specialities: Speciality[];
  languages: string[];
  links: string[];
  social: Record<SocialNetwork, string>;
};

function draftOf(f: ProfileFields): Draft {
  return {
    name: f.name,
    latinName: f.latinName,
    headline: f.headline,
    bio: f.bio,
    location: f.location,
    openTo: f.openTo,
    skills: [...f.skills],
    specialities: [...f.specialities],
    languages: [...f.languages],
    links: f.links.length ? f.links.map((u) => u.replace(/^https?:\/\//, "")) : [""],
    social: Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, f.social[n] ? socialNameOf(n, f.social[n]) : ""])) as Record<SocialNetwork, string>,
  };
}

/** The ✕ top bar Edit profile draws (Mobile / Top bar with Close in the left slot). */
function CloseBar({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex h-[56px] shrink-0 items-center gap-4 px-8">
      <div className="flex min-w-[44px] shrink-0">
        <IconButton hierarchy="secondary" size="xl" aria-label="Close" icon={<Icon icon={Cancel01Icon} size={22} />} onClick={onClose} />
      </div>
      <h1 className="min-w-0 flex-1 truncate text-center text-lg font-semibold leading-lg text-text-primary">Edit profile</h1>
      <div className="min-w-[44px] shrink-0" />
    </header>
  );
}

export function EditProfileScreen() {
  const router = useRouter();
  const { hydrated, fields } = useMyProfile();
  const photo = useMyPhoto();
  const cover = useMyCover();
  if (!hydrated || !photo.hydrated || !cover.hydrated) {
    return (
      <Screen top={<CloseBar onClose={() => router.replace("/m/profile")} />}>
        <div className="px-8 pt-4">
          <ListBones rows={5} />
        </div>
      </Screen>
    );
  }
  return <EditForm fields={fields} photoUrl={photo.url} coverUrl={cover.url} />;
}

function EditForm({ fields, photoUrl, coverUrl }: { fields: ProfileFields; photoUrl: string | null; coverUrl: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const own = useOwnData(fields);
  const ids = useFieldIds(["name", "latin", "headline", "bio", "location", "openTo"] as const);
  const base = React.useId();
  const [initial] = React.useState(() => draftOf(fields));
  const [d, setD] = React.useState<Draft>(initial);
  const set = (patch: Partial<Draft>) => setD((v) => ({ ...v, ...patch }));
  const [linkErrors, setLinkErrors] = React.useState<boolean[]>([]);
  const [socialErrors, setSocialErrors] = React.useState<Partial<Record<SocialNetwork, boolean>>>({});
  const [pic, setPic] = React.useState<Picture>({ kind: "keep" });
  const [coverPic, setCoverPic] = React.useState<Picture>({ kind: "keep" });
  const [fileError, setFileError] = React.useState<{ what: "photo" | "cover"; text: string } | null>(null);
  const [menu, setMenu] = React.useState<"photo" | "cover" | null>(null);
  const [ask, setAsk] = React.useState<{ kind: "camera" | "photos"; what: "photo" | "cover" } | null>(null);
  const [sheet, setSheet] = React.useState<"skills" | "specialities" | "languages" | null>(null);
  const [suggest, setSuggest] = React.useState<Suggest>({ kind: "idle" });
  const [saving, setSaving] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [discard, setDiscard] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const inputs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const photosRef = React.useRef<HTMLInputElement>(null);
  const picking = React.useRef<"photo" | "cover">("photo");

  React.useEffect(() => () => abortRef.current?.abort(), []);
  React.useEffect(() => () => {
    if (pic.kind === "new") URL.revokeObjectURL(pic.url);
  }, [pic]);
  React.useEffect(() => () => {
    if (coverPic.kind === "new") URL.revokeObjectURL(coverPic.url);
  }, [coverPic]);

  const typedLinks = d.links.map((l) => l.trim()).filter(Boolean);
  const dirty =
    d.name.trim() !== initial.name.trim() ||
    d.latinName.trim() !== initial.latinName.trim() ||
    d.headline.trim() !== initial.headline.trim() ||
    d.bio.trim() !== initial.bio.trim() ||
    d.location.trim() !== initial.location.trim() ||
    d.openTo !== initial.openTo ||
    !sameList(d.skills, initial.skills) ||
    d.specialities.map((x) => `${x.skill}\n${x.years}`).join("\n") !== initial.specialities.map((x) => `${x.skill}\n${x.years}`).join("\n") ||
    !sameList(d.languages, initial.languages) ||
    !sameList(typedLinks, initial.links.map((l) => l.trim()).filter(Boolean)) ||
    SOCIAL_NETWORKS.some((n) => d.social[n].trim() !== initial.social[n]) ||
    pic.kind !== "keep" ||
    coverPic.kind !== "keep";

  // Opened from your profile (`?from=profile`): back to it. Opened on its own: to your profile.
  const fromProfile = useSearchParams().get("from") === "profile";
  const me = phoneProfileHref(ownHandleOf(fields.handle));
  const leave = () => {
    if (fromProfile) router.back();
    else router.replace(me);
  };
  const close = () => {
    if (saving) return;
    if (dirty) setDiscard(true);
    else leave();
  };

  // ── photo and cover ──
  const shownPhoto = pic.kind === "new" ? pic.url : pic.kind === "remove" ? null : photoUrl;
  const ownCover = coverPic.kind === "new" ? coverPic.url : coverPic.kind === "remove" ? null : coverUrl;
  const shownCover = ownCover ?? own.fallbackCover;

  const pick = (kind: "camera" | "photos", what: "photo" | "cover") => {
    const p = readPhone();
    if (kind === "camera" ? !p.cameraAsked : !p.photosAsked) return setAsk({ kind, what });
    picking.current = what;
    (kind === "camera" ? cameraRef : photosRef).current?.click();
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const what = picking.current;
    setFileError(null);
    const blob = what === "photo" ? await resizePhoto(file) : await resizeCover(file);
    if (!blob) return setFileError({ what, text: "Choose a JPG or PNG image under 10 MB." });
    const next: Picture = { kind: "new", blob, url: URL.createObjectURL(blob) };
    if (what === "photo") setPic(next);
    else setCoverPic(next);
  };

  // ── Suggest from my work (D7): your shared projects' titles and stories only ──
  const noShared = own.ready && own.shared.length === 0;
  const runSuggest = async () => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSuggest({ kind: "running" });
    try {
      const res = await fetch("/api/profile/headline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: own.shared }),
        signal: ctrl.signal,
      });
      const body = (await res.json().catch(() => null)) as { headline?: unknown } | null;
      if (ctrl.signal.aborted) return;
      const text = res.ok && typeof body?.headline === "string" ? body.headline : null;
      setSuggest(text ? { kind: "draft", text } : { kind: "failed" });
    } catch {
      if (!ctrl.signal.aborted) setSuggest({ kind: "failed" });
    }
  };
  const cancelSuggest = () => {
    abortRef.current?.abort();
    setSuggest({ kind: "idle" });
  };

  // ── save ──
  const save = async () => {
    if (saving || !dirty) return;
    const badLinks = d.links.map((l) => l.trim() !== "" && linkOf(l) === null);
    const urls = {} as Record<SocialNetwork, string>;
    const badSocial: Partial<Record<SocialNetwork, boolean>> = {};
    for (const n of SOCIAL_NETWORKS) {
      const url = socialUrlOf(n, d.social[n]);
      if (url === null) badSocial[n] = true;
      else urls[n] = url;
    }
    setLinkErrors(badLinks);
    setSocialErrors(badSocial);
    const firstLink = badLinks.indexOf(true);
    if (firstLink >= 0) return inputs.current[`link-${firstLink}`]?.focus();
    const firstSocial = SOCIAL_NETWORKS.find((n) => badSocial[n]);
    if (firstSocial) return inputs.current[`social-${firstSocial}`]?.focus();

    setSaving(true);
    setFailed(false);
    const wrote = saveProfile({
      name: d.name,
      latinName: d.latinName,
      headline: d.headline,
      bio: d.bio,
      location: d.location,
      // Your local time shows next to where you are, so the zone goes with a location, unless
      // you chose your time zone in Settings: that one stays.
      ...(readProfileFields().timeZoneManual ? {} : { timeZone: d.location.trim() ? deviceZone() : null }),
      links: d.links.flatMap((l) => {
        const url = linkOf(l);
        return url ? [url] : [];
      }),
      openTo: d.openTo,
      skills: d.skills,
      specialities: d.specialities.filter((x) => d.skills.includes(x.skill)),
      languages: cleanLanguages(d.languages),
      social: urls,
    });
    let filesOk = true;
    if (wrote.ok && pic.kind === "new") filesOk = (await putPhoto(pic.blob)).ok;
    if (wrote.ok && pic.kind === "remove") filesOk = (await deletePhoto()).ok;
    if (wrote.ok && filesOk && coverPic.kind === "new") filesOk = (await putCover(coverPic.blob)).ok;
    if (wrote.ok && filesOk && coverPic.kind === "remove") filesOk = (await deleteCover()).ok;
    setSaving(false);
    if (!wrote.ok || !filesOk) {
      setFailed(true);
      document.getElementById(`${base}-top`)?.scrollIntoView({ block: "start" });
      return;
    }
    toast({ title: "Profile saved" });
    leave();
  };

  const name = displayNameOf(d.name);
  const setLink = (i: number, v: string) => {
    set({ links: d.links.map((x, j) => (j === i ? v : x)) });
    if (linkErrors[i]) setLinkErrors(linkErrors.map((e, j) => (j === i ? false : e)));
  };

  return (
    <Screen
      top={<CloseBar onClose={close} />}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" disabled={!dirty} loading={saving} onClick={save}>
            Save profile
          </Button>
        </BottomBar>
      }
    >
      <div id={`${base}-top`} className="flex flex-col gap-8 px-8 pb-12">
        {failed && (
          <Banner tone="error" title="Couldn’t save">
            Try again. Your changes are kept.
          </Banner>
        )}
        <p className="text-md leading-md text-text-secondary">Other creators see these on your profile.</p>

        {/* Photos */}
        <section aria-labelledby={`${base}-photos`} className="flex flex-col gap-6">
          <h2 id={`${base}-photos`} className={SECTION}>
            Photos
          </h2>
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[343/192] w-full overflow-hidden rounded-lg bg-bg-brand-subtle">
              {shownCover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownCover} alt="Your cover" className="absolute inset-0 h-full w-full object-cover" />
              )}
            </div>
            {!ownCover && <p className={HINT}>{shownCover ? "Showing your featured project’s picture until you add one." : "No cover yet. Others see a quiet tint until you add one."}</p>}
            <div className="flex">
              <Button hierarchy="secondary" size="md" iconLeading={<Icon icon={ImageAdd01Icon} size={16} />} onClick={() => setMenu("cover")}>
                {ownCover ? "Change cover" : "Upload cover"}
              </Button>
            </div>
            {fileError?.what === "cover" && (
              <p role="alert" className="text-sm leading-sm text-text-error">
                {fileError.text}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-6">
              <Avatar size="xl" initials={initialsOf(name, d.latinName || null)} src={shownPhoto ?? undefined} label="Your photo" />
              <Button hierarchy="secondary" size="md" iconLeading={<Icon icon={Camera01Icon} size={16} />} onClick={() => setMenu("photo")}>
                {shownPhoto ? "Change photo" : "Add photo"}
              </Button>
            </div>
            <p className={HINT}>JPG or PNG. Resized on your device before it is saved.</p>
            {fileError?.what === "photo" && (
              <p role="alert" className="text-sm leading-sm text-text-error">
                {fileError.text}
              </p>
            )}
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
          <input ref={photosRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
        </section>

        {/* About you */}
        <section aria-labelledby={`${base}-about`} className="flex flex-col gap-6">
          <h2 id={`${base}-about`} className={SECTION}>
            About you
          </h2>
          <Field label={`Name (${d.name.length}/${NAME_MAX})`} htmlFor={ids.name.id}>
            <TextInput id={ids.name.id} size="xl" maxLength={NAME_MAX} placeholder="Your name" autoComplete="name" value={d.name} onValueChange={(v) => set({ name: v.slice(0, NAME_MAX) })} />
            <p className={HINT}>{d.name.trim() ? "Any script. This is the name other creators see." : "You can leave this empty. Others see “Unnamed creator”."}</p>
          </Field>
          <Field label="Name in English letters (optional)" htmlFor={ids.latin.id}>
            <TextInput id={ids.latin.id} size="xl" maxLength={NAME_MAX} value={d.latinName} onValueChange={(v) => set({ latinName: v.slice(0, NAME_MAX) })} />
            <p className={HINT}>Shown under your name, and used when people search.</p>
          </Field>
          <Field label="Headline" htmlFor={ids.headline.id}>
            <Textarea
              id={ids.headline.id}
              rows={2}
              maxLength={HEADLINE_MAX}
              placeholder="For example: Builds solar soil sensors for small farms"
              value={d.headline}
              onValueChange={(v) => set({ headline: v.slice(0, HEADLINE_MAX) })}
            />
            <p className={cn(HINT, "tabular-nums")}>
              {d.headline.length}/{HEADLINE_MAX}
            </p>
            <SuggestLine state={suggest} noShared={noShared} ready={own.ready} onRun={runSuggest} onCancel={cancelSuggest} onUse={(text) => {
              set({ headline: text.slice(0, HEADLINE_MAX) });
              setSuggest({ kind: "idle" });
            }} onDiscard={() => setSuggest({ kind: "idle" })} />
          </Field>
          <Field label="About" htmlFor={ids.bio.id}>
            <Textarea id={ids.bio.id} rows={4} maxLength={BIO_MAX} value={d.bio} onValueChange={(v) => set({ bio: v.slice(0, BIO_MAX) })} />
            <p className={cn(HINT, "tabular-nums")}>
              {d.bio.length}/{BIO_MAX}
            </p>
          </Field>
          <Field label="Location" htmlFor={ids.location.id}>
            <TextInput id={ids.location.id} size="xl" maxLength={LOCATION_MAX} autoComplete="address-level2" value={d.location} onValueChange={(v) => set({ location: v.slice(0, LOCATION_MAX) })} />
            <p className={HINT}>A city is enough. Your local time shows next to it.</p>
          </Field>
          <Field label="Open to" htmlFor={ids.openTo.id}>
            <SheetSelect id={ids.openTo.id} title="Open to" value={d.openTo} options={OPEN_TO_OPTIONS} onChange={(v) => set({ openTo: v as OpenTo })} />
          </Field>
        </section>

        {/* Skills */}
        <section aria-labelledby={`${base}-skills`} className="flex flex-col gap-4">
          <h2 id={`${base}-skills`} className={SECTION}>
            Skills
          </h2>
          <div className="-mx-6 flex flex-col">
            <InfoRow label="Your skills" value={`${d.skills.length} of ${SKILLS_MAX}`} onClick={() => setSheet("skills")} />
            <InfoRow label="Top specialties" value={`${d.specialities.length} of ${SPECIALITIES_MAX}`} onClick={() => setSheet("specialities")} />
            <InfoRow label="Languages" value={String(d.languages.length)} onClick={() => setSheet("languages")} />
          </div>
          {d.skills.length > 0 && (
            <ul aria-label="Your skills" className="m-0 flex list-none flex-wrap gap-4 p-0">
              {d.skills.map((s) => (
                <li key={s}>
                  <Tag size="md">{s}</Tag>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Links */}
        <section aria-labelledby={`${base}-links`} className="flex flex-col gap-6">
          <h2 id={`${base}-links`} className={SECTION}>
            Links (up to {LINKS_MAX})
          </h2>
          {d.links.map((l, i) => (
            <Field key={i} label={`Link ${i + 1}`} htmlFor={`${base}-link-${i}`} error={linkErrors[i] ? LINK_ERROR : undefined} errorId={`${base}-link-${i}-error`}>
              <TextInput
                ref={(el) => {
                  inputs.current[`link-${i}`] = el;
                }}
                id={`${base}-link-${i}`}
                size="xl"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="yoursite.com"
                value={l}
                invalid={!!linkErrors[i]}
                aria-invalid={linkErrors[i] || undefined}
                aria-describedby={linkErrors[i] ? `${base}-link-${i}-error` : undefined}
                onValueChange={(v) => setLink(i, v)}
                action={
                  d.links.length > 1 || l ? (
                    <button
                      type="button"
                      aria-label={`Remove link ${i + 1}`}
                      className="inline-flex size-[32px] items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                      onClick={() => {
                        set({ links: d.links.length > 1 ? d.links.filter((_, j) => j !== i) : [""] });
                        setLinkErrors(linkErrors.filter((_, j) => j !== i));
                      }}
                    >
                      <Icon icon={Cancel01Icon} size={16} />
                    </button>
                  ) : undefined
                }
              />
            </Field>
          ))}
          {d.links.length < LINKS_MAX && (
            <Button hierarchy="ghost" size="xl" className="w-full" iconLeading={<Icon icon={Add01Icon} size={20} />} onClick={() => set({ links: [...d.links, ""] })}>
              Add link
            </Button>
          )}
        </section>

        {/* Social accounts */}
        <section aria-labelledby={`${base}-social`} className="flex flex-col gap-6">
          <h2 id={`${base}-social`} className={SECTION}>
            Social accounts
          </h2>
          {SOCIAL_NETWORKS.map((n) => (
            <Field
              key={n}
              label={SOCIAL_WORDS[n]}
              htmlFor={`${base}-${n}`}
              error={socialErrors[n] ? `Enter your ${SOCIAL_PREFIX[n].replace(/\/.*$/, "")} address, or just your username.` : undefined}
              errorId={`${base}-${n}-error`}
            >
              <TextInput
                ref={(el) => {
                  inputs.current[`social-${n}`] = el;
                }}
                id={`${base}-${n}`}
                size="xl"
                prefixText={SOCIAL_PREFIX[n]}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="username"
                value={d.social[n]}
                invalid={!!socialErrors[n]}
                aria-invalid={socialErrors[n] || undefined}
                aria-describedby={socialErrors[n] ? `${base}-${n}-error` : undefined}
                onValueChange={(v) => {
                  set({ social: { ...d.social, [n]: v } });
                  if (socialErrors[n]) setSocialErrors({ ...socialErrors, [n]: false });
                }}
              />
            </Field>
          ))}
        </section>
      </div>

      <ActionSheet
        open={menu !== null}
        onClose={() => setMenu(null)}
        title={menu === "cover" ? "Cover photo" : "Profile photo"}
        items={[
          { label: "Take photo", icon: Camera01Icon, onSelect: () => pick("camera", menu ?? "photo") },
          { label: "Choose from library", icon: Image01Icon, onSelect: () => pick("photos", menu ?? "photo") },
          ...(menu === "photo" && shownPhoto ? [{ label: "Remove photo", icon: Delete02Icon, destructive: true, onSelect: () => setPic({ kind: "remove" }) }] : []),
          ...(menu === "cover" && ownCover ? [{ label: "Remove cover", icon: Delete02Icon, destructive: true, onSelect: () => setCoverPic({ kind: "remove" }) }] : []),
        ]}
      />
      <Sheet
        open={ask !== null}
        onClose={() => setAsk(null)}
        title={ask?.kind === "camera" ? "Use your camera" : "Choose photos"}
        actions={
          <>
            <Button
              size="xl"
              className="w-full"
              onClick={() => {
                if (!ask) return;
                updatePhone(ask.kind === "camera" ? { cameraAsked: true } : { photosAsked: true });
                picking.current = ask.what;
                setAsk(null);
                (ask.kind === "camera" ? cameraRef : photosRef).current?.click();
              }}
            >
              Continue
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setAsk(null)}>
              Not now
            </Button>
          </>
        }
      >
        <p className="text-md leading-md text-text-secondary">
          {ask?.kind === "camera" ? "To take your profile photo and cover." : "To add photos to your project, profile or messages. You pick which ones."}
        </p>
      </Sheet>
      <SkillsSheet open={sheet === "skills"} onClose={() => setSheet(null)} skills={d.skills} onChange={(skills) => set({ skills, specialities: d.specialities.filter((x) => skills.includes(x.skill)) })} />
      <SpecialitiesSheet open={sheet === "specialities"} onClose={() => setSheet(null)} skills={d.skills} specialities={d.specialities} onChange={(specialities) => set({ specialities })} />
      <LanguagesSheet open={sheet === "languages"} onClose={() => setSheet(null)} languages={d.languages} onChange={(languages) => set({ languages })} />
      <ConfirmSheet
        open={discard}
        onClose={() => setDiscard(false)}
        title="Discard changes?"
        body="Your edits to your profile are lost."
        verb="Discard"
        destructive
        cancelLabel="Keep editing"
        onConfirm={leave}
      />
    </Screen>
  );
}

// ─────────────────────────── Suggest from my work (PR-34…34c) ───────────────────────────

function SuggestLine({
  state,
  noShared,
  ready,
  onRun,
  onCancel,
  onUse,
  onDiscard,
}: {
  state: Suggest;
  noShared: boolean;
  ready: boolean;
  onRun: () => void;
  onCancel: () => void;
  onUse: (text: string) => void;
  onDiscard: () => void;
}) {
  const reasonId = React.useId();
  if (state.kind === "running") {
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className="flex items-start gap-4 text-sm leading-sm text-text-secondary">
          <Spinner size={16} />
          Reading your shared projects… this can take up to 40 seconds.
        </p>
        <button type="button" onClick={onCancel} className="-my-4 inline-flex min-h-[44px] items-center self-start text-md font-medium leading-md text-text-primary outline-none hover:underline focus-visible:underline">
          Cancel
        </button>
      </div>
    );
  }
  if (state.kind === "draft") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface p-6">
        <span className="self-start">
          <Badge tone="brand">AI draft</Badge>
        </span>
        <p className="text-md leading-md text-text-primary">{state.text}</p>
        <p className="text-sm leading-sm text-text-tertiary">Not saved until you save your profile.</p>
        <div className="grid grid-cols-2 gap-4">
          <Button size="md" className="w-full" onClick={() => onUse(state.text)}>
            Use this
          </Button>
          <Button hierarchy="secondary" size="md" className="w-full" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {state.kind === "failed" && (
        <Banner
          tone="error"
          title="Couldn’t write a suggestion"
          action={
            <button type="button" className="font-medium hover:underline" onClick={onRun}>
              Try again
            </button>
          }
        >
          Try again.
        </Banner>
      )}
      {state.kind === "idle" && (
        <button
          type="button"
          disabled={!ready || noShared}
          aria-describedby={noShared ? reasonId : undefined}
          onClick={onRun}
          className="-my-4 inline-flex min-h-[44px] items-center self-start text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:underline disabled:cursor-not-allowed disabled:text-text-disabled disabled:no-underline"
        >
          Suggest from my work
        </button>
      )}
      {noShared && (
        <p id={reasonId} className="text-sm leading-sm text-text-tertiary">
          Share a project first, and the AI can suggest a headline from it.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────── the sheets (PR-35…35c) ───────────────────────────

function SkillsSheet({ open, onClose, skills, onChange }: { open: boolean; onClose: () => void; skills: string[]; onChange: (s: string[]) => void }) {
  const id = React.useId();
  const [typed, setTyped] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const full = skills.length >= SKILLS_MAX;
  const add = () => {
    const words = typed.split(",").map((w) => w.trim()).filter(Boolean);
    if (!words.length) return;
    const next = cleanSkills([...skills, ...words]);
    if (next.length - skills.length < words.length) setNote(next.length >= SKILLS_MAX ? "Remove a skill to add another." : "You already have that skill.");
    else {
      setNote(null);
      setTyped("");
    }
    onChange(next);
  };
  const done = () => {
    setTyped("");
    setNote(null);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={done}
      title="Your skills"
      description={`${skills.length} of ${SKILLS_MAX}`}
      actions={
        <Button size="xl" className="w-full" onClick={done}>
          Done
        </Button>
      }
    >
      <Field label="Add a skill" htmlFor={id} error={note && !full ? note : undefined} errorId={`${id}-error`}>
        <div className="flex items-start gap-4">
          <TextInput
            id={id}
            size="xl"
            enterKeyHint="done"
            placeholder="Firmware"
            containerClassName="flex-1"
            disabled={full}
            value={typed}
            invalid={!!note && !full}
            aria-invalid={(!!note && !full) || undefined}
            aria-describedby={note && !full ? `${id}-error` : undefined}
            onValueChange={(v) => {
              setTyped(v);
              setNote(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button hierarchy="secondary" size="xl" disabled={full || !typed.trim()} onClick={add}>
            Add
          </Button>
        </div>
      </Field>
      {skills.length > 0 && (
        <ul aria-label="Your skills" className="m-0 flex list-none flex-wrap gap-4 p-0">
          {skills.map((s) => (
            <li key={s}>
              <Tag size="md" onDismiss={() => onChange(skills.filter((x) => x !== s))} dismissLabel={`Remove ${s}`}>
                {s}
              </Tag>
            </li>
          ))}
        </ul>
      )}
      {full && <p className={HINT}>Remove a skill to add another.</p>}
    </Sheet>
  );
}

function SpecialitiesSheet({
  open,
  onClose,
  skills,
  specialities,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  skills: string[];
  specialities: Speciality[];
  onChange: (s: Speciality[]) => void;
}) {
  const full = specialities.length >= SPECIALITIES_MAX;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Top specialties"
      description={`Pick up to ${SPECIALITIES_MAX} from your skills.`}
      actions={
        <Button size="xl" className="w-full" onClick={onClose}>
          Done
        </Button>
      }
    >
      {skills.length === 0 ? (
        <p className="text-md leading-md text-text-secondary">Add your skills first. Your top specialties come from them.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {skills.map((s) => {
            const picked = specialities.find((x) => x.skill === s);
            const off = !picked && full;
            return (
              <li key={s} className="flex flex-col gap-2">
                <label className={cn("relative flex min-h-[44px] items-center gap-6 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus", off ? "cursor-not-allowed" : "cursor-pointer")}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!!picked}
                    disabled={off}
                    onChange={() => onChange(picked ? specialities.filter((x) => x.skill !== s) : [...specialities, { skill: s, years: "1-2" }])}
                  />
                  <Checkbox checked={!!picked} disabled={off} decorative />
                  <span className={cn("text-lg leading-lg", off ? "text-text-disabled" : "text-text-primary")}>{s}</span>
                </label>
                {picked && (
                  <SheetSelect
                    title={`Years of ${s}`}
                    value={picked.years}
                    options={YEARS.map((y) => ({ value: y, label: YEARS_WORDS[y].replace("Years", "years") }))}
                    onChange={(y) => onChange(specialities.map((x) => (x.skill === s ? { ...x, years: y as Years } : x)))}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {full && <p className={HINT}>You picked {SPECIALITIES_MAX}. Untick one to pick another.</p>}
    </Sheet>
  );
}

function LanguagesSheet({ open, onClose, languages, onChange }: { open: boolean; onClose: () => void; languages: string[]; onChange: (l: string[]) => void }) {
  const options = React.useMemo(() => spokenLanguageOptions(), []);
  const [q, setQ] = React.useState("");
  const id = React.useId();
  const full = languages.length >= LANGUAGES_MAX;
  const query = q.trim().toLowerCase();
  const matches = query ? options.filter((l) => !languages.includes(l) && l.toLowerCase().includes(query)).slice(0, 8) : [];
  const done = () => {
    setQ("");
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={done}
      title="Languages"
      description={`${languages.length} of ${LANGUAGES_MAX}`}
      actions={
        <Button size="xl" className="w-full" onClick={done}>
          Done
        </Button>
      }
    >
      <label htmlFor={id} className="sr-only">
        Search languages
      </label>
      <TextInput
        id={id}
        size="xl"
        type="search"
        placeholder="Search languages"
        disabled={full}
        value={q}
        onValueChange={setQ}
        suffix={<Icon icon={Search01Icon} size={20} />}
      />
      {full && <p className={HINT}>Remove a language to add another.</p>}
      {query && !full && (
        <ul aria-label="Matching languages" className="-mx-8 m-0 flex list-none flex-col p-0">
          {matches.length === 0 ? (
            <li className="px-8 py-4 text-md leading-md text-text-secondary">No language matches “{q.trim()}”.</li>
          ) : (
            matches.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...languages, l].slice(0, LANGUAGES_MAX));
                    setQ("");
                  }}
                  className="flex h-[40px] w-full items-center rounded-md px-8 text-left text-lg leading-lg text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {l}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {languages.length > 0 && (
        <ul aria-label="Languages you speak" className="m-0 flex list-none flex-wrap gap-4 p-0">
          {languages.map((l) => (
            <li key={l}>
              <Tag size="md" onDismiss={() => onChange(languages.filter((x) => x !== l))} dismissLabel={`Remove ${l}`}>
                {l}
              </Tag>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
