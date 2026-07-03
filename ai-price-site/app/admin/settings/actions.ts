"use server";

import { revalidatePath } from "next/cache";
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
}
