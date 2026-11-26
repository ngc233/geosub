"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  AdminCommandInputError,
  executeAdminCommand,
} from "../../../lib/admin-command";
import { adminPrisma } from "../../../lib/prisma";
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
  getEffectiveSeoSearchPageObservations,
  parseSeoSearchPageImportState,
  SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
} from "../../../lib/seo-search-observation-import";
import { saveSeoSearchImport } from "../../../lib/seo-search-import-storage";
import { SeoSearchImportError } from "../../../lib/seo-search-import-recovery";
import type { SeoSearchEngine } from "../../../lib/seo-search-performance-baseline";

const SEARCH_IMPORT_FALLBACK_ERROR =
  "操作未完成或结果暂时无法确认，输入仍保留。请先刷新另一标签页核对记录，勿重复提交。";

function cleanPromotionValue(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

async function getPlanPromotionDecisionContext() {
  const [audits, demandSignals, trafficConversion, settings] = await Promise.all([
    getCachedProductSeoQualityAudits(),
    getPipelineGrowthSignals(),
    getSeoTrafficConversionOverview(),
    adminPrisma.siteSetting.findMany({
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
  throw new AdminCommandInputError(SEARCH_IMPORT_FALLBACK_ERROR);
}

function getActiveProductPlanPageCount(
  audits: Awaited<ReturnType<typeof getCachedProductSeoQualityAudits>>,
  activeSlugs: string[],
) {
  const activeSet = new Set(activeSlugs);
  return audits.reduce(
    (total, audit) =>
      total +
      (audit.status === "indexable" ? 2 : 0) +
      (activeSet.has(audit.slug) ? audit.currentPlanCount * 2 : 0),
    0,
  );
}

export async function importSeoSearchPageObservationsAction(formData: FormData) {
  const result = await executeAdminCommand({
    name: "seo.search_import.apply",
    capability: "manage",
    input: formData,
    transactional: false,
    parseInput: (raw) => {
      const fd = raw as FormData;
      return {
        recordVersion: String(fd.get("recordVersion") ?? ""),
        engine: parseSearchEngine(fd.get("engine")),
        periodStart: String(fd.get("periodStart") ?? ""),
        periodEnd: String(fd.get("periodEnd") ?? ""),
        text: String(fd.get("pageRows") ?? ""),
        preflightToken: String(fd.get("preflightToken") ?? ""),
        acknowledgeExcluded: fd.get("acknowledgeExcluded") === "yes",
      };
    },
    execute: async ({ admin, input }) => {
      try {
        return await saveSeoSearchImport(adminPrisma, admin, input.recordVersion, {
          kind: "import",
          input: {
            engine: input.engine,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            text: input.text,
          },
          preflightToken: input.preflightToken,
          acknowledgeExcluded: input.acknowledgeExcluded,
          batchId: randomUUID(),
          importedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof SeoSearchImportError) {
          throw new AdminCommandInputError(error.message);
        }
        throw error;
      }
    },
    invalidate: ["seo"],
    revalidatePaths: ["/admin/seo"],
  });

  if (!result.ok) {
    return {
      error:
        result.code === "INVALID_INPUT" || result.code === "CONFLICT"
          ? result.message
          : SEARCH_IMPORT_FALLBACK_ERROR,
    };
  }
  return { ...result.data, message: "页面报表已导入，窗口选择状态已更新。" };
}

export async function rollbackSeoSearchPageObservationsAction(formData: FormData) {
  const result = await executeAdminCommand({
    name: "seo.search_import.rollback",
    capability: "manage",
    input: formData,
    transactional: false,
    parseInput: (raw) => {
      const fd = raw as FormData;
      return {
        recordVersion: String(fd.get("recordVersion") ?? ""),
        engine: parseSearchEngine(fd.get("engine")),
        batchId: String(fd.get("batchId") ?? ""),
        auditId: String(fd.get("auditId") ?? ""),
      };
    },
    execute: async ({ admin, input }) => {
      try {
        return await saveSeoSearchImport(adminPrisma, admin, input.recordVersion, {
          kind: "restore",
          engine: input.engine,
          batchId: input.batchId,
          auditId: input.auditId,
        });
      } catch (error) {
        if (error instanceof SeoSearchImportError) {
          throw new AdminCommandInputError(error.message);
        }
        throw error;
      }
    },
    invalidate: ["seo"],
    revalidatePaths: ["/admin/seo"],
  });

  if (!result.ok) {
    return {
      error:
        result.code === "INVALID_INPUT" || result.code === "CONFLICT"
          ? result.message
          : SEARCH_IMPORT_FALLBACK_ERROR,
    };
  }
  return {
    ...result.data,
    message:
      "已按审计撤销最近导入；同窗口原批次已恢复（首次导入则移除该窗口），其他窗口保持原样。",
  };
}

export async function saveSeoObservationSnapshotAction(formData: FormData) {
  await executeAdminCommand({
    name: "seo.observation_snapshot.save",
    capability: "manage",
    input: formData,
    db: adminPrisma,
    parseInput: (raw) => {
      const fd = raw as FormData;
      try {
        return createSeoObservationSnapshot({
          date: fd.get("date"),
          clicks: fd.get("clicks"),
          impressions: fd.get("impressions"),
          indexedPages: fd.get("indexedPages"),
          discoveredNotIndexed: fd.get("discoveredNotIndexed"),
          crawledNotIndexed: fd.get("crawledNotIndexed"),
        });
      } catch {
        redirect("/admin/seo?baselineError=invalid");
      }
    },
    execute: async ({ input: snapshot, tx }) => {
      const existing = await tx.siteSetting.findUnique({
        where: { settingKey: SEO_OBSERVATION_SETTING_KEY },
        select: { valueText: true },
      });
      const snapshots = appendSeoObservationSnapshot(
        parseSeoObservationSnapshots(existing?.valueText),
        snapshot,
      );
      const setting = await tx.siteSetting.upsert({
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
      return { settingId: setting.id, snapshot };
    },
    audit: ({ data }) => ({
      action: "save_seo_observation_snapshot",
      targetType: "site_setting",
      targetId: data.settingId,
      newValue: data.snapshot,
      note: "Saved a read-only Google Search Console observation snapshot.",
    }),
    invalidate: ["seo"],
    revalidatePaths: ["/admin/seo"],
    afterCommit: () => {
      redirect("/admin/seo?baselineSaved=1");
    },
  });
}

export async function saveBingObservationSnapshotAction(formData: FormData) {
  await executeAdminCommand({
    name: "seo.bing_snapshot.save",
    capability: "manage",
    input: formData,
    db: adminPrisma,
    parseInput: (raw) => {
      const fd = raw as FormData;
      try {
        return createSeoTrafficObservationSnapshot({
          date: fd.get("date"),
          clicks: fd.get("clicks"),
          impressions: fd.get("impressions"),
        });
      } catch {
        redirect("/admin/seo?bingError=invalid");
      }
    },
    execute: async ({ input: snapshot, tx }) => {
      const existing = await tx.siteSetting.findUnique({
        where: { settingKey: SEO_BING_OBSERVATION_SETTING_KEY },
        select: { valueText: true },
      });
      const snapshots = appendSeoTrafficObservationSnapshot(
        parseSeoTrafficObservationSnapshots(existing?.valueText),
        snapshot,
      );
      const setting = await tx.siteSetting.upsert({
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
      return { settingId: setting.id, snapshot };
    },
    audit: ({ data }) => ({
      action: "save_bing_observation_snapshot",
      targetType: "site_setting",
      targetId: data.settingId,
      newValue: data.snapshot,
      note: "Saved a read-only Bing Webmaster observation snapshot.",
    }),
    invalidate: ["seo"],
    revalidatePaths: ["/admin/seo"],
    afterCommit: () => {
      redirect("/admin/seo?bingSaved=1");
    },
  });
}

export async function applyPlanSitemapPromotionAction(formData: FormData) {
  await executeAdminCommand({
    name: "seo.plan_promotion.apply",
    capability: "manage",
    input: formData,
    db: adminPrisma,
    parseInput: (raw) => {
      const fd = raw as FormData;
      return {
        targetSlug: cleanPromotionValue(fd.get("targetSlug"), 100),
        removeSlug: cleanPromotionValue(fd.get("removeSlug"), 100),
        operatorNote: cleanPromotionValue(fd.get("operatorNote"), 240),
      };
    },
    execute: async ({ admin, input, tx }) => {
      const context = await getPlanPromotionDecisionContext();
      const target = context.recommendations.find(
        (item) => item.productSlug === input.targetSlug,
      );

      if (!target || (target.state !== "add" && target.state !== "swap")) {
        redirect("/admin/seo?promotionError=signal");
      }
      if (target.state === "swap" && !input.removeSlug) {
        redirect("/admin/seo?promotionError=donor");
      }
      if (input.removeSlug && !context.state.activeSlugs.includes(input.removeSlug)) {
        redirect("/admin/seo?promotionError=donor");
      }
      if (input.removeSlug === input.targetSlug) {
        redirect("/admin/seo?promotionError=donor");
      }

      const nextActiveSlugs = context.state.activeSlugs
        .filter((slug) => slug !== input.removeSlug)
        .concat(input.targetSlug);
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
        input.operatorNote,
      ]
        .filter(Boolean)
        .join(" ");
      const nextState = createPlanSitemapPromotionRevision({
        current: context.state,
        nextActiveSlugs,
        id: randomUUID(),
        changedAt: new Date().toISOString(),
        actorLabel: admin.email,
        reason,
      });

      const setting = await tx.siteSetting.upsert({
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

      return {
        settingId: setting.id,
        previousState: context.state,
        nextState,
      };
    },
    audit: ({ input, data }) => ({
      action: "apply_plan_sitemap_promotion",
      targetType: "site_setting",
      targetId: data.settingId,
      oldValue: data.previousState,
      newValue: data.nextState,
      note: `Approved plan sitemap promotion for ${input.targetSlug}${input.removeSlug ? ` and removed ${input.removeSlug}` : ""}.`,
    }),
    invalidate: ["seo"],
    revalidatePaths: ["/admin/seo", "/sitemap.xml"],
    afterCommit: () => {
      redirect("/admin/seo?promotionSaved=1");
    },
  });
}

export async function rollbackPlanSitemapPromotionAction(formData: FormData) {
  await executeAdminCommand({
    name: "seo.plan_promotion.rollback",
    capability: "manage",
    input: formData,
    db: adminPrisma,
    parseInput: (raw) => {
      const fd = raw as FormData;
      return {
        revisionId: cleanPromotionValue(fd.get("revisionId"), 100),
      };
    },
    execute: async ({ admin, input, tx }) => {
      const context = await getPlanPromotionDecisionContext();
      let nextState;
      try {
        nextState = rollbackLatestPlanSitemapPromotionRevision({
          current: context.state,
          expectedRevisionId: input.revisionId,
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

      const setting = await tx.siteSetting.upsert({
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

      return {
        settingId: setting.id,
        previousState: context.state,
        nextState,
      };
    },
    audit: ({ input, data }) => ({
      action: "rollback_plan_sitemap_promotion",
      targetType: "site_setting",
      targetId: data.settingId,
      oldValue: data.previousState,
      newValue: data.nextState,
      note: `Rolled back plan sitemap promotion revision ${input.revisionId}.`,
    }),
    invalidate: ["seo"],
    revalidatePaths: ["/admin/seo", "/sitemap.xml"],
    afterCommit: () => {
      redirect("/admin/seo?promotionRolledBack=1");
    },
  });
}
