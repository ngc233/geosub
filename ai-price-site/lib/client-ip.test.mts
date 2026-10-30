import assert from "node:assert/strict";
import test from "node:test";
import { getTrustedClientIp } from "./client-ip.ts";

const spoofed = new Headers({
  "x-forwarded-for": "198.51.100.99, 203.0.113.10",
  "x-real-ip": "203.0.113.10",
  "cf-connecting-ip": "192.0.2.44",
});

test("trusted client IP never uses the client-controlled left-most forwarded value", () => {
  for (const header of [undefined, "", "x-real-ip", "x-forwarded-for-rightmost", "cf-connecting-ip", "x-forwarded-for"]) {
    assert.notEqual(getTrustedClientIp(spoofed, header), "198.51.100.99", `header=${header}`);
  }
});

test("trusted client IP defaults to the proxy-set x-real-ip", () => {
  assert.equal(getTrustedClientIp(spoofed, undefined), "203.0.113.10");
  assert.equal(getTrustedClientIp(spoofed, " X-Real-IP "), "203.0.113.10");
});

test("trusted client IP honours explicit proxy-chain configurations", () => {
  assert.equal(getTrustedClientIp(spoofed, "x-forwarded-for-rightmost"), "203.0.113.10");
  assert.equal(getTrustedClientIp(spoofed, "cf-connecting-ip"), "192.0.2.44");
});

test("an unknown configured header falls back to x-real-ip instead of trusting it", () => {
  assert.equal(getTrustedClientIp(spoofed, "x-forwarded-for"), "203.0.113.10");
});

test("rotating a spoofed forwarded value keeps one throttle identity", () => {
  const identities = new Set(
    ["10.0.0.1", "10.0.0.2", "10.0.0.3"].map((fake) =>
      getTrustedClientIp(new Headers({
        "x-forwarded-for": `${fake}, 203.0.113.10`,
        "x-real-ip": "203.0.113.10",
      }), undefined),
    ),
  );
  assert.deepEqual([...identities], ["203.0.113.10"]);
});

test("missing or control-character values normalize safely", () => {
  assert.equal(getTrustedClientIp(new Headers(), undefined), "unknown");
  assert.equal(getTrustedClientIp({ get: () => "203.0.113.10\u0000\n" }, undefined), "203.0.113.10");
  assert.equal(getTrustedClientIp({ get: () => "a".repeat(500) }, undefined).length, 120);
});

test("GEOSUB_CLIENT_IP_HEADER takes precedence over the legacy events variable", () => {
  const saved = { shared: process.env.GEOSUB_CLIENT_IP_HEADER, events: process.env.GEOSUB_EVENTS_CLIENT_IP_HEADER };
  try {
    process.env.GEOSUB_EVENTS_CLIENT_IP_HEADER = "x-real-ip";
    process.env.GEOSUB_CLIENT_IP_HEADER = "cf-connecting-ip";
    assert.equal(getTrustedClientIp(spoofed), "192.0.2.44");
    delete process.env.GEOSUB_CLIENT_IP_HEADER;
    process.env.GEOSUB_EVENTS_CLIENT_IP_HEADER = "cf-connecting-ip";
    assert.equal(getTrustedClientIp(spoofed), "192.0.2.44");
  } finally {
    for (const [name, value] of [["GEOSUB_CLIENT_IP_HEADER", saved.shared], ["GEOSUB_EVENTS_CLIENT_IP_HEADER", saved.events]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
