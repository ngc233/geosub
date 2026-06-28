import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type {
  AnalyticsEventKey,
  AnalyticsPlacement,
} from "../../lib/analytics-events";

type TrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  eventKey: AnalyticsEventKey;
  eventName?: string;
  buttonKey?: string;
  placement?: AnalyticsPlacement | string;
  source?: string;
  productId?: string;
  planId?: string;
  countryId?: string;
  articleId?: string;
};

function isExternalUrl(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export default function TrackedLink({
  href,
  children,
  eventKey,
  eventName,
  buttonKey,
  placement,
  source,
  productId,
  planId,
  countryId,
  articleId,
  ...props
}: TrackedLinkProps) {
  const trackingProps = {
    "data-track-event": eventKey,
    "data-track-name": eventName,
    "data-track-button": buttonKey,
    "data-track-placement": placement,
    "data-track-source": source || "tracked_link",
    "data-track-product-id": productId,
    "data-track-plan-id": planId,
    "data-track-country-id": countryId,
    "data-track-article-id": articleId,
  };

  if (isExternalUrl(href)) {
    return (
      <a href={href} {...trackingProps} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...trackingProps} {...props}>
      {children}
    </Link>
  );
}
