#!/usr/bin/env node

await import("dotenv/config");

import { access } from "node:fs/promises";
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

    approvedLocalCount += 1;
    console.log(`LOCAL ${product.slug}: ${approvedLocalAsset.path}`);
  } else if (simpleIconName) {
    simpleIconCount += 1;
    console.log(`ICON  ${product.slug}: Simple Icons ${simpleIconName}`);
  } else {
    neutralCount += 1;
    console.log(`TEXT  ${product.slug}: GeoSub neutral initials`);
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
  if (!asset.evidenceReference.trim() || !asset.reviewedAt.trim()) {
    failures.push(`${slug}: rights evidence and review date are required`);
  }
}

await prisma.$disconnect();

console.log(
  `Public logo coverage: ${products.length - failures.length}/${products.length}; ` +
    `approved local ${approvedLocalCount}; Simple Icons ${simpleIconCount}; ` +
    `neutral ${neutralCount}; restricted legacy references ${restrictedLegacyCount}.`,
);
console.log(
  "Remote and App Store artwork is not downloaded or published by this command. " +
    "Register rights-cleared assets in lib/product-brand-assets.ts before use.",
);

if (failures.length > 0) {
  process.exitCode = 1;
}
