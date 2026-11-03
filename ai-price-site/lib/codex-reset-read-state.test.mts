import assert from "node:assert/strict";
import test from "node:test";
import {isCodexResetReadUnavailable} from "./codex-reset-read-state.ts";
test("actual Prisma 7 pg adapter missing-table shape is a recoverable public read failure",()=>{
 assert.equal(isCodexResetReadUnavailable({code:"P2010",meta:{driverAdapterError:{cause:{originalCode:"42P01",kind:"TableDoesNotExist"}}}}),true);
 assert.equal(isCodexResetReadUnavailable({code:"P2010",meta:{driverAdapterError:{cause:{originalCode:"42601",kind:"InvalidQuery"}}}}),false);
});
