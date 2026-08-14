"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";
import {
  appendSeoObservationSnapshot,
  appendSeoTrafficObservationSnapshot,
  createSeoObservationSnapshot,
  createSeoTrafficObservationSnapshot,
  parseSeoObservationSnapshots,
  parseSeoTrafficObservationSnapshots,
  SEO_BING_OBSERVATION_SETTING_KEY,
  SEO_OBSERVATION_SETTING_KEY,
} from "../../../lib/seo-observation-snapshots";
import { getCachedProductSeoQualityAudits } from "../../../lib/product-seo-quality-data";
import { getPipelineGrowthSignals } from "../../../lib/admin-pipeline-growth";
import { getSeoTrafficConversionOverview } from "../../../lib/admin-seo-conversion";
import {
  getProductPlanSitemapPromotion,
  getProductSeoGateMode,
} from "../../../lib/product-seo-indexing-policy";
import { buildPlanSitemapPromotionRecommendations } from "../../../lib/plan-sitemap-promotion-recommendation";
import { seoSearchPerformanceBaseline } from "../../../lib/seo-search-performance-baseline";
import {
  createPlanSitemapPromotionRevision,
  parsePlanSitemapPromotionState,
  rollbackLatestPlanSitemapPromotionRevision,
  SEO_PLAN_PROMOTION_SETTING_KEY,
} from "../../../lib/seo-plan-promotion-state";
import { seoSitemapBudgets } from "../../../lib/seo-indexing-policy";
import {
  appendSeoSearchPageImportBatch,
  getEffectiveSeoSearchPageObservations,
  parseSeoSearchPageImportState,
  parseSeoSearchPageObservationRows,
  rollbackLatestSeoSearchPageImport,
  SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
  type SeoSearchPageImportState,
} from "../../../lib/seo-search-observation-import";
import type { SeoSearchEngine } from "../../../lib/seo-search-performance-baseline";

function cleanPromotionValue(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

async function getPlanPromotionDecisionContext() {
  const [audits, demandSignals, trafficConversion, settings] = await Promise.all([
    getCachedProductSeoQualityAudits(),
    getPipelineGrowthSignals(),
    getSeoTrafficConversionOverview(),
    prisma.siteSetting.findMany({
      where: {
        settingKey: {
          in: [
            SEO_PLAN_PROMOTION_SETTING_KEY,
            SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
          ],
        },
      },
      select: { settingKey: true, valueText: true },
    }),
  ]);
  const settingValueByKey = new Map(
    settings.map((setting) => [setting.settingKey, setting.valueText]),
  );
  const state = parsePlanSitemapPromotionState(
    settingValueByKey.get(SEO_PLAN_PROMOTION_SETTING_KEY),
  );
  const searchPageImportState = parseSeoSearchPageImportState(
    settingValueByKey.get(SEO_SEARCH_PAGE_IMPORT_SETTING_KEY),
  );
  const searchObservations = getEffectiveSeoSearchPageObservations({
    baseline: seoSearchPerformanceBaseline,
    state: searchPageImportState,
  });
  const gateMode = getProductSeoGateMode();
  const promotions = audits.map((audit) =>
    getProductPlanSitemapPromotion({
      productSlug: audit.slug,
      qualityStatus: audit.status,
      gateMode,
      currentPlanCount: audit.currentPlanCount,
      promotedProductSlugs: state.activeSlugs,
    }),
  );
  const activePages = promotions.reduce(
    (total, promotion) =>
      total + promotion.productOverviewPages + promotion.includedPlanPages,
    0,
  );
  const recommendations = buildPlanSitemapPromotionRecommendations({
    audits,
    demandSignals,
    searchObservations,
    trafficConversion,
    gateMode,
    availablePageCapacity: Math.max(
      0,
      seoSitemapBudgets.productPlanPages - activePages,
    ),
    promotedProductSlugs: state.activeSlugs,
  });

  return { audits, state, recommendations };
}

function parseSearchEngine(value: FormDataEntryValue | null): SeoSearchEngine {
  if (value === "google" || value === "bing") return value;
  throw new Error("Invalid search engine.");
}

async function persistSeoSearchPageImportState({
  adminId,
  previousState,
  nextState,
  action,
  note,
}: {
  adminId: string;
  previousState: SeoSearchPageImportState;
  nextState: SeoSearchPageImportState;
  action: "import_seo_search_page_observations" | "rollback_seo_search_page_observations";
  note: string;
}) {
  await prisma.$transaction(async (transaction) => {
    const setting = await transaction.siteSetting.upsert({
      where: { settingKey: SEO_SEARCH_PAGE_IMPORT_SETTING_KEY },
      update: {
        groupName: "seo",
        label: "Google and Bing page observation imports",
        valueText: JSON.stringify(nextState),
        isPublic: false,
        note: "Audited page-level webmaster observations. Does not call search platforms or submit URLs.",
      },
      create: {
        settingKey: SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
        groupName: "seo",
        label: "Google and Bing page observation imports",
        valueText: JSON.stringify(nextState),
        isPublic: false,
        note: "Audited page-level webmaster observations. Does not call search platforms or submit URLs.",
      },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: adminId,
        action,
        targetType: "site_setting",
        targetId: setting.id,
        oldValue: previousState,
        newValue: nextState,
        note,
      },
    });
  });
  revalidatePath("/admin/seo");
}

