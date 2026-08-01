"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin-auth";
import {
  isSearchOpportunityWorkflowStatus,
  saveSearchOpportunity,
} from "../../../lib/admin-search-opportunities";
import {
  approveSearchAlias,
  isSearchAliasStatus,
  setSearchAliasStatus,
  type SearchAliasTargetKind,
} from "../../../lib/admin-search-aliases";
import type { SearchGapKind } from "../../../lib/search-opportunity";
import {
  isSearchConversionRepairStatus,
  startSearchConversionRepair,
  updateSearchConversionRepairStatus,
} from "../../../lib/admin-search-conversion-repairs";
import type {
  SearchConversionBlockerCode,
} from "../../../lib/search-conversion-diagnostics";
import { prisma } from "../../../lib/prisma";
import {
  getAuthorityCoverageTaskRecords,
  isAuthorityCoverageTaskStatus,
  startAuthorityCoverageTask,
  updateAuthorityCoverageTaskStatus,
} from "../../../lib/admin-authority-coverage-tasks";
import { getProductSeoQualityAudits } from "../../../lib/product-seo-quality-data";
import { buildAuthorityCoverageQueue } from "../../../lib/search-authority-coverage";

const ALLOWED_KINDS = new Set<SearchGapKind>(["product", "plan", "content"]);
const ALLOWED_DESTINATIONS = [
  "/admin/discovery?",
  "/admin/articles/new?",
] as const;
const ALLOWED_CONVERSION_BLOCKERS = new Set<SearchConversionBlockerCode>([
  "missing_target",
  "missing_price",
  "missing_entry",
  "stale_price",
  "thin_plan_copy",
  "trust_gap",
  "ux_review",
]);

function cleanText(value: FormDataEntryValue | null, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

function getKind(value: FormDataEntryValue | null): SearchGapKind {
  const kind = cleanText(value, 20) as SearchGapKind;
  if (!ALLOWED_KINDS.has(kind)) {
    throw new Error("Invalid search opportunity kind.");
  }
  return kind;
}

function getDays(value: FormDataEntryValue | null) {
  const days = Number(value);
  return [7, 30, 90].includes(days) ? days : 30;
}

function getAliasTargetKind(
  value: FormDataEntryValue | null,
): SearchAliasTargetKind {
  const kind = cleanText(value, 20);
  if (kind !== "product" && kind !== "plan") {
    throw new Error("Invalid search alias target kind.");
  }
  return kind;
}

function getOptionalUuid(value: FormDataEntryValue | null) {
  const id = cleanText(value, 40);
  if (!id) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
    throw new Error("Invalid search alias target ID.");
  }
  return id;
}

function getNonNegativeInteger(
  value: FormDataEntryValue | null,
  max = 1_000_000,
) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > max) {
    throw new Error("Invalid search conversion metric.");
  }
  return parsed;
}

function getConversionBlocker(value: FormDataEntryValue | null) {
  const blocker = cleanText(value, 40) as SearchConversionBlockerCode;
  if (!ALLOWED_CONVERSION_BLOCKERS.has(blocker)) {
    throw new Error("Invalid search conversion blocker.");
  }
  return blocker;
}

function getInternalHref(value: FormDataEntryValue | null) {
  const href = cleanText(value, 1000);
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) {
    throw new Error("Invalid search conversion action path.");
  }
  return href;
}

function getDestination(value: FormDataEntryValue | null) {
  const destination = cleanText(value, 2000);
  if (!ALLOWED_DESTINATIONS.some((prefix) => destination.startsWith(prefix))) {
    throw new Error("Invalid search opportunity destination.");
  }
  return destination;
}

function appendOpportunity(destination: string, query: string) {
  const separator = destination.includes("?") ? "&" : "?";
  return `${destination}${separator}opportunity=${encodeURIComponent(query)}`;
}

async function writeAuditLog({
  adminId,
  opportunityId,
  status,
  query,
}: {
  adminId: string;
  opportunityId: string;
  status: string;
  query: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "update_search_opportunity",
      targetType: "search_opportunity",
      targetId: opportunityId,
      newValue: { status, query },
      note: "Updated a search-demand opportunity from GeoSub Admin.",
    },
  });
}

