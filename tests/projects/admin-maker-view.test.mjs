// Admin › Maker preview (owner, 2026-11-11): what makers see of the admin's
// prices, live now or once the draft is published, and why the draft can't be
// shown while Publish is blocked.
import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../../.tmp-test/lib/admin/credit-pricing.js");
const M = await import("../../.tmp-test/lib/admin/maker-view.js");

const withDraft = (doc, change) => ({ ...doc, draft: change(doc.draft) });
const service = (view, key) => view.groups.flatMap((g) => g.services).find((s) => s.key === key);

test("live: the demo's shown packs cheapest first, the levels on, the services but builds", () => {
  const { prices, held, waiting } = M.previewPrices(P.seedPricingDoc(), "live");
  assert.equal(held, null);
  assert.equal(waiting, 4);
  const view = M.makerView(prices);
  assert.deepEqual(
    view.packs.map((p) => [p.name, p.priceUsd, p.total, p.popular]),
    [
      ["Starter", 5, 1570, false],
      ["Basic", 10, 3290, false],
      ["Pro", 25, 8640, true],
      ["Studio", 50, 18070, false],
      ["Team", 100, 36150, false],
    ],
  );
  assert.deepEqual(view.hiddenPacks, []);
  assert.deepEqual(
    view.levels.map((l) => [l.id, l.credits, l.dailyLimit]),
    [
      ["free", 0, 3],
      ["low", 446, 0],
      ["medium", 1002, 0],
      ["high", 2743, 10],
    ],
  );
  assert.deepEqual(view.hiddenLevels, ["Max"]);
  assert.equal(view.groups.some((g) => g.id === "build"), false);
  assert.equal(view.groups.flatMap((g) => g.services).length, 15);
  assert.equal(service(view, "ai_image_generation").credits, 36);
  assert.deepEqual(view.custom, { enabled: true, min: 315, max: 0 });
});

test("next: the draft as Publish would make it, the live prices untouched", () => {
  const doc = P.seedPricingDoc();
  const { prices, held, waiting } = M.previewPrices(doc, "next");
  assert.equal(held, null);
  assert.equal(waiting, 4);
  const view = M.makerView(prices);
  assert.equal(service(view, "ai_image_generation").credits, 32);
  assert.equal(service(view, "ai_pcb_edit").credits, 42);
  assert.equal(view.levels.find((l) => l.id === "medium").credits, 1085);
  assert.deepEqual(prices, P.publishPricing(doc, 0, "").published);
  assert.equal(doc.published.services.ai_image_generation, 36);
});

test("next while Publish is blocked: today's prices, and why", () => {
  const doc = withDraft(P.seedPricingDoc(), (d) => ({ ...d, services: { ...d.services, ai_video: { cost: "abc", profit: "" } } }));
  const { prices, held } = M.previewPrices(doc, "next");
  assert.equal(held, "Fix the fields marked in red first.");
  assert.equal(prices, doc.published);
  assert.equal(M.previewPrices(doc, "live").held, null);
});

test("nothing waiting: next is the live prices, with nothing held", () => {
  const doc = P.publishPricing(P.seedPricingDoc(), 1, "Demo Admin");
  const { prices, held, waiting } = M.previewPrices(doc, "next");
  assert.equal(waiting, 0);
  assert.equal(held, null);
  assert.equal(prices, doc.published);
});

test("a hidden pack and a level turned off leave the maker's view", () => {
  const doc = withDraft(P.seedPricingDoc(), (d) => ({
    ...d,
    packs: d.packs.map((p) => (p.name === "Studio" ? { ...p, visible: false } : p)),
    quality: { ...d.quality, high: { ...d.quality.high, enabled: false }, max: { ...d.quality.max, enabled: true } },
  }));
  const view = M.makerView(M.previewPrices(doc, "next").prices);
  assert.deepEqual(view.packs.map((p) => p.name), ["Starter", "Basic", "Pro", "Team"]);
  assert.deepEqual(view.hiddenPacks, ["Studio"]);
  assert.deepEqual(view.levels.map((l) => l.id), ["free", "low", "medium", "max"]);
  assert.deepEqual(view.hiddenLevels, ["High"]);
});

test("a pack's coin prices follow the credit's", () => {
  const view = M.makerView(P.seedPricingDoc().published);
  assert.equal(M.packCoinPrice(view, 25, "USDT"), (25 / view.creditUsd) * view.usdtPerCredit);
  assert.ok(Math.abs(M.packCoinPrice(view, 25, "USDT") - 25) < 1e-9);
  assert.ok(Math.abs(M.packCoinPrice(view, 25, "IDZ") - (25 / view.creditUsd) * view.idzPerCredit) < 1e-9);
  assert.equal(M.packCoinPrice({ ...view, creditUsd: 0 }, 25, "IDZ"), 0);
});
