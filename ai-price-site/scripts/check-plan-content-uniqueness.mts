import {
  calculateIntentSimilarity,
  getPlanIntentSimilarityText,
  getPlanSearchIntentCopy,
} from "../lib/plan-search-intent.ts";
import {
  getPlanEditorialIndexingStatus,
  getProductEditorialCatalog,
} from "../lib/product-editorial-content.ts";

const MAX_SIMILARITY = 0.72;
const failures: string[] = [];
const report: Array<{
  locale: "zh" | "en";
  currentPlans: number;
  maximumSimilarity: number;
  closestPair: string;
}> = [];

for (const locale of ["zh", "en"] as const) {
  const entries = getProductEditorialCatalog(locale).filter(
    ({ productSlug, planSlug }) =>
      getPlanEditorialIndexingStatus(productSlug, planSlug) === "current",
  );
  const descriptions = new Map<string, string>();
  let maximumSimilarity = 0;
  let closestPair = "";

  for (const entry of entries) {
    const key = `${entry.productSlug}/${entry.planSlug}`;
    const copy = getPlanSearchIntentCopy({
      locale,
      displayName: `${entry.productSlug} ${entry.planSlug}`,
      productName: entry.productSlug,
      regionCount: 24,
      lowestCountry: locale === "zh" ? "日本" : "Japan",
      lowestPrice: "$19.99",
      content: entry.content,
    });

    if (!copy || copy.description.length < 70 || copy.description.length > 180) {
      failures.push(`${locale}/${key} has an invalid search description`);
      continue;
    }

    const duplicate = descriptions.get(copy.description);
    if (duplicate) {
      failures.push(`${locale}/${key} duplicates the description for ${duplicate}`);
    }
    descriptions.set(copy.description, key);
  }

  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      const similarity = calculateIntentSimilarity(
        getPlanIntentSimilarityText(entries[left].content),
        getPlanIntentSimilarityText(entries[right].content),
      );

      if (similarity > maximumSimilarity) {
        maximumSimilarity = similarity;
        closestPair = `${entries[left].productSlug}/${entries[left].planSlug} <> ${entries[right].productSlug}/${entries[right].planSlug}`;
      }
      if (similarity >= MAX_SIMILARITY) {
        failures.push(
          `${locale}/${entries[left].productSlug}/${entries[left].planSlug} <> ${entries[right].productSlug}/${entries[right].planSlug} is ${(similarity * 100).toFixed(1)}% similar`,
        );
      }
    }
  }

  report.push({
    locale,
    currentPlans: entries.length,
    maximumSimilarity: Number(maximumSimilarity.toFixed(3)),
    closestPair,
  });
}

console.log(JSON.stringify({ threshold: MAX_SIMILARITY, report }, null, 2));

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Plan content uniqueness check passed.");
}
