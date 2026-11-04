// The demo sign-in (owner 2026-11-04, Notion Part 1): one account per browser,
// the password only as a salted hash, verifying signs you in, the one question
// asked only when the link didn't say, and the pre-paint gate.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.dispatchEvent = () => true;
globalThis.Event = class {};

const auth = await import("../../.tmp-test/lib/account/auth.js");
const { PROFILE_KEY } = await import("../../.tmp-test/lib/people/fields.js");

const NOW = Date.UTC(2026, 10, 4, 12);
const INPUT = {
  firstName: " Rafiq ",
  lastName: "Ahmed",
  email: "Rafiq@Example.com ",
  password: "correct horse",
  confirm: "correct horse",
  day: "9",
  month: "3",
  year: "1994",
  consent: true,
};

beforeEach(() => store.clear());

test("a full form has no problems; each missing or wrong field says why", () => {
  assert.deepEqual(auth.signUpProblems(INPUT, NOW), {});
  const p = auth.signUpProblems({ ...INPUT, firstName: " ", email: "nope", password: "short", confirm: "other", day: "", consent: false }, NOW);
  assert.deepEqual(Object.keys(p), ["firstName", "email", "password", "confirm", "birthday", "consent"]);
  assert.equal(auth.signUpProblems({ ...INPUT, confirm: "correct horsE" }, NOW).confirm, "The passwords don't match.");
});

test("the date of birth must be a real day, and not in the future", () => {
  assert.equal(auth.birthDateOf("9", "3", "1994", NOW), "1994-03-09");
  assert.equal(auth.birthDateOf("31", "2", "2000", NOW), "");
  assert.equal(auth.birthDateOf("29", "2", "2000", NOW), "2000-02-29");
  assert.equal(auth.birthDateOf("1", "1", "2030", NOW), "");
  assert.equal(auth.signUpProblems({ ...INPUT, day: "31", month: "2" }, NOW).birthday, "That date doesn't exist.");
});

test("signing up saves an unverified account: the email in lower case, the password only hashed", async () => {
  assert.equal((await auth.createAccount(INPUT, "", NOW)).ok, true);
  const raw = store.get(auth.ACCOUNT_KEY);
  assert.ok(!raw.includes("correct horse"));
  const a = auth.readAccount();
  assert.equal(a.email, "rafiq@example.com");
  assert.equal(a.firstName, "Rafiq");
  assert.equal(a.birthDate, "1994-03-09");
  assert.equal(a.consentAt, NOW);
  assert.equal(a.verifiedAt, null);
  assert.equal(a.passwordHash, await auth.hashPassword("correct horse", a.salt));
  assert.equal(auth.isSignedIn(a, auth.readSession()), false);
});

test("an invalid form is refused and nothing is saved", async () => {
  assert.equal((await auth.createAccount({ ...INPUT, consent: false }, "", NOW)).ok, false);
  assert.equal(store.has(auth.ACCOUNT_KEY), false);
});

test("verifying signs you in and fills the profile's empty name and country", async () => {
  await auth.createAccount(INPUT, "", NOW);
  assert.equal(auth.verifyEmail(NOW + 1).ok, true);
  const a = auth.readAccount();
  assert.equal(a.verifiedAt, NOW + 1);
  assert.equal(auth.isSignedIn(a, auth.readSession()), true);
  const profile = JSON.parse(store.get(PROFILE_KEY));
  assert.equal(profile.name, "Rafiq Ahmed");
  if (a.country) assert.ok(profile.location.length > 0);
});

test("verifying keeps a name the profile already has", async () => {
  store.set(PROFILE_KEY, JSON.stringify({ v: 2, name: "Maker R", location: "Dhaka" }));
  await auth.createAccount(INPUT, "", NOW);
  auth.verifyEmail(NOW);
  const profile = JSON.parse(store.get(PROFILE_KEY));
  assert.equal(profile.name, "Maker R");
  assert.equal(profile.location, "Dhaka");
});

test("sign in: right pair in, wrong pair one answer, unverified sent back", async () => {
  await auth.createAccount(INPUT, "", NOW);
  assert.equal(await auth.signIn("rafiq@example.com", "correct horse", NOW), "unverified");
  auth.verifyEmail(NOW);
  auth.signOut();
  assert.equal(auth.isSignedIn(auth.readAccount(), auth.readSession()), false);
  assert.equal(await auth.signIn("rafiq@example.com", "wrong horse", NOW), "wrong");
  assert.equal(await auth.signIn("someone@example.com", "correct horse", NOW), "wrong");
  assert.equal(await auth.signIn("  RAFIQ@example.com", "correct horse", NOW), "ok");
  assert.equal(auth.isSignedIn(auth.readAccount(), auth.readSession()), true);
});

