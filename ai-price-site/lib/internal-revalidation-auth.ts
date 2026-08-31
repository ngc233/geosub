import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";

const tokenKey = Symbol.for("geosub.internal-revalidation-token");
type TokenGlobal = typeof globalThis & { [tokenKey]?: string };

export function getInternalRevalidationToken() {
  const shared = globalThis as TokenGlobal;
  shared[tokenKey] ??= randomBytes(32).toString("hex");
  return shared[tokenKey];
}

export function isValidInternalRevalidationToken(value: string | null) {
  if (!value) return false;

  const actual = Buffer.from(value, "utf8");
  const expected = Buffer.from(getInternalRevalidationToken(), "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
