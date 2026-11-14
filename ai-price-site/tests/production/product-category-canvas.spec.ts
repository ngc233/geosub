import { test, expect } from '@playwright/test';
const routes = ['/zh/ai-pricing', '/zh/streaming-pricing'];
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'geosub_analytics_consent', value: `denied.${Math.floor(Date.now()/1000)}`, domain: '127.0.0.1', path: '/' }]);
  await context.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
});
for (const width of [1280, 390]) for (const colorScheme of ['light', 'dark'] as const) {
  test(`category layout ${width} ${colorScheme}: full rows, links, local icons and no overflow`, async ({ context }) => {
    const errors: string[] = [];
    for (const route of routes) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ colorScheme });
      page.on('pageerror', e => errors.push(e.message));
      const pending = new Set<unknown>(); let activity = Date.now();
      page.on('request', r => { pending.add(r); activity = Date.now(); });
      const finished = (r: unknown) => { pending.delete(r); activity = Date.now(); };
      page.on('requestfinished', finished); page.on('requestfailed', finished);
      const settled = () => expect.poll(() => pending.size === 0 && Date.now() - activity >= 500).toBe(true);
      expect((await page.goto(route, { waitUntil: 'networkidle' }))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      const fonts = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => n.includes('.woff2')));
      expect(fonts.some(n => n.includes('geosub-price-numerals-700'))).toBe(true);
      expect(fonts.some(n => n.includes('inter-tight-latin-'))).toBe(false);
      await expect(page.locator('.gs-listing h1')).toHaveCount(1);
      expect(await page.locator('.gs-listing-card').count()).toBeGreaterThan(0);
      await expect(page.locator('.gs-listing-card').first()).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(26, 29, 32)' : 'rgb(255, 255, 255)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const card of await page.locator('.gs-listing-card').all()) {
        expect(await card.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
        await expect(card.locator('thead th').last()).toBeVisible();
        expect(await card.locator('.gs-listing-period').count()).toBeGreaterThan(0);
        await expect(card.locator('.gs-listing-detail')).toHaveText('查看详情');
        expect(await card.locator('a,button').count()).toBe(0); // no nested controls/links
        await card.scrollIntoViewIfNeeded();
        for (const img of await card.locator('img').all()) {
          await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true);
          expect(await img.getAttribute('src')).toMatch(/^\/brand-assets\//);
        }
      }
      const card = page.locator('.gs-listing-card').first(); const href = await card.getAttribute('href');
      await card.focus(); await expect(card).toHaveCSS('outline-width', '3px');
      await settled();
      await page.keyboard.press('Enter'); await expect(page).toHaveURL(new RegExp(`${href}$`));
      await page.waitForLoadState('networkidle');
      await settled();
      expect(errors).toEqual([]);
      await page.close();
    }
    expect(errors).toEqual([]);
  });
}
test('row hover changes only row color; reduced motion removes card movement', async ({ page }) => {
  await page.goto(routes[0], { waitUntil: 'networkidle' });
  const row = page.locator('.gs-listing-table tbody tr').first();
  await row.hover(); await expect(row).toHaveCSS('transform', 'none'); await expect(row).toHaveCSS('box-shadow', 'none');
  await expect(row).toHaveCSS('background-color', 'rgb(248, 251, 239)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const card = page.locator('.gs-listing-card').first(); await card.hover();
  await expect(card).toHaveCSS('transform', 'none'); await expect(card).toHaveCSS('transition-duration', '0s');
});
test('server HTML contains original price rows and destinations without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    await context.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
    const page = await context.newPage();
    for (const route of routes) {
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.locator('.gs-listing-card').first()).toBeVisible();
      expect(await page.locator('.gs-listing-table tbody tr').count()).toBeGreaterThan(0);
      expect(await page.locator('.gs-listing-directory a').count()).toBe(await page.locator('.gs-listing-card').count());
    }
  } finally { await context.close(); }
});

test('390px long fictional labels and local amounts wrap without losing text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(routes[0], { waitUntil: 'networkidle' });
  // DOM-only stress fixture: no database mutation or public fixture route.
  const title = '虚构测试产品：长名称与长地区说明用于排版验证';
  const local = '1,234,567,890.99 测试本币';
  await page.locator('.gs-listing-card-name h2').first().evaluate((el, text) => { el.textContent = text; }, title);
  await page.locator('.gs-listing-countryname').first().evaluate(el => { el.textContent = '虚构测试长国家地区名称'; });
  await page.locator('.gs-listing-local').first().evaluate((el, text) => { el.textContent = text; }, local);
  await expect(page.locator('.gs-listing-card-name h2').first()).toHaveText(title);
  await expect(page.locator('.gs-listing-local').first()).toHaveText(local);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of ['.gs-listing-card', '.gs-listing-card-name', '.gs-listing-local', '.gs-listing-table']) {
    expect(await page.locator(selector).first().evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});
