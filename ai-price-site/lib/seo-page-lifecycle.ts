import type { Locale } from "@prisma/client";
import { getActiveSeoExperimentLock } from "./seo-experiment-locks.ts";

export type SeoPageObservationInput = {
  locale: Locale;
  pageType: string;
  canonicalPath: string;
  productId?: string | null;
  productSlug?: string | null;
  planId?: string | null;
  planSlug?: string | null;
  eligibilityState: string;
  indexingDecision: string;
  decisionSource: string;
  effectiveAt: Date;
  reason?: string | null;
  policyVersion: string;
  finalRobotsIndex: boolean;
  finalRobotsFollow: boolean;
  canonicalUrl: string;
  qualityScore?: number | null;
  qualityStatus?: string | null;
  sitemapIncluded: boolean;
  triggerSource: string;
};

function requiredText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function canonicalPagePath(path: string) {
  const normalized = requiredText(path, "canonicalPath");
  if (!normalized.startsWith("/") || normalized.includes("?") || normalized.includes("#")) {
    throw new Error("canonicalPath must be a path without query or fragment.");
  }
  return normalized.replace(/\/+$/, "") || "/";
}

function canonicalPageUrl(value: string, canonicalPath: string) {
  const url = new URL(requiredText(value, "canonicalUrl"));
  if (url.search || url.hash || canonicalPagePath(url.pathname) !== canonicalPath) {
    throw new Error("canonicalUrl must match canonicalPath without query or fragment.");
  }
  return url.toString();
}

export function normalizeSeoPageObservation(input: SeoPageObservationInput) {
  const canonicalPath = canonicalPagePath(input.canonicalPath);
  const localePath = String(input.locale).toLowerCase();
  if (
    canonicalPath !== `/${localePath}` &&
    !canonicalPath.startsWith(`/${localePath}/`)
  ) {
    throw new Error("canonicalPath locale does not match locale.");
  }
  if (
    input.qualityScore !== undefined &&
    input.qualityScore !== null &&
    (!Number.isInteger(input.qualityScore) ||
      input.qualityScore < 0 ||
      input.qualityScore > 100)
  ) {
    throw new Error("qualityScore must be an integer from 0 to 100.");
  }
  if (Number.isNaN(input.effectiveAt.getTime())) {
    throw new Error("effectiveAt must be a valid date.");
  }

  const productId = optionalText(input.productId);
  const productSlug = optionalText(input.productSlug);
  const planId = optionalText(input.planId);
  const planSlug = optionalText(input.planSlug);
  if (Boolean(productId) !== Boolean(productSlug)) {
    throw new Error("productId and productSlug must be provided together.");
  }
  if (Boolean(planId) !== Boolean(planSlug)) {
    throw new Error("planId and planSlug must be provided together.");
  }
  if ((planId || planSlug) && (!productId || !productSlug)) {
    throw new Error("plan identity requires product identity.");
  }

  const lock = getActiveSeoExperimentLock(canonicalPath);
  return {
    locale: input.locale,
    pageType: requiredText(input.pageType, "pageType"),
    canonicalPath,
    productId,
    productSlug,
    planId,
    planSlug,
    eligibilityState: requiredText(
      input.eligibilityState,
      "eligibilityState",
    ),
    indexingDecision: requiredText(
      input.indexingDecision,
      "indexingDecision",
    ),
    decisionSource: requiredText(input.decisionSource, "decisionSource"),
    effectiveAt: input.effectiveAt,
    reason: optionalText(input.reason),
    policyVersion: requiredText(input.policyVersion, "policyVersion"),
    finalRobotsIndex: input.finalRobotsIndex,
    finalRobotsFollow: input.finalRobotsFollow,
    canonicalUrl: canonicalPageUrl(input.canonicalUrl, canonicalPath),
    qualityScore: input.qualityScore ?? null,
    qualityStatus: optionalText(input.qualityStatus),
    sitemapIncluded: input.sitemapIncluded,
    triggerSource: requiredText(input.triggerSource, "triggerSource"),
    experimentLockId: lock?.experimentId ?? null,
    experimentLocked: Boolean(lock),
  };
}
