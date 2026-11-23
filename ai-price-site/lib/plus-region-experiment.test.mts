import assert from "node:assert/strict";
import test from "node:test";
import { variantForVisitor } from "./plus-region-experiment.ts";

test("the uniform first UUID nibble maps eight ways to each stable arm", () => {
  const assignments = Array.from("0123456789abcdef", prefix => {
    const id = prefix + "6db4601-e410-4afd-9ca0-7345086e80ea";
    assert.equal(variantForVisitor(id), variantForVisitor(id.toUpperCase()));
    return variantForVisitor(id);
  });
  assert.deepEqual(assignments, [...Array(8).fill("A"), ...Array(8).fill("B")]);
});

test("unavailable or non-random visitor IDs do not enter either arm", () => {
  for (const id of [undefined, "", "visitor", "00000000-0000-1000-8000-0123456789ab"]) {
    assert.equal(variantForVisitor(id), null);
  }
});
