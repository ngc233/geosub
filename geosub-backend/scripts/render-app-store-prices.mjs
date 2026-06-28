import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

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
const executablePath = resolveBrowserPath(args.get("chrome-path") ?? process.env.CHROME_PATH);
const url = `https://apps.apple.com/${country}/app/chatgpt/id${appId}`;

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
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
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

  const items = await page.evaluate(() => {
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
      return pairs;
    }

    const bodyText = normalize(document.body?.innerText ?? "");
    const fallbackMatches = [];
    const knownNames = ["ChatGPT Plus", "ChatGPT Pro 20x"];
    for (const name of knownNames) {
      const index = bodyText.indexOf(name);
      if (index < 0) continue;
      const slice = bodyText.slice(index, index + 180);
      const price = slice.match(/[$€£¥₱CA$A$S$]?\s?[0-9][0-9,]*(?:\.[0-9]+)?(?:\/mo|\/month| per month)?/i);
      if (price) {
        fallbackMatches.push({
          name,
          priceText: price[0]
        });
      }
    }

    return fallbackMatches;
  });

  const result = {
    ok: items.length > 0,
    url,
    finalUrl: page.url(),
    status: response?.status() ?? null,
    country: country.toUpperCase(),
    items,
    capturedAt: new Date().toISOString()
  };

  process.stdout.write(JSON.stringify(result));
} finally {
  await browser.close();
}
