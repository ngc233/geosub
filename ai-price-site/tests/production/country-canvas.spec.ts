import { test, expect } from "@playwright/test";
// Requires the handwritten eight-product V6 local database, never production.
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "geosub_analytics_consent", value: `denied.${Math.floor(Date.now() / 1000)}`, domain: "127.0.0.1", path: "/" }]);
});
test("offscreen logos and flags wait for visibility while the heading flag and font stay unchanged", async ({ page }) => {
  const errors: string[] = [];page.on("pageerror", error => errors.push(error.message));
  const requested: string[] = [];
  page.on("request", request => { if (request.url().includes("/country-flags/")) requested.push(new URL(request.url()).pathname); });
  await page.goto("/zh/countries/turkey", { waitUntil: "networkidle" });
  await expect(page.locator('head link[rel="preload"][as="font"]')).toHaveCount(0);
  const peers = page.locator(".gs-country-peers");
  expect((await peers.boundingBox())!.y).toBeGreaterThan(page.viewportSize()!.height + 100);
  expect(requested).toEqual(["/country-flags/tr.svg"]);
  await expect(page.locator(".gs-country-title img")).toBeVisible();
  await expect(page.locator(".gs-country-title img")).toHaveAttribute("fetchpriority", "low");
  await expect(peers.locator("img")).toHaveCount(0);
  const logos = page.locator('.gs-country-product [data-brand-source="approved-local"]');
  await expect(logos).toHaveCount(8);
  for (const index of [0, 1]) {
    await expect(logos.nth(index).locator("img")).toHaveCount(1);
    await expect(logos.nth(index).locator("img")).toHaveAttribute("fetchpriority", "low");
    await expect(logos.nth(index).locator("noscript")).toHaveCount(0);
  }
  expect(await logos.locator("img").count()).toBeLessThan(8);
  for (const logo of await logos.all()) {
    await logo.scrollIntoViewIfNeeded();
    await expect(logo.locator("img")).toBeVisible();
    await expect.poll(() => logo.locator("img").evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  await peers.scrollIntoViewIfNeeded();
  await expect(peers.locator("img")).toHaveCount(4);
  for (const flag of await peers.locator("img").all()) {
    await expect(flag).toBeVisible();
    await expect.poll(() => flag.evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  expect([...new Set(requested)].sort()).toEqual(["/country-flags/in.svg", "/country-flags/jp.svg", "/country-flags/ph.svg", "/country-flags/tr.svg"]);
  await page.evaluate(() => document.fonts.ready);
  const fontFaces = await page.evaluate(() => [...document.fonts].filter(font => font.family.includes("GeoSub Country Numerals")).map(font => ({ display: font.display, status: font.status })));
  expect(fontFaces.map(font => font.display)).toEqual(["swap"]);
  expect(fontFaces.filter(font => font.status === "loaded")).toHaveLength(1);
  const fontRequests = await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => /\.woff2(?:\?|$)/.test(entry.name)).map(entry => entry.name));
  expect(fontRequests).toEqual([]);
  // API-unavailable fallback is unit tested in isolation: deleting the global API
  // would also break the existing shared number animation outside this change.
  expect(errors).toEqual([]);
});
test("four countries show raw-median conclusions, original local prices and no overflow", async ({ page }) => {
  const errors: string[] = [];page.on("pageerror", e => errors.push(e.message));
  for (const [slug, name, percent, direction] of [["turkey", "土耳其", 13, "便宜"], ["india", "印度", 1, "便宜"], ["philippines", "菲律宾", 14, "便宜"], ["japan", "日本", 2, "贵"]]) {
    await page.goto(`/zh/countries/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`在${name}订阅，一半比美国${direction} ${percent}% 以上`);
    await expect(page.getByLabel("订阅价格统计")).toContainText("/8");
    await expect(page.locator(".gs-country-item:visible")).toHaveCount(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const link = page.locator(".gs-country-row").first();await link.focus();
    await expect(link).toHaveCSS("min-height", "64px");
    expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    // Let focus-triggered prefetch finish before navigating away in WebKit.
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
});
test("currency prices settle exactly, keyboard filters preserve rows and evidence links", async ({ page }) => {
  const planRequests: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (/^\/zh\/(?:ai-pricing|streaming-pricing)\/[^/]+\/[^/]+$/.test(path)) planRequests.push(path);
  });
  await page.goto("/zh/countries/turkey");
  const first = page.locator(".gs-country-item:visible").first();
  await first.hover();
  await expect(first.locator(".gs-country-local")).toHaveText("TRY 576.00");
  await expect(first.locator(".gs-country-price [data-gs-price] > [aria-hidden]").first()).toHaveText("¥ 134.40");
  const trigger = page.getByRole("button", { name: /折合为/ });await trigger.click();
  await page.getByRole("option", { name: /^USD ·/ }).click();
  await expect(first.locator(".gs-country-price [data-gs-price] > [aria-hidden]").first()).toHaveText("$ 19.20");
  await expect(first.locator(".gs-country-us [data-gs-price] > [aria-hidden]").first()).toHaveText("$ 24.00");
  await page.waitForLoadState("networkidle");
  expect(planRequests).toEqual([]);
  const originalLinks = await page.locator("main a").evaluateAll(nodes => nodes.map(x => x.getAttribute("href")));
  const all = page.getByRole("tab", { name: "全部", exact: true });await all.focus();await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "AI 订阅", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".gs-country-item:visible")).toHaveCount(4);
  await expect(page.locator(".gs-country-list-viewport")).toHaveCSS("transition-duration", "0.22s");
  await page.keyboard.press("ArrowRight");await expect(page.locator('.gs-country-item:visible[data-category="streaming"]')).toHaveCount(4);
  expect(await page.locator("main a").evaluateAll(nodes => nodes.map(x => x.getAttribute("href")))).toEqual(originalLinks);
  await all.click();await expect(page.locator(".gs-country-item:visible")).toHaveCount(8);
  const evidence = page.locator("details.gs-country-evidence > summary");
  await expect(evidence).toHaveCount(1);
  const details = page.locator("details.gs-country-evidence");
  await expect(details).toHaveJSProperty("open", false);
  const content = details.locator(".gs-country-evidence-content");
  await expect(content).toBeHidden();
  await expect(content.locator(".gs-country-method")).toContainText("少于 5 个可比套餐时不显示中位数结论");
  await expect(content.locator('nav[aria-label="价格探索"] a')).toHaveCount(3);
  await expect(content.locator('nav[aria-label="套餐分类"] a')).toHaveCount(2);
  await evidence.focus();await page.keyboard.press("Enter");
  await expect(details).toHaveJSProperty("open", true);
  await expect(page.getByRole("link", { name: "原始快照", exact: true })).toHaveCount(8);
  await expect(content).toBeVisible();
  await expect(content.getByRole("link", { name: "价格变化记录", exact: true })).toBeVisible();
  await content.getByRole("link", { name: "流媒体订阅 4", exact: true }).click();
  await expect(page.locator('.gs-country-item:visible[data-category="streaming"]')).toHaveCount(4);
  await all.click();
  await evidence.focus();await page.keyboard.press("Space");
  await expect(details).toHaveJSProperty("open", false);
  await expect(content).toBeHidden();
  await trigger.focus();await page.keyboard.press("Enter");await page.keyboard.press("Escape");await expect(trigger).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".gs-country-list-viewport")).toHaveCSS("transition-duration", "0s");
  // The whole row is a native link, including its local-price cell.
  await first.locator(".gs-country-local").click();
  await expect(page).toHaveURL(/\/zh\/ai-pricing\/chatgpt\/plus$/);
});
test("server HTML keeps prices and conclusions without JavaScript, unknown countries remain 404", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport, colorScheme: testInfo.project.use.colorScheme });const page = await context.newPage();
  await page.goto(`${baseURL}/zh/countries/turkey`);
  await expect(page.locator("h1")).toContainText("13%");await expect(page.locator(".gs-country-item")).toHaveCount(8);
  await expect(page.locator(".gs-country-product img")).toHaveCount(8);
  await expect(page.locator(".gs-country-peers img")).toHaveCount(4);
  await expect(page.locator(".gs-country-price").first()).toContainText("134.40");
  const details = page.locator("details.gs-country-evidence");
  await expect(details).toHaveJSProperty("open", false);
  await details.locator("summary").click();
  await expect(details).toHaveJSProperty("open", true);
  await expect(details.locator(".gs-country-method")).toBeVisible();
  await expect(details.getByRole("link", { name: "原始快照", exact: true })).toHaveCount(8);
  await expect(details.getByRole("link", { name: "价格变化记录", exact: true })).toBeVisible();
  await details.getByRole("link", { name: "流媒体订阅 4", exact: true }).click();
  await expect(page).toHaveURL(/#streaming-plans$/);
  await expect(page.locator("#streaming-plans")).toBeVisible();
  // Hash navigation uses the site's smooth scrolling. Verify it reaches the
  // actual target before scrolling back, rather than racing two scrolls.
  await expect.poll(() => page.locator("#streaming-plans").evaluate(el => Math.abs(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)))).toBeLessThanOrEqual(1);
  const summary = details.locator("summary");
  const box = await summary.boundingBox();
  await page.mouse.wheel(0, box!.y - page.viewportSize()!.height / 2);
  await expect(summary).toBeInViewport();
  await summary.click();
  await expect(details).toHaveJSProperty("open", false);
  expect((await page.goto(`${baseURL}/zh/countries/not-a-real-country`))!.status()).toBe(404);
  await context.close();
});
test("unavailable local flags fall back to a decorative country code", async ({ page }) => {
  await page.route("**/country-flags/*.svg", route => route.abort());
  await page.goto("/zh/countries/turkey");
  const flag = page.locator(".gs-country-title .gs-country-flag > span");
  await expect(flag).toHaveText("TR");
  await expect(flag).toHaveAttribute("aria-hidden", "true");
  await expect(flag.locator("img")).toHaveCount(0);
});

test("sequential keyboard navigation follows table, support cards, then data disclosure", async ({ page, browserName }) => {
  await page.goto("/zh/countries/turkey");
  const cards = page.locator(".gs-country-support"), details = page.locator("details.gs-country-evidence");
  expect(await page.locator(".gs-country-pricing").evaluate(el => el.nextElementSibling?.className)).toBe("gs-country-support");
  expect(await cards.evaluate(el => el.nextElementSibling?.className)).toBe("gs-country-evidence");
  const tableBox = await page.locator(".gs-country-pricing").boundingBox();
  const cardsBox = await cards.boundingBox(), detailsBox = await details.boundingBox();
  expect(tableBox!.y + tableBox!.height).toBeLessThanOrEqual(cardsBox!.y);
  expect(cardsBox!.y + cardsBox!.height).toBeLessThanOrEqual(detailsBox!.y);
  await page.locator(".gs-country-row").last().focus();
  // WebKit on macOS uses Option+Tab for navigation through all links.
  const next = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const targets = [page.locator(".gs-country-notes > a"), ...await page.locator(".gs-country-peers > a").all(), details.locator("summary")];
  for (const target of targets) { await page.keyboard.press(next);await expect(target).toBeFocused(); }
  await page.keyboard.press("Enter");await expect(details).toHaveJSProperty("open", true);
  await page.keyboard.press(next);
  await expect(details.getByRole("link", { name: "按国家找订阅", exact: true })).toBeFocused();
  await page.waitForLoadState("networkidle");
});
