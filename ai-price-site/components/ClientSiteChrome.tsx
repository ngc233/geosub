"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function ClientSiteChrome({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();

  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/admin-login");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      {header}
      <main>{children}</main>
      {footer}
    </>
  );
}