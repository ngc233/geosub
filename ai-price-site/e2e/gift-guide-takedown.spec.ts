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
