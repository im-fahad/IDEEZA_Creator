// Admin › AI credit pricing (owner, 2026-11-10): real costs and a profit in,
// every service's credits out. The formula, the lowest effective credit price,
// rounding, the currencies, what Publish changes, and what a broken store reads as.
import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../../.tmp-test/lib/admin/credit-pricing.js");

/** The formula's tests start from today's backend: no costs typed, nothing published yet. */
const doc = (change = (d) => d) => change(P.backendPricingDoc());
const withSettings = (over) => (d) => ({ ...d, draft: { ...d.draft, settings: { ...d.draft.settings, ...over } } });
const withCost = (key, cost, profit = "") => (d) => ({
  ...d,
  draft: { ...d.draft, services: { ...d.draft.services, [key]: { cost, profit } } },
});
const withLevel = (level, over) => (d) => ({
  ...d,
  draft: { ...d.draft, quality: { ...d.draft.quality, [level]: { ...d.draft.quality[level], ...over } } },
});
const withCustom = (over) => (d) => ({ ...d, draft: { ...d.draft, custom: { ...d.draft.custom, ...over } } });
/** One pack, already published as the draft works it out ($10 at $0.00318: 3,140 + 5% = 150). */
const withBasicPack = (d) => ({
  ...d,
  draft: { ...d.draft, packs: [{ id: "p-basic", name: "Basic", price: "10.00", visible: true, popular: false }] },
  published: { ...d.published, packs: [{ id: "p-basic", name: "Basic", priceUsd: 10, base: 3140, bonus: 150, visible: true, popular: false }] },
});
const pipe = (...fns) => (d) => fns.reduce((acc, f) => f(acc), d);
const row = (plan, key) => plan.services.find((r) => r.id === key);

test("today's backend: 17 services at 10 credits, five levels, $1 = 314.47 credits", () => {
  const d = P.backendPricingDoc();
  assert.equal(P.AI_SERVICES.length, 17);
  assert.equal(new Set(P.AI_SERVICES.map((s) => s.key)).size, 17, "no key twice");
  for (const s of P.AI_SERVICES) assert.equal(d.published.services[s.key], 10, s.key);
  assert.deepEqual(d.published.quality, { free: 0, low: 250, medium: 600, high: 1500, max: 4000 });
  assert.equal(P.creditsPerUnit(d.published.creditUsd), "314.47");
  assert.equal(d.history.length, 0);
  for (const s of P.AI_SERVICES) assert.ok(P.SERVICE_GROUPS.some((g) => g.id === s.group), `${s.key} has a group`);
  assert.deepEqual(d.published.custom, { enabled: true, min: 315, max: 0 }, "the live admin's Custom Credit");
  assert.deepEqual(d.published.available, { free: true, low: true, medium: true, high: true, max: true }, "the live admin has no switch: every level is on");
  for (const q of P.QUALITY_LEVELS) assert.equal(d.draft.quality[q.id].enabled, true);
  assert.deepEqual(d.draft.custom, { enabled: true, min: "315", max: "0" });
});

test("the demo: every field filled, two publishes from the backend's prices, four changes waiting, every price on target", () => {
  const d = P.seedPricingDoc();
  for (const s of P.AI_SERVICES) assert.ok(P.parseAmount(d.draft.services[s.key].cost) > 0, `${s.key} has a cost`);
  for (const q of P.QUALITY_LEVELS) assert.ok(P.parseAmount(d.draft.quality[q.id].cost) > 0, `${q.id} has a cost`);
  assert.deepEqual(
    d.history.map((h) => h.by),
    ["Daniel Okafor", "Maya Chen"],
    "newest first",
  );
  assert.ok(d.history[0].at > d.history[1].at);
  const first = d.history[1].changes;
  assert.ok(first.some((c) => c.label === "AI image generation" && c.from === "10 credits"), "the first publish replaced the test prices");
  assert.ok(first.some((c) => c.label === "Free builds a day" && c.to === "3 a day"));
  for (const s of P.AI_SERVICES) assert.notEqual(d.published.services[s.key], 10, `${s.key} has a real price`);
  const plan = P.pricingPlan(d);
  assert.equal(plan.blocked, null, "Publish is ready");
  assert.equal(plan.missing, 0);
  assert.equal(plan.losses, 0);
  assert.equal(plan.belowTarget, 0);
  assert.equal(plan.changes.length, 4);
  for (const r of [...plan.services, ...plan.quality]) assert.ok(r.status === "ok" || r.status === "free", `${r.label}: ${r.status}`);
  for (const r of plan.services) assert.equal(r.ownProfit, true, `${r.label} has its own profit`);
  for (const q of P.QUALITY_LEVELS.filter((l) => l.id !== "free")) assert.ok(P.parseAmount(d.draft.quality[q.id].profit) > 0, `${q.id} has its own profit`);
  assert.deepEqual(d.published.custom, { enabled: true, min: 315, max: 0 }, "the demo leaves Custom credit as the live admin has it");
  assert.equal(plan.custom.minError, null);
  assert.equal(plan.custom.maxError, null);
  assert.deepEqual(d.published.available, { free: true, low: true, medium: true, high: true, max: false }, "Max is off until a plan offers it");
  assert.deepEqual(d.published.dailyLimits, { free: 3, low: 0, medium: 0, high: 10, max: 2 });
  assert.ok(first.some((c) => c.label === "Max quality level" && c.from === "On" && c.to === "Off"), "the first publish turned Max off");
  assert.ok(first.some((c) => c.label === "High builds a day" && c.to === "10 a day"));
  assert.ok(plan.quality.every((q) => q.enabled === q.currentEnabled), "no switch waits to publish");
});

