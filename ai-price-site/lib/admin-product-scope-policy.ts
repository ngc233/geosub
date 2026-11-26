export const LEGACY_OFFICIAL_WEB_PRODUCT_SLUGS = [
  "spotify",
  "apple-music",
] as const;

export const LEGACY_ACTIVATION_PREFLIGHT_RULES = [
  {
    productSlug: "claude",
    collectorKind: "pricing_page",
    message: "请从 Claude 采集配置检查启用条件，再确认加入周期调度。",
  },
] as const;

export const LEGACY_AUTO_REVIEW_ERROR_PREFIX =
  "Automatic review failed after collection:";

export type CollectorFailurePhase = "collector" | "auto_review" | "spawn";

export type ProductBillingPlatformScope = "web" | "ios";

export function resolveProductBillingPlatformScope({
  productSlug,
  appStoreJobCount,
  officialWebJobCount,
  hasActiveWebSourceProfile = false,
  explicitBillingPlatformScope = null,
}: {
  productSlug: string;
  appStoreJobCount: number;
  officialWebJobCount: number;
  hasActiveWebSourceProfile?: boolean;
  explicitBillingPlatformScope?: string | null;
}): ProductBillingPlatformScope {
  if (appStoreJobCount > 0 || officialWebJobCount <= 0) {
    return "ios";
  }

  const normalizedSlug = productSlug.trim().toLowerCase();
  const isLegacyWebSlug = (
    LEGACY_OFFICIAL_WEB_PRODUCT_SLUGS as readonly string[]
  ).includes(normalizedSlug);

  if (
    explicitBillingPlatformScope === "web" ||
    hasActiveWebSourceProfile ||
    isLegacyWebSlug
  ) {
    return "web";
  }

  return "ios";
}

export function requiresCollectorActivationPreflight({
  productSlug,
  collectorKind,
  jobRequiresPreflight = false,
  profileRequiresPreflight = false,
}: {
  productSlug: string;
  collectorKind?: string | null;
  jobRequiresPreflight?: boolean;
  profileRequiresPreflight?: boolean;
}): boolean {
  if (jobRequiresPreflight || profileRequiresPreflight) {
    return true;
  }

  const normalizedSlug = productSlug.trim().toLowerCase();
  const normalizedKind = (collectorKind ?? "").trim().toLowerCase();

  return LEGACY_ACTIVATION_PREFLIGHT_RULES.some(
    (rule) =>
      rule.productSlug === normalizedSlug &&
      rule.collectorKind === normalizedKind,
  );
}

export function formatActivationPreflightError({
  productSlug,
  preflightMessage,
}: {
  productSlug?: string | null;
  preflightMessage?: string | null;
}): string {
  const custom = preflightMessage?.trim();
  if (custom) {
    return custom;
  }

  const normalizedSlug = (productSlug ?? "").trim().toLowerCase();
  const legacyRule = LEGACY_ACTIVATION_PREFLIGHT_RULES.find(
    (rule) => rule.productSlug === normalizedSlug,
  );
  if (legacyRule) {
    return legacyRule.message;
  }

  return "请先在产品采集配置中检查启用条件，再确认加入周期调度。";
}

export function classifyCollectorRunFailurePhase(input: {
  failure_phase?: string | null;
  failure_stage?: string | null;
  collector_status?: string | null;
  auto_review_status?: string | null;
  error_message?: string | null;
}): CollectorFailurePhase | null {
  const explicitPhase = input.failure_phase?.trim().toLowerCase();
  if (
    explicitPhase === "auto_review" ||
    explicitPhase === "collector" ||
    explicitPhase === "spawn"
  ) {
    return explicitPhase;
  }

  if (
    input.failure_stage?.trim().toLowerCase() === "review" ||
    (input.collector_status === "succeeded" &&
      input.auto_review_status === "failed") ||
    Boolean(input.error_message?.startsWith(LEGACY_AUTO_REVIEW_ERROR_PREFIX))
  ) {
    return "auto_review";
  }

  return null;
}
