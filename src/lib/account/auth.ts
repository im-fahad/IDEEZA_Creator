// The demo sign-in (owner, 2026-11-04): Notion Part 1's sign-up flow, with
// nothing behind it but this browser, like the rest of the app. One account
// per browser in `ideeza:account`, the signed-in state in `ideeza:session`,
// both through the shared key store so every reader agrees without a reload.
// The password is kept only as a salted PBKDF2 hash. Signing out keeps the
// account and all the work in the browser; signing in again finds it all.
//
// Sign up → the "email" (a Demo card in the app) → verifying signs you in →
// one question (where you heard of IDEEZA) unless the link already said →
// Home. Your country is saved to your profile from the browser's time zone.
// Relative imports only, so node:test can load it.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { readProfileFields, saveProfile } from "../people/profile-store";
import { countryCodeOf, countryNameOf } from "./countries";
import { ZONE_COUNTRIES } from "./zone-countries";

export const ACCOUNT_KEY = "ideeza:account";
export const SESSION_KEY = "ideeza:session";

export const NAME_PART_MAX = 40;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const OTHER_MAX = 60;

/** Notion Part 1's chips, in its order. */
export const SOURCES = ["youtube", "friend", "google", "linkedin", "event", "other"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_WORDS: Record<Source, string> = {
  youtube: "YouTube",
  friend: "Friend",
  google: "Google",
  linkedin: "LinkedIn",
  event: "Event",
  other: "Other",
};

export type Account = {
  v: 1;
  firstName: string;
  lastName: string;
  /** Lower case, so signing in ignores how it was typed. */
  email: string;
  passwordHash: string;
  salt: string;
  /** "YYYY-MM-DD". */
  birthDate: string;
  /** When the Terms and Privacy box was ticked. */
  consentAt: number;
  createdAt: number;
  verifiedAt: number | null;
  /** Where they heard of IDEEZA: the link's utm_source, or their answer; "" when unknown. */
  source: string;
  sourceVia: "" | "link" | "answer";
  /** What they typed under Other. */
  sourceOther: string;
  /** They skipped the question, so Home asks again until they answer or close it. */
  sourceSkipped: boolean;
  nudgeClosed: boolean;
  /** ISO code, from the browser's time zone; "" when it couldn't tell. */
  country: string;
};

export type Session = { v: 1; email: string; at: number };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const time = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  return e.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** The account stored here, or null when there is none or it can't be read. */
export function normalizeAccount(raw: unknown): Account | null {
  if (!isObj(raw)) return null;
  const email = typeof raw.email === "string" ? normalizeEmail(raw.email) : "";
  const passwordHash = typeof raw.passwordHash === "string" ? raw.passwordHash : "";
  const salt = typeof raw.salt === "string" ? raw.salt : "";
  if (!isEmail(email) || !passwordHash || !salt) return null;
  const via = raw.sourceVia === "link" || raw.sourceVia === "answer" ? raw.sourceVia : "";
  const source = str(raw.source, 40);
  return {
    v: 1,
    firstName: str(raw.firstName, NAME_PART_MAX),
    lastName: str(raw.lastName, NAME_PART_MAX),
    email,
    passwordHash,
    salt,
    birthDate: typeof raw.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.birthDate) ? raw.birthDate : "",
    consentAt: time(raw.consentAt) ?? 0,
    createdAt: time(raw.createdAt) ?? 0,
    verifiedAt: time(raw.verifiedAt),
    source,
    sourceVia: source ? via : "",
    sourceOther: str(raw.sourceOther, OTHER_MAX),
    sourceSkipped: !source && raw.sourceSkipped === true,
    nudgeClosed: raw.nudgeClosed === true,
    country: countryCodeOf(raw.country) ?? "",
  };
}

export function normalizeSession(raw: unknown): Session | null {
  if (!isObj(raw) || typeof raw.email !== "string" || !raw.email) return null;
  return { v: 1, email: normalizeEmail(raw.email), at: time(raw.at) ?? 0 };
}

/** Signed in: a session for this browser's account, and its email verified. */
export function isSignedIn(account: Account | null, session: Session | null): boolean {
  return !!account && !!session && session.email === account.email && account.verifiedAt !== null;
}

/** Where a signed-out visitor goes: Sign up when this browser has no account,
 *  Check your email while it isn't verified, else Sign in. */