test("the lowest a credit sells for: the biggest discount, then the biggest pack bonus", () => {
  const d = doc(withSettings({ creditUsd: "0.01", maxDiscountPct: "35", maxBonusPct: "15" }));
  const { rates } = P.checkSettings(d.draft.settings);
  assert.ok(Math.abs(rates.lowestCreditUsd - (0.01 * 0.65) / 1.15) < 1e-12);
  assert.equal(rates.basisUsd, rates.lowestCreditUsd, "the default protects the profit at the lowest price");
  const list = P.checkSettings({ ...d.draft.settings, basis: "list" }).rates;
  assert.equal(list.basisUsd, 0.01);
});

test("credits: cost plus profit, counted at the basis, rounded up — never down, never 0", () => {
  assert.equal(P.creditsFor(0.04, 50, 0.01, 1), 6);
  assert.equal(P.creditsFor(0.04, 50, (0.01 * 0.65) / 1.15, 1), 11, "$0.06 at $0.00565 a credit is 10.6, so 11");
  assert.equal(P.creditsFor(0.04, 50, 0.01, 5), 10);
  assert.equal(P.creditsFor(0.1, 0, 0.01, 1), 10, "a float a hair over 10 stays 10");
  assert.equal(P.creditsFor(0, 50, 0.01, 1), 1, "a run is never free");
  assert.equal(P.creditsFor(0, 50, 0.01, 10), 10, "nor less than one step");
});

test("a row: what a maker pays, what we get at the lowest price, and the profit left", () => {
  const plan = P.pricingPlan(doc(pipe(withSettings({ creditUsd: "0.01" }), withCost("ai_video", "0.04"))));
  const r = row(plan, "ai_video");
  assert.equal(r.next, 11);
  assert.ok(Math.abs(r.listUsd - 0.11) < 1e-12);
  assert.ok(r.profitOnCostPct >= 50, "at least the profit asked for");
  assert.equal(r.status, "ok");
  assert.equal(row(plan, "ai_freerouting").status, "missing");
  assert.equal(row(plan, "ai_freerouting").next, null, "no cost keeps today's price");
});

test("priced at list, a deep discount shows as below the target or a loss", () => {
  const mild = withSettings({ creditUsd: "0.01", basis: "list", maxDiscountPct: "10", maxBonusPct: "0" });
  const below = row(P.pricingPlan(doc(pipe(mild, withCost("ai_video", "0.04")))), "ai_video");
  assert.equal(below.next, 6);
  assert.equal(below.status, "below-target", "6 credits at $0.009 is $0.054: 35% on a $0.04 run, not 50%");
  assert.ok(below.profitUsd > 0);
  const deep = withSettings({ creditUsd: "0.01", basis: "list", maxDiscountPct: "35", maxBonusPct: "15" });
  const loss = row(P.pricingPlan(doc(pipe(deep, withCost("ai_video", "0.04")))), "ai_video");
  assert.equal(loss.next, 6);
  assert.equal(loss.status, "loss", "6 credits at $0.00565 is $0.034 for a $0.04 run");
  assert.ok(loss.profitUsd < 0);
});

test("a service's own profit wins over the global one", () => {
  const plan = P.pricingPlan(doc(pipe(withSettings({ creditUsd: "0.01", basis: "list" }), withCost("ai_patent", "1", "100"))));
  const r = row(plan, "ai_patent");
  assert.equal(r.ownProfit, true);
  assert.equal(r.profitPct, 100);
  assert.equal(r.next, 200);
});

