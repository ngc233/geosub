import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const chromium = await loadChromium();

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (key?.startsWith("--")) {
    args.set(key.slice(2), value);
  }
}

const country = (args.get("country") ?? "US").toLowerCase();
const appId = args.get("app-id") ?? "6448311069";
const configuredUrl = args.get("url");
const outputFile = args.get("output-file");
const userAgent =
  args.get("user-agent") ??
  process.env.GEOSUB_APP_STORE_USER_AGENT ??
  "GeoSubPriceResearch/2.8 (+https://geosub.org/data-sources; contact: https://geosub.org/zh/contact)";
const executablePath = resolveBrowserPath(args.get("chrome-path") ?? process.env.CHROME_PATH);
const url = getAppStoreUrl(country, appId, configuredUrl);

async function loadChromium() {
  try {
    return (await import("playwright-core")).chromium;
  } catch {
    const runtimePackage = process.env.PLAYWRIGHT_CORE_PACKAGE_JSON;
    const packageJsonPath = resolvePackageJsonPath(runtimePackage);

    if (packageJsonPath) {
      return createRequire(packageJsonPath)("playwright-core").chromium;
    }

    throw new Error(
      "Cannot find the playwright-core package. Install project dependencies or set PLAYWRIGHT_CORE_PACKAGE_JSON."
    );
  }
}

function resolvePackageJsonPath(candidate) {
  if (!candidate || !existsSync(candidate)) {
    return null;
  }

  if (candidate.endsWith("package.json")) {
    return candidate;
  }

  const packageJsonPath = join(candidate, "package.json");
  return existsSync(packageJsonPath) ? packageJsonPath : null;
}

function getAppStoreUrl(countryCode, appleAppId, value) {
  if (value) {
    const normalized = /apps\.apple\.com\/[a-z]{2}\//i.test(value)
      ? value.replace(/apps\.apple\.com\/[a-z]{2}\//i, `apps.apple.com/${countryCode}/`)
      : value.replace(/apps\.apple\.com\//i, `apps.apple.com/${countryCode}/`);
    if (normalized.match(new RegExp(`/id${appleAppId}(\\?|$)`))) {
      return normalized;
    }
  }

  return `https://apps.apple.com/${countryCode}/app/id${appleAppId}`;
}

function resolveBrowserPath(candidate) {
  if (candidate && existsSync(candidate)) {
    return candidate;
  }

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
        ]
      : [
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/usr/bin/google-chrome",
          "/usr/bin/microsoft-edge"
        ];

  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      `No Chromium-compatible browser found. Set CHROME_PATH or pass --chrome-path. Tried: ${candidates.join(", ")}`
    );
  }

  return found;
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check"
  ]
});

try {
  const context = await browser.newContext({
    locale: "en-US",
    userAgent,
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9"
    },
    viewport: { width: 1365, height: 900 }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(90000);

  const response = await page.goto(url, {
    waitUntil: "commit",
    timeout: 90000
  });

  await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page
    .waitForSelector(".text-pair, text=In-App Purchases", { timeout: 20000 })
    .catch(() => {});

  const pageEvidence = await page.evaluate(() => {
    const normalize = (value) => value.replace(/\s+/g, " ").trim();
    const pairs = [];

    for (const pair of document.querySelectorAll(".text-pair")) {
      const spans = Array.from(pair.querySelectorAll("span")).map((span) =>
        normalize(span.textContent ?? "")
      );
      if (spans.length >= 2 && spans[0] && spans[1]) {
        pairs.push({
          name: spans[0],
          priceText: spans[1]
        });
      }
    }

    if (pairs.length > 0) {
      return {
        items: pairs,
        parserSource: "text-pair-dom",
        hasInAppPurchasesSection: true,
      };
    }

    const visit = (value) => {
      if (!value || typeof value !== "object") return null;
      if (
        value.title === "In-App Purchases" &&
        Array.isArray(value.items)
      ) {
        const embeddedPairs = value.items.flatMap((item) =>
          Array.isArray(item?.textPairs) ? item.textPairs : [],
        );
        const normalizedPairs = embeddedPairs
          .filter((pair) => Array.isArray(pair) && pair.length >= 2)
          .map((pair) => ({
            name: normalize(String(pair[0] ?? "")),
            priceText: normalize(String(pair[1] ?? "")),
          }))
          .filter((pair) => pair.name && pair.priceText);
        if (normalizedPairs.length > 0) return normalizedPairs;
      }

      for (const child of Array.isArray(value) ? value : Object.values(value)) {
        const found = visit(child);
        if (found?.length) return found;
      }
      return null;
    };

    for (const script of document.querySelectorAll('script[type="application/json"], script:not([src])')) {
      const text = script.textContent ?? "";
      if (!text.includes("In-App Purchases") || !text.includes("textPairs")) continue;
      try {
        const embeddedPairs = visit(JSON.parse(text));
        if (embeddedPairs?.length) {
          return {
            items: embeddedPairs,
            parserSource: "embedded-json",
            hasInAppPurchasesSection: true,
          };
        }
      } catch {
        // Non-JSON inline scripts are expected and are ignored.
      }
    }

    const bodyText = normalize(document.body?.innerText ?? "");
    return {
      items: [],
      parserSource: "no-purchases-found",
      hasInAppPurchasesSection: /In[‐-‑–—\s]?App Purchases/i.test(bodyText),
    };
  });

  const items = pageEvidence.items;
  const status = response?.status() ?? null;

  const result = {
    ok: status !== null && status >= 200 && status < 400,
    url,
    finalUrl: page.url(),
    status,
    country: country.toUpperCase(),
    items,
    parserSource: pageEvidence.parserSource,
    hasInAppPurchasesSection: pageEvidence.hasInAppPurchasesSection,
    capturedAt: new Date().toISOString()
  };

  const serializedResult = JSON.stringify(result);
  if (outputFile) {
    writeFileSync(outputFile, serializedResult, "utf8");
  } else {
    process.stdout.write(serializedResult);
  }
} finally {
  await browser.close();
}
