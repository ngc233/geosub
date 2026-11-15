import { test, expect } from '@playwright/test';
const countries = ['turkey', 'india', 'philippines', 'japan'];
test.beforeEach(async ({ context }) => {
  await context.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
});
for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const) {
  test(`${width} ${theme}: cards, flags, full text, links and keyboard access`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    expect((await page.goto('/zh/countries', { waitUntil: 'networkidle' }))?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('按国家找订阅');
    await expect(page.locator('main [data-gs-auxiliary="countryIndex"]')).toHaveCount(1);
    const cards = page.locator('.gs-country-index-card');
    await expect(cards).toHaveCount(4);
    expect(await page.locator('main a').evaluateAll(els => els.map(a => a.getAttribute('href')))).toEqual([
      '/zh/countries', '/zh/price-history', '/zh/data-sources', ...countries.map(c => `/zh/countries/${c}`),
    ]);
    const boxes = await cards.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
    expect(new Set(boxes.map(b => b.x)).size).toBe(1);
    for(let i=1;i<boxes.length;i++) expect(boxes[i].y).toBeGreaterThan(boxes[i-1].y);
    await expect(page.getByText('GEOSUB 订阅价格数据',{exact:true})).toHaveCount(0);
    const controls=page.locator('.gs-country-index-nav a');
    await expect(controls).toHaveCount(3);
    for(const control of await controls.all()){await expect(control).toHaveAttribute('data-gs-ui','button');await expect(control).toHaveCSS('border-radius','12px');await expect(control).toHaveCSS('cursor','pointer');}
    await expect(controls.first()).toHaveAttribute('data-gs-variant','primary');
    await controls.nth(1).focus();await expect(controls.nth(1)).toHaveCSS('outline-width','3px');
    for (const card of await cards.all()) {
      await expect(card.locator('a,button')).toHaveCount(0);
      const alignment = await card.evaluate(el => {
        const description = el.querySelector(':scope > div:first-child p:last-of-type')!.getBoundingClientRect();
        const coverage = el.children[1].getBoundingClientRect();
        const style = getComputedStyle(el.children[1]);
        const footer = getComputedStyle(el.children[2]);
        return { descriptionX: description.x, coverageTextX: coverage.x + parseFloat(style.paddingLeft), footerBorder: footer.borderTopWidth };
      });
      if(width===390)expect(alignment.descriptionX).toBe(alignment.coverageTextX);
      else expect(alignment.coverageTextX).toBeGreaterThan(alignment.descriptionX);
      expect(alignment.footerBorder).toBe('0px');
      await expect(card).toContainText('查看已核验套餐、本币标价、比较结果与采集日期');
      await expect(card).toContainText('查看地区价格');
      await expect(card).toContainText(/\d+ 个产品 · \d+ 个套餐 · AI \d+ \/ 流媒体 \d+/);
      const flag = card.locator('img');
      await expect(flag).toHaveAttribute('alt', '');
      const flagURL = new URL((await flag.getAttribute('src'))!, page.url());
      expect(flagURL.origin).toBe(new URL(page.url()).origin);
      expect(flagURL.pathname).toMatch(/^\/country-flags\//);
      await expect(flag.locator('..')).toHaveAttribute('aria-hidden', 'true');
      await expect.poll(() => flag.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    await expect(page.locator('main > section')).toContainText('不发布国家综合指数，也不保证跨区购买资格。');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await cards.first().focus(); await expect(cards.first()).toHaveCSS('outline-width', '3px');
    await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/zh\/countries\/turkey$/);
    await page.waitForLoadState('networkidle'); expect(errors).toEqual([]);
  });
}
test('rows use background-only hover and honor reduced motion', async ({ page }) => {
  await page.goto('/zh/countries', { waitUntil: 'networkidle' });
  const card = page.locator('.gs-country-index-card').first();
  const before=await card.boundingBox();
  await card.hover();
  await expect(card).toHaveCSS('background-color','rgb(248, 251, 239)');
  // Production CSS may serialize `none` as the identity matrix; both must leave every coordinate unchanged.
  expect(await card.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).isIdentity)).toBe(true);
  expect(await card.boundingBox()).toEqual(before);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Production CSS may serialize `none` as the identity matrix; both must leave every coordinate unchanged.
  expect(await card.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).isIdentity)).toBe(true);
  await expect(card).toHaveCSS('transition-duration', '0s');
});
test('no-JavaScript server HTML retains all cards, counts and links', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 390, height: 844 } });
  try {
    await context.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
    const page = await context.newPage();
    await page.goto('/zh/countries');
    await expect(page.locator('.gs-country-index-card')).toHaveCount(4);
    await expect(page.locator('main a')).toHaveCount(7);
    await expect(page.locator('.gs-country-index-card').first()).toContainText(/\d+ 个产品/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});