test("USDT follows the dollar and IDZ the IDZ price, unless set by hand", () => {
  const auto = P.checkSettings(doc(withSettings({ creditUsd: "0.01", idzUsd: "0.025" })).draft.settings).rates;
  assert.equal(auto.usdtPerCredit, 0.01);
  assert.ok(Math.abs(auto.idzPerCredit - 0.4) < 1e-12);
  const hand = P.checkSettings(
    doc(withSettings({ creditUsd: "0.01", usdtAuto: false, usdtPerCredit: "0.011", idzAuto: false, idzPerCredit: "2" })).draft.settings,
  ).rates;
  assert.equal(hand.usdtPerCredit, 0.011);
  assert.equal(hand.idzPerCredit, 2);
});

test("a wrong setting stops every price and Publish, and says which field", () => {
  for (const [field, value] of [["creditUsd", "0"], ["creditUsd", "abc"], ["profitPct", ""], ["maxDiscountPct", "95"], ["idzUsd", "-1"]]) {
    const plan = P.pricingPlan(doc(withSettings({ [field]: value })));
    assert.equal(plan.rates, null, `${field}=${value}`);
    assert.ok(plan.errors[field], `${field} names its error`);
    assert.ok(plan.blocked);
  }
  assert.equal(P.checkSettings(doc(withSettings({ idzAuto: false, idzUsd: "nope" })).draft.settings).errors.idzUsd, undefined, "a hidden field is not checked");
});

test("quality levels: free is always 0 credits and its cost is ours; the daily limit is a whole number", () => {
  const plan = P.pricingPlan(
    doc(pipe(withSettings({ creditUsd: "0.01", basis: "list" }), withLevel("free", { cost: "0.2", dailyLimit: "3" }), withLevel("low", { cost: "1" }))),
  );
  const free = plan.quality.find((q) => q.level === "free");
  assert.equal(free.next, 0);
  assert.equal(free.status, "free");
  assert.ok(Math.abs(free.profitUsd + 0.2) < 1e-12);
  assert.equal(plan.quality.find((q) => q.level === "low").next, 150);
  assert.ok(plan.changes.some((c) => c.label === "Free builds a day" && c.to === "3 a day"));
  const bad = P.pricingPlan(doc(withLevel("free", { dailyLimit: "1.5" })));
  assert.equal(bad.quality.find((q) => q.level === "free").dailyLimitError, "Enter a whole number");
  assert.ok(bad.blocked);
});

test("quality levels: each can be turned off and given its own daily limit; one must stay on", () => {
  const asToday = withSettings({ usdtAuto: false, usdtPerCredit: "0.0032", idzAuto: false, idzPerCredit: "5" });
  const d = doc(pipe(asToday, withLevel("max", { enabled: false }), withLevel("high", { dailyLimit: "10" })));
  const plan = P.pricingPlan(d);
  assert.equal(plan.blocked, null);
  assert.deepEqual(plan.changes, [
    { label: "High builds a day", from: "No limit", to: "10 a day" },
    { label: "Max quality level", from: "On", to: "Off" },
  ]);
  const max = plan.quality.find((q) => q.level === "max");
  assert.equal(max.next, null, "a level that's off keeps its price: no cost typed");
  const after = P.publishPricing(d, 1000, "Abdullah Al Fahad");
  assert.equal(after.published.available.max, false);
  assert.equal(after.published.available.high, true);
  assert.equal(after.published.dailyLimits.high, 10);
  assert.equal(after.published.quality.max, 4000, "its price is kept for when it's back on");
  const back = P.pricingPlan({ ...after, draft: { ...after.draft, quality: { ...after.draft.quality, max: { ...after.draft.quality.max, enabled: true } } } });
  assert.deepEqual(back.changes, [{ label: "Max quality level", from: "Off", to: "On" }]);
  const allOff = doc((x) => P.QUALITY_LEVELS.reduce((acc, l) => withLevel(l.id, { enabled: false })(acc), x));
  const none = P.pricingPlan(allOff);
  assert.equal(none.qualityError, "Keep at least one level on, or makers can't start a build.");
  assert.equal(none.blocked, "Fix the fields marked in red first.");
  assert.equal(P.pricingPlan(doc(withLevel("medium", { dailyLimit: "1001" }))).quality.find((q) => q.level === "medium").dailyLimitError, "Enter 0 to 1000");
});

