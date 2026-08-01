"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changeCurrentAdminPassword,
  getAdminPasswordPolicyError,
  requireAdmin,
} from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";
import { getOperationsNotificationConfig } from "../../../lib/operations-notification";

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

async function upsertSetting({
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
  await prisma.siteSetting.upsert({
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
  await requireAdmin();
  const ga4 = extractTrackingId(formData.get("ga4_id"), /\bG-[A-Z0-9]{4,}\b/);
  const gtm = extractTrackingId(formData.get("gtm_id"), /\bGTM-[A-Z0-9]{4,}\b/);
  const errorCode = analyticsErrorCode(ga4.invalid, gtm.invalid);

  if (errorCode) {
    redirect(`/admin/settings?analyticsError=${errorCode}`);
  }

  await Promise.all([
    upsertSetting({
      settingKey: "ga4_id",
      groupName: "analytics",
      label: "Google Analytics 4 Measurement ID",
      valueText: ga4.id,
      note: "填写 Measurement ID（例如 G-XXXXXXXXXX），或粘贴包含该 ID 的 Google 代码。",
    }),
    upsertSetting({
      settingKey: "gtm_id",
      groupName: "analytics",
      label: "Google Tag Manager Container ID",
      valueText: gtm.id,
      note: "填写 Container ID（例如 GTM-XXXXXXX），或粘贴包含该 ID 的 Google 代码。若填写 GTM，前台优先加载 GTM。",
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/zh");
  revalidatePath("/en");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function updateOperationsNotificationSettings(formData: FormData) {
  await requireAdmin();
  const enabled = formData.get("operations_brief_enabled") === "on";
  const config = await getOperationsNotificationConfig();

  if (enabled && !config.channelConfigured) {
    redirect("/admin/settings?notificationError=channel");
  }

  await upsertSetting({
    settingKey: "operations_brief_enabled",
    groupName: "notifications",
    label: "Daily operations brief",
    valueText: enabled ? "true" : "false",
    note: "仅在产品采集失败或需要人工处理时，通过服务器配置的安全 Webhook 发送。",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?notificationSaved=1");
}

export async function updateAdminPassword(formData: FormData) {
  const admin = await requireAdmin();
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
