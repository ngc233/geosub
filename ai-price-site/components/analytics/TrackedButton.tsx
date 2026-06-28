import type { ButtonHTMLAttributes, ReactNode } from "react";
import type {
  AnalyticsEventKey,
  AnalyticsPlacement,
} from "../../lib/analytics-events";

type TrackedButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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

export default function TrackedButton({
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
  type = "button",
  ...props
}: TrackedButtonProps) {
  return (
    <button
      type={type}
      data-track-event={eventKey}
      data-track-name={eventName}
      data-track-button={buttonKey}
      data-track-placement={placement}
      data-track-source={source || "tracked_button"}
      data-track-product-id={productId}
      data-track-plan-id={planId}
      data-track-country-id={countryId}
      data-track-article-id={articleId}
      {...props}
    >
      {children}
    </button>
  );
}