test("Publish: the new prices become today's, the history records them, and an unchanged plan is refused", () => {
  const d = doc(pipe(withSettings({ creditUsd: "0.01", usdtAuto: false, usdtPerCredit: "0.01", idzAuto: false, idzPerCredit: "0.4" }), withCost("ai_video", "0.04")));
  const plan = P.pricingPlan(d);
  assert.equal(plan.blocked, null);
  assert.deepEqual(plan.changes.find((c) => c.label === "Product video"), { label: "Product video", from: "10 credits", to: "11 credits" });
  const after = P.publishPricing(d, 1000, "Abdullah Al Fahad");
  assert.equal(after.published.services.ai_video, 11);
  assert.equal(after.published.services.ai_patent, 10, "a service with no cost keeps its price");
  assert.equal(after.published.creditUsd, 0.01);
  assert.equal(after.history.length, 1);
  assert.equal(after.history[0].by, "Abdullah Al Fahad");
  assert.match(after.history[0].basis, /^50% markup at the lowest effective credit price, \$0\.00565 a credit, rounded up to whole credits$/);
  assert.equal(P.pricingPlan(after).blocked, "Nothing has changed since the last publish.");
  assert.equal(P.publishPricing(after, 2000, "x"), after, "a blocked publish changes nothing");
});

test("custom credit: a minimum of 1 or more, a maximum of 0 (no limit) or at least the minimum", () => {
  const plan = (over) => P.pricingPlan(doc(withCustom(over))).custom;
  assert.deepEqual(
    { min: plan({}).min, max: plan({}).max, minError: plan({}).minError, maxError: plan({}).maxError },
    { min: 315, max: 0, minError: null, maxError: null },
  );
  assert.equal(plan({ min: "" }).minError, "Enter 1 or more");
  assert.equal(plan({ min: "0" }).minError, "Enter 1 to 2,147,483,647");
  assert.equal(plan({ min: "12.5" }).minError, "Enter a whole number");
  assert.equal(plan({ max: "" }).maxError, "Enter 0 for no limit");
  assert.equal(plan({ max: "100" }).maxError, "Enter 0 for no limit, or 315 or more");
  assert.equal(plan({ max: "315" }).maxError, null, "the same number is a fixed amount");
  assert.equal(plan({ max: "0", min: "5000" }).maxError, null, "0 is no limit, whatever the minimum");
  assert.equal(plan({ max: "100", min: "" }).maxError, null, "with no minimum to compare, only the minimum is wrong");
  const bad = P.pricingPlan(doc(withCustom({ max: "100" })));
  assert.equal(bad.blocked, "Fix the fields marked in red first.");
  assert.equal(P.formatPurchaseMax(0), "No limit");
  assert.equal(P.formatPurchaseMax(1000), "1,000 credits");
});

test("custom credit: a change waits for Publish like a price, and Publish makes it current", () => {
  const asToday = withSettings({ usdtAuto: false, usdtPerCredit: "0.0032", idzAuto: false, idzPerCredit: "5" });
  const d = doc(pipe(asToday, withBasicPack, withCustom({ enabled: false, min: "500", max: "25000" })));
  const plan = P.pricingPlan(d);
  assert.equal(plan.blocked, null, "a custom credit change alone can be published");
  assert.deepEqual(plan.changes, [
    { label: "Custom credit", from: "On", to: "Off" },
    { label: "Minimum purchase limit", from: "315 credits", to: "500 credits" },
    { label: "Maximum purchase limit", from: "No limit", to: "25,000 credits" },
  ]);
  const after = P.publishPricing(d, 1000, "Abdullah Al Fahad");
  assert.deepEqual(after.published.custom, { enabled: false, min: 500, max: 25000 });
  assert.equal(after.history[0].changes.length, 3);
  assert.equal(after.published.services.ai_video, 10, "the prices are untouched");
  assert.equal(P.pricingPlan(after).blocked, "Nothing has changed since the last publish.");
});