test("signing out keeps the account; a reset sets a new password and signs you in", async () => {
  await auth.createAccount(INPUT, "", NOW);
  auth.verifyEmail(NOW);
  auth.signOut();
  assert.ok(auth.readAccount());
  assert.equal((await auth.resetPassword("short", NOW)).ok, false);
  assert.equal((await auth.resetPassword("a new password", NOW)).ok, true);
  assert.equal(auth.isSignedIn(auth.readAccount(), auth.readSession()), true);
  auth.signOut();
  assert.equal(await auth.signIn("rafiq@example.com", "correct horse", NOW), "wrong");
  assert.equal(await auth.signIn("rafiq@example.com", "a new password", NOW), "ok");
});

test("a link's utm_source answers the question, so it is never asked", async () => {
  await auth.createAccount(INPUT, " YouTube<script> ", NOW);
  const a = auth.readAccount();
  assert.equal(a.source, "youtubescript");
  assert.equal(a.sourceVia, "link");
  assert.equal(auth.needsSourceQuestion(a), false);
  assert.equal(auth.showsSourceNudge(a), false);
});

test("the one question: asked once; Skip moves it to Home's nudge until answered or closed", async () => {
  await auth.createAccount(INPUT, "", NOW);
  assert.equal(auth.needsSourceQuestion(auth.readAccount()), true);
  auth.skipSource();
  assert.equal(auth.needsSourceQuestion(auth.readAccount()), false);
  assert.equal(auth.showsSourceNudge(auth.readAccount()), true);
  auth.answerSource("other", "  a  maker fair ");
  const a = auth.readAccount();
  assert.deepEqual([a.source, a.sourceVia, a.sourceOther, a.sourceSkipped], ["other", "answer", "a maker fair", false]);
  assert.equal(auth.showsSourceNudge(a), false);
  auth.skipSource();
  store.set(auth.ACCOUNT_KEY, JSON.stringify({ ...auth.readAccount(), source: "", sourceSkipped: true }));
  auth.closeSourceNudge();
  assert.equal(auth.showsSourceNudge(auth.readAccount()), false);
});

test("Notion's chips, in its order", () => {
  assert.deepEqual(auth.SOURCES.map((s) => auth.SOURCE_WORDS[s]), ["YouTube", "Friend", "Google", "LinkedIn", "Event", "Other"]);
});

test("only Sign up and Sign in are open without signing in", () => {
  for (const p of ["/sign-up", "/sign-up/check-email", "/sign-up/welcome", "/sign-in"]) assert.equal(auth.isAuthPath(p), true, p);
  for (const p of ["/", "/projects", "/sign-upx", "/settings/account", "/project/x/pcb"]) assert.equal(auth.isAuthPath(p), false, p);
  assert.equal(auth.signedOutHome(null), "/sign-up");
  assert.equal(auth.signedOutHome({ verifiedAt: null }), "/sign-up/check-email");
  assert.equal(auth.signedOutHome({ verifiedAt: NOW }), "/sign-in");
});

test("the time zone gives the country, old browser names included", () => {
  assert.equal(auth.countryOfZone("Asia/Dhaka"), "BD");
  assert.equal(auth.countryOfZone("Asia/Calcutta"), "IN");
  assert.equal(auth.countryOfZone("Europe/Berlin"), "DE");
  assert.equal(auth.countryOfZone("Etc/UTC"), "");
  assert.equal(auth.countryOfZone(null), "");
});

test("junk in storage reads as no account and no session", () => {
  for (const raw of [null, 4, "x", [], {}, { email: "a@b.co" }]) assert.equal(auth.normalizeAccount(raw), null);
  assert.equal(auth.normalizeSession({ email: "" }), null);
});

test("the pre-paint gate lets a signed-in visitor through and sends others on", () => {
  const run = (path, search = "") => {
    let went = null;
    const html = { style: {} };
    const fn = new Function("location", "localStorage", "document", auth.AUTH_PREPAINT);
    fn({ pathname: path, search, replace: (u) => (went = u) }, globalThis.localStorage, { documentElement: html });
    return went;
  };
  assert.equal(run("/projects", "?utm_source=yt"), "/sign-up?utm_source=yt");
  assert.equal(run("/sign-up"), null);
  store.set(auth.ACCOUNT_KEY, JSON.stringify({ email: "a@b.co", verifiedAt: null }));
  assert.equal(run("/projects"), "/sign-up/check-email");
  store.set(auth.ACCOUNT_KEY, JSON.stringify({ email: "a@b.co", verifiedAt: NOW }));
  assert.equal(run("/projects"), "/sign-in");
  store.set(auth.SESSION_KEY, JSON.stringify({ v: 1, email: "a@b.co", at: NOW }));
  assert.equal(run("/projects"), null);
});
