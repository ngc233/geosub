import { createHash, timingSafeEqual } from "node:crypto";

function hashSecret(value: string | null | undefined) {
  return createHash("sha256").update(value ?? "").digest();
}

export function secretsMatch(
  candidate: string | null | undefined,
  expected: string,
) {
  return timingSafeEqual(hashSecret(candidate), hashSecret(expected));
}
