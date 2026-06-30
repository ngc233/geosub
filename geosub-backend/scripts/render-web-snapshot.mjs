import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key?.startsWith("--")) continue;
  const next = process.argv[index + 1];
  args.set(key.slice(2), next && !next.startsWith("--") ? next : "true");
  if (next && !next.startsWith("--")) index += 1;
}

const url = args.get("url");
const executablePath = resolveBrowserPath(args.get("chrome-path") ?? process.env.CHROME_PATH);
const locale = args.get("locale") ?? "en-US";

if (!url) {
  throw new Error("Missing --url.");
}

function resolveBrowserPath(candidate) {
  if (candidate && existsSync(candidate)) {
    return candidate;
  }

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
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

function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function priceHintsFromText(text) {
  const patterns = [
    /(?:US\$|CA\$|A\$|HK\$|NT\$|S\$|\$)\s?\d+(?:[.,]\d{1,2})?(?:\s?\/(?:mo|month|monthly|yr|year|annually))?/gi,
    /\d+(?:[.,]\d{1,2})?\s?(?:USD|CAD|AUD|EUR|GBP|JPY|INR|PHP|SGD|HKD)(?:\s?\/(?:mo|month|monthly|yr|year|annually))?/gi
  ];
  const seen = new Set();
  const hints = [];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = normalize(match[0]);
      const key = value.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        hints.push(value);
      }
      if (hints.length >= 20) return hints;
    }
  }

  return hints;
}

function diagnose({ title, finalUrl, text, priceHints }) {
  const titleText = title.toLowerCase();
  const urlText = finalUrl.toLowerCase();
  const bodyText = text.toLowerCase();

  if (
    /accounts\.google\.com|\/login|\/signin|\/auth/.test(urlText) ||
    /sign in|log in|login/.test(titleText) ||
    /sign in to continue|log in to continue/.test(bodyText)
  ) {
    return "login_required";
  }

  if (priceHints.length === 0) {
    return "no_price_hints";
  }

  return "price_hints_found";
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
    locale,
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
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});

  const snapshot = await page.evaluate(() => {
    const normalizeInner = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const metaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ??
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ??
      null;

    return {
      title: normalizeInner(document.title),
      description: normalizeInner(metaDescription),
      text: normalizeInner(document.body?.innerText ?? "")
    };
  });

  const text = snapshot.text;
  const priceHints = priceHintsFromText(text);
  const finalUrl = page.url();
  const title = snapshot.title;
  const diagnosis = diagnose({ title, finalUrl, text, priceHints });

  const result = {
    ok: true,
    render_mode: "browser",
    source_url: url,
    final_url: finalUrl,
    http_status: response?.status() ?? null,
    title,
    description: snapshot.description || null,
    diagnosis,
    price_hints: priceHints,
    text_snippet: text.slice(0, 360),
    text_length: text.length,
    captured_at: new Date().toISOString()
  };

  process.stdout.write(JSON.stringify(result));
} finally {
  await browser.close();
}
