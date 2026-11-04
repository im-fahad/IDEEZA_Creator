// The mobile prototype's own way in (mobile Figma "Account · 2026 update",
// AU-01…33). The accounts themselves are the web's (auth.ts) — one person, one
// account, on either — and this keeps only what the phone adds: its four
// password rules, the six-digit codes for verifying and resetting, the
// sign-in tries, how each account signs in on the phone (Apple, Google,
// Facebook, a password) and Face ID, and what this phone remembers (Explore
// first, the Face ID offer). Relative imports only, so node:test can load it.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { PASSWORD_MAX, normalizeEmail } from "./auth";
import { handleProblem } from "../people/ids";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** "4:59" — what a countdown shows (minutes, then two-digit seconds). */
export function clockOf(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─────────────────────────── the password (AU-10, AU-32) ───────────────────────────

export const PHONE_PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "letter", label: "A letter", test: (p: string) => /\p{L}/u.test(p) },
  { id: "number", label: "A number", test: (p: string) => /\p{N}/u.test(p) },
  { id: "symbol", label: "A symbol", test: (p: string) => /[^\p{L}\p{N}\s]/u.test(p) },
] as const;

export type PhonePasswordRule = (typeof PHONE_PASSWORD_RULES)[number]["id"];

/** Each rule, in the checklist's order, and whether the password meets it. */
export function phonePasswordChecks(password: string): { id: PhonePasswordRule; label: string; met: boolean }[] {
  return PHONE_PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, met: r.test(password) }));
}

/** "" when the password meets every rule; otherwise what is wrong, in a sentence. */
export function phonePasswordProblem(password: string): string {
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return PHONE_PASSWORD_RULES.every((r) => r.test(password)) ? "" : "Your password doesn’t meet every rule yet.";
}

// ─────────────────────────── six-digit codes (AU-12, AU-31) ───────────────────────────

export const CODE_KEY = "ideeza:m:code";
export const CODE_LENGTH = 6;
/** A code works for 10 minutes. */
export const CODE_TTL_MS = 10 * 60_000;
/** "Resend in 0:30". */
export const RESEND_AFTER_MS = 30_000;
/** Five wrong codes lock the step for 10 minutes ("Too many tries · Try again in 10:00"). */
export const CODE_TRIES = 5;
export const CODE_LOCK_MS = 10 * 60_000;

export type CodePurpose = "verify" | "reset";

export type CodeRecord = {
  v: 1;
  purpose: CodePurpose;
  email: string;
  code: string;
  sentAt: number;
  tries: number;
  lockedUntil: number;
};

export function normalizeCode(raw: unknown): CodeRecord | null {
  if (!isObj(raw)) return null;
  const purpose = raw.purpose === "verify" || raw.purpose === "reset" ? raw.purpose : null;
  const code = typeof raw.code === "string" && /^\d{6}$/.test(raw.code) ? raw.code : "";
  const email = typeof raw.email === "string" ? normalizeEmail(raw.email) : "";
  if (!purpose || !code || !email) return null;
  return {
    v: 1,
    purpose,
    email,
    code,
    sentAt: num(raw.sentAt),
    tries: Math.min(CODE_TRIES, Math.floor(num(raw.tries))),
    lockedUntil: num(raw.lockedUntil),
  };
}

/** Six digits, never starting with 0 so it reads as six. */
export function newCode(random: () => number = Math.random): string {
  return String(100000 + Math.floor(random() * 900000));
}

export type CodeCheck = "ok" | "wrong" | "expired" | "locked";

/** Checks what was typed against the record; the record comes back with the try counted. */
export function checkCode(record: CodeRecord, typed: string, now: number): { result: CodeCheck; record: CodeRecord } {
  if (now < record.lockedUntil) return { result: "locked", record };
  if (now - record.sentAt > CODE_TTL_MS) return { result: "expired", record };
  if (typed === record.code) return { result: "ok", record: { ...record, tries: 0 } };
  const tries = record.tries + 1;
  if (tries >= CODE_TRIES) return { result: "locked", record: { ...record, tries: 0, lockedUntil: now + CODE_LOCK_MS } };
  return { result: "wrong", record: { ...record, tries } };
}