test("what was stored reads part by part: a broken part is today's, the rest is kept", () => {
  assert.deepEqual(P.normalizePricingDoc(null), P.seedPricingDoc());
  assert.deepEqual(P.normalizePricingDoc("junk"), P.seedPricingDoc());
  const old = { ...P.backendPricingDoc(), v: 1 };
  assert.deepEqual(P.normalizePricingDoc(old), P.seedPricingDoc(), "a doc from before the demo reads as the demo");
  const kept = P.normalizePricingDoc({
    v: P.PRICING_DOC_VERSION,
    draft: { settings: { creditUsd: "0.02", basis: "sideways", rounding: 7 }, services: { ai_video: { cost: "0.5", profit: 3 } } },
    published: { creditUsd: -1, services: { ai_video: 12, ai_patent: 1.5 }, quality: { free: 9, low: 300 } },
    history: [{ at: 5, by: "A", basis: "b", changes: [{ label: "x", from: "1", to: "2" }, { label: 1 }] }, "nope"],
  });
  assert.deepEqual(kept.draft.custom, P.seedPricingDoc().draft.custom, "a doc from before Custom credit gets today's");
  assert.deepEqual(kept.published.custom, { enabled: true, min: 315, max: 0 });
  const custom = P.normalizePricingDoc({
    v: P.PRICING_DOC_VERSION,
    draft: { custom: { enabled: "yes", min: 50, max: "900" } },
    published: { custom: { enabled: false, min: 0, max: 1.5 } },
  });
  assert.deepEqual(custom.draft.custom, { enabled: true, min: "315", max: "900" }, "each field on its own");
  assert.deepEqual(custom.published.custom, { enabled: false, min: 315, max: 0 }, "a minimum of 0 and a part credit are today's");
  assert.deepEqual(kept.published.available, { free: true, low: true, medium: true, high: true, max: true }, "a doc from before the switch: every level on");
  assert.equal(kept.draft.quality.max.enabled, true, "and nothing waits");
  const levels = P.normalizePricingDoc({
    v: P.PRICING_DOC_VERSION,
    draft: { quality: { low: { cost: "1", enabled: "no" }, high: { enabled: true } } },
    published: { available: { low: false, high: false, max: "off" } },
  });
  assert.equal(levels.published.available.low, false);
  assert.equal(levels.published.available.max, true, "not a yes/no: on");
  assert.equal(levels.draft.quality.low.enabled, false, "a broken switch reads as published");
  assert.equal(levels.draft.quality.high.enabled, true, "a draft switch is kept");
  assert.equal(kept.draft.settings.creditUsd, "0.02");
  assert.equal(kept.draft.settings.basis, "lowest");
  assert.equal(kept.draft.settings.rounding, 1);
  assert.deepEqual(kept.draft.services.ai_video, { cost: "0.5", profit: "" });
  assert.equal(kept.published.creditUsd, 0.00318);
  assert.equal(kept.published.services.ai_video, 12);
  assert.equal(kept.published.services.ai_patent, P.seedPricingDoc().published.services.ai_patent, "not a whole number of credits");
  assert.equal(kept.published.quality.free, 0, "free is never priced");
  assert.equal(kept.published.quality.low, 300);
  assert.equal(kept.history.length, 1);
  assert.equal(kept.history[0].changes.length, 1);
});

test("money on screen: cents from a cent up, enough decimals below one", () => {
  assert.equal(P.formatUsd(0.00318), "$0.00318");
  assert.equal(P.formatUsd(0.0318), "$0.0318");
  assert.equal(P.formatUsd(0.5), "$0.50");
  assert.equal(P.formatUsd(1234.5), "$1,234.50");
  assert.equal(P.formatUsd(-0.034), "−$0.034");
  assert.equal(P.formatUsd(0), "$0.00");
  assert.equal(P.formatCoin(0.4, "IDZ"), "0.40 IDZ");
  assert.equal(P.formatPercent(-100), "−100%", "the same minus as the dollars");
  assert.equal(P.formatPercent(52.83), "52.8%");
  assert.equal(P.formatCredits(1), "1 credit");
  assert.equal(P.formatCredits(1500), "1,500 credits");
  assert.equal(P.parseAmount("1."), 1);
  assert.equal(P.parseAmount(".5"), 0.5);
  assert.equal(P.parseAmount("1,5"), null);
  assert.equal(P.parseAmount("-1"), null);
});

// ── Credit packs (owner, 2026-11-11): a name and a price in; base, bonus and total out ──

const K = await import("../../.tmp-test/lib/admin/credit-packs.js");
const withPacks = (packs) => (d) => ({ ...d, draft: { ...d.draft, packs } });
const withRules = (over) => (d) => ({ ...d, draft: { ...d.draft, packRules: { ...d.draft.packRules, ...over } } });
const draftPack = (id, name, price, over = {}) => ({ id, name, price, visible: true, popular: false, ...over });
const packRow = (plan, name) => plan.packs.rows.find((r) => r.name === name);

