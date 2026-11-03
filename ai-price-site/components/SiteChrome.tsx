import type { ReactNode } from "react";
import ClientSiteChrome from "./ClientSiteChrome";
import HeaderShell from "./HeaderShell";
import FooterShell from "./FooterShell";
import { getCachedPublicDisplayRates } from "../lib/public-display-rates";

export default async function SiteChrome({ children }: { children: ReactNode }) {
  const displayRates = await getCachedPublicDisplayRates();
  return (
    <ClientSiteChrome displayRates={displayRates} header={<HeaderShell />} footer={<FooterShell />}>
      {children}
    </ClientSiteChrome>
  );
}
