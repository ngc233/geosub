import Script from "next/script";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "../../lib/prisma";

function isValidGa4Id(value: string) {
  return /^G-[A-Z0-9]{4,}$/.test(value);
}

function isValidGtmId(value: string) {
  return /^GTM-[A-Z0-9]{4,}$/.test(value);
}

async function getAnalyticsSettings() {
  noStore();

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
}

export default async function GoogleAnalyticsScripts() {
  const { ga4Id, gtmId } = await getAnalyticsSettings();

  if (!ga4Id && !gtmId) {
    return null;
  }

  return (
    <>
      {gtmId ? (
        <>
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              className="hidden invisible"
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}

      {ga4Id && !gtmId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics-4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}');
            `}
          </Script>
        </>
      ) : null}
    </>
  );
}