export async function importSeoSearchPageObservationsAction(formData: FormData) {
  const admin = await requireAdmin();
  let engine: SeoSearchEngine;
  let observations;

  try {
    engine = parseSearchEngine(formData.get("engine"));
    observations = parseSeoSearchPageObservationRows({
      engine,
      periodStart: cleanPromotionValue(formData.get("periodStart"), 10),
      periodEnd: cleanPromotionValue(formData.get("periodEnd"), 10),
      text: cleanPromotionValue(formData.get("pageRows"), 250_000),
    });
  } catch {
    redirect("/admin/seo?pageImportError=invalid");
  }

  const existing = await prisma.siteSetting.findUnique({
    where: { settingKey: SEO_SEARCH_PAGE_IMPORT_SETTING_KEY },
    select: { valueText: true },
  });
  const previousState = parseSeoSearchPageImportState(existing?.valueText);
  const batch = {
    id: randomUUID(),
    engine,
    periodStart: observations[0].periodStart,
    periodEnd: observations[0].periodEnd,
    importedAt: new Date().toISOString(),
    actorLabel: admin.email,
    observations,
  };
  const nextState = appendSeoSearchPageImportBatch(previousState, batch);
  await persistSeoSearchPageImportState({
    adminId: admin.id,
    previousState,
    nextState,
    action: "import_seo_search_page_observations",
    note: `Imported ${observations.length} ${engine} page observations for ${batch.periodStart} through ${batch.periodEnd}.`,
  });
  redirect(`/admin/seo?pageImportSaved=${engine}`);
}

export async function rollbackSeoSearchPageObservationsAction(formData: FormData) {
  const admin = await requireAdmin();
  let engine: SeoSearchEngine;
  try {
    engine = parseSearchEngine(formData.get("engine"));
  } catch {
    redirect("/admin/seo?pageImportError=invalid");
  }

  const existing = await prisma.siteSetting.findUnique({
    where: { settingKey: SEO_SEARCH_PAGE_IMPORT_SETTING_KEY },
    select: { valueText: true },
  });
  const previousState = parseSeoSearchPageImportState(existing?.valueText);
  let nextState;
  try {
    nextState = rollbackLatestSeoSearchPageImport(previousState, engine);
  } catch {
    redirect("/admin/seo?pageImportError=history");
  }
  await persistSeoSearchPageImportState({
    adminId: admin.id,
    previousState,
    nextState,
    action: "rollback_seo_search_page_observations",
    note: `Rolled back the latest ${engine} page observation import.`,
  });
  redirect(`/admin/seo?pageImportRolledBack=${engine}`);
}

function getActiveProductPlanPageCount(
  audits: Awaited<ReturnType<typeof getCachedProductSeoQualityAudits>>,
  activeSlugs: string[],
) {
  const activeSet = new Set(activeSlugs);
  return audits.reduce(
    (total, audit) =>
      total
      + (audit.status === "indexable" ? 2 : 0)
      + (activeSet.has(audit.slug) ? audit.currentPlanCount * 2 : 0),
    0,
  );
}