test("a pack's credits: its price at the list price, rounded down, plus its tier's bonus, rounded down", () => {
  assert.deepEqual(K.packCredits(10, 0.00318, 5, 10), { base: 3140, bonus: 150 }, "3,144.65 → 3,140; 5% = 157 → 150");
  assert.deepEqual(K.packCredits(10, 0.00318, 5, 1), { base: 3144, bonus: 157 });
  assert.deepEqual(K.packCredits(3.18, 0.00318, 0, 1), { base: 1000, bonus: 0 }, "999.9999… is 1,000, not 999");
  const tiers = K.checkTiers([{ from: "0", pct: "0" }, { from: "10", pct: "5" }, { from: "25", pct: "10" }], 15);
  assert.equal(K.bonusPctFor(9.99, tiers), 0);
  assert.equal(K.bonusPctFor(10, tiers), 5, "a tier's own price reaches it");
  assert.equal(K.bonusPctFor(500, tiers), 10);
  assert.equal(K.minPriceFor(315, 0.00318, 1), 1.01, "$1.00 is 314 credits");
  assert.equal(K.minPriceFor(315, 0.00318, 10), 1.02, "rounded to tens it takes 320: $1.02");
  assert.equal(K.formatDeal(25, 8640), "$25.00 for 8,640 credits");
});

test("the demo's packs: five, published as worked out, Pro the most popular, nothing waiting", () => {
  const d = P.seedPricingDoc();
  assert.deepEqual(
    d.published.packs.map((p) => [p.name, p.priceUsd, p.base, p.bonus, p.base + p.bonus]),
    [
      ["Starter", 5, 1570, 0, 1570],
      ["Basic", 10, 3140, 150, 3290],
      ["Pro", 25, 7860, 780, 8640],
      ["Studio", 50, 15720, 2350, 18070],
      ["Team", 100, 31440, 4710, 36150],
    ],
  );
  assert.deepEqual(d.published.packs.filter((p) => p.popular).map((p) => p.name), ["Pro"]);
  const plan = P.pricingPlan(d);
  assert.ok(plan.packs.rows.every((r) => r.status === "same" && !r.minError), "nothing waits on the packs");
  assert.equal(plan.changes.length, 4, "the same four changes wait");
  const first = d.history[1].changes;
  assert.ok(first.some((c) => c.label === "Pro pack" && c.from === "Not sold" && c.to === "$25.00 for 8,640 credits"));
  assert.ok(first.some((c) => c.label === "Most popular pack" && c.from === "None" && c.to === "Pro"));
  assert.ok(d.history[0].changes.some((c) => c.label === "Team pack" && c.to === "$100.00 for 36,150 credits"), "Daniel added Team");
  const studio = packRow(plan, "Studio");
  assert.equal(studio.bonusPct, 15);
  assert.equal(P.formatPercent(studio.offListPct), "13%", "$50 ÷ 18,070 = $0.00277 a credit, 13% under $0.00318");
  assert.deepEqual(P.backendPricingDoc().published.packs, [], "the live packs are test data: the backend's doc has none");
});

test("bonus tiers: each from more dollars, never a smaller bonus, none above the maximum pack bonus", () => {
  const rows = (tiers, max = 15) => K.checkTiers(tiers, max);
  const ok = rows([{ from: "0", pct: "0" }, { from: "10", pct: "5" }]);
  assert.ok(ok.every((t) => !t.fromError && !t.pctError));
  assert.equal(rows([{ from: "7", pct: "0" }])[0].from, 0, "the first tier is from $0, whatever was typed");
  assert.equal(rows([{ from: "0", pct: "0" }, { from: "10", pct: "5" }, { from: "10", pct: "8" }])[2].fromError, "Enter more than $10.00, the tier above");
  assert.equal(rows([{ from: "0", pct: "0" }, { from: "9.999", pct: "5" }])[1].fromError, "Enter dollars and cents, like 9.99");
  assert.equal(rows([{ from: "0", pct: "0" }, { from: "10", pct: "20" }])[1].pctError, "Enter 0 to 15: the maximum pack bonus is 15%");
  assert.equal(rows([{ from: "0", pct: "5" }, { from: "10", pct: "2" }])[1].pctError, "Enter 5 or more: a bigger pack never gets a smaller bonus");
  const seed = P.seedPricingDoc();
  const lowered = P.pricingPlan({ ...seed, draft: { ...seed.draft, settings: { ...seed.draft.settings, maxBonusPct: "10" } } });
  assert.equal(lowered.packs.tiers[3].pctError, "Enter 0 to 10: the maximum pack bonus is 10%", "lowering the maximum pack bonus catches the tier above it");
  assert.equal(lowered.blocked, "Fix the credit packs first.");
  assert.equal(packRow(lowered, "Studio").total, null, "a pack waits while a tier is wrong");
});

