import assert from "node:assert/strict";
import test from "node:test";
import { codexStyleFixture } from "./fixtures.ts";

test("long-text preview requests cannot mutate subsequent requests or other fixture fields",()=>{
  const before=structuredClone(codexStyleFixture("mixed"));
  const long=codexStyleFixture("long");
  assert(long.events[0].facts.summary.zh.length>before.events[0].facts.summary.zh.length);
  assert.deepEqual(codexStyleFixture("mixed"),before);
  assert.equal(codexStyleFixture("long").events[0].facts.summary.zh,long.events[0].facts.summary.zh);
  long.events[0].history[0].note.zh="mutated only in this request";
  long.events[2].facts.action.instructions.zh="mutated only in this request";
  assert.deepEqual(codexStyleFixture("mixed"),before);
});