/** How long until another code can be sent: the lock, else 30 s after the last one. */
export function resendWait(record: CodeRecord, now: number): number {
  return Math.max(0, record.lockedUntil - now, record.sentAt + RESEND_AFTER_MS - now);
}

export function readCode(): CodeRecord | null {
  return normalizeCode(parseStored(readStoredKey(CODE_KEY)).value);
}

export function saveCode(record: CodeRecord | null): WriteResult {
  return writeStoredKey(CODE_KEY, record);
}

/** Sends a new code for this step (the demo's "email" is the inbox sheet), unless the step is locked. */
export function issueCode(purpose: CodePurpose, email: string, now: number, random: () => number = Math.random): CodeRecord | null {
  const e = normalizeEmail(email);
  const old = readCode();
  const lockedUntil = old && old.purpose === purpose && old.email === e && now < old.lockedUntil ? old.lockedUntil : 0;
  if (lockedUntil) return old;
  const record: CodeRecord = { v: 1, purpose, email: e, code: newCode(random), sentAt: now, tries: 0, lockedUntil: 0 };
  return saveCode(record).ok ? record : null;
}

export function useCode(): { hydrated: boolean; code: CodeRecord | null } {
  const k = useStoredKey(CODE_KEY);
  return React.useMemo(() => ({ hydrated: k.hydrated, code: normalizeCode(parseStored(k.raw).value) }), [k.hydrated, k.raw]);
}

// ─────────────────────────── sign-in tries (AU-05g) ───────────────────────────

export const TRIES_KEY = "ideeza:m:sign-in-tries";
/** Five wrong tries for an email lock its sign-in for 5 minutes. */
export const SIGN_IN_TRIES = 5;
export const SIGN_IN_LOCK_MS = 5 * 60_000;

export type SignInTries = Record<string, { wrong: number; lockedUntil: number }>;

export function normalizeTries(raw: unknown): SignInTries {
  if (!isObj(raw)) return {};
  const out: SignInTries = {};
  for (const [email, v] of Object.entries(raw)) {
    if (isObj(v)) out[normalizeEmail(email)] = { wrong: Math.floor(num(v.wrong)), lockedUntil: num(v.lockedUntil) };
  }
  return out;
}

export function signInLockedFor(tries: SignInTries, email: string, now: number): number {
  return Math.max(0, (tries[normalizeEmail(email)]?.lockedUntil ?? 0) - now);
}

export function afterWrongSignIn(tries: SignInTries, email: string, now: number): SignInTries {
  const e = normalizeEmail(email);
  const wrong = (tries[e]?.wrong ?? 0) + 1;
  return {
    ...tries,
    [e]: wrong >= SIGN_IN_TRIES ? { wrong: 0, lockedUntil: now + SIGN_IN_LOCK_MS } : { wrong, lockedUntil: 0 },
  };
}

export function afterRightSignIn(tries: SignInTries, email: string): SignInTries {
  const rest = { ...tries };
  delete rest[normalizeEmail(email)];
  return rest;
}

export function readTries(): SignInTries {
  return normalizeTries(parseStored(readStoredKey(TRIES_KEY)).value);
}

export function saveTries(tries: SignInTries): WriteResult {
  return writeStoredKey(TRIES_KEY, tries);
}

// ─────────────────────────── how each account signs in on the phone ───────────────────────────

export type Provider = "apple" | "google" | "facebook";
export const PROVIDERS: readonly Provider[] = ["apple", "google", "facebook"];
export const PROVIDER_WORDS: Record<Provider, string> = { apple: "Apple", google: "Google", facebook: "Facebook" };

export const PHONE_ACCOUNTS_KEY = "ideeza:m:accounts";

export type PhoneAccount = {
  /** The providers linked to the account (AU-06). */
  providers: Provider[];
  /** Made through a provider: no password of its own yet (AU-41h adds one). */
  passwordless: boolean;
  /** "Use Face ID" was chosen (AU-08). */
  faceId: boolean;
};

