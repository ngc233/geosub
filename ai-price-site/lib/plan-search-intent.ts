import type { ProductEditorialContent } from "./product-editorial-content";
import type { PricingFaq } from "./pricing-seo";
import type { SiteLocale } from "./site-locale";

type EditorialContent = ProductEditorialContent & {
  plan: ProductEditorialContent["plans"][string];
};

function withoutTerminalPunctuation(value: string) {
  return value.trim().replace(/[。.!?！？]+$/u, "");
}

function firstSentence(value: string) {
  return withoutTerminalPunctuation(value).split(/[。.!?！？]/u, 1)[0].trim();
}

function lowerFirst(value: string) {
  return value ? value[0].toLocaleLowerCase("en") + value.slice(1) : value;
}

const SEO_DESCRIPTION_MAX_LENGTH = 160;

function clampDescription(value: string, maxLength = SEO_DESCRIPTION_MAX_LENGTH) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;

  const shortened = compact.slice(0, maxLength - 1);
  const lastBoundary = Math.max(
    shortened.lastIndexOf("。"),
    shortened.lastIndexOf("."),
    shortened.lastIndexOf("；"),
    shortened.lastIndexOf(";"),
  );

  return `${
    lastBoundary >= Math.floor(maxLength * 0.55)
      ? shortened.slice(0, lastBoundary)
      : shortened
  }…`;
}

function summarizeSegment(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;

  const shortened = compact.slice(0, Math.max(1, maxLength - 1)).trimEnd();
  const wordBoundary = shortened.lastIndexOf(" ");
  const body =
    wordBoundary >= Math.floor(maxLength * 0.6)
      ? shortened.slice(0, wordBoundary)
      : shortened;

  return `${body}…`;
}

function buildIntentDescription({
  prefix,
  difference,
  separator,
  context,
}: {
  prefix: string;
  difference: string;
  separator: string;
  context: string;
}) {
  const available =
    SEO_DESCRIPTION_MAX_LENGTH -
    prefix.length -
    separator.length -
    context.length;
  if (available < 24) {
    return clampDescription(`${prefix}${difference}${separator}${context}`);
  }

  return `${prefix}${summarizeSegment(difference, available)}${separator}${context}`;
}

export function getPlanSearchIntentCopy({
  locale,
  displayName,
  productName,
  regionCount,
  lowestCountry,
  lowestPrice,
  content,
}: {
  locale: SiteLocale;
  displayName: string;
  productName: string;
  regionCount: number;
  lowestCountry?: string | null;
  lowestPrice?: string | null;
  content: EditorialContent | null;
}): {
  description: string;
  faqs: PricingFaq[];
} | null {
  if (!content || (locale !== "zh" && locale !== "en")) return null;

  const difference = withoutTerminalPunctuation(content.plan.difference);
  const primaryDifference = firstSentence(difference);
  const availability = content.plan.availabilityNote
    ? ` ${content.plan.availabilityNote.trim()}`
    : "";

  if (locale === "zh") {
    const priceContext =
      lowestCountry && lowestPrice
        ? `已核验 ${regionCount} 个地区，当前最低约 ${lowestPrice}（${lowestCountry}），并可查看税费、汇率和购买力。`
        : `比较 ${regionCount} 个已核验地区的月费、税费、汇率和购买力。`;

    return {
      description: buildIntentDescription({
        prefix: `${displayName} 套餐价格：`,
        difference: primaryDifference,
        separator: "。",
        context: priceContext,
      }),
      faqs: [
        {
          q: `${displayName} 适合哪些用户？`,
          a: content.plan.bestFor,
        },
        {
          q: `${displayName} 与其他 ${productName} 套餐有什么区别？`,
          a: `${content.plan.difference}${availability}`.trim(),
        },
      ],
    };
  }

  const priceLead =
    lowestCountry && lowestPrice
      ? `${displayName} starts at ${lowestPrice} per month in ${lowestCountry}.`
      : `${displayName} prices are compared across ${regionCount} reviewed regions.`;

  return {
    description: buildIntentDescription({
      prefix: `${priceLead} `,
      difference: primaryDifference,
      separator: " ",
      context: `Compare ${regionCount} reviewed App Store regions.`,
    }),
    faqs: [
      {
        q: `Who is ${displayName} best for?`,
        a: content.plan.bestFor,
      },
      {
        q: `How is ${displayName} different from other ${productName} plans?`,
        a: `${content.plan.difference}${availability}`.trim(),
      },
    ],
  };
}

export function getPlanIntentSimilarityText(content: EditorialContent) {
  return [
    content.plan.bestFor,
    content.plan.difference,
    content.plan.availabilityNote || "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeIntentText(value: string) {
  return lowerFirst(
    value
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function calculateIntentSimilarity(left: string, right: string) {
  const toTrigrams = (value: string) => {
    const compact = normalizeIntentText(value).replace(/\s+/g, "");
    const grams = new Set<string>();

    if (compact.length < 3) {
      if (compact) grams.add(compact);
      return grams;
    }

    for (let index = 0; index <= compact.length - 3; index += 1) {
      grams.add(compact.slice(index, index + 3));
    }
    return grams;
  };

  const leftGrams = toTrigrams(left);
  const rightGrams = toTrigrams(right);
  if (leftGrams.size === 0 && rightGrams.size === 0) return 1;

  let overlap = 0;
  for (const gram of leftGrams) {
    if (rightGrams.has(gram)) overlap += 1;
  }

  return (2 * overlap) / (leftGrams.size + rightGrams.size);
}
