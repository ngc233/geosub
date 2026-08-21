import productBrandAssetManifest from "../data/product-brand-assets.json" with { type: "json" };

export type ApprovedLocalBrandAsset = {
  path: `/brand-assets/${string}`;
  sourceClass: "official-app-store-artwork" | "permission-backed" | "owned-by-geosub";
  usageBasis: "owner-approved-nominative-identification" | "written-permission" | "owned-by-geosub";
  evidenceReference: string;
  sourceUrl: string;
  appStoreId?: string;
  trackName: string;
  sellerName: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  reviewedAt: string;
  displayMode: "app-icon" | "brand-mark";
};

// This generated manifest is refreshed only by the explicit maintenance command.
// Public rendering never requests the recorded remote source URL.
export const approvedLocalBrandAssets = productBrandAssetManifest.products as Record<
  string,
  ApprovedLocalBrandAsset
>;
const approvedLocalBrandAssetRegistry = approvedLocalBrandAssets;

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

export function getOptimizedBrandAssetPath(asset: ApprovedLocalBrandAsset) {
  const filename = asset.path.split("/").pop()?.replace(/\.[^.]+$/, ".webp");
  return `/brand-assets/thumbs/${filename}?v=${asset.sha256.slice(0, 12)}`;
}

export function getSimpleIconCandidates(productSlug: string) {
  return simpleIconCandidates[productSlug.trim().toLowerCase()] || [];
}

export function isRestrictedLegacyLogoReference(value?: string | null) {
  const source = value?.trim();

  if (!source) return false;
  return /^https?:\/\//i.test(source) || source.startsWith("/api/product-logos/");
}
