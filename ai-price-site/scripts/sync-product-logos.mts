#!/usr/bin/env node

await import("dotenv/config");

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as icons from "simple-icons";
import {
  approvedLocalBrandAssets,
  getApprovedLocalBrandAsset,
  getSimpleIconCandidates,
  isRestrictedLegacyLogoReference,
  type ApprovedLocalBrandAsset,
} from "../lib/product-brand-assets.ts";

const { prisma } = await import("../lib/prisma.ts");
const publicDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const iconPack = icons as unknown as Record<string, { path?: string } | undefined>;

const products = await prisma.product.findMany({
  where: { status: "PUBLISHED" },
  select: {
    slug: true,
    logoUrl: true,
  },
  orderBy: { slug: "asc" },
});

const failures: string[] = [];
let approvedLocalCount = 0;
let simpleIconCount = 0;
let neutralCount = 0;
let restrictedLegacyCount = 0;
const maxReviewAgeDays = 120;

for (const product of products) {
  const approvedLocalAsset = getApprovedLocalBrandAsset(product.slug);
  const simpleIconName = getSimpleIconCandidates(product.slug).find(
    (candidate) => Boolean(iconPack[candidate]?.path),
  );

  if (approvedLocalAsset) {
    const filePath = resolve(publicDirectory, approvedLocalAsset.path.replace(/^\//, ""));
    const isInsidePublicDirectory = filePath.startsWith(`${publicDirectory}\\`) ||
      filePath.startsWith(`${publicDirectory}/`);
    const exists = isInsidePublicDirectory
      ? await access(filePath).then(() => true).catch(() => false)
      : false;

    if (!exists) {
      failures.push(`${product.slug}: registered local asset is missing`);
      console.error(`FAIL  ${product.slug}: registered local asset is missing`);
      continue;
    }

    const fileBuffer = await readFile(filePath);
    const actualSha256 = createHash("sha256").update(fileBuffer).digest("hex");
    if (actualSha256 !== approvedLocalAsset.sha256) {
      failures.push(`${product.slug}: local asset checksum does not match the reviewed manifest`);
      console.error(`FAIL  ${product.slug}: local asset checksum mismatch`);
      continue;
    }

    const reviewedAt = new Date(`${approvedLocalAsset.reviewedAt}T00:00:00Z`);
    const ageDays = Math.floor((Date.now() - reviewedAt.getTime()) / 86_400_000);
    if (!Number.isFinite(ageDays) || ageDays < -1 || ageDays > maxReviewAgeDays) {
      failures.push(`${product.slug}: local asset review is missing or older than ${maxReviewAgeDays} days`);
      console.error(`FAIL  ${product.slug}: local asset review is stale`);
      continue;
    }

    approvedLocalCount += 1;
    console.log(
      `LOCAL ${product.slug}: ${approvedLocalAsset.trackName} by ${approvedLocalAsset.sellerName}`,
    );
  } else if (simpleIconName) {
    simpleIconCount += 1;
    failures.push(`${product.slug}: published product has no reviewed local app icon`);
    console.error(`FAIL  ${product.slug}: Simple Icons ${simpleIconName} is fallback-only`);
  } else {
    neutralCount += 1;
    failures.push(`${product.slug}: published product would render neutral initials`);
    console.error(`FAIL  ${product.slug}: neutral initials are not valid published coverage`);
  }

  if (isRestrictedLegacyLogoReference(product.logoUrl)) {
    restrictedLegacyCount += 1;
    console.log(`NOTE  ${product.slug}: legacy remote logo retained as diagnostic metadata only`);
  }
}

for (const [slug, asset] of Object.entries(
  approvedLocalBrandAssets as Record<string, ApprovedLocalBrandAsset>,
)) {
  if (!asset.path.startsWith("/brand-assets/")) {
    failures.push(`${slug}: approved asset must be stored under /brand-assets/`);
  }
  if (
    !asset.evidenceReference.trim() ||
    !asset.sourceUrl.trim() ||
    !asset.reviewedAt.trim() ||
    !asset.sha256.trim() ||
    !asset.trackName.trim() ||
    !asset.sellerName.trim()
  ) {
    failures.push(`${slug}: source evidence, checksum and review metadata are required`);
  }
}

await prisma.$disconnect();

console.log(
  `Public logo coverage: ${products.length - failures.length}/${products.length}; ` +
    `approved local ${approvedLocalCount}; Simple Icons ${simpleIconCount}; ` +
    `neutral ${neutralCount}; restricted legacy references ${restrictedLegacyCount}.`,
);
console.log("Public rendering uses committed local files only; remote URLs remain provenance metadata.");

if (failures.length > 0) {
  process.exitCode = 1;
}
