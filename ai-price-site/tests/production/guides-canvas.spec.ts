import { test, expect } from '@playwright/test';
for(const width of [1280,390])for(const colorScheme of ['light','dark'] as const) {
 test(`guide list and article ${width} ${colorScheme}`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  await page.goto('/zh/guides');await expect(page.locator('h1')).toHaveText('GeoSub 指南');
  const first=page.getByRole('tab',{name:'全部',exact:true});await first.focus();await first.press('ArrowRight');
  await expect(page.getByRole('tab',{selected:true})).not.toHaveText('全部');
  await page.getByRole('tab',{selected:true}).press('Home');await expect(first).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.gs-guide-card')).toHaveCount(10);
  await expect(page.locator('.gs-guide-taxonomy')).toHaveCSS('column-gap', '16px');
  await expect(page.locator('.gs-guide-taxonomy')).toHaveCSS('row-gap', '8px');
  await expect(page.locator('a[href*="gift-card-guide"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.goto('/zh/guides/v7-test-1');await expect(page.locator('[data-guide-body]')).toContainText('这是虚构测试文章');
  // Price numerals are below the mobile fold; CSS loads them without a preload competing with the title.
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(0);
  const toc=width===390?page.locator('.gs-guide-toc-mobile'):page.locator('.gs-guide-toc-desktop');
  if(width===390)await toc.locator('summary').click();
  await toc.getByRole('button',{name:'核对来源',exact:true}).click();
  await expect(page.locator('.gs-guide-prose h2').filter({hasText:'核对来源'})).toBeFocused();
  await expect(toc.getByRole('button',{name:'核对来源',exact:true})).toHaveAttribute('aria-current','location');
  expect(await page.locator('.gs-guide-progress').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
  await expect(page.locator('.gs-guide-prices')).toBeVisible();
  expect(await page.locator('.gs-guide-price [data-gs-number]').first().innerText()).toMatch(/[¥$] \d/);
  await expect(page.locator('.gs-guide-price')).toHaveCSS('flex-direction', 'column');
  const amountBox = await page.locator('.gs-guide-price [data-gs-number]').first().boundingBox();
  const staleNotice = page.locator('.gs-guide-price > small');
  if (await staleNotice.count()) {
    const noticeBox = await staleNotice.first().boundingBox();
    expect(noticeBox!.y).toBeGreaterThanOrEqual(amountBox!.y + amountBox!.height);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 });
}
test('unavailable article/category keeps 404, empty published category has empty state',async({page})=>{
 expect((await page.goto('/zh/guides/v7-does-not-exist'))?.status()).toBe(404);
 expect((await page.goto('/zh/guides/category/v7-does-not-exist'))?.status()).toBe(404);
 await page.goto('/zh/guides/category/v7-empty');await expect(page.getByRole('status')).toContainText('暂时还没有');
 await expect(page.locator('.gs-guide-card')).toHaveCount(0);
});
test('article remains readable without JavaScript',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 await page.goto(`${baseURL}/zh/guides/v7-test-1`);await expect(page.locator('[data-guide-body]')).toContainText('核对来源');
 await expect(page.locator('a[href="/zh/data-sources"]')).not.toHaveCount(0);await context.close();
});
test('price card exactly matches its target product minimum after animations settle',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/zh/guides/v7-test-1');
 const text=await page.locator('.gs-guide-price [data-gs-number]').first().innerText();
 const amount=text.split(' / ')[0];await page.locator('.gs-guide-price-row').first().click();
 await expect(page.locator('.gs-product-hero')).toContainText(amount);
});
test('filter transition, reduced motion and missing-price state remain usable',async({page})=>{
 await page.goto('/zh/guides');const viewport=page.locator('.gs-guide-grid-viewport');
 await expect.poll(()=>viewport.evaluate(el=>getComputedStyle(el).height)).not.toBe('auto');
 expect(await viewport.evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0.22s');
 await page.getByRole('tab',{name:'付款',exact:true}).click();await expect(page.locator('.gs-guide-card')).toHaveCount(2);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await viewport.evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
 await page.goto('/zh/guides/tool-review');await expect(page.locator('.gs-guide-prices')).toHaveCount(0);await expect(page.locator('[data-guide-body]')).toContainText('从自己的任务出发');
 await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(0);
});
test('copy failure gives feedback and article currency follows existing preference',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}});localStorage.setItem('geosub-public-display-currency','USD');});
 await page.goto('/zh/guides/v7-test-1');await page.getByRole('button',{name:'复制文章链接'}).click();await expect(page.getByRole('status')).toContainText('复制失败');
 await expect(page.locator('.gs-guide-price [data-gs-number]')).toContainText('$');
});

