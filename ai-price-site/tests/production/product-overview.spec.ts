import { test, expect } from "@playwright/test";

test("initial prices avoid per-cell style reads; currency changes still animate and offscreen flags load on access", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.getComputedStyle;
    Object.assign(window, { priceStyleReads: 0 });
    window.getComputedStyle = function(element, pseudo) {
      if (element.hasAttribute("data-gs-number")) (window as unknown as {priceStyleReads:number}).priceStyleReads++;
      return original.call(window, element, pseudo);
    };
  });
  const flags: string[] = [];
  page.on("request", request => { if (request.url().includes("/flags/")) flags.push(new URL(request.url()).pathname); });
  await page.goto("/zh/ai-pricing/chatgpt");
  await expect(page.getByRole("button", {name:/折合为/})).toBeVisible();
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as unknown as {priceStyleReads:number}).priceStyleReads)).toBe(0);
  expect(flags).not.toContain("/flags/gb.svg");
  const lastFlag = page.locator('[data-country="GB"] .gs-home-flag');
  await lastFlag.scrollIntoViewIfNeeded();
  await expect(lastFlag.locator("img")).toBeVisible();
  await expect.poll(() => lastFlag.locator("img").evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", {name:/折合为/}).click();
  await page.getByRole("option", {name:/^USD ·/}).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {priceStyleReads:number}).priceStyleReads)).toBeGreaterThan(0);
  await expect(page.locator(".gs-product-conclusion [data-gs-price] > span[aria-hidden]").first()).toHaveText("$ 4.74");
  await page.getByRole("button", {name:/折合为/}).click();
  await page.getByRole("option", {name:/^HKD ·/}).click();
  const heroPrice = page.locator(".gs-product-conclusion [data-gs-price]").first();
  await expect(heroPrice).toContainText("HK$");
  expect(await heroPrice.evaluate(element=>getComputedStyle(element).fontFamily)).not.toContain("GeoSub Price Numerals");
  await page.getByRole("button", {name:/折合为/}).click();
  await page.getByRole("option", {name:/^CNY ·/}).click();
  await expect(heroPrice.locator('span[aria-hidden="true"]')).toHaveText("¥ 33.18");
  expect(await heroPrice.evaluate(element=>getComputedStyle(element).fontFamily)).toContain("GeoSub Price Numerals");
});

// Dedicated handwritten local fixture: 3 ChatGPT plans, 12 regions, sparse
// Netflix Premium with no US row. Run against build + start, never production.
test("matrix and cards show the same prices; sorting, currency and expansion work", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/zh/ai-pricing/chatgpt");
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveAttribute("href", /^\/_next\/static\/media\/geosub-price-numerals-700\..*\.woff2$/);
  await expect(page.locator(".gs-product-plan")).toHaveCount(3);
  await expect(page.locator(".gs-product-matrix-row:visible")).toHaveCount(8);
  await expect(page.locator(".gs-product-conclusion")).toContainText("Go");
  await page.getByRole("columnheader").getByRole("button", { name: /^Plus/ }).click();
  await page.getByRole("button", { name: "展开全部 12 个地区" }).click();
  await expect(page.locator(".gs-product-matrix-row:visible")).toHaveCount(12);
  await expect(page.locator(".gs-product-table-viewport")).toHaveCSS("transition-duration", "0.22s");
  await page.waitForTimeout(260);
  const rows = page.locator(".gs-product-matrix-row:visible");
  const values = () => rows.locator('.gs-product-matrix-cell[data-selected="true"] [data-gs-price] > span[aria-hidden="true"]').allTextContents().then(items => items.map(text => Number(text.replace(/[^\d.]/g, ""))));
  const asc = await values(); expect(asc).toEqual([...asc].sort((a, b) => a - b));
  const minimum = Math.min(...asc);
  await expect(page.locator('.gs-product-plan').filter({has:page.getByRole("heading", {name:"Plus", exact:true})}).locator('.gs-product-plan-price')).toContainText(minimum.toFixed(2));
  await page.getByRole("tab", { name: "从高到低" }).click();
  const desc = await values(); expect(desc).toEqual([...desc].sort((a, b) => b - a));
  await expect(page.locator('[role="columnheader"][aria-sort="descending"]')).toContainText("Plus");
  await page.getByRole("columnheader").getByRole("button", { name: /^Go/ }).click();
  await expect(page.locator('[role="columnheader"][aria-sort="ascending"]')).toContainText("Go");
  await expect(rows.last()).toHaveAttribute("data-country", "KR");
  await expect(rows.last().locator('[data-selected="true"]')).toContainText("没有可比价格");
  await page.getByRole("button", { name: /折合为/ }).click();
  await page.getByRole("option", { name: /^USD ·/ }).click();
  await expect(page.locator(".gs-product-conclusion [data-gs-price]").first()).toContainText("$");
  await page.waitForTimeout(520);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("mobile cards, keyboard sorting and reduced-motion preserve access", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/zh/ai-pricing/chatgpt");
  const plus = page.getByRole("columnheader").getByRole("button", { name: /^Plus/ });
  await plus.focus(); await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
  await expect(page.locator('[role="columnheader"][aria-sort="descending"]')).toContainText("Plus");
  await expect(page.locator(".gs-product-matrix-row:visible").first()).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".gs-product-matrix-row:visible").first()).toHaveCSS("transform", "none");
  await expect(page.locator(".gs-product-table-viewport")).toHaveCSS("transition-duration", "0s");
  if (page.viewportSize()!.width === 390) {
    await expect(page.locator('.gs-product-matrix-row:visible').first().locator('[role="cell"]:visible')).toHaveCount(3);
    const flag = page.locator('.gs-product-matrix-row:visible').first().locator('.gs-home-flag');
    expect((await flag.boundingBox())!.width).toBeGreaterThan(0);
  }
  await page.getByRole("button", { name: "展开全部 12 个地区" }).click();
  await expect(page.locator(".gs-product-matrix-row:visible")).toHaveCount(12);
  await page.getByRole("button", { name: "收起地区" }).click();
  await expect(page.locator(".gs-product-matrix-row:visible")).toHaveCount(8);
});

test("no US quote produces no invented savings and no extra pricing API requests", async ({ page }) => {
  await page.goto("/zh/streaming-pricing/netflix");
  const premium = page.locator('.gs-product-plan').filter({ has: page.getByRole("heading", {name:"高级版",exact:true}) });
  await expect(premium).toBeVisible();
  await expect(premium.locator('.gs-product-saving')).toHaveCount(0);
  await expect(premium).not.toContainText("美国");
  const requests:string[]=[];page.on("request",request=>{if(new URL(request.url()).pathname.startsWith("/api/")&&!request.url().includes("analytics"))requests.push(request.url());});
  await page.getByRole("columnheader").getByRole("button", { name: /^高级版/ }).click();
  await page.getByRole("tab", {name:"从高到低"}).click();
  expect(requests).toEqual([]);
});

test("prices and locked overview content render without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({javaScriptEnabled:false});
  const page = await context.newPage();await page.goto(`${baseURL}/zh/ai-pricing/chatgpt`);
  await expect(page.locator("h1")).toContainText("ChatGPT");
  await expect(page.locator(".gs-product-conclusion [data-gs-price]").first()).toContainText("¥");
  await expect(page.locator(".gs-product-plan")).toHaveCount(3);
  await expect(page.locator(".gs-product-matrix-row:visible")).toHaveCount(8);
  await context.close();
});
