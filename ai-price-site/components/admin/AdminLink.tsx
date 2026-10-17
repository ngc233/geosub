"use client";

import Link from "next/link";
import { useAdminPermission } from "./AdminPermissions";
import type { ComponentProps } from "react";
import { usePathname, useRouter } from "next/navigation";

type AdminLinkProps = ComponentProps<typeof Link> & {
  prefetchOnIntent?: boolean;
};

/**
 * Admin destinations often execute database-heavy server queries. Load them
 * only after an explicit click instead of prefetching every visible link.
 */
export default function AdminLink({
  children,
  href,
  onClick,
  onFocus,
  onMouseEnter,
  prefetchOnIntent = false,
  scroll,
  ...props
}: AdminLinkProps) {
  const canManage = useAdminPermission("manage");
  const router = useRouter();
  const pathname = usePathname();
  const hrefValue = typeof href === "string" ? href : href.pathname || "";
  const destinationPathname = hrefValue.split("?")[0].split("#")[0];
  const preserveSamePageScroll =
    pathname.startsWith("/admin") && destinationPathname === pathname;

  const prefetchDestination = () => {
    if (!prefetchOnIntent) return;
    if (hrefValue?.startsWith("/admin")) router.prefetch(hrefValue);
  };

  if (!canManage && /\/admin\/[^?#]+\/new$/.test(destinationPathname)) return <span className={props.className} aria-disabled="true" title="仅管理员可新增">{children}</span>;

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      scroll={scroll ?? !preserveSamePageScroll}
      onFocus={(event) => {
        prefetchDestination();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        prefetchDestination();
        onMouseEnter?.(event);
      }}
      onClick={onClick}
    >
      {!canManage && destinationPathname.endsWith("/edit") && children === "编辑" ? "查看" : children}
    </Link>
  );
}
