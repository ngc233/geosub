import assert from "node:assert/strict";
import test from "node:test";
import { parseCarouselDuration } from "./carousel-duration.ts";
import tokens from "../design/design-tokens.json" with { type: "json" };

test("carousel source and production-minified time tokens are equivalent", () => {
  assert.equal(parseCarouselDuration("4500ms"), 4500);
  assert.equal(parseCarouselDuration("4.5s"), 4500);
  assert.equal(parseCarouselDuration(tokens.motion.carousel), 4500);
});

test("CSS whitespace, fractional seconds and milliseconds retain their units", () => {
  for (const [value, expected] of [[" 4.5s\n", 4500], [".5s", 500], ["0.5ms", .5], ["1s", 1000], ["1ms", 1]] as const) {
    assert.equal(parseCarouselDuration(value), expected);
  }
});

test("invalid or zero durations do not start autoplay", () => {
  for (const value of ["", " ", "0ms", "0s", "-4.5s", "4500", "NaNms", "Infinitys", "4.5seconds", "4.5s junk", "4..5s", "4.5 s", "1e3ms", "var(--time)"]) {
    assert.equal(parseCarouselDuration(value), null, value);
  }
});

test("timer overflow cannot turn a very long delay into a fast loop", () => {
  assert.equal(parseCarouselDuration("2147483647ms"), 2_147_483_647);
  assert.equal(parseCarouselDuration("2147483648ms"), null);
  assert.equal(parseCarouselDuration("2147483.648s"), null);
  assert.equal(parseCarouselDuration(`${"9".repeat(400)}s`), null);
});
