#!/usr/bin/env node

await import("dotenv/config");

const [{ prisma }, { fetchOfficialSiteIcon }, logoStorage] = await Promise.all([
  import("../lib/prisma.ts"),
  import("../lib/official-site-logo.ts"),
  import("../lib/product-logo-storage.ts"),
]);

const { cacheRemoteProductLogo, readStoredProductLogo } = logoStorage;
const checkOnly = process.argv.includes("--check");
const refresh = process.argv.includes("--refresh");

function extractAppStoreId(value: string | null | undefined) {
  return value?.match(/\/id(\d+)/i)?.[1] || null;
}

function normalizeAppStoreArtworkUrl(value: string | null | undefined) {
  const url = value?.trim();
  return url
    ? url.replace(/\/\d+x\d+bb\.(jpg|jpeg|png|webp)$/i, "/512x512bb.$1")
    : null;
}

async function lookupAppStoreArtwork(appStoreId: string | null) {
  if (!appStoreId) return null;

  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(appStoreId)}`,
    {
      headers: { "User-Agent": "GeoSubLogoSync/1.0 (+https://geosub.org)" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    results?: Array<{
      artworkUrl512?: string;
      artworkUrl100?: string;
      artworkUrl60?: string;
    }>;
  };
  const app = data.results?.[0];

  return normalizeAppStoreArtworkUrl(
    app?.artworkUrl512 || app?.artworkUrl100 || app?.artworkUrl60,
  );
}

const products = await prisma.product.findMany({
  where: { status: "PUBLISHED" },
  select: {
    id: true,
    slug: true,
    logoUrl: true,
    officialUrl: true,
    collectorJobs: {
      where: { status: { not: "archived" } },
      select: {
        source: {
          select: { type: true, baseUrl: true },
        },
      },
    },
  },
  orderBy: { slug: "asc" },
});

const missing: string[] = [];
const failures: string[] = [];
let cached = 0;
let unchanged = 0;

for (const product of products) {
  const stored = await readStoredProductLogo(product.slug);

  if (stored && !refresh) {
    unchanged += 1;
    console.log(`OK    ${product.slug}: ${stored.fileName}`);
    continue;
  }

  if (checkOnly) {
    missing.push(product.slug);
    console.error(`MISS  ${product.slug}: no persistent cached logo`);
    continue;
  }

  const appStoreUrl = product.collectorJobs.find(
    (job) => job.source?.type === "APP_STORE",
  )?.source?.baseUrl;
  const appStoreId = extractAppStoreId(appStoreUrl);
  const officialSiteLogo = refresh || !product.logoUrl
    ? await fetchOfficialSiteIcon(product.officialUrl).catch(() => null)
    : null;
  const appStoreLogo = await lookupAppStoreArtwork(appStoreId).catch(() => null);
  const candidates = [
    refresh ? officialSiteLogo : product.logoUrl,
    refresh ? product.logoUrl : officialSiteLogo,
    appStoreLogo,
  ].filter((value, index, values): value is string =>
    Boolean(value && values.indexOf(value) === index),
  );

  let synchronizedUrl: string | null = null;

  for (const sourceUrl of candidates) {
    const result = await cacheRemoteProductLogo({
      productSlug: product.slug,
      sourceUrl,
    }).catch(() => null);

    if (result) {
      synchronizedUrl = sourceUrl;
      console.log(`SYNC  ${product.slug}: ${result.fileName}`);
      break;
    }
  }

  if (!synchronizedUrl) {
    failures.push(product.slug);
    console.error(`FAIL  ${product.slug}: no downloadable official logo`);
    continue;
  }

  if (product.logoUrl !== synchronizedUrl) {
    await prisma.product.update({
      where: { id: product.id },
      data: { logoUrl: synchronizedUrl },
    });
  }

  cached += 1;
}

await prisma.$disconnect();

console.log(
  `Logo coverage: ${products.length - missing.length - failures.length}/${products.length}; ` +
    `cached ${cached}; unchanged ${unchanged}; missing ${missing.length}; failed ${failures.length}.`,
);

if (missing.length > 0 || failures.length > 0) {
  process.exitCode = 1;
}
