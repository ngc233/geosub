"use client";

import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import { useAdminPermission } from "./AdminPermissions";
import type { ComponentProps } from "react";
import { usePathname, useRouter } from "next/navigation";

type AdminLinkProps = ComponentProps<typeof Link> & {
  prefetchOnIntent?: boolean;
  showPending?: boolean;
};

function NavigationPending() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-live="polite"
      className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2"
    >
      {pending ? <>
        <LoaderCircle aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
        <span className="sr-only">正在打开页面</span>
      </> : null}
    </span>
  );
}

// Large result lists stay click-only. Navigation can opt into Next's partial
// prefetch, which stops at admin/loading.tsx instead of fetching every dataset.
export default function AdminLink({
  children,
  href,
  onClick,
  onFocus,
  onMouseEnter,
  prefetchOnIntent = false,
  prefetch = false,
  showPending = false,
  className,
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

  if (!canManage && /\/admin\/[^?#]+\/new$/.test(destinationPathname)) {
    return <span className={className} aria-disabled="true" title="仅管理员可新增">{children}</span>;
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch}
      className={showPending ? `${className || ""} relative pr-8` : className}
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
      {showPending ? <NavigationPending /> : null}
    </Link>
  );
}