export async function startSearchOpportunityAction(formData: FormData) {
  const admin = await requireAdmin();
  const query = cleanText(formData.get("query"), 240);
  const kind = getKind(formData.get("kind"));
  const destination = getDestination(formData.get("destination"));
  const opportunity = await saveSearchOpportunity({
    query,
    kind,
    status: "in_progress",
    adminId: admin.id,
  });

  await writeAuditLog({
    adminId: admin.id,
    opportunityId: opportunity.id,
    status: opportunity.status,
    query,
  });
  revalidatePath("/admin/search-demand");
  redirect(appendOpportunity(destination, query));
}

export async function updateSearchOpportunityAction(formData: FormData) {
  const admin = await requireAdmin();
  const query = cleanText(formData.get("query"), 240);
  const kind = getKind(formData.get("kind"));
  const status = cleanText(formData.get("status"), 20);
  const days = getDays(formData.get("days"));

  if (!isSearchOpportunityWorkflowStatus(status)) {
    throw new Error("Invalid search opportunity status.");
  }

  const opportunity = await saveSearchOpportunity({
    query,
    kind,
    status,
    note: cleanText(formData.get("note"), 1000),
    adminId: admin.id,
  });

  await writeAuditLog({
    adminId: admin.id,
    opportunityId: opportunity.id,
    status,
    query,
  });
  revalidatePath("/admin/search-demand");
  redirect(`/admin/search-demand?days=${days}`);
}

export async function startSearchConversionRepairAction(formData: FormData) {
  const admin = await requireAdmin();
  const days = getDays(formData.get("days"));
  const query = cleanText(formData.get("query"), 240);
  const locale = cleanText(formData.get("locale"), 10) || "zh";
  const blockerCode = getConversionBlocker(formData.get("blockerCode"));
  const repair = await startSearchConversionRepair({
    diagnostic: {
      query,
      locale,
      productId: getOptionalUuid(formData.get("productId")),
      planId: getOptionalUuid(formData.get("planId")),
      blockerCode,
      actionHref: getInternalHref(formData.get("actionHref")),
    },
    baseline: {
      resultClickCount: getNonNegativeInteger(formData.get("resultClickCount")),
      planEngagementCount: getNonNegativeInteger(
        formData.get("planEngagementCount"),
      ),
      commercialConversionCount: getNonNegativeInteger(
        formData.get("commercialConversionCount"),
      ),
    },
    days,
    adminId: admin.id,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "start_search_conversion_repair",
      targetType: "search_conversion_repair",
      targetId: repair.id,
      newValue: { query, locale, blockerCode, status: repair.status },
      note: "Started a product-level search conversion repair task.",
    },
  });
  revalidatePath("/admin/search-demand");
  redirect(`/admin/search-demand?days=${days}&repairResult=started`);
}

export async function updateSearchConversionRepairAction(formData: FormData) {
  const admin = await requireAdmin();
  const days = getDays(formData.get("days"));
  const id = getOptionalUuid(formData.get("id"));
  const status = cleanText(formData.get("status"), 20);
  if (!id || !isSearchConversionRepairStatus(status)) {
    throw new Error("Invalid search conversion repair update.");
  }

  await updateSearchConversionRepairStatus({
    id,
    status,
    note: cleanText(formData.get("note"), 1000),
    adminId: admin.id,
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "update_search_conversion_repair",
      targetType: "search_conversion_repair",
      targetId: id,
      newValue: { status },
      note: "Updated a product-level search conversion repair task.",
    },
  });
  revalidatePath("/admin/search-demand");
  redirect(`/admin/search-demand?days=${days}&repairResult=${status}`);
}