test('mobile contents reserves its closed height before hydration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route('**/*.js', async route => { await scriptsReady; await route.continue(); });
  try {
    await page.goto('/zh/guides/v7-test-1', { waitUntil: 'commit' });
    const summary = page.locator('.gs-guide-toc-mobile summary');
    await expect(summary).toBeVisible();
    // The Chinese title uses system fonts. WebKit's fonts.ready waits for
    // window load, which intentionally cannot finish while scripts are held.
    await expect(summary).toHaveCSS('min-height', '44px');
    const before = await page.locator('.gs-guide-article').boundingBox();
    expect(before).not.toBeNull();
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    releaseScripts();
    await expect(page.locator('.gs-guide-toc-mobile button').first()).toBeAttached();
    await expect.poll(async () => (await page.locator('.gs-guide-article').boundingBox())!.y).toBe(before!.y);
    await summary.click();
    await expect(page.locator('.gs-guide-toc-mobile button').first()).toBeVisible();
  } finally {
    releaseScripts();
  }
});

test('streamed article metadata has one complete canonical set', async ({ page, request }) => {
  await page.goto('/zh/guides/v7-test-1');
  // Next can stream these tags into body; location is not their SEO value.
  const expected = [
    ['meta[name="description"]', 'content', '本地虚构测试摘要；不作为真实购买建议。'],
    ['meta[name="robots"]', 'content', 'index, follow'],
    ['link[rel="canonical"]', 'href', 'https://geosub.org/zh/guides/v7-test-1'],
  ];
  for (const [selector, attribute, value] of expected) {
    await expect(page.locator(selector)).toHaveCount(1);
    await expect(page.locator(selector)).toHaveAttribute(attribute, value);
  }
  // HTML-limited crawlers must receive the same values in head, without JS.
  const response = await request.get('/zh/guides/v7-test-1', { headers: { 'User-Agent': 'Twitterbot/1.0' } });
  expect(response.status()).toBe(200);
  const head = (await response.text()).match(/<head>([\s\S]*?)<\/head>/)?.[1];
  expect(head).toBeDefined();
  for (const value of expected.map(item => item[2])) expect(head).toContain(value);
});

test('guide numbers use the approved Inter Tight subset with the original weight and swap policy', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'font') fonts.push(request.url()); });
  await page.goto('/zh/guides');
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.some(url => url.includes('inter-tight-latin-700-normal'))).toBe(false);
  expect(fonts.some(url => url.includes('geosub-price-numerals'))).toBe(true);
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(1);
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveAttribute('href', /geosub-price-numerals-700/);
  // WebKit omits the optional quotes when serializing font names.
  const families = await page.locator('.gs-guide-step-number').first().evaluate(el => getComputedStyle(el).fontFamily.split(',').map(name => name.trim().replace(/^['"]|['"]$/g, '')));
  expect(families).toEqual(['GeoSub Price Numerals', 'Inter Tight', 'system-ui', 'sans-serif']);
  const faces = await page.evaluate(() => [...document.fonts].filter(face => face.family.includes('GeoSub Price Numerals')).map(face => ({ weight: face.weight, display: face.display })));
  expect(faces.some(face => face.weight === '700' && face.display === 'swap')).toBe(true);
  await expect(page.locator('.gs-guide-step-number').first()).toHaveCSS('font-weight', '700');
  await expect(page.locator('.gs-guide-step-number').first()).toHaveCSS('border-top-left-radius', '50%');
});

for (const width of [1280, 390]) for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`filter frames keep following links clickable ${width} ${reducedMotion}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion });
    await page.goto('/zh/guides');
    await page.getByRole('tab', { name: '付款', exact: true }).click();
    await page.waitForTimeout(700);
    await page.locator('.gs-guide-collection').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    for (const sequence of [['全部'], ['付款'], ['全部', '付款', '全部']]) {
      const result = await page.evaluate(async ({ sequence }) => {
        const outer = document.querySelector<HTMLElement>('.gs-guide-grid-viewport')!;
        const inner = document.querySelector<HTMLElement>('.gs-guide-card-grid')!;
        const failures: { label: string; hit: string | null; ms: number }[] = [];
        let samples = 0, visibleLinks = 0, intermediateFrames = 0;
        const choose = (label: string) => [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(el => el.textContent === label)!.click();
        const start = performance.now(); let next = 1;
        choose(sequence[0]);
        while (performance.now() - start < 750) {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          const ms = performance.now() - start;
          if (next < sequence.length && ms >= next * 45) choose(sequence[next++]);
          // Keep the following links visible; a tall expanded list must not make hit tests vacuous.
          document.querySelector('.gs-guide-taxonomy')!.scrollIntoView({ block: 'center', behavior: 'instant' });
          samples++;
          if (Math.abs(outer.getBoundingClientRect().height - inner.getBoundingClientRect().height) > 1) intermediateFrames++;
          for (const link of document.querySelectorAll<HTMLAnchorElement>('.gs-guide-taxonomy a,.gs-guide-contact a')) {
            const rect = link.getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
            if (y < 80 || y >= innerHeight || x < 0 || x >= innerWidth) continue;
            visibleLinks++;
            const hit = document.elementFromPoint(x, y);
            if (!link.contains(hit)) failures.push({ label: link.textContent || '', hit: hit?.closest('.gs-guide-card')?.textContent || hit?.nodeName || null, ms });
          }
        }
        return { failures, samples, visibleLinks, intermediateFrames, height: outer.getBoundingClientRect().height, target: inner.getBoundingClientRect().height, overflow: getComputedStyle(outer).overflow };
      }, { sequence });
      expect(result.samples).toBeGreaterThan(1);
      expect(result.visibleLinks).toBeGreaterThan(0);
      expect(result.failures).toEqual([]);
      expect(Math.abs(result.height - result.target)).toBeLessThan(1);
      expect(result.overflow).toBe('visible'); // Stable cards retain their outer focus ring and hover shadow.
      if (reducedMotion === 'no-preference') expect(result.intermediateFrames).toBeGreaterThan(0);
    }
    const card = page.locator('.gs-guide-card').first();
    await page.keyboard.press('Tab');
    await card.focus();
    await expect(card).toBeFocused();
    await expect(card).toHaveCSS('outline-style', 'solid');
    await expect(card).toHaveCSS('outline-width', '3px');
    await page.locator('.gs-guide-taxonomy a').first().click();
    await expect(page).toHaveURL(/\/zh\/guides\/category\//);
  });
}
