export type ProductCollectionSourceState =
  | "app_store_active"
  | "app_store_paused"
  | "official_web_active"
  | "official_web_paused"
  | "official_web_observed"
  | "official_web_unconfigured"
  | "one_time"
  | "unconfigured";

export type ProductCollectionSourceInput = {
  integrationStatus?: string | null;
  appStoreJobCount?: number;
  activeAppStoreJobCount?: number;
  officialWebJobCount?: number;
  activeOfficialWebJobCount?: number;
  pausedOfficialWebJobCount?: number;
  pendingWebObservationCount?: number;
};

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function classifyProductCollectionSource({
  integrationStatus,
  appStoreJobCount = 0,
  activeAppStoreJobCount = 0,
  officialWebJobCount = 0,
  activeOfficialWebJobCount = 0,
  pausedOfficialWebJobCount = 0,
  pendingWebObservationCount = 0,
}: ProductCollectionSourceInput): ProductCollectionSourceState {
  const normalizedIntegrationStatus = normalize(integrationStatus);

  if (normalizedIntegrationStatus === "one_time_only") {
    return "one_time";
  }

  if (appStoreJobCount > 0) {
    return activeAppStoreJobCount > 0
      ? "app_store_active"
      : "app_store_paused";
  }

  const usesOfficialWeb =
    normalizedIntegrationStatus === "official_page_only" ||
    officialWebJobCount > 0 ||
    pendingWebObservationCount > 0;

  if (usesOfficialWeb) {
    if (pendingWebObservationCount > 0) return "official_web_observed";
    if (activeOfficialWebJobCount > 0) return "official_web_active";
    if (pausedOfficialWebJobCount > 0) return "official_web_paused";
    return "official_web_unconfigured";
  }

  return "unconfigured";
}

export function isAppStoreCollectionState(state: ProductCollectionSourceState) {
  return state === "app_store_active" || state === "app_store_paused";
}

export function isOfficialWebCollectionState(state: ProductCollectionSourceState) {
  return state.startsWith("official_web_");
}
