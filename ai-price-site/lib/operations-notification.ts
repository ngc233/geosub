import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.ts";
import {
  fingerprintDailyOperationsBrief,
  serializeDailyOperationsBrief,
  shouldSuppressDailyOperationsBrief,
  type DailyOperationsBrief,
} from "./daily-operations-brief.ts";

export type OperationsNotificationConfig = {
  enabled: boolean;
  channelConfigured: boolean;
  endpointHost: string | null;
};

export type OperationsNotificationStatus =
  | "disabled"
  | "no_action"
  | "misconfigured"
  | "suppressed"
  | "sent"
  | "failed";

export type OperationsNotificationDelivery = {
  id: string;
  status: OperationsNotificationStatus;
  level: string;
  title: string;
  summary: string;
  interventionCount: number;
  responseStatus: number | null;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

type LatestDeliveryRow = {
  brief_fingerprint: string;
  delivery_status: OperationsNotificationStatus;
};

type DeliveryHistoryRow = {
  id: string;
  delivery_status: OperationsNotificationStatus;
  brief_level: string;
  title: string;
  summary: string;
  intervention_count: number;
  response_status: number | null;
  error_message: string | null;
  sent_at: Date | null;
  created_at: Date;
};

function configuredEndpoint() {
  const rawUrl = String(process.env.GEOSUB_OPERATIONS_WEBHOOK_URL || "").trim();
  const allowedHosts = String(
    process.env.GEOSUB_OPERATIONS_WEBHOOK_ALLOWED_HOSTS || "",
  )
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (!rawUrl || allowedHosts.length === 0) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname.toLowerCase())) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function getOperationsNotificationConfig(): Promise<OperationsNotificationConfig> {
  const setting = await prisma.siteSetting.findUnique({
    where: { settingKey: "operations_brief_enabled" },
    select: { valueText: true },
  });
  const endpoint = configuredEndpoint();

  return {
    enabled: setting?.valueText === "true",
    channelConfigured: Boolean(endpoint),
    endpointHost: endpoint?.hostname || null,
  };
}

async function getLatestDelivery() {
  const rows = await prisma.$queryRaw<LatestDeliveryRow[]>(Prisma.sql`
    SELECT brief_fingerprint, delivery_status
    FROM operations_notification_deliveries
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

async function recordDelivery({
  brief,
  fingerprint,
  status,
  responseStatus = null,
  errorMessage = null,
}: {
  brief: DailyOperationsBrief;
  fingerprint: string;
  status: OperationsNotificationStatus;
  responseStatus?: number | null;
  errorMessage?: string | null;
}) {
  const payload = serializeDailyOperationsBrief(brief);
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO operations_notification_deliveries (
      brief_fingerprint,
      brief_level,
      delivery_status,
      title,
      summary,
      intervention_count,
      payload,
      response_status,
      error_message,
      sent_at
    ) VALUES (
      ${fingerprint},
      ${brief.level},
      ${status},
      ${brief.title},
      ${brief.summary},
      ${brief.interventionItems.length},
      ${JSON.stringify(payload)}::jsonb,
      ${responseStatus},
      ${errorMessage},
      ${status === "sent" ? new Date() : null}
    )
  `);
}

export async function getOperationsNotificationHistory(limit = 8) {
  const safeLimit = Math.min(20, Math.max(1, Math.trunc(limit)));
  const rows = await prisma.$queryRaw<DeliveryHistoryRow[]>(Prisma.sql`
    SELECT
      id::text,
      delivery_status,
      brief_level,
      title,
      summary,
      intervention_count,
      response_status,
      error_message,
      sent_at,
      created_at
    FROM operations_notification_deliveries
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `);

  return rows.map((row): OperationsNotificationDelivery => ({
    id: row.id,
    status: row.delivery_status,
    level: row.brief_level,
    title: row.title,
    summary: row.summary,
    interventionCount: row.intervention_count,
    responseStatus: row.response_status,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  }));
}

export async function deliverDailyOperationsBrief(brief: DailyOperationsBrief) {
  const config = await getOperationsNotificationConfig();
  const fingerprint = fingerprintDailyOperationsBrief(brief);

  if (!config.enabled) {
    await recordDelivery({ brief, fingerprint, status: "disabled" });
    return { status: "disabled" as const };
  }
  if (brief.interventionItems.length === 0) {
    await recordDelivery({ brief, fingerprint, status: "no_action" });
    return { status: "no_action" as const };
  }

  const endpoint = configuredEndpoint();
  if (!endpoint) {
    await recordDelivery({ brief, fingerprint, status: "misconfigured" });
    return { status: "misconfigured" as const };
  }

  const latest = await getLatestDelivery();
  if (shouldSuppressDailyOperationsBrief(
    latest ? {
      fingerprint: latest.brief_fingerprint,
      status: latest.delivery_status,
    } : null,
    fingerprint,
  )) {
    await recordDelivery({ brief, fingerprint, status: "suppressed" });
    return { status: "suppressed" as const };
  }

  const token = String(process.env.GEOSUB_OPERATIONS_WEBHOOK_TOKEN || "").trim();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(serializeDailyOperationsBrief(brief)),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      await recordDelivery({
        brief,
        fingerprint,
        status: "failed",
        responseStatus: response.status,
        errorMessage: `Webhook returned HTTP ${response.status}`,
      });
      return { status: "failed" as const, statusCode: response.status };
    }

    await recordDelivery({
      brief,
      fingerprint,
      status: "sent",
      responseStatus: response.status,
    });
    return { status: "sent" as const, statusCode: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Webhook request failed";
    await recordDelivery({
      brief,
      fingerprint,
      status: "failed",
      errorMessage: message,
    });
    return { status: "failed" as const, errorMessage: message };
  }
}
