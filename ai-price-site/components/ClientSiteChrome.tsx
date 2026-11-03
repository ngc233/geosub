"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PricingDisplayProvider } from "./PricingDisplayContext";
import { usesUnifiedPublicStyle } from "../lib/public-style-rollout";
import type { PublicDisplayRates } from "../lib/public-display-currency";

export default function ClientSiteChrome({
  children,
  header,
  footer,
  displayRates,
}: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  displayRates: PublicDisplayRates;
}) {
  const pathname = usePathname();
  const unified = usesUnifiedPublicStyle(pathname);

  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/admin-login");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <PricingDisplayProvider rates={displayRates} unified={unified} pathname={pathname}>
      <div data-gs-motion={unified ? "" : undefined} data-gs-plan-motion={unified && /^\/zh\/(?:ai-pricing|streaming-pricing)\/[^/]+\/[^/]+\/?$/.test(pathname) ? "" : undefined} className={`gs-public-shell${unified ? " gs-public-unified" : ""}`}>
        <div className={unified ? "gs-unified-layout" : /^\/(zh|en)\/ai-pricing\/chatgpt\/plus\/?$/.test(pathname) ? "gs-site-frame" : undefined}>
          {header}
          <div className="gs-public-site">{children}</div>
          {footer}
        </div>
      </div>
    </PricingDisplayProvider>
  );
}