export function signedOutHome(account: Account | null): "/sign-in" | "/sign-up" | "/sign-up/check-email" {
  if (!account) return "/sign-up";
  return account.verifiedAt === null ? "/sign-up/check-email" : "/sign-in";
}

/** The pages anyone can open. Every other page needs you signed in. */
export function isAuthPath(pathname: string): boolean {
  return /^\/(sign-up|sign-in)(\/|$)/.test(pathname);
}

/** The one question is asked once, right after verifying, when the link didn't say. */
export function needsSourceQuestion(account: Account): boolean {
  return !account.source && !account.sourceSkipped;
}

/** Home's profile card: they skipped the question and haven't answered or closed it. */
export function showsSourceNudge(account: Account): boolean {
  return !account.source && account.sourceSkipped && !account.nudgeClosed;
}

/** A link's utm_source, kept as a short lower-case word; "" when there is none. */
export function sourceFromUtm(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
}

/** The country a time zone is in, as an ISO code; "" when unknown. */
export function countryOfZone(zone: string | null | undefined): string {
  return (zone && ZONE_COUNTRIES[zone]) || "";
}

function deviceCountry(): string {
  try {
    const byZone = countryOfZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (byZone) return byZone;
    const region = new Intl.Locale(navigator.language).maximize().region;
    return countryCodeOf(region) ?? "";
  } catch {
    return "";
  }
}

// ─────────────────────────── the sign-up form ───────────────────────────

export type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
  day: string;
  month: string;
  year: string;
  consent: boolean;
};

export type SignUpField = "firstName" | "lastName" | "email" | "password" | "confirm" | "birthday" | "consent";

/** "YYYY-MM-DD" when day, month and year make a real date before `now`; "" otherwise. */
export function birthDateOf(day: string, month: string, year: string, now: number): string {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || y < 1900) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "";
  if (date.getTime() > now) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function passwordProblem(password: string): string {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return "";
}

/** What is wrong with each field, in the form's order; empty when it can be sent. */
export function signUpProblems(input: SignUpInput, now: number): Partial<Record<SignUpField, string>> {
  const out: Partial<Record<SignUpField, string>> = {};
  if (!str(input.firstName, NAME_PART_MAX)) out.firstName = "Enter your first name.";
  if (!str(input.lastName, NAME_PART_MAX)) out.lastName = "Enter your last name.";
  if (!input.email.trim()) out.email = "Enter your email.";
  else if (!isEmail(input.email)) out.email = "Enter an email like name@example.com.";
  const pw = passwordProblem(input.password);
  if (pw) out.password = pw;
  if (!input.confirm) out.confirm = "Type the password again.";
  else if (input.confirm !== input.password) out.confirm = "The passwords don't match.";
  if (!input.day || !input.month || !input.year) out.birthday = "Choose your day, month and year of birth.";
  else if (!birthDateOf(input.day, input.month, input.year, now)) out.birthday = "That date doesn't exist.";
  if (!input.consent) out.consent = "Agree to the Privacy policy and Terms to continue.";
  return out;
}

// ─────────────────────────── the password ───────────────────────────

const ITERATIONS = 100_000;

