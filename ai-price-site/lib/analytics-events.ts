export const ANALYTICS_EVENTS = {
  PAGE_VIEW: "page_view",

  CLICK_DIGITAL_SERVICE_CARD: "click_digital_service_card",
  CLICK_DIGITAL_SERVICE_SIDEBAR: "click_digital_service_sidebar",
  CLICK_INTERNAL_LINK: "click_internal_link",
  CLICK_BUTTON: "click_button",
  VIEW_DIGITAL_SERVICE: "view_digital_service",

  SELECT_PLAN: "select_plan",
  CLICK_PRODUCT_OVERVIEW: "click_product_overview",
  CLICK_RELATED_PRICING_PRODUCT: "click_related_pricing_product",
  CLICK_RELATED_PLAN: "click_related_plan",
  CLICK_COUNTRY: "click_country",
  CLICK_PRICE_MAP_REGION: "click_price_map_region",

  CLICK_OFFICIAL: "click_official",
  DOWNLOAD_PRICE_REPORT: "download_price_report",
  CLICK_AFFILIATE: "click_affiliate",
  CLICK_AD: "click_ad",

  OPEN_SHARE_MODAL: "open_share_modal",
  COPY_SHARE_LINK: "copy_share_link",
  DOWNLOAD_SHARE_IMAGE: "download_share_image",
  SHARE_TO_SOCIAL: "share_to_social",

  SEARCH_DIGITAL_SERVICE: "search_digital_service",
  SEARCH_NO_RESULT: "search_no_result",
  CLICK_SEARCH_RESULT: "click_search_result",
} as const;

export type AnalyticsEventKey =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ANALYTICS_PLACEMENTS = {
  PRICING_CARD: "pricing_card",
  PRODUCT_SIDEBAR: "product_sidebar",
  PLAN_TABS: "plan_tabs",
  PRICE_WORLD_MAP: "price_world_map",
  REGION_PRICE_TABLE: "region_price_table",
  SHARE_MODAL: "share_modal",
  PRODUCT_HERO: "product_hero",
  PRODUCT_OVERVIEW: "product_overview",
  PRODUCT_OVERVIEW_CARD: "product_overview_card",
  PLAN_DETAIL: "plan_detail",
  AFFILIATE_BOX: "affiliate_box",
  AD_SLOT: "ad_slot",
} as const;

export type AnalyticsPlacement =
  (typeof ANALYTICS_PLACEMENTS)[keyof typeof ANALYTICS_PLACEMENTS];