test("a pack's fields: a name of its own, dollars and cents, and at least the minimum purchase unless hidden", () => {
  const plan = (packs, ...more) => P.pricingPlan(doc(pipe(withPacks(packs), ...more)));
  const p = plan([draftPack("a", " Basic ", "10"), draftPack("b", "basic", "20"), draftPack("c", "", "5"), draftPack("d", "Odd", "4.999")]);
  assert.equal(p.packs.rows.find((r) => r.id === "a").nameError, "Another pack has this name", "names match whatever their case");
  assert.equal(p.packs.rows.find((r) => r.id === "a").name, "Basic", "trimmed");
  assert.equal(p.packs.rows.find((r) => r.id === "c").nameError, "Enter a name");
  assert.equal(p.packs.rows.find((r) => r.id === "d").priceError, "Enter dollars and cents, like 9.99");
  assert.equal(plan([draftPack("a", "A", "")]).packs.rows[0].priceError, "Enter a price");
  assert.equal(plan([draftPack("a", "A", "10001")]).packs.rows[0].priceError, "Enter more than $0, up to $10,000.00");
  const small = plan([draftPack("a", "Tiny", "0.50")]);
  assert.equal(small.packs.rows[0].base, 150);
  assert.equal(small.packs.rows[0].minError, "Fewer than 315 credits, the minimum purchase. Raise the price to $1.02 or more, or hide the pack.");
  assert.equal(small.blocked, "Fix the credit packs first.");
  const hidden = plan([draftPack("a", "Tiny", "0.50", { visible: false })]);
  assert.equal(hidden.packs.rows[0].minError, null, "a hidden pack isn't sold, so it may stay below");
  assert.deepEqual(hidden.packs.rows[0].belowMin, { minBase: 315, minPrice: 1.02 });
  const noMin = plan([draftPack("a", "Tiny", "0.02")], withCustom({ min: "1" }));
  assert.match(noMin.packs.rows[0].minError, /^Fewer than 10 credits, the least a pack can hold\./, "10 base credits at least, as the live admin");
  const none = plan([draftPack("a", "A", "10", { visible: false })], withCustom({ enabled: false }));
  assert.equal(none.packs.error, "Makers can't buy credits: show a pack, or turn Custom credit on.");
  assert.equal(plan([], withCustom({ enabled: true })).packs.error, null, "custom credit alone is a way to buy");
  assert.deepEqual(plan([draftPack("b", "B", "30"), draftPack("a", "A", "10"), draftPack("c", "C", "")]).packs.rows.map((r) => r.id), ["a", "b", "c"], "cheapest first, no price last");
});

test("pack changes wait for Publish: added, repriced, renamed, hidden, removed, the most popular", () => {
  const start = P.seedPricingDoc();
  const packs = start.draft.packs
    .filter((p) => p.id !== "pack-team")
    .map((p) => (p.id === "pack-basic" ? { ...p, price: "12.00" } : p.id === "pack-studio" ? { ...p, name: "Studio plus", visible: false } : p))
    .concat(draftPack("pack-new", "Lab", "250.00"));
  const d = { ...start, draft: { ...start.draft, packs: K.withPopular(packs, "pack-new") } };
  const plan = P.pricingPlan(d);
  const packChanges = plan.changes.slice(4);
  assert.deepEqual(packChanges, [
    { label: "Basic pack", from: "$10.00 for 3,290 credits", to: "$12.00 for 3,950 credits" },
    { label: "Pack name", from: "Studio", to: "Studio plus" },
    { label: "Studio plus pack", from: "Shown", to: "Hidden" },
    { label: "Lab pack", from: "Not sold", to: "$250.00 for 90,400 credits" },
    { label: "Team pack", from: "$100.00 for 36,150 credits", to: "Removed" },
    { label: "Most popular pack", from: "Pro", to: "Lab" },
  ]);
  assert.equal(packRow(plan, "Lab").status, "new");
  assert.equal(packRow(plan, "Basic").status, "changed");
  assert.equal(packRow(plan, "Starter").status, "same");
  const after = P.publishPricing(d, 1000, "Abdullah Al Fahad");
  assert.deepEqual(after.published.packs.map((p) => p.name), ["Starter", "Basic", "Pro", "Studio plus", "Lab"], "cheapest first");
  assert.equal(after.published.packs.find((p) => p.name === "Lab").popular, true);
  assert.equal(after.published.packs.find((p) => p.name === "Studio plus").visible, false);
  assert.equal(P.pricingPlan(after).blocked, "Nothing has changed since the last publish.");
});