export async function approveSearchAliasAction(formData: FormData) {
  const admin = await requireAdmin();
  const days = getDays(formData.get("days"));
  const alias = cleanText(formData.get("alias"), 120);
  const locale = cleanText(formData.get("locale"), 10) || "zh";
  const targetKind = getAliasTargetKind(formData.get("targetKind"));

  let record: { id: string };
  try {
    record = await approveSearchAlias({
      alias,
      locale,
      targetKind,
      productId: getOptionalUuid(formData.get("productId")),
      planId: getOptionalUuid(formData.get("planId")),
      targetTitle: cleanText(formData.get("targetTitle"), 200),
      targetHref: cleanText(formData.get("targetHref"), 500),
      adminId: admin.id,
    });
  } catch {
    redirect(`/admin/search-demand?days=${days}&aliasResult=insufficient`);
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "approve_search_alias",
      targetType: "search_alias",
      targetId: record.id,
      newValue: { alias, locale, targetKind, status: "active" },
      note: "Approved a search alias backed by repeat visitor clicks.",
    },
  });
  revalidatePath("/admin/search-demand");
  redirect(`/admin/search-demand?days=${days}&aliasResult=approved`);
}

export async function updateSearchAliasAction(formData: FormData) {
  const admin = await requireAdmin();
  const days = getDays(formData.get("days"));
  const id = getOptionalUuid(formData.get("id"));
  const status = cleanText(formData.get("status"), 20);
  if (!id || !isSearchAliasStatus(status)) {
    throw new Error("Invalid search alias update.");
  }

  await setSearchAliasStatus({ id, status, adminId: admin.id });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "update_search_alias",
      targetType: "search_alias",
      targetId: id,
      newValue: { status },
      note: "Updated a controlled search alias.",
    },
  });
  revalidatePath("/admin/search-demand");
  redirect(`/admin/search-demand?days=${days}&aliasResult=${status}`);
}

export async function startAuthorityCoverageTaskAction(formData: FormData) {
  const admin = await requireAdmin();
  const productId = getOptionalUuid(formData.get("productId"));
  if (!productId) throw new Error("Authority coverage product is required.");

  const audits = await getProductSeoQualityAudits();
  const audit = audits.find((item) => item.id === productId);
  const item = audit ? buildAuthorityCoverageQueue([audit], [])[0] : null;
  if (
    !audit
    || !item
    || !item.gapCode
    || item.actionKind === "collect"
    || item.actionKind === "monitor"
  ) {
    throw new Error("Authority coverage task is no longer actionable.");
  }

  const task = await startAuthorityCoverageTask({
    audit,
    gapCode: item.gapCode,
    actionKind: item.actionKind,
    actionHref: item.actionHref,
    adminId: admin.id,
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "start_authority_coverage_task",
      targetType: "product",
      targetId: audit.id,
      newValue: {
        authorityTaskId: task.id,
        gapCode: item.gapCode,
        actionKind: item.actionKind,
      },
      note: `Started an authority coverage task for ${audit.title}.`,
    },
  });
  revalidatePath("/admin/search-demand");
  redirect(item.actionHref);
}

export async function updateAuthorityCoverageTaskAction(formData: FormData) {
  const admin = await requireAdmin();
  const days = getDays(formData.get("days"));
  const id = getOptionalUuid(formData.get("id"));
  const requestedStatus = cleanText(formData.get("status"), 20);
  if (!id || !isAuthorityCoverageTaskStatus(requestedStatus)) {
    throw new Error("Invalid authority coverage task update.");
  }

  const audits = await getProductSeoQualityAudits();
  const records = await getAuthorityCoverageTaskRecords(audits);
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error("Authority coverage task was not found.");
  if (requestedStatus === "resolved" && record.effect !== "resolved") {
    redirect(`/admin/search-demand?days=${days}&authorityResult=not-ready`);
  }

  await updateAuthorityCoverageTaskStatus({
    id,
    status: requestedStatus,
    note: cleanText(formData.get("note"), 1000),
    adminId: admin.id,
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "update_authority_coverage_task",
      targetType: "authority_coverage_task",
      targetId: id,
      newValue: {
        status: requestedStatus,
        effect: record.effect,
        productId: record.productId,
        gapCode: record.gapCode,
      },
      note: "Updated an evidence-backed authority coverage task.",
    },
  });
  revalidatePath("/admin/search-demand");
  redirect(`/admin/search-demand?days=${days}&authorityResult=${requestedStatus}`);
}
