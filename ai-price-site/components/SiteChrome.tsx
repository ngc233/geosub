import type { ReactNode } from "react";
import ClientSiteChrome from "./ClientSiteChrome";
import HeaderShell from "./HeaderShell";
import FooterShell from "./FooterShell";

export default function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <ClientSiteChrome header={<HeaderShell />} footer={<FooterShell />}>
      {children}
    </ClientSiteChrome>
  );
}