test('long fictional coverage text wraps; directory styles are absent from locked pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/countries', { waitUntil: 'networkidle' });
  // DOM-only stress data, never written to the fixture database or production.
  const label = '123456789 个产品 · 234567890 个套餐 · AI 123456789 / 流媒体 123456789';
  const coverage = page.locator('.gs-country-index-card > div:nth-child(2)').first();
  await coverage.evaluate((el, text) => { el.textContent = text; }, label);
  await expect(coverage).toHaveText(label);
  expect(await coverage.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  for (const route of ['/en/countries', '/en', '/zh/ai-pricing/chatgpt/plus']) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-gs-auxiliary="countryIndex"],.gs-country-index')).toHaveCount(0);
  }
});

for (const theme of ['light', 'dark'] as const) test(`Chinese decoration cleanup: ${theme}`, async ({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:theme});
  const cases:[string,string[]][]=[
    ['/zh/price-history',['GEOSUB 订阅价格数据']],
    ['/zh/price-history/chatgpt',['GEOSUB 订阅价格数据']],
    ['/zh/price-records/30000000-0000-4000-8000-000000000001',['GEOSUB 订阅价格数据']],
    ['/zh/about',['ABOUT GEOSUB','HOW IT WORKS']],
    ['/zh/data-sources',['DATA SOURCES · METHODOLOGY']],
    ['/zh/contact',['CONTACT · PARTNERSHIP','ADVERTISING & BRAND']],
    ['/zh/privacy',['PRIVACY · CONTROL']],
    ['/zh/terms',['Terms of Service']],
  ];
  for(const [route,labels] of cases){
    expect((await page.goto(route,{waitUntil:'networkidle'}))?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    for(const label of labels)await expect(page.getByText(label,{exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const) {
  test(`${width} ${theme}: rounded hover and inset focus on first, middle and last rows`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'geosub_analytics_consent', value: `denied.${Math.floor(Date.now() / 1000)}`, domain: '127.0.0.1', path: '/' }]);
    await page.goto('/zh/countries', { waitUntil: 'networkidle' });
    const cards = page.locator('.gs-country-index-card');
    const sharp = (await import('sharp')).default;
    for (const index of [0, 1, 3]) {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded();
      await page.locator('h1').click();
      // Center the row before measuring; hover may otherwise auto-scroll a clipped bottom edge.
      await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.mouse.move(0, 0);
      const before = await card.boundingBox();
      const resting = await sharp(await card.screenshot()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      await card.hover();
      for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
        await expect(card).toHaveCSS(`border-${corner}-radius`, '16px');
      }
      expect(await card.boundingBox()).toEqual(before);
      const { data, info } = await sharp(await card.screenshot()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(info).toEqual(resting.info);
      const pixel = (x: number, y: number, buffer = data) => [...buffer.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 3)];
      for (const [x, y] of [[1, 1], [info.width - 2, 1], [1, info.height - 2], [info.width - 2, info.height - 2]]) {
        // Outer panel anti-aliasing is preserved exactly; hover must not paint any corner.
        expect(pixel(x, y)).toEqual(pixel(x, y, resting.data));
      }
      expect(pixel(Math.floor(info.width / 2), 2)).not.toEqual(pixel(Math.floor(info.width / 2), 2, resting.data));
      // Establish keyboard modality without assuming platform-specific Tab stops.
      await page.keyboard.press("Tab");
      await card.focus();
      await expect(card).toBeFocused();
      await expect(card).toHaveCSS('outline-width', '3px');
      await expect(card).toHaveCSS('outline-offset', '-3px');
      // The inset ring must not cover text or flags at either edge.
      await expect(card).toHaveCSS('padding-left', '8px');
      await expect(card).toHaveCSS('padding-right', '8px');
      await expect(card).toHaveCSS('border-radius', '16px');
      await expect(card).toHaveCSS('transition-duration', '0s');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const) for (const motion of ['no-preference', 'reduce'] as const) {
  test(`footer focus: ${width} ${theme} ${motion}: complete outline and real disclosure transitions`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: motion });
    await context.addCookies([{ name: 'geosub_analytics_consent', value: `denied.${Math.floor(Date.now() / 1000)}`, domain: '127.0.0.1', path: '/' }]);
    await page.goto('/zh/countries', { waitUntil: 'networkidle' });
    const sharp = (await import('sharp')).default;
    const groups = page.locator('.gs-footer-groups [data-gs-disclosure]');
    for (const group of await groups.all()) {
      const toggle = group.locator('button'), grid = group.locator('.gs-disclosure-grid'), clip = grid.locator(':scope > div');
      if (width === 390) {
        await toggle.scrollIntoViewIfNeeded();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(clip).toHaveAttribute('inert', '');
        expect((await grid.boundingBox())!.height).toBe(0);
        await expect(grid).toHaveCSS('transition-duration', motion === 'reduce' ? '0s' : '0.22s');
        const sampling = grid.evaluate(el => new Promise<number[]>(resolve => {
          const heights: number[] = [], start = performance.now();
          const sample = () => { heights.push(el.getBoundingClientRect().height); if (performance.now() - start < 450) requestAnimationFrame(sample); else resolve(heights); };
          sample();
        }));
        await toggle.click();
        const heights = await sampling;
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const full = (await grid.boundingBox())!.height;
        expect(full).toBeGreaterThan(0);
        if (motion === 'no-preference') expect(heights.some(h => h > 0 && h < full)).toBe(true);
      }
      await expect(clip).not.toHaveAttribute('inert', '');
      await expect(clip).toHaveCSS('overflow', 'hidden');
      for (const link of await clip.locator('a').all()) {
        await link.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const resting = await link.boundingBox();
        await link.hover();
        expect(await link.boundingBox()).toEqual(resting);
        await page.keyboard.press('Tab'); await link.focus(); await expect(link).toBeFocused();
        const geometry = await link.evaluate(el => {
          const rect = el.getBoundingClientRect(), parent = el.parentElement!.getBoundingClientRect(), css = getComputedStyle(el);
          const line = parseFloat(css.outlineWidth), offset = parseFloat(css.outlineOffset), outer = line + offset;
          return { line, color: css.outlineColor.match(/\d+/g)!.slice(0, 3).map(Number),
            left: rect.left - parent.left, top: rect.top - parent.top, width: rect.width, height: rect.height,
            clipWidth: parent.width, clipHeight: parent.height, outer, center: offset + line / 2 };
        });
        expect(geometry.line).toBe(3);
        expect(geometry.left - geometry.outer).toBeGreaterThanOrEqual(0);
        expect(geometry.top - geometry.outer).toBeGreaterThanOrEqual(0);
        expect(geometry.left + geometry.width + geometry.outer).toBeLessThanOrEqual(geometry.clipWidth);
        expect(geometry.top + geometry.height + geometry.outer).toBeLessThanOrEqual(geometry.clipHeight);
        // Match CSS geometry on both 1x Chromium and 2x Desktop Safari; never sample device pixels as CSS pixels.
        const { data, info } = await sharp(await clip.screenshot({ scale: 'css' })).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const points = [
          [geometry.left - geometry.center, geometry.top + geometry.height / 2],
          [geometry.left + geometry.width + geometry.center, geometry.top + geometry.height / 2],
          [geometry.left + geometry.width / 2, geometry.top - geometry.center],
          [geometry.left + geometry.width / 2, geometry.top + geometry.height + geometry.center],
        ];
        for (const [x, y] of points) {
          // A 3px stroke has a solid center; inspect a one-pixel neighborhood for fractional raster coordinates.
          const pixels: number[][] = [];
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const px = Math.round(x) + dx, py = Math.round(y) + dy;
            if (px >= 0 && py >= 0 && px < info.width && py < info.height) pixels.push([...data.subarray((py * info.width + px) * 4, (py * info.width + px) * 4 + 3)]);
          }
          expect(pixels).toContainEqual(geometry.color);
        }
      }
      if (width === 390) {
        await toggle.focus();
        const full = (await grid.boundingBox())!.height;
        const sampling = grid.evaluate(el => new Promise<number[]>(resolve => {
          const heights: number[] = [], start = performance.now();
          const sample = () => { heights.push(el.getBoundingClientRect().height); if (performance.now() - start < 450) requestAnimationFrame(sample); else resolve(heights); };
          sample();
        }));
        await toggle.press('Space');
        const heights = await sampling;
        await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await expect(toggle).toBeFocused();
        await expect(clip).toHaveAttribute('inert', ''); expect((await grid.boundingBox())!.height).toBe(0);
        if (motion === 'no-preference') expect(heights.some(h => h > 0 && h < full)).toBe(true);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
