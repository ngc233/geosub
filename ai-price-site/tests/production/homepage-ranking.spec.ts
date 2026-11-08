import { test, expect, type Page } from "@playwright/test";

async function openHome(page: Page) {
  await page.goto("/zh", { waitUntil: "networkidle" });
  await expect(page.locator('.gs-home-products')).toHaveAttribute('data-jelly-ready', 'true');
  const consent = page.getByRole('button', { name: '拒绝统计', exact: true });
  if (await consent.isVisible()) await consent.click();
  await page.evaluate(() => document.fonts.ready);
}
const rows = (page: Page) => page.getByRole('list', { name: '订阅省钱排名' }).getByRole('listitem', { includeHidden: true });
const more = (page: Page) => page.getByRole('button', { name: /加载更多/ });

async function links(page: Page) {
  return page.locator('a').evaluateAll(es => es.map(e => ({
    text: e.textContent, href: e.getAttribute('href'), rel: e.getAttribute('rel'),
  })));
}

async function startHeightSamples(page: Page) {
  await page.locator('.gs-home-ranking').evaluate(element => {
    const samples: { time: number; height: number }[] = [];
    const start = performance.now();
    Object.assign(window, { __rankingSamples: samples });
    const sample = () => {
      samples.push({ time: performance.now() - start, height: element.getBoundingClientRect().height });
      if (performance.now() - start < 600) requestAnimationFrame(sample);
    };
    sample();
  });
}
async function heightSamples(page: Page) {
  await page.waitForTimeout(650);
  return page.evaluate(() => (window as unknown as {
    __rankingSamples: { time: number; height: number }[];
  }).__rankingSamples);
}

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
});