async function persistPlanPromotionState({
  adminId,
  previousState,
  nextState,
  action,
  note,
}: {
  adminId: string;
  previousState: ReturnType<typeof parsePlanSitemapPromotionState>;
  nextState: ReturnType<typeof parsePlanSitemapPromotionState>;
  action: "apply_plan_sitemap_promotion" | "rollback_plan_sitemap_promotion";
  note: string;
}) {
  await prisma.$transaction(async (transaction) => {
    const setting = await transaction.siteSetting.upsert({
      where: { settingKey: SEO_PLAN_PROMOTION_SETTING_KEY },
      update: {
        groupName: "seo",
        label: "Plan sitemap promotion approvals",
        valueText: JSON.stringify(nextState),
        isPublic: false,
        note: "Audited product-level plan sitemap promotion state. Does not submit URLs to webmaster platforms.",
      },
      create: {
        settingKey: SEO_PLAN_PROMOTION_SETTING_KEY,
        groupName: "seo",
        label: "Plan sitemap promotion approvals",
        valueText: JSON.stringify(nextState),
        isPublic: false,
        note: "Audited product-level plan sitemap promotion state. Does not submit URLs to webmaster platforms.",
      },
      select: { id: true },
    });

    await transaction.auditLog.create({
      data: {
        actorId: adminId,
        action,
        targetType: "site_setting",
        targetId: setting.id,
        oldValue: previousState,
        newValue: nextState,
        note,
      },
    });
  });

  revalidatePath("/admin/seo");
  revalidatePath("/sitemap.xml");
}

export async function saveSeoObservationSnapshotAction(formData: FormData) {
  const admin = await requireAdmin();
  let snapshot;

  try {
    snapshot = createSeoObservationSnapshot({
      date: formData.get("date"),
      clicks: formData.get("clicks"),
      impressions: formData.get("impressions"),
      indexedPages: formData.get("indexedPages"),
      discoveredNotIndexed: formData.get("discoveredNotIndexed"),
      crawledNotIndexed: formData.get("crawledNotIndexed"),
    });
  } catch {
    redirect("/admin/seo?baselineError=invalid");
  }

  const existing = await prisma.siteSetting.findUnique({
    where: { settingKey: SEO_OBSERVATION_SETTING_KEY },
    select: { valueText: true },
  });
  const snapshots = appendSeoObservationSnapshot(
    parseSeoObservationSnapshots(existing?.valueText),
    snapshot,
  );

  await prisma.$transaction(async (transaction) => {
    const setting = await transaction.siteSetting.upsert({
      where: { settingKey: SEO_OBSERVATION_SETTING_KEY },
      update: {
        groupName: "seo",
        label: "Google Search Console observation snapshots",
        valueText: JSON.stringify(snapshots),
        isPublic: false,
        note: "Read-only manual snapshots used to compare SEO releases. Does not call Search Console or request indexing.",
      },
      create: {
        settingKey: SEO_OBSERVATION_SETTING_KEY,
        groupName: "seo",
        label: "Google Search Console observation snapshots",
        valueText: JSON.stringify(snapshots),
        isPublic: false,
        note: "Read-only manual snapshots used to compare SEO releases. Does not call Search Console or request indexing.",
      },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: admin.id,
        action: "save_seo_observation_snapshot",
        targetType: "site_setting",
        targetId: setting.id,
        newValue: snapshot,
        note: "Saved a read-only Google Search Console observation snapshot.",
      },
    });
  });

  revalidatePath("/admin/seo");
  redirect("/admin/seo?baselineSaved=1");
}