const NO_PHONE_ACCOUNT: PhoneAccount = { providers: [], passwordless: false, faceId: false };

export function normalizePhoneAccounts(raw: unknown): Record<string, PhoneAccount> {
  if (!isObj(raw)) return {};
  const out: Record<string, PhoneAccount> = {};
  for (const [email, v] of Object.entries(raw)) {
    if (!isObj(v)) continue;
    const providers = Array.isArray(v.providers) ? PROVIDERS.filter((p) => (v.providers as unknown[]).includes(p)) : [];
    out[normalizeEmail(email)] = { providers, passwordless: v.passwordless === true, faceId: v.faceId === true };
  }
  return out;
}

export function phoneAccountOf(all: Record<string, PhoneAccount>, email: string): PhoneAccount {
  return all[normalizeEmail(email)] ?? NO_PHONE_ACCOUNT;
}

export function readPhoneAccounts(): Record<string, PhoneAccount> {
  return normalizePhoneAccounts(parseStored(readStoredKey(PHONE_ACCOUNTS_KEY)).value);
}

export function updatePhoneAccount(email: string, patch: (a: PhoneAccount) => PhoneAccount): WriteResult {
  const all = readPhoneAccounts();
  const e = normalizeEmail(email);
  return writeStoredKey(PHONE_ACCOUNTS_KEY, { ...all, [e]: patch(phoneAccountOf(all, e)) });
}

/** Links a provider to the account (it can sign in with it from now on). */
export function linkProvider(email: string, provider: Provider, passwordless = false): WriteResult {
  return updatePhoneAccount(email, (a) => ({
    ...a,
    providers: a.providers.includes(provider) ? a.providers : [...a.providers, provider],
    passwordless: a.passwordless || passwordless,
  }));
}

/** Disconnects a provider (Sign-in & security). Refused while it is the account's only way in:
 *  no password and no other provider. */
export function unlinkProvider(email: string, provider: Provider): WriteResult {
  const a = phoneAccountOf(readPhoneAccounts(), email);
  if (isLastWayIn(a, provider)) return { ok: false };
  return updatePhoneAccount(email, (x) => ({ ...x, providers: x.providers.filter((p) => p !== provider) }));
}

/** The provider is the only way in: no password of its own and no other provider. */
export function isLastWayIn(a: PhoneAccount, provider: Provider): boolean {
  return a.passwordless && a.providers.length === 1 && a.providers[0] === provider;
}

/** The email changed: its sign-in methods go with it. */
export function movePhoneAccount(from: string, to: string): WriteResult {
  const all = readPhoneAccounts();
  const f = normalizeEmail(from);
  const t = normalizeEmail(to);
  if (!all[f] || f === t) return { ok: true };
  const rest = { ...all };
  delete rest[f];
  return writeStoredKey(PHONE_ACCOUNTS_KEY, { ...rest, [t]: all[f] });
}

export function usePhoneAccounts(): Record<string, PhoneAccount> {
  const k = useStoredKey(PHONE_ACCOUNTS_KEY);
  return React.useMemo(() => normalizePhoneAccounts(parseStored(k.raw).value), [k.raw]);
}

// ─────────────────────────── this phone ───────────────────────────

export const PHONE_KEY = "ideeza:m:phone";

export type PhoneState = {
  /** Chose Explore first: the app opens on the guest Feed, not Welcome, until a sign-out. */
  explored: boolean;
  /** The Face ID offer was made on this phone (it is made once). */
  faceIdOffered: boolean;
  /** Show the Face ID offer on the next screen (set by the first sign-in here). */
  faceIdPending: boolean;
  /** The kit's pre-prompts (KIT-PM-01 camera, PM-02 photos) come once, at first use. */
  cameraAsked: boolean;
  photosAsked: boolean;
};

export function normalizePhone(raw: unknown): PhoneState {
  const r = isObj(raw) ? raw : {};
  return {
    explored: r.explored === true,
    faceIdOffered: r.faceIdOffered === true,
    faceIdPending: r.faceIdPending === true,
    cameraAsked: r.cameraAsked === true,
    photosAsked: r.photosAsked === true,
  };
}

