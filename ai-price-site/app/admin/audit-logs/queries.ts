import "server-only";

import type { Prisma } from "@prisma/client";
import { clampAdminPage } from "../../../lib/admin-list-params";
import { measureAdminWorkload } from "../../../lib/admin-performance";
import { adminPrisma as prisma } from "../../../lib/prisma";
import {
  formatAuditActionLabel,
  formatAuditTargetTypeLabel,
  getAuditLogRangeStart,
  isUuidValue,
  type AuditLogFilters,
} from "./model";

export type AuditLogListItem = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  oldValue: unknown;
  newValue: unknown;
  note: string | null;
  createdAt: Date;
};

export type AuditLogFilterOptions = {
  actors: Array<{ value: string; label: string }>;
  actions: Array<{ value: string; label: string }>;
  targetTypes: Array<{ value: string; label: string }>;
};

export type AuditLogsPageData = {
  items: AuditLogListItem[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  last24hCount: number;
  activeActorCount: number;
  options: AuditLogFilterOptions;
};

export function buildAuditLogWhere(
  filters: Pick<AuditLogFilters, "q" | "actor" | "action" | "targetType" | "range">,
  now = new Date(),
): Prisma.AuditLogWhereInput {
  const andConditions: Prisma.AuditLogWhereInput[] = [];
  const rangeStart = getAuditLogRangeStart(filters.range, now);

  if (rangeStart) {
    andConditions.push({ createdAt: { gte: rangeStart } });
  }

  if (filters.actor === "system") {
    andConditions.push({ actorId: null });
  } else if (filters.actor) {
    andConditions.push({ actorId: filters.actor });
  }

  if (filters.action) {
    andConditions.push({ action: filters.action });
  }

  if (filters.targetType) {
    andConditions.push({ targetType: filters.targetType });
  }

  if (filters.q) {
    const orConditions: Prisma.AuditLogWhereInput[] = [
      { action: { contains: filters.q, mode: "insensitive" } },
      { targetType: { contains: filters.q, mode: "insensitive" } },
      { note: { contains: filters.q, mode: "insensitive" } },
      { actor: { email: { contains: filters.q, mode: "insensitive" } } },
      { actor: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
    if (isUuidValue(filters.q)) {
      orConditions.push({ targetId: filters.q });
      orConditions.push({ id: filters.q });
    }
    andConditions.push({ OR: orConditions });
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

function buildAuditLogOrderBy(
  filters: Pick<AuditLogFilters, "sort" | "direction">,
): Prisma.AuditLogOrderByWithRelationInput[] {
  if (filters.sort === "action") {
    return [{ action: filters.direction }, { createdAt: "desc" }, { id: "desc" }];
  }
  if (filters.sort === "targetType") {
    return [
      { targetType: filters.direction },
      { createdAt: "desc" },
      { id: "desc" },
    ];
  }
  return [{ createdAt: filters.direction }, { id: "desc" }];
}

export async function getAuditLogsPageData(
  filters: AuditLogFilters,
): Promise<AuditLogsPageData> {
  return measureAdminWorkload("audit-logs.page-data", async () => {
    const now = new Date();
    const where = buildAuditLogWhere(filters, now);
    const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, last24hCount, distinctActorRows, adminUsers, actionRows, targetRows] =
      await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.count({
          where: { createdAt: { gte: last24hStart } },
        }),
        prisma.auditLog.findMany({
          where: { ...where, actorId: { not: null } },
          distinct: ["actorId"],
          select: { actorId: true },
          take: 100,
        }),
        prisma.adminUser.findMany({
          orderBy: { email: "asc" },
          select: { id: true, name: true, email: true, role: true },
          take: 50,
        }),
        prisma.auditLog.findMany({
          distinct: ["action"],
          orderBy: { action: "asc" },
          select: { action: true },
          take: 100,
        }),
        prisma.auditLog.findMany({
          distinct: ["targetType"],
          orderBy: { targetType: "asc" },
          select: { targetType: true },
          take: 100,
        }),
      ]);

    const { page, totalPages } = clampAdminPage(
      filters.page,
      total,
      filters.pageSize,
    );
    const skip = (page - 1) * filters.pageSize;

    const rows =
      total === 0
        ? []
        : await prisma.auditLog.findMany({
            where,
            orderBy: buildAuditLogOrderBy(filters),
            skip,
            take: filters.pageSize,
            select: {
              id: true,
              actorId: true,
              action: true,
              targetType: true,
              targetId: true,
              oldValue: true,
              newValue: true,
              note: true,
              createdAt: true,
              actor: {
                select: {
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          });

    return {
      items: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actorName: row.actor?.name ?? null,
        actorEmail: row.actor?.email ?? null,
        actorRole: row.actor?.role ?? null,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        oldValue: row.oldValue,
        newValue: row.newValue,
        note: row.note,
        createdAt: row.createdAt,
      })),
      total,
      page,
      totalPages,
      pageSize: filters.pageSize,
      last24hCount,
      activeActorCount: distinctActorRows.length,
      options: {
        actors: [
          { value: "system", label: "系统 / 无操作人" },
          ...adminUsers.map((user) => ({
            value: user.id,
            label: user.name ? `${user.name} (${user.email})` : user.email,
          })),
        ],
        actions: actionRows.map((row) => ({
          value: row.action,
          label: `${formatAuditActionLabel(row.action)} (${row.action})`,
        })),
        targetTypes: targetRows.map((row) => ({
          value: row.targetType,
          label: `${formatAuditTargetTypeLabel(row.targetType)} (${row.targetType})`,
        })),
      },
    };
  });
}