export async function saveBingObservationSnapshotAction(formData: FormData) {
  const admin = await requireAdmin();
  let snapshot;

  try {
    snapshot = createSeoTrafficObservationSnapshot({
      date: formData.get("date"),
      clicks: formData.get("clicks"),
      impressions: formData.get("impressions"),
    });
  } catch {
    redirect("/admin/seo?bingError=invalid");
  }

  const existing = await prisma.siteSetting.findUnique({
    where: { settingKey: SEO_BING_OBSERVATION_SETTING_KEY },
    select: { valueText: true },
  });
  const snapshots = appendSeoTrafficObservationSnapshot(
    parseSeoTrafficObservationSnapshots(existing?.valueText),
    snapshot,
  );

  await prisma.$transaction(async (transaction) => {
    const setting = await transaction.siteSetting.upsert({
      where: { settingKey: SEO_BING_OBSERVATION_SETTING_KEY },
      update: {
        groupName: "seo",
        label: "Bing Webmaster observation snapshots",
        valueText: JSON.stringify(snapshots),
        isPublic: false,
        note: "Read-only manual snapshots used to compare SEO releases. Does not call Bing or submit URLs.",
      },
      create: {
        settingKey: SEO_BING_OBSERVATION_SETTING_KEY,
        groupName: "seo",
        label: "Bing Webmaster observation snapshots",
        valueText: JSON.stringify(snapshots),
        isPublic: false,
        note: "Read-only manual snapshots used to compare SEO releases. Does not call Bing or submit URLs.",
      },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: admin.id,
        action: "save_bing_observation_snapshot",
        targetType: "site_setting",
        targetId: setting.id,
        newValue: snapshot,
        note: "Saved a read-only Bing Webmaster observation snapshot.",
      },
    });
  });

  revalidatePath("/admin/seo");
  redirect("/admin/seo?bingSaved=1");
}

export async function applyPlanSitemapPromotionAction(formData: FormData) {
  const admin = await requireAdmin();
  const targetSlug = cleanPromotionValue(formData.get("targetSlug"), 100);
  const removeSlug = cleanPromotionValue(formData.get("removeSlug"), 100);
  const operatorNote = cleanPromotionValue(formData.get("operatorNote"), 240);
  const context = await getPlanPromotionDecisionContext();
  const target = context.recommendations.find(
    (item) => item.productSlug === targetSlug,
  );

  if (!target || (target.state !== "add" && target.state !== "swap")) {
    redirect("/admin/seo?promotionError=signal");
  }
  if (target.state === "swap" && !removeSlug) {
    redirect("/admin/seo?promotionError=donor");
  }
  if (removeSlug && !context.state.activeSlugs.includes(removeSlug)) {
    redirect("/admin/seo?promotionError=donor");
  }
  if (removeSlug === targetSlug) {
    redirect("/admin/seo?promotionError=donor");
  }

  const nextActiveSlugs = context.state.activeSlugs
    .filter((slug) => slug !== removeSlug)
    .concat(targetSlug);
  const nextPageCount = getActiveProductPlanPageCount(
    context.audits,
    nextActiveSlugs,
  );
  if (nextPageCount > seoSitemapBudgets.productPlanPages) {
    redirect("/admin/seo?promotionError=budget");
  }

  const reason = [
    `${target.productName} 推广信号 ${target.signalScore}/100。`,
    target.reason,
    operatorNote,
  ].filter(Boolean).join(" ");
  const nextState = createPlanSitemapPromotionRevision({
    current: context.state,
    nextActiveSlugs,
    id: randomUUID(),
    changedAt: new Date().toISOString(),
    actorLabel: admin.email,
    reason,
  });

  await persistPlanPromotionState({
    adminId: admin.id,
    previousState: context.state,
    nextState,
    action: "apply_plan_sitemap_promotion",
    note: `Approved plan sitemap promotion for ${targetSlug}${removeSlug ? ` and removed ${removeSlug}` : ""}.`,
  });
  redirect("/admin/seo?promotionSaved=1");
}

export async function rollbackPlanSitemapPromotionAction(formData: FormData) {
  const admin = await requireAdmin();
  const revisionId = cleanPromotionValue(formData.get("revisionId"), 100);
  const context = await getPlanPromotionDecisionContext();
  let nextState;

  try {
    nextState = rollbackLatestPlanSitemapPromotionRevision({
      current: context.state,
      expectedRevisionId: revisionId,
      id: randomUUID(),
      changedAt: new Date().toISOString(),
      actorLabel: admin.email,
    });
  } catch {
    redirect("/admin/seo?promotionError=history");
  }

  const nextPageCount = getActiveProductPlanPageCount(
    context.audits,
    nextState.activeSlugs,
  );
  if (nextPageCount > seoSitemapBudgets.productPlanPages) {
    redirect("/admin/seo?promotionError=budget");
  }

  await persistPlanPromotionState({
    adminId: admin.id,
    previousState: context.state,
    nextState,
    action: "rollback_plan_sitemap_promotion",
    note: `Rolled back plan sitemap promotion revision ${revisionId}.`,
  });
  redirect("/admin/seo?promotionRolledBack=1");
}
