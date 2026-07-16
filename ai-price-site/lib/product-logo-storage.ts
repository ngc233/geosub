import "server-only";

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 12_000;

type LogoFormat = {
  extension: string;
  contentType: string;
};

type StoredLogoMetadata = {
  slug: string;
  sourceUrl: string;
  fileName: string;
  contentType: string;
  checksum: string;
  storedAt: string;
};

export type StoredProductLogo = StoredLogoMetadata & {
  data: Buffer;
};

function getStorageDirectory() {
  if (process.env.GEOSUB_LOGO_STORAGE_DIR?.trim()) {
    return process.env.GEOSUB_LOGO_STORAGE_DIR.trim().replace(/[\\/]+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "/var/lib/geosub/product-logos";
  }

  const localCacheRoot = process.env.LOCALAPPDATA || process.env.TEMP || "/tmp";
  return `${localCacheRoot.replace(/[\\/]+$/, "")}/GeoSub/product-logos`;
}

function storagePath(fileName: string) {
  return `${getStorageDirectory()}/${fileName}`;
}

export function normalizeProductLogoSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function getRemoteProductLogoUrl(value?: string | null) {
  const source = value?.trim();

  if (!source) {
    return null;
  }

  try {
    const url = new URL(source);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function metadataPath(slug: string) {
  return storagePath(`${slug}.json`);
}

function detectLogoFormat(data: Buffer, contentTypeHeader: string | null): LogoFormat | null {
  const contentType = contentTypeHeader?.split(";", 1)[0]?.trim().toLowerCase() || "";
  const textStart = data.subarray(0, 512).toString("utf8").trimStart().toLowerCase();

  if (contentType.includes("svg") || textStart.startsWith("<svg") || textStart.startsWith("<?xml")) {
    return { extension: "svg", contentType: "image/svg+xml" };
  }

  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { extension: "png", contentType: "image/png" };
  }

  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }

  if (data.length >= 6 && ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"))) {
    return { extension: "gif", contentType: "image/gif" };
  }

  if (data.length >= 4 && data[0] === 0 && data[1] === 0 && data[2] === 1 && data[3] === 0) {
    return { extension: "ico", contentType: "image/x-icon" };
  }

  return null;
}

async function readMetadata(slug: string) {
  try {
    const parsed = JSON.parse(await readFile(metadataPath(slug), "utf8")) as StoredLogoMetadata;

    if (
      parsed.slug !== slug ||
      !parsed.fileName.startsWith(`${slug}-`) ||
      !parsed.contentType.startsWith("image/")
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function readStoredProductLogo(
  productSlug: string,
  expectedSourceUrl?: string | null,
): Promise<StoredProductLogo | null> {
  const slug = normalizeProductLogoSlug(productSlug);

  if (!slug) {
    return null;
  }

  const metadata = await readMetadata(slug);

  if (!metadata || (expectedSourceUrl && metadata.sourceUrl !== expectedSourceUrl)) {
    return null;
  }

  try {
    const data = await readFile(storagePath(metadata.fileName));
    return { ...metadata, data };
  } catch {
    return null;
  }
}

async function removeSupersededFiles(slug: string, keepFileName: string) {
  const files = await readdir(getStorageDirectory()).catch(() => [] as string[]);

  await Promise.all(
    files
      .filter((fileName) => fileName.startsWith(`${slug}-`) && fileName !== keepFileName)
      .map((fileName) => unlink(storagePath(fileName)).catch(() => undefined)),
  );
}

export async function cacheRemoteProductLogo({
  productSlug,
  sourceUrl,
}: {
  productSlug: string;
  sourceUrl: string;
}): Promise<StoredProductLogo> {
  const slug = normalizeProductLogoSlug(productSlug);
  const remoteUrl = getRemoteProductLogoUrl(sourceUrl);

  if (!slug || !remoteUrl) {
    throw new Error("A valid product slug and HTTP(S) logo URL are required.");
  }

  const existing = await readStoredProductLogo(slug, remoteUrl);
  if (existing) {
    return existing;
  }

  const response = await fetch(remoteUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.2",
      "User-Agent": "GeoSubLogoCache/1.0 (+https://geosub.org)",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Logo download failed with HTTP ${response.status}.`);
  }

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_LOGO_BYTES) {
    throw new Error("Logo file exceeds the 2 MB limit.");
  }

  const data = Buffer.from(await response.arrayBuffer());
  if (data.length === 0 || data.length > MAX_LOGO_BYTES) {
    throw new Error("Logo file is empty or exceeds the 2 MB limit.");
  }

  const format = detectLogoFormat(data, response.headers.get("content-type"));
  if (!format) {
    throw new Error("Downloaded file is not a supported image.");
  }

  const checksum = createHash("sha256").update(data).digest("hex");
  const fileName = `${slug}-${checksum.slice(0, 16)}.${format.extension}`;
  const storageDirectory = getStorageDirectory();
  const metadata: StoredLogoMetadata = {
    slug,
    sourceUrl: remoteUrl,
    fileName,
    contentType: format.contentType,
    checksum,
    storedAt: new Date().toISOString(),
  };

  await mkdir(storageDirectory, { recursive: true });
  await writeFile(`${storageDirectory}/${fileName}`, data);
  await writeFile(metadataPath(slug), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  await removeSupersededFiles(slug, fileName);

  return { ...metadata, data };
}
