"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changeCurrentAdminPassword,
  getAdminPasswordPolicyError,
  requireAdmin,
} from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";

function normalizeOptionalText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function validateGa4Id(value: string) {
  if (!value) return;
  if (!/^G-[A-Z0-9]{4,}$/.test(value)) {
    throw new Error("GA4 Measurement ID 格式应类似 G-XXXXXXXXXX。");
  }
}

function validateGtmId(value: string) {
  if (!value) return;
  if (!/^GTM-[A-Z0-9]{4,}$/.test(value)) {
    throw new Error("GTM Container ID 格式应类似 GTM-XXXXXXX。");
  }
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
  const ga4Id = normalizeOptionalText(formData.get("ga4_id")).toUpperCase();
  const gtmId = normalizeOptionalText(formData.get("gtm_id")).toUpperCase();

  validateGa4Id(ga4Id);
  validateGtmId(gtmId);

  await Promise.all([
    upsertSetting({
      settingKey: "ga4_id",
      groupName: "analytics",
      label: "Google Analytics 4 Measurement ID",
      valueText: ga4Id,
      note: "只填写 Measurement ID，例如 G-XXXXXXXXXX，不要粘贴整段脚本。",
    }),
    upsertSetting({
      settingKey: "gtm_id",
      groupName: "analytics",
      label: "Google Tag Manager Container ID",
      valueText: gtmId,
      note: "只填写 Container ID，例如 GTM-XXXXXXX。若填写 GTM，前台优先加载 GTM。",
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/zh");
  revalidatePath("/en");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
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
