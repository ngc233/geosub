import { test, expect } from "@playwright/test";

test("retired gift guide returns 404/noindex in both languages and at its legacy URL", async ({ request }) => {
  for (const locale of ["zh", "en", "zh-tw"]) {
    const response = await request.get(`/${locale}/guides/gift-card-guide`, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers().location).toBeUndefined();
    const html = await response.text();
    expect(html).toMatch(/<meta name="robots" content="[^"]*noindex/);
    expect(html).not.toContain('"@type":"Article"');
    expect(html).not.toContain("购买数字礼品卡前应核对");
  }
});

test("public discovery no longer advertises the retired gift guide", async ({ page, request }) => {
  for (const locale of ["zh", "en"]) {
    await page.goto(`/${locale}/guides`);
    await expect(page.locator('a[href*="/guides/gift-card-guide"]')).toHaveCount(0);
    await expect(page.locator(`main a[href="/${locale}/guides/price-guide"]`).first()).toBeVisible();
    const response = await request.get(`/api/search?locale=${locale}&q=gift-card-guide`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.results.some((item: { href: string }) => item.href.includes("/guides/gift-card-guide"))).toBe(false);
  }
});

for (const width of [1280, 390]) for (const colorScheme of ["light", "dark"] as const) {
  test(`Plus footer exception ${width} ${colorScheme}: exactly one link is removed`, async ({ browser }, testInfo) => {
    const baseline = process.env.GEOSUB_GIFT_LINKS_BASELINE;
    const candidate = process.env.GEOSUB_GIFT_LINKS_CANDIDATE;
    test.skip(!baseline || !candidate, "Requires retained main and candidate servers using the same repository navigation fixture.");
    const snapshots = [];
    for (const origin of [baseline!, candidate!]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 720 }, colorScheme, reducedMotion: "reduce" });
      await context.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
      const page = await context.newPage();
      await page.goto(`${origin}/zh/ai-pricing/chatgpt/plus`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const snapshot = await page.evaluate(() => {
        const normalize = (value: string | null) => value?.replace(/http:\/\/127\.0\.0\.1:\d+/g, "https://local-preview.invalid") ?? null;
        return {
          links: [...document.querySelectorAll("a")].map(link => ({ text: link.textContent, href: normalize(link.getAttribute("href")), rel: link.getAttribute("rel"), footer: Boolean(link.closest("footer")) })),
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
          h1: [...document.querySelectorAll("h1")].map(node => node.textContent),
          mainHtml: normalize(document.querySelector("main")?.innerHTML ?? null),
          seo: [...document.querySelectorAll('link[rel="canonical"],link[rel="alternate"],meta[name="robots"]')].map(node => normalize(node.outerHTML)),
          structuredData: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => normalize(node.textContent)),
        };
      });
      snapshots.push(snapshot);
      await testInfo.attach(origin === baseline ? "before-links-and-content.json" : "after-links-and-content.json", { body: JSON.stringify(snapshot, null, 2), contentType: "application/json" });
      await testInfo.attach(origin === baseline ? "before-footer.png" : "after-footer.png", { body: await page.getByRole("contentinfo").screenshot({ animations: "disabled" }), contentType: "image/png" });
      await context.close();
    }
    const [before, after] = snapshots;
    const removed = before.links.filter(link => link.href === "/zh/guides/gift-card-guide");
    expect(removed).toEqual([{ text: "礼品卡教程", href: "/zh/guides/gift-card-guide", rel: null, footer: true }]);
    expect(after.links).toEqual(before.links.filter(link => link.href !== "/zh/guides/gift-card-guide"));
    expect(after.links.length).toBe(before.links.length - 1);
    expect({ ...after, links: [] }).toEqual({ ...before, links: [] });
  });
}
