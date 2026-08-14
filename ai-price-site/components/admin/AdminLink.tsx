"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";

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
  ...props
}: AdminLinkProps) {
  const router = useRouter();

  const prefetchDestination = () => {
    if (!prefetchOnIntent) return;
    const hrefValue = typeof href === "string" ? href : href.pathname;
    if (hrefValue?.startsWith("/admin")) router.prefetch(hrefValue);
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
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
      {children}
    </Link>
  );
}
