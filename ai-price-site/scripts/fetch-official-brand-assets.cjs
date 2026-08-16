#!/usr/bin/env node

const { createHash } = require("node:crypto");
const { mkdir, writeFile } = require("node:fs/promises");
const { resolve } = require("node:path");

const products = [
  { slug: "anghami", appStoreId: "545395155", expectedName: /Anghami/i },
  { slug: "boomplay", appStoreId: "1437251983", expectedName: /Boomplay/i },
  { slug: "captions", appStoreId: "1541407007", expectedName: /Captions/i },
  { slug: "character-ai", appStoreId: "1671705818", expectedName: /Character[.]AI|Character AI/i },
  { slug: "chatgpt", appStoreId: "6448311069", expectedName: /^ChatGPT$/i },
  { slug: "claude", appStoreId: "6473753684", expectedName: /Claude/i },
  { slug: "crunchyroll", appStoreId: "329913454", expectedName: /Crunchyroll/i },
  { slug: "deezer", appStoreId: "292738169", expectedName: /Deezer/i },
  { slug: "gemini", appStoreId: "6477489729", expectedName: /Gemini/i },
  { slug: "goodshort", appStoreId: "6448176203", expectedName: /GoodShort/i },
  { slug: "grok", appStoreId: "6670324846", expectedName: /Grok/i },
  { slug: "heygen", appStoreId: "6711356409", expectedName: /HeyGen/i },
  { slug: "invideo-ai", appStoreId: "6471394316", expectedName: /invideo/i },
  { slug: "kimi", appStoreId: "6474233312", expectedName: /Kimi/i },
  { slug: "kling-ai", appStoreId: "6738049229", expectedName: /Kling/i },
  { slug: "le-chat", appStoreId: "6740410176", expectedName: /Le Chat|Mistral/i },
  { slug: "leonardo-ai", appStoreId: "1662773014", expectedName: /Leonardo/i },
  { slug: "manus", appStoreId: "6740909540", expectedName: /Manus/i },
  { slug: "microsoft-copilot", appStoreId: "6472538445", expectedName: /Copilot/i },
  { slug: "perplexity", appStoreId: "1668000334", expectedName: /Perplexity/i },
  { slug: "podimo", appStoreId: "1476538730", expectedName: /Podimo/i },
  { slug: "poe", appStoreId: "1640745955", expectedName: /Poe/i },
  { slug: "pollo-ai", appStoreId: "6740024098", expectedName: /Pollo/i },
  { slug: "reelshort", appStoreId: "1636235979", expectedName: /ReelShort/i },
  { slug: "runwayml", appStoreId: "1665024375", expectedName: /Runway/i },
  { slug: "suno", appStoreId: "6480136315", expectedName: /Suno/i },
  { slug: "disney", appStoreId: "1446075923", expectedName: /Disney/i },
  { slug: "dramabox", appStoreId: "6445905219", expectedName: /DramaBox/i },
  { slug: "f1-tv", appStoreId: "1315007279", expectedName: /F1 TV/i },
  { slug: "hbo-max", appStoreId: "1666653815", expectedName: /HBO Max|Max:/i },
  { slug: "mubi", appStoreId: "626148774", expectedName: /^MUBI:/i },
  { slug: "netflix", appStoreId: "363590051", expectedName: /^Netflix$/i },
  { slug: "soundcloud", appStoreId: "336353151", expectedName: /^SoundCloud:/i },
  { slug: "viki", appStoreId: "445553058", expectedName: /Viki/i },
  { slug: "x-premium", appStoreId: "333903271", expectedName: /^X$/i },
  { slug: "youtube-premium", appStoreId: "544007664", expectedName: /YouTube/i },
];

const projectRoot = resolve(__dirname, "..");
const outputDirectory = resolve(projectRoot, "public", "brand-assets");
const manifestPath = resolve(projectRoot, "data", "product-brand-assets.json");
const reviewedAt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Singapore",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function imageExtension(contentType) {
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/webp")) return "webp";
  if (contentType.includes("image/jpeg")) return "jpg";
  throw new Error(`Unsupported artwork content type: ${contentType || "unknown"}`);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "GeoSub brand asset maintenance/1.0" },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const ids = products.map((product) => product.appStoreId).join(",");
  const lookupUrl = `https://itunes.apple.com/lookup?id=${ids}&country=us`;
  const lookup = await fetchJson(lookupUrl);
  const resultsById = new Map(
    (lookup.results || []).map((result) => [String(result.trackId), result]),
  );
  const downloads = [];

  for (const product of products) {
    const result = resultsById.get(product.appStoreId);
    if (!result) throw new Error(`${product.slug}: App Store lookup returned no result`);
    if (!product.expectedName.test(result.trackName || "")) {
      throw new Error(
        `${product.slug}: expected product name did not match ${JSON.stringify(result.trackName)}`,
      );
    }
    if (!result.artworkUrl512) {
      throw new Error(`${product.slug}: App Store lookup returned no 512px artwork`);
    }

    const response = await fetch(result.artworkUrl512, {
      headers: { "User-Agent": "GeoSub brand asset maintenance/1.0" },
    });
    if (!response.ok) {
      throw new Error(`${product.slug}: artwork returned HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    const extension = imageExtension(contentType);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength < 1024 || buffer.byteLength > 3 * 1024 * 1024) {
      throw new Error(`${product.slug}: unexpected artwork size ${buffer.byteLength}`);
    }

    downloads.push({
      product,
      result,
      extension,
      buffer,
      contentType: contentType.split(";")[0],
    });
  }

  await mkdir(outputDirectory, { recursive: true });
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    usagePurpose: "nominative-product-identification",
    products: {},
  };

  for (const download of downloads) {
    const { product, result, extension, buffer, contentType } = download;
    const filename = `${product.slug}.${extension}`;
    await writeFile(resolve(outputDirectory, filename), buffer);
    manifest.products[product.slug] = {
      path: `/brand-assets/${filename}`,
      sourceClass: "official-app-store-artwork",
      usageBasis: "owner-approved-nominative-identification",
      evidenceReference: `https://apps.apple.com/us/app/id${product.appStoreId}`,
      sourceUrl: result.artworkUrl512,
      appStoreId: product.appStoreId,
      trackName: result.trackName,
      sellerName: result.sellerName || result.artistName || "",
      mimeType: contentType,
      byteLength: buffer.byteLength,
      sha256: sha256(buffer),
      reviewedAt,
      displayMode: "app-icon",
    };
    console.log(`FETCH ${product.slug}: ${result.trackName} by ${manifest.products[product.slug].sellerName}`);
  }

  await mkdir(resolve(projectRoot, "data"), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`WROTE ${downloads.length} local assets and ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
