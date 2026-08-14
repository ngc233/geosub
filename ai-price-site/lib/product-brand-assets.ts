export type ApprovedLocalBrandAsset = {
  path: `/brand-assets/${string}`;
  rightsBasis: "written-permission" | "owned-by-geosub";
  evidenceReference: string;
  reviewedAt: string;
};

// Add an entry only after the rights evidence has been recorded in
// docs/product-brand-asset-register.md and the file has been committed under
// public/brand-assets. An empty registry is intentional: a neutral fallback is
// safer than presenting an unreviewed image as an official brand asset.
export const approvedLocalBrandAssets = {} satisfies Record<
  string,
  ApprovedLocalBrandAsset
>;
const approvedLocalBrandAssetRegistry = approvedLocalBrandAssets as Record<
  string,
  ApprovedLocalBrandAsset
>;

export const restrictedLegacyBrandAssetClass = "app-store-restricted";

// Simple Icons is bundled locally under CC0-1.0. Only exact brand matches are
// listed here. Generic company marks and lookalike products are deliberately
// excluded so the UI does not imply that a parent-company logo is the product
// logo.
export const simpleIconCandidates: Record<string, readonly string[]> = {
  claude: ["siClaude", "siAnthropic"],
  gemini: ["siGooglegemini"],
  perplexity: ["siPerplexity"],
  deepseek: ["siDeepseek"],
  mistral: ["siMistralai"],
  llama: ["siMeta"],
  "meta-ai": ["siMeta"],
  "le-chat": ["siMistralai"],
  poe: ["siPoe"],
  suno: ["siSuno"],
  elevenlabs: ["siElevenlabs"],
  netflix: ["siNetflix"],
  "youtube-premium": ["siYoutube"],
  spotify: ["siSpotify"],
  "apple-music": ["siApplemusic"],
  max: ["siMax", "siHbomax"],
  "hbo-max": ["siHbomax", "siMax"],
  crunchyroll: ["siCrunchyroll"],
  deezer: ["siDeezer"],
};

export function getApprovedLocalBrandAsset(productSlug: string) {
  return approvedLocalBrandAssetRegistry[productSlug.trim().toLowerCase()] || null;
}

export function getSimpleIconCandidates(productSlug: string) {
  return simpleIconCandidates[productSlug.trim().toLowerCase()] || [];
}

export function isRestrictedLegacyLogoReference(value?: string | null) {
  const source = value?.trim();

  if (!source) return false;
  return /^https?:\/\//i.test(source) || source.startsWith("/api/product-logos/");
}
