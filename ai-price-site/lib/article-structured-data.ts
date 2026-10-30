import type { StructuredDataType } from "@prisma/client";

// Prisma enum identifiers are not the case-sensitive Schema.org type names.
const schemaOrgTypes = {
  ARTICLE: "Article",
  BLOG_POSTING: "BlogPosting",
  HOW_TO: "HowTo",
  FAQ_PAGE: "FAQPage",
  NEWS_ARTICLE: "NewsArticle",
  TECH_ARTICLE: "TechArticle",
  NONE: null,
} as const satisfies Record<StructuredDataType, string | null>;

export function getArticleSchemaOrgType(type: StructuredDataType) {
  return schemaOrgTypes[type];
}