for (const width of [1280, 390]) for (const colorScheme of ['light', 'dark'] as const) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`logos, row targets and keyboard focus ${width} ${colorScheme} ${reducedMotion}`, async ({ page, browserName }, info) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
      await page.emulateMedia({ colorScheme, reducedMotion });
      await openHome(page);
      const visible = rows(page).filter({ visible: true });
      await expect(visible).toHaveCount(6);
      const geometry = [];
      for (const row of await visible.all()) {
        await row.scrollIntoViewIfNeeded();
        const value = await row.evaluate(e => {
          const mark = e.querySelector('.gs-home-ranking-mark')!.getBoundingClientRect();
          const name = e.querySelector('strong')!.getBoundingClientRect();
          const row = e.getBoundingClientRect();
          const href = e.querySelector('a')!.getAttribute('href');
          const hit = (x: number, y: number) => document.elementFromPoint(x, y)?.closest('a')?.getAttribute('href');
          return {
            logoRight: mark.right, nameLeft: name.left, width: mark.width, height: mark.height,
            overlap: Math.max(0, Math.min(mark.right, name.right) - Math.max(mark.left, name.left))
              * Math.max(0, Math.min(mark.bottom, name.bottom) - Math.max(mark.top, name.top)),
            logoHit: hit(mark.x + mark.width / 2, mark.y + mark.height / 2),
            rightHit: hit(row.right - 8, row.y + row.height / 2), href,
          };
        });
        geometry.push(value);
        expect(value.overlap).toBe(0);
        expect(value.logoRight).toBeLessThanOrEqual(value.nameLeft);
        expect(value.width).toBe(28); expect(value.height).toBe(28);
        expect(value.logoHit).toBe(value.href); expect(value.rightHit).toBe(value.href);
      }
      const link = visible.first().getByRole('link');
      // Use real keyboard navigation: programmatic focus after a mouse click
      // intentionally does not activate the browser's :focus-visible state.
      await visible.nth(1).getByRole('link').focus();
      // macOS WebKit's default keyboard mode uses Option+Tab to include links.
      await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
      await expect(link).toBeFocused();
      // The visible focus ring follows the full-row link hit area.
      const focus = await link.evaluate(e => {
        const style = getComputedStyle(e, '::after');
        return { outline: style.outlineStyle, width: parseFloat(style.outlineWidth), height: parseFloat(style.height) };
      });
      expect(focus.outline).toBe('solid'); expect(focus.width).toBeGreaterThanOrEqual(3);
      expect(focus.height).toBeGreaterThanOrEqual(44);
      await info.attach('row-geometry', { body: JSON.stringify(geometry), contentType: 'application/json' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    });
  }

  test(`progressive height, count, links and focus ${width} ${colorScheme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' });
    await openHome(page);
    const total = await rows(page).count();
    expect(total, 'Use at least 13 local fictional representatives to test multiple batches and the final batch').toBeGreaterThanOrEqual(13);
    const originalLinks = await links(page);
    await more(page).scrollIntoViewIfNeeded();
    await startHeightSamples(page);
    await more(page).click();
    await expect(rows(page).filter({ visible: true })).toHaveCount(12);
    const samples = await heightSamples(page);
    const from = samples[0].height, to = samples.at(-1)!.height;
    expect(to).toBeGreaterThan(from);
    expect(samples.filter(s => s.height > from + 1 && s.height < to - 1).length).toBeGreaterThanOrEqual(3);
    const started = samples.find(s => s.height > from + 1)!;
    const finished = samples.find(s => s.height >= to - 0.1)!;
    expect(finished.time - started.time).toBeGreaterThanOrEqual(120);
    expect(finished.time - started.time).toBeLessThanOrEqual(350);
    for (let i = 1; i < samples.length; i++) expect(samples[i].height).toBeGreaterThanOrEqual(samples[i - 1].height - 0.1);
    await expect(rows(page).nth(6).getByRole('link')).toBeFocused();
    expect(await links(page)).toEqual(originalLinks);
    while (await more(page).count()) await more(page).click();
    await expect(rows(page).filter({ visible: true })).toHaveCount(total);
    await expect(more(page)).toHaveCount(0);
    await page.waitForTimeout(350);
    expect(await links(page)).toEqual(originalLinks);
    await page.getByRole('tab', { name: 'AI 订阅', exact: true }).click();
    await expect(rows(page).filter({ visible: true })).toHaveCount(Math.min(6, await rows(page).count()));
    await page.getByRole('tab', { name: '全部', exact: true }).click();
    await expect(rows(page).filter({ visible: true })).toHaveCount(6);
    expect(await links(page)).toEqual(originalLinks);
    await info.attach('native-height-frames', { body: JSON.stringify({ width, colorScheme, from, to, samples }), contentType: 'application/json' });
  });
}

test('rapid clicks retarget height; reduced-motion and viewport changes never clip rows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openHome(page);
  const total = await rows(page).count(); expect(total).toBeGreaterThanOrEqual(13);
  await more(page).click();
  // Retarget before the first 220ms transition ends, without waiting for a moving button to settle.
  await more(page).evaluate(e => (e as HTMLButtonElement).click());
  await page.waitForTimeout(350);
  await expect(rows(page).filter({ visible: true })).toHaveCount(Math.min(18, total));
  await expect(rows(page).nth(12).getByRole('link')).toBeFocused();
  await page.getByRole('tab', { name: 'AI 订阅', exact: true }).click();
  await page.getByRole('tab', { name: '全部', exact: true }).click();
  await page.waitForTimeout(350);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await more(page).scrollIntoViewIfNeeded(); await startHeightSamples(page);
  await more(page).click(); const samples = await heightSamples(page);
  expect(new Set(samples.map(s => s.height)).size).toBe(2);
  await expect(rows(page).nth(6).getByRole('link')).toBeFocused();
  await page.getByRole('tab', { name: 'AI 订阅', exact: true }).click();
  await page.getByRole('tab', { name: '全部', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await more(page).click(); await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(rows(page).nth(6).getByRole('link')).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(100);
  const clipped = await rows(page).last().locator('..').evaluate(e => {
    const viewport = e.parentElement!;
    return viewport.clientHeight + 1 < e.getBoundingClientRect().height;
  });
  expect(clipped).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('server-rendered prices and all ranking hrefs survive with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route('**/*', r => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
  const page = await context.newPage();
  await page.goto(baseURL + '/zh');
  expect(await rows(page).count()).toBeGreaterThanOrEqual(13);
  await expect(rows(page).filter({ visible: true })).toHaveCount(6);
  await expect(rows(page).first().getByRole('link')).toHaveAttribute('href', /^\/zh\//);
  await expect(rows(page).first().locator('.gs-home-row-price')).toContainText('¥');
  await context.close();
});
