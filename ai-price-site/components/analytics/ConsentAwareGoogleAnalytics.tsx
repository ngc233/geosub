"use client";

import Script from "next/script";
import { ANALYTICS_CONSENT_GRANTED } from "../../lib/analytics-consent";
import { useAnalyticsConsent } from "./useAnalyticsConsent";

export default function ConsentAwareGoogleAnalytics({
  ga4Id,
  gtmId,
  nonce,
}: {
  ga4Id: string;
  gtmId: string;
  nonce?: string;
}) {
  const { consent } = useAnalyticsConsent();

  if (consent !== ANALYTICS_CONSENT_GRANTED) {
    return null;
  }

  return (
    <>
      {gtmId ? (
        <Script id="google-tag-manager" strategy="afterInteractive" nonce={nonce}>
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      ) : null}

      {ga4Id && !gtmId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
            nonce={nonce}
          />
          <Script
            id="google-analytics-4"
            strategy="afterInteractive"
            nonce={nonce}
          >
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