export function readPhone(): PhoneState {
  return normalizePhone(parseStored(readStoredKey(PHONE_KEY)).value);
}

export function updatePhone(patch: Partial<PhoneState>): WriteResult {
  return writeStoredKey(PHONE_KEY, { ...readPhone(), ...patch });
}

export function usePhone(): { hydrated: boolean; phone: PhoneState } {
  const k = useStoredKey(PHONE_KEY);
  return React.useMemo(() => ({ hydrated: k.hydrated, phone: normalizePhone(parseStored(k.raw).value) }), [k.hydrated, k.raw]);
}

/** After a sign-in: the Face ID offer, once per phone. */
export function afterPhoneSignIn(): void {
  const p = readPhone();
  if (!p.faceIdOffered) updatePhone({ faceIdPending: true });
}

// ─────────────────────────── a provider's answer, between its sheet and "Signing you in" ───────────────────────────

export const PROVIDER_KEY = "ideeza:m:provider";

export type ProviderAnswer = {
  provider: Provider;
  /** "" when the provider shared none (Facebook can, AU-04e). */
  email: string;
  first: string;
  last: string;
  /** Where they started, so Cancel and errors land back there. */
  from: string;
  /** Where they were going. */
  next: string;
};

export function normalizeProviderAnswer(raw: unknown): ProviderAnswer | null {
  if (!isObj(raw) || !PROVIDERS.includes(raw.provider as Provider)) return null;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    provider: raw.provider as Provider,
    email: normalizeEmail(s(raw.email)),
    first: s(raw.first).slice(0, 40),
    last: s(raw.last).slice(0, 40),
    from: mobileNext(s(raw.from), "/m/welcome", true),
    next: mobileNext(s(raw.next)),
  };
}

export function readProviderAnswer(): ProviderAnswer | null {
  return normalizeProviderAnswer(parseStored(readStoredKey(PROVIDER_KEY)).value);
}

export function saveProviderAnswer(a: ProviderAnswer | null): WriteResult {
  return writeStoredKey(PROVIDER_KEY, a);
}

/** Apple's "Hide my email": a relay address stands in for theirs (AU-04d). */
export function relayAddress(random: () => number = Math.random): string {
  return `${Math.floor(random() * 36 ** 8).toString(36).padStart(8, "0")}@privaterelay.appleid.com`;
}

// ─────────────────────────── where to go ───────────────────────────

/** The way-in screens: open to anyone signed out. */
export const ENTRY_PATH = /^\/m\/(welcome|sign-in|sign-up|verify|reset|signing-in|add-email|link)(\/|$)/;
/** After sign-up: name and handle, the profile steps and the Welcome map. */
export const SETUP_PATH = /^\/m\/(handle|setup|welcome-map)(\/|$)/;

/** A mobile path to go back to: only the prototype's own, never a way-in screen (unless `entryOk`). */
export function mobileNext(raw: string | null | undefined, fallback = "/m", entryOk = false): string {
  if (!raw || !/^\/m(\/|\?|#|$)/.test(raw) || raw.startsWith("//")) return fallback;
  if (!entryOk && ENTRY_PATH.test(raw.split(/[?#]/)[0])) return fallback;
  return raw;
}

// ─────────────────────────── handle suggestions (AU-13c) ───────────────────────────

/** A name as a handle: Latin letters and numbers, hyphens between words. */
export function handleBaseOf(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

/** Three free handles near the name (or what was typed, when the name has no Latin letters). */
export function handleSuggestions(name: string, typed: string, isFree: (h: string) => boolean = (h) => handleProblem(h) === null): string[] {
  const base = handleBaseOf(name) || handleBaseOf(typed);
  if (!base) return [];
  const first = base.split("-")[0];
  const candidates = [`${base}-1`, base.replace(/-/g, ""), `${first}-makes`, `${base}-2`, `${first}-builds`, `${base}-3`];
  const out: string[] = [];
  for (const c of candidates) {
    if (c !== typed && !out.includes(c) && isFree(c)) out.push(c);
    if (out.length === 3) break;
  }
  return out;
}
