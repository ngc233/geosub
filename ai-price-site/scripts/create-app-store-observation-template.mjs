import fs from "node:fs";
import path from "node:path";

const outputPath = path.join(
  process.cwd(),
  "data",
  "observations",
  "chatgpt-ios-observations.csv",
);

const countries = [
  { code: "US", storefront: "us" },
  { code: "JP", storefront: "jp" },
  { code: "PH", storefront: "ph" },
];

const plans = [
  { slug: "plus", name: "Plus" },
  { slug: "pro", name: "Pro" },
];

const rows = [
  [
    "product_slug",
    "plan_slug",
    "country_code",
    "billing_platform",
    "source_level",
    "source_url",
    "raw_price",
    "currency",
    "observed_price_text",
    "converted_usd",
    "price_type",
    "tax_included",
    "confidence_score",
    "review_note",
    "screenshot_url",
  ],
];

for (const country of countries) {
  for (const plan of plans) {
    rows.push([
      "chatgpt",
      plan.slug,
      country.code,
      "ios",
      "A",
      `https://apps.apple.com/${country.storefront}/app/chatgpt/id6448311069`,
      "",
      "",
      "",
      "",
      "list_price",
      "unknown",
      "80",
      `Manual App Store observation for ChatGPT ${plan.name} in ${country.code}.`,
      "",
    ]);
  }
}

const csv = rows
  .map((row) =>
    row
      .map((cell) => {
        const value = String(cell ?? "");
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replaceAll('"', '""')}"`;
        }
        return value;
      })
      .join(","),
  )
  .join("\n");

fs.writeFileSync(outputPath, csv, "utf8");

console.log(`[OK] Template created: ${outputPath}`);
console.log("");
console.log("Fill these columns:");
console.log("- raw_price, e.g. 20, 3000, 1100");
console.log("- currency, e.g. USD, JPY, PHP");
console.log("- observed_price_text, e.g. $20/mo, ¥3,000/月, ₱1,100/mo");
console.log("- converted_usd, e.g. 20, 19.10, 18.80");
console.log("- screenshot_url, optional");