test("a new credit price or rounding moves every pack's credits", () => {
  const start = P.seedPricingDoc();
  const pricier = P.pricingPlan({ ...start, draft: { ...start.draft, settings: { ...start.draft.settings, creditUsd: "0.004" } } });
  assert.deepEqual([packRow(pricier, "Basic").base, packRow(pricier, "Basic").bonus], [2500, 120]);
  assert.ok(pricier.changes.some((c) => c.label === "Basic pack" && c.to === "$10.00 for 2,620 credits"));
  const ones = P.pricingPlan(pipe(withRules({ step: 1 }))(start));
  assert.equal(packRow(ones, "Basic").total, 3144 + 157);
});

test("stored packs read part by part", () => {
  const seed = P.seedPricingDoc();
  const none = P.normalizePricingDoc({ v: P.PRICING_DOC_VERSION });
  assert.deepEqual(none.draft.packs, seed.draft.packs, "a doc from before the packs gets the demo's");
  assert.deepEqual(none.published.packs, seed.published.packs);
  assert.deepEqual(none.draft.packRules, seed.draft.packRules);
  const read = P.normalizePricingDoc({
    v: P.PRICING_DOC_VERSION,
    draft: {
      packs: [{ id: "a", name: "A", price: "5", popular: true }, { id: "a", name: "dup" }, "junk", { id: "b", name: "B", price: 9, visible: false, popular: true }],
      packRules: { tiers: [{ from: "3", pct: "1" }, { from: "20" }], step: 7 },
    },
    published: { packs: [{ id: "a", name: "A", priceUsd: 5, base: 1570, bonus: 0, popular: true }, { id: "x", name: "X", priceUsd: -1, base: 1, bonus: 0 }] },
  });
  assert.deepEqual(read.draft.packs, [
    { id: "a", name: "A", price: "5", visible: true, popular: true },
    { id: "b", name: "B", price: "", visible: false, popular: false },
  ], "a broken field is empty, an id twice keeps the first, one popular");
  assert.deepEqual(read.draft.packRules, { tiers: [{ from: "0", pct: "1" }, { from: "20", pct: "" }], step: 10 }, "the first tier is from $0; a step that isn't offered is the demo's");
  assert.deepEqual(read.published.packs, [{ id: "a", name: "A", priceUsd: 5, base: 1570, bonus: 0, visible: true, popular: true }]);
  assert.deepEqual(P.normalizePricingDoc({ v: P.PRICING_DOC_VERSION, draft: { packs: [] }, published: { packs: [] } }).draft.packs, [], "no packs stays no packs");
  assert.equal(K.newPackId(["pack-1"], 1), "pack-1-2");
});

test("info tips: every AI service, group and quality level says what it is", async () => {
  const H = await import("../../.tmp-test/lib/admin/credit-help.js");
  const blank = (t) => typeof t !== "string" || t.trim().length < 20;
  assert.deepEqual(P.AI_SERVICES.filter((s) => blank(H.SERVICE_HELP[s.key])).map((s) => s.key), [], "a service with no tip");
  assert.deepEqual(Object.keys(H.SERVICE_HELP).filter((k) => !P.AI_SERVICES.some((s) => s.key === k)), [], "a tip for a service the page doesn't list");
  assert.deepEqual(P.SERVICE_GROUPS.filter((g) => blank(H.GROUP_HELP[g.id])).map((g) => g.id), [], "a group with no tip");
  assert.deepEqual(P.QUALITY_LEVELS.filter((l) => blank(H.LEVEL_HELP[l.id])).map((l) => l.id), [], "a level with no tip");
  for (const unit of ["run", "build"]) {
    const cols = H.priceColumnHelp(unit);
    assert.equal(Object.keys(cols).length, 9, "one tip per column of the price table");
    assert.deepEqual(Object.entries(cols).filter(([, t]) => blank(t)).map(([k]) => k), []);
  }
  for (const table of [H.ACCESS_COLUMN_HELP, H.PACK_COLUMN_HELP, H.TIER_COLUMN_HELP, H.CHANGE_COLUMN_HELP]) {
    assert.deepEqual(Object.entries(table).filter(([, t]) => typeof t !== "string" || t.trim().length < 10).map(([k]) => k), []);
  }
  assert.match(H.priceColumnHelp("run").markup, /50% makes a \$1\.00 run cost the maker \$1\.50/, "the markup tip matches the Markup section's example");
});