const hex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function fromHex(s: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(s.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function newSalt(): string {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

/** PBKDF2-SHA-256 of the password with the salt, as hex. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations: ITERATIONS },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

// ─────────────────────────── the store ───────────────────────────

export function readAccount(): Account | null {
  return normalizeAccount(parseStored(readStoredKey(ACCOUNT_KEY)).value);
}

export function readSession(): Session | null {
  return normalizeSession(parseStored(readStoredKey(SESSION_KEY)).value);
}

function writeAccount(account: Account): WriteResult {
  if (storedUnreadable(ACCOUNT_KEY, isObj)) return { ok: false };
  return writeStoredKey(ACCOUNT_KEY, account);
}

function startSession(email: string, now: number): WriteResult {
  return writeStoredKey(SESSION_KEY, { v: 1, email, at: now } satisfies Session);
}

/** Saves a new, unverified account; nobody is signed in until the email is verified. */
export async function createAccount(input: SignUpInput, utmSource: string, now: number): Promise<WriteResult> {
  const birthDate = birthDateOf(input.day, input.month, input.year, now);
  if (Object.keys(signUpProblems(input, now)).length || !birthDate) return { ok: false };
  const salt = newSalt();
  const source = sourceFromUtm(utmSource);
  return writeAccount({
    v: 1,
    firstName: str(input.firstName, NAME_PART_MAX),
    lastName: str(input.lastName, NAME_PART_MAX),
    email: normalizeEmail(input.email),
    passwordHash: await hashPassword(input.password, salt),
    salt,
    birthDate,
    consentAt: now,
    createdAt: now,
    verifiedAt: null,
    source,
    sourceVia: source ? "link" : "",
    sourceOther: "",
    sourceSkipped: false,
    nudgeClosed: false,
    country: "",
  });
}

/** The verify link: marks the email verified, signs you in, and fills your
 *  profile's name and country where they are still empty. */
export function verifyEmail(now: number): WriteResult {
  const account = readAccount();
  if (!account) return { ok: false };
  const country = account.country || deviceCountry();
  const saved = writeAccount({ ...account, verifiedAt: account.verifiedAt ?? now, country });
  if (!saved.ok) return saved;
  const profile = readProfileFields();
  const patch: { name?: string; location?: string } = {};
  if (!profile.name) patch.name = `${account.firstName} ${account.lastName}`.trim();
  if (!profile.location && country) patch.location = countryNameOf(country);
  if (patch.name || patch.location) saveProfile(patch);
  return startSession(account.email, now);
}

export type SignInResult = "ok" | "wrong" | "unverified" | "refused";

export async function signIn(email: string, password: string, now: number): Promise<SignInResult> {
  const account = readAccount();
  if (!account || normalizeEmail(email) !== account.email) return "wrong";
  if ((await hashPassword(password, account.salt)) !== account.passwordHash) return "wrong";
  if (account.verifiedAt === null) return "unverified";
  return startSession(account.email, now).ok ? "ok" : "refused";
}

export function signOut(): WriteResult {
  return writeStoredKey(SESSION_KEY, null);
}

/** The reset link: a new password, and you're signed in. Opening the link
 *  proves the email, so it counts as verified. */
export async function resetPassword(password: string, now: number): Promise<WriteResult> {
  const account = readAccount();
  if (!account || passwordProblem(password)) return { ok: false };
  const salt = newSalt();
  const saved = writeAccount({ ...account, salt, passwordHash: await hashPassword(password, salt), verifiedAt: account.verifiedAt ?? now });
  return saved.ok ? startSession(account.email, now) : saved;
}

export function answerSource(source: Source, other: string): WriteResult {
  const account = readAccount();
  if (!account) return { ok: false };
  return writeAccount({
    ...account,
    source,
    sourceVia: "answer",
    sourceOther: source === "other" ? str(other, OTHER_MAX) : "",
    sourceSkipped: false,
  });
}

export function skipSource(): WriteResult {
  const account = readAccount();
  if (!account) return { ok: false };
  return writeAccount({ ...account, sourceSkipped: true });
}

export function closeSourceNudge(): WriteResult {
  const account = readAccount();
  if (!account) return { ok: false };
  return writeAccount({ ...account, nudgeClosed: true });
}

/** The account and whether you're signed in, live. `hydrated` is false until the browser's copy is read. */
export function useAuth(): { hydrated: boolean; account: Account | null; signedIn: boolean } {
  const a = useStoredKey(ACCOUNT_KEY);
  const s = useStoredKey(SESSION_KEY);
  return React.useMemo(() => {
    const account = normalizeAccount(parseStored(a.raw).value);
    const session = normalizeSession(parseStored(s.raw).value);
    return { hydrated: a.hydrated && s.hydrated, account, signedIn: isSignedIn(account, session) };
  }, [a.hydrated, a.raw, s.hydrated, s.raw]);
}

/** Runs in <head> before the first paint: a signed-out visitor to any page but
 *  Sign up / Sign in goes there at once, so no page flashes before the gate.
 *  The same rule as `isSignedIn` and `signedOutHome`; the link's query (its
 *  utm_source) rides along to Sign up. */
export const AUTH_PREPAINT = `(function(){try{var p=location.pathname;if(/^\\/(sign-up|sign-in)(\\/|$)/.test(p))return;var a=JSON.parse(localStorage.getItem("${ACCOUNT_KEY}")||"null"),s=JSON.parse(localStorage.getItem("${SESSION_KEY}")||"null");if(a&&s&&a.email&&s.email===a.email&&a.verifiedAt)return;document.documentElement.style.visibility="hidden";location.replace(!(a&&a.email)?"/sign-up"+location.search:a.verifiedAt?"/sign-in":"/sign-up/check-email");}catch(e){}})();`;
