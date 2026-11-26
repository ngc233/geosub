import assert from "node:assert/strict";
import test from "node:test";
import { countInStartValue, numberMotionProgress, parseNumberMotion } from "./public-number-motion.ts";
import tokens from "../design/design-tokens.json" with { type: "json" };

test("number interpolation follows the shared CSS curve with exact endpoints", () => {
  const motion = parseNumberMotion(tokens.motion.slow, tokens.motion.ease)!;
  assert.equal(motion.ms, 480);
  assert.equal(numberMotionProgress(0, motion.curve), 0);
  assert.equal(numberMotionProgress(1, motion.curve), 1);
  let previous = 0;
  for (let step = 1; step < 100; step++) {
    const value = numberMotionProgress(step / 100, motion.curve);
    assert.ok(value > previous && value < 1);
    previous = value;
  }
  assert.ok(numberMotionProgress(.5, motion.curve) > .8);
  assert.deepEqual(parseNumberMotion(".48s", tokens.motion.ease), motion);
});

test("missing or malformed motion tokens cause instant final-value rendering", () => {
  for (const [time, curve] of [["", ""], ["0ms", "linear"], ["480ms", "cubic-bezier(1,2)"], ["480ms", "cubic-bezier(a,b,c,d)"]]) {
    assert.equal(parseNumberMotion(time, curve), null);
  }
});

test("countInStartValue keeps decimal digit width stable while providing visible upward motion", () => {
  assert.equal(countInStartValue(0), 0);
  assert.equal(countInStartValue(7, 0), 0);
  const cnyStart = countInStartValue(137.73, 2);
  assert.ok(cnyStart >= 100 && cnyStart < 137.73);
  const usdStart = countInStartValue(19.99, 2);
  assert.ok(usdStart >= 10 && usdStart < 19.99);
  const pctStart = countInStartValue(54, 0);
  assert.ok(pctStart >= 10 && pctStart < 54 && Number.isInteger(pctStart));
});
