import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv, selectLatestBigMacRows } from "./big-mac-index-core.mjs";

test("parseCsv handles quoted fields and CRLF", () => {
  const rows = parseCsv('date,iso_a3,currency_code,name,local_price,dollar_price\r\n2025-01-01,USA,USD,"United States, test",5.79,5.79\r\n');
  assert.equal(rows[0].name, "United States, test");
});

test("selectLatestBigMacRows keeps the latest valid observation per region", () => {
  const input = [
    "date,iso_a3,currency_code,name,local_price,dollar_price",
    "2024-01-01,USA,USD,United States,5.69,5.69",
    "2025-01-01,USA,USD,United States,5.79,5.79",
    "2025-01-01,ESP,EUR,Spain,4.58,4.96",
    "2025-01-01,BAD,USD,Bad,0,0",
  ].join("\n");
  const latest = selectLatestBigMacRows(input);
  assert.equal(latest.get("USA")?.observedOn, "2025-01-01");
  assert.equal(latest.get("ESP")?.currency, "EUR");
  assert.equal(latest.has("BAD"), false);
});
