// Quality picked on Home (src/lib/create/quality.ts): the level a chat's
// concepts render at, and what each level changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_QUALITY,
  HORDE_STEPS,
  POLLINATIONS_SIZE,
  QUALITIES,
  QUALITY_INFO,
  cleanQuality,
} from "../../.tmp-test/lib/create/quality.js";

test("three levels, Medium by default, in the order the menu shows them", () => {
  assert.deepEqual(QUALITIES, ["low", "medium", "high"]);
  assert.equal(DEFAULT_QUALITY, "medium");
  assert.deepEqual(
    QUALITIES.map((q) => QUALITY_INFO[q].label),
    ["Low", "Medium", "High"],
  );
});

test("a chat from before the choice, or a bad value, renders at Medium", () => {
  assert.equal(cleanQuality(undefined), "medium");
  assert.equal(cleanQuality("ultra"), "medium");
  assert.equal(cleanQuality(3), "medium");
  assert.equal(cleanQuality("high"), "high");
  assert.equal(cleanQuality("low"), "low");
});

test("Medium is exactly what every render got before", () => {
  assert.equal(HORDE_STEPS.medium, 25);
  assert.deepEqual(POLLINATIONS_SIZE.medium, { width: 640, height: 480 });
});

test("each level is more work than the one below, and High stays in the free tier", () => {
  assert.ok(HORDE_STEPS.low < HORDE_STEPS.medium && HORDE_STEPS.medium < HORDE_STEPS.high);
  // Past 50 steps the horde wants kudos up front.
  assert.ok(HORDE_STEPS.high <= 50);
  for (const q of QUALITIES) {
    const { width, height } = POLLINATIONS_SIZE[q];
    assert.equal(width * 3, height * 4, `${q} keeps 4:3`);
  }
  assert.ok(POLLINATIONS_SIZE.low.width < POLLINATIONS_SIZE.high.width);
});
