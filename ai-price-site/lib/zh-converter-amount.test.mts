import assert from "node:assert/strict";
import test from "node:test";
import {
  convertZhAmount,
  formatZhSourceAmount,
  parseZhConverterAmount,
} from "./zh-converter-amount.ts";

const quote = (rate: number, isExpired = false) => ({ rate, isExpired });
const usd = quote(1);

function amount(text: string) {
  const parsed = parseZhConverterAmount(text);
  if (parsed.status !== "ok") throw new Error(`Expected valid fixture amount: ${text}`);
  return parsed;
}

test("JPY rounds once at the exact half yen", () => {
  const jpy = quote(150);
  for (const [input, expected] of [
    ["19.98999999", 2998],
    ["19.99", 2999],
    ["19.99000001", 2999],
  ] as const) {
    assert.deepEqual(convertZhAmount(amount(input), usd, jpy, "JPY"), { status: "ok", value: expected });
  }
  assert.deepEqual(convertZhAmount(amount("2998.5"), jpy, usd, "USD"), { status: "ok", value: 19.99 });
});

test("existing quote ratio and currency precision apply to both ordinary and tiny amounts", () => {
  assert.deepEqual(convertZhAmount(amount("10"), usd, quote(7.2), "CNY"), { status: "ok", value: 72 });
  assert.deepEqual(convertZhAmount(amount("10"), usd, quote(1), "TWD"), { status: "ok", value: 10 });
  const stale = { ...quote(0.9), isStale: true };
  assert.deepEqual(convertZhAmount(amount("10"), usd, stale, "EUR"), { status: "ok", value: 9 });
  assert.deepEqual(convertZhAmount(amount("10"), quote(1e-7), quote(2e-7), "USD"), { status: "ok", value: 20 });
  assert.deepEqual(convertZhAmount(amount(".004"), usd, quote(7.2), "CNY"), { status: "ok", value: 0.03 });
  assert.deepEqual(convertZhAmount(amount("0"), usd, quote(7.2), "CNY"), { status: "ok", value: 0 });
  assert.equal(formatZhSourceAmount(amount(".004"), "USD"), "$ 0.004");
  assert.equal(formatZhSourceAmount(amount("0"), "USD"), "$ 0.00");
});

test("plain grouped decimals obey the exact inclusive input limit", () => {
  assert.equal(parseZhConverterAmount(" 9,999,999,999.99 ").status, "ok");
  assert.equal(parseZhConverterAmount("9,999,999,999.9901").status, "too-large");
  for (const input of ["10,000,000,000", "123456789012345.67"]) {
    assert.equal(parseZhConverterAmount(input).status, "too-large");
  }
  for (const input of ["", "-1", "1e308", "0x10", "12,34", "Infinity"]) {
    assert.equal(parseZhConverterAmount(input).status, "invalid");
  }
  assert.deepEqual(convertZhAmount(amount("1,234.56"), usd, usd, "USD"), { status: "ok", value: 1234.56 });
});

test("each target checks its own limit before and after rounding", () => {
  assert.deepEqual(convertZhAmount(amount("9999999999.99"), usd, usd, "USD"), { status: "ok", value: 9999999999.99 });
  assert.deepEqual(convertZhAmount(amount("9999999999.99"), usd, quote(1.0000000000001), "CNY"), { status: "too-large" });
  assert.deepEqual(convertZhAmount(amount("9999999999.50"), usd, usd, "JPY"), { status: "too-large" });
  assert.deepEqual(convertZhAmount(amount("9999999999.49"), usd, usd, "JPY"), { status: "ok", value: 9999999999 });
  assert.deepEqual(convertZhAmount(amount("9999999999.99"), usd, quote(0.9), "EUR"), { status: "ok", value: 8999999999.99 });
});

test("missing, expired and invalid rates keep the existing unavailable state", () => {
  for (const target of [undefined, quote(150, true), quote(0), quote(Infinity)]) {
    assert.deepEqual(convertZhAmount(amount("19.99"), usd, target, "JPY"), { status: "unavailable" });
    assert.deepEqual(convertZhAmount(amount("19.99"), target, usd, "USD"), { status: "unavailable" });
  }
});
