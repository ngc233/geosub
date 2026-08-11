import { unstable_cache } from "next/cache";
import { prisma } from "../../lib/prisma";
import {
  PUBLIC_SITE_SETTINGS_CACHE_TAG,
  PUBLIC_SITE_SETTINGS_REVALIDATE_SECONDS,
} from "../../lib/public-site-settings-cache";
import ConsentAwareGoogleAnalytics from "./ConsentAwareGoogleAnalytics";

function isValidGa4Id(value: string) {
  return /^G-[A-Z0-9]{4,}$/.test(value);
}

function isValidGtmId(value: string) {
  return /^GTM-[A-Z0-9]{4,}$/.test(value);
}

const getAnalyticsSettings = unstable_cache(async () => {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: {
        settingKey: {
          in: ["ga4_id", "gtm_id"],
        },
      },
      select: {
        settingKey: true,
        valueText: true,
      },
    });

    const valueByKey = new Map(
      rows.map((row) => [row.settingKey, row.valueText?.trim() || ""]),
    );

    const ga4Id = valueByKey.get("ga4_id") || "";
    const gtmId = valueByKey.get("gtm_id") || "";

    return {
      ga4Id: isValidGa4Id(ga4Id) ? ga4Id : "",
      gtmId: isValidGtmId(gtmId) ? gtmId : "",
    };
  } catch {
    console.warn("Analytics settings unavailable; skipping GA/GTM injection.");

    return {
      ga4Id: "",
      gtmId: "",
    };
  }
}, ["public-analytics-settings"], {
  revalidate: PUBLIC_SITE_SETTINGS_REVALIDATE_SECONDS,
  tags: [PUBLIC_SITE_SETTINGS_CACHE_TAG],
});

export default async function GoogleAnalyticsScripts({
  nonce,
}: {
  nonce?: string;
}) {
  const { ga4Id, gtmId } = await getAnalyticsSettings();

  if (!ga4Id && !gtmId) {
    return null;
  }

  return (
    <ConsentAwareGoogleAnalytics ga4Id={ga4Id} gtmId={gtmId} nonce={nonce} />
  );
}
