"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AdminLinkProps = ComponentProps<typeof Link> & {
  prefetchOnIntent?: boolean;
};

function isPlainInternalNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  href: ComponentProps<typeof Link>["href"],
) {
  const hrefValue = typeof href === "string" ? href : href.pathname;

  return Boolean(
    hrefValue?.startsWith("/admin") &&
      event.currentTarget.target !== "_blank" &&
      !event.currentTarget.hasAttribute("download") &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey,
  );
}

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pendingRouteKey, setPendingRouteKey] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const isNavigating = pendingRouteKey === routeKey;

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const prefetchDestination = () => {
    if (!prefetchOnIntent) return;
    const hrefValue = typeof href === "string" ? href : href.pathname;
    if (hrefValue?.startsWith("/admin")) router.prefetch(hrefValue);
  };

  return (
    <>
      {isNavigating ? (
        <div
          data-admin-navigation-progress
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-blue-100"
        >
          <div className="h-full w-1/2 animate-pulse bg-blue-600" />
          <span className="sr-only">正在打开后台页面</span>
        </div>
      ) : null}
      <Link
        {...props}
        href={href}
        prefetch={false}
        aria-busy={isNavigating || undefined}
        onFocus={(event) => {
          prefetchDestination();
          onFocus?.(event);
        }}
        onMouseEnter={(event) => {
          prefetchDestination();
          onMouseEnter?.(event);
        }}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || !isPlainInternalNavigation(event, href)) return;

          setPendingRouteKey(routeKey);
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => setPendingRouteKey(null), 15_000);
        }}
      >
        {children}
      </Link>
    </>
  );
}
