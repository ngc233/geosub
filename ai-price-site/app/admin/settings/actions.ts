"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  changeCurrentAdminPassword,
  getAdminPasswordPolicyError,
  requireAdmin,
} from "../../../lib/admin-auth";
import type { Prisma } from "@prisma/client";
import {
  AdminCommandInputError,
  executeAdminCommand,
} from "../../../lib/admin-command";
import { ANALYTICS_KEYS, NOTIFICATION_KEYS, settingsVersion, assertSettingsVersion } from "../../../lib/admin-settings-version";
import { getOperationsNotificationConfig } from "../../../lib/operations-notification";
import { PUBLIC_SITE_SETTINGS_CACHE_TAG } from "../../../lib/public-site-settings-cache";

function normalizeOptionalText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function extractTrackingId(
  value: FormDataEntryValue | null,
  pattern: RegExp,
) {
  const normalized = normalizeOptionalText(value).toUpperCase();

  if (!normalized) {
    return {
      id: "",
      invalid: false,
    };
  }

  return {
    id: normalized.match(pattern)?.[0] || "",
    invalid: !pattern.test(normalized),
  };
}

function analyticsErrorCode(ga4Invalid: boolean, gtmInvalid: boolean) {
  if (ga4Invalid && gtmInvalid) return "both";
  if (ga4Invalid) return "ga4";
  if (gtmInvalid) return "gtm";
  return "";
}

async function upsertSetting(tx: Prisma.TransactionClient, {
  settingKey,
  groupName,
  label,
  valueText,
  note,
}: {
  settingKey: string;
  groupName: string;
  label: string;
  valueText: string;
  note: string;
}) {
  await tx.siteSetting.upsert({
    where: {
      settingKey,
    },
    update: {
      groupName,
      label,
      valueText,
      note,
      isPublic: false,
    },
    create: {
      settingKey,
      groupName,
      label,
      valueText,
      note,
      isPublic: false,
    },
  });
}

export async function updateAnalyticsSettings(formData: FormData) {
  const result = await executeAdminCommand({
    name: "settings.analytics.update",
    capability: "manage",
    input: formData,
    parseInput: (raw) => {
      const fd = raw as FormData;
      const ga4 = extractTrackingId(fd.get("ga4_id"), /\bG-[A-Z0-9]{4,}\b/);
      const gtm = extractTrackingId(fd.get("gtm_id"), /\bGTM-[A-Z0-9]{4,}\b/);
      if (analyticsErrorCode(ga4.invalid, gtm.invalid)) {
        throw new AdminCommandInputError(
          "统计 ID 格式无效，请填写有效的 G- 或 GTM- ID。输入仍保留。",
        );
      }
      return { ga4, gtm, recordVersion: fd.get("recordVersion") };
    },
    execute: async ({ input, tx }) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091121)`;
      const rows = await tx.siteSetting.findMany({
        where: { settingKey: { in: ANALYTICS_KEYS } },
      });
      assertSettingsVersion(rows, ANALYTICS_KEYS, input.recordVersion);
      await Promise.all([
        upsertSetting(tx, {
          settingKey: "ga4_id",
          groupName: "analytics",
          label: "Google Analytics 4 Measurement ID",
          valueText: input.ga4.id,
          note: "填写 Measurement ID（例如 G-XXXXXXXXXX），或粘贴包含该 ID 的 Google 代码。",
        }),
        upsertSetting(tx, {
          settingKey: "gtm_id",
          groupName: "analytics",
          label: "Google Tag Manager Container ID",
          valueText: input.gtm.id,
          note: "填写 Container ID（例如 GTM-XXXXXXX），或粘贴包含该 ID 的 Google 代码。若填写 GTM，前台优先加载 GTM。",
        }),
      ]);
      return settingsVersion(
        await tx.siteSetting.findMany({
          where: { settingKey: { in: ANALYTICS_KEYS } },
        }),
        ANALYTICS_KEYS,
      );
    },
    audit: () => ({
      action: "settings_analytics_update",
      targetType: "site_settings",
      newValue: { keys: ANALYTICS_KEYS },
    }),
    invalidate: ["system"],
    revalidatePaths: ["/", "/zh", "/en", "/admin/settings"],
    afterCommit: () => {
      updateTag(PUBLIC_SITE_SETTINGS_CACHE_TAG);
    },
  });

  if (!result.ok) return { error: result.message };
  return { recordVersion: result.data };
}

export async function updateOperationsNotificationSettings(formData: FormData) {
  const result = await executeAdminCommand({
    name: "settings.notifications.update",
    capability: "manage",
    input: formData,
    parseInput: (raw) => {
      const fd = raw as FormData;
      return {
        enabled: fd.get("operations_brief_enabled") === "on",
        recordVersion: fd.get("recordVersion"),
      };
    },
    preflight: async ({ input }) => {
      const config = await getOperationsNotificationConfig();
      if (input.enabled && !config.channelConfigured) {
        throw new AdminCommandInputError("通知渠道尚未配置，本次设置未保存。");
      }
    },
    execute: async ({ input, tx }) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091122)`;
      const rows = await tx.siteSetting.findMany({
        where: { settingKey: { in: NOTIFICATION_KEYS } },
      });
      assertSettingsVersion(rows, NOTIFICATION_KEYS, input.recordVersion);
      await upsertSetting(tx, {
        settingKey: "operations_brief_enabled",
        groupName: "notifications",
        label: "Daily operations brief",
        valueText: input.enabled ? "true" : "false",
        note: "仅在产品采集失败或需要人工处理时，通过服务器配置的安全 Webhook 发送。",
      });
      return settingsVersion(
        await tx.siteSetting.findMany({
          where: { settingKey: { in: NOTIFICATION_KEYS } },
        }),
        NOTIFICATION_KEYS,
      );
    },
    audit: ({ input }) => ({
      action: "settings_notifications_update",
      targetType: "site_settings",
      newValue: { enabled: input.enabled },
    }),
    invalidate: ["system"],
    revalidatePaths: ["/admin", "/admin/settings"],
  });

  if (!result.ok) return { error: result.message };
  return { recordVersion: result.data };
}

export async function updateAdminPassword(formData: FormData) {
  const admin = await requireAdmin("account");
  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/admin/settings?passwordError=missing");
  }

  if (newPassword !== confirmPassword) {
    redirect("/admin/settings?passwordError=mismatch");
  }

  const policyError = getAdminPasswordPolicyError(newPassword);
  if (policyError) {
    redirect("/admin/settings?passwordError=policy");
  }

  const result = await changeCurrentAdminPassword({
    userId: admin.id,
    currentPassword,
    newPassword,
  });

  if (!result.ok) {
    if (result.reason === "session") {
      redirect("/admin-login");
    }

    redirect(`/admin/settings?passwordError=${result.reason}`);
  }

  revalidatePath("/admin/settings");
  redirect(`/admin/settings?passwordChanged=1&revoked=${result.revokedSessions}`);
}
