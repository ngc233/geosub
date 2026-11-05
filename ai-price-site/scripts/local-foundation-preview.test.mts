import assert from "node:assert/strict";
import test from "node:test";
import config from "../design/preview/next.config.mjs";

test("sample requires explicit opt-in and rejects production even with opt-in", () => {
  const previous = process.env.GEOSUB_V1_SAMPLE;
  try {
    for (const value of [undefined, "0", "1"]) {
      if (value === undefined) delete process.env.GEOSUB_V1_SAMPLE;
      else process.env.GEOSUB_V1_SAMPLE = value;
      if (value === "1") assert.equal(config("phase-development-server").devIndicators, false);
      else assert.throws(() => config("phase-development-server"), /local-only/);
      for (const phase of ["phase-production-build", "phase-production-server"]) assert.throws(() => config(phase), /production build\/start is forbidden/);
    }
  } finally {
    if (previous === undefined) delete process.env.GEOSUB_V1_SAMPLE;
    else process.env.GEOSUB_V1_SAMPLE = previous;
  }
});
