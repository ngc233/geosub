import { test, expect, type Page } from "@playwright/test";

// Run against npm run build + next start with an isolated, handwritten local
// database fixture (at least two eligible representatives), never production.
async function openMap(page: Page) {
  await page.goto("/zh", { waitUntil: "domcontentloaded" });
  await expect(page.locator('.gs-home-products')).toHaveAttribute('data-jelly-ready', 'true');
  expect(await page.locator('.gs-home-product-pill').count()).toBeGreaterThan(1);
  // This compressed value is the production-only trigger of the original bug.
  await expect.poll(() => page.locator('.gs-home-map').evaluate(e => getComputedStyle(e).getPropertyValue('--gs-motion-carousel').trim())).toBe('4.5s');
}
async function staysPaused(page: Page) {
  await expect(page.locator('.gs-home-carousel-note')).toContainText('暂停');
  const active = page.locator('.gs-home-product-pill[data-active="true"]');
  const href = await active.getAttribute('href');
  const changes = await page.locator('.gs-home-products').evaluate(async e => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.filter(r => r.attributeName === 'data-active').length; });
    observer.observe(e, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
    await new Promise(resolve => setTimeout(resolve, 4800));
    observer.disconnect();
    return count;
  });
  expect(changes).toBe(0);
  await expect(active).toHaveAttribute('href', href!);
  await expect(page.locator('.gs-home-carousel-progress[data-running="true"]')).toHaveCount(0);
}

test.beforeEach(async ({ context, page }) => {
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

for (const width of [1280, 390]) for (const colorScheme of ['light', 'dark'] as const) {
  test(`production carousel cadence and pauses ${width} ${colorScheme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    await page.emulateMedia({ colorScheme });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    // Observe native intervals without changing their delays or advancing a fake clock.
    await page.addInitScript(() => {
      const original = window.setInterval;
      const calls: { delay: number; started: number; ticks: number[] }[] = [];
      Object.assign(window, { __carouselTimers: calls });
      window.setInterval = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
        if (typeof handler !== 'function') return original(handler, delay, ...args);
        const call = { delay: Number(delay), started: performance.now(), ticks: [] as number[] };
        calls.push(call);
        return original(() => { call.ticks.push(performance.now() - call.started); handler(...args); }, delay);
      }) as typeof window.setInterval;
    });
    await openMap(page);
    const timers = () => page.evaluate(() => (window as unknown as { __carouselTimers: { delay: number; started: number; ticks: number[] }[] }).__carouselTimers);
    await expect.poll(async () => (await timers()).length).toBeGreaterThan(0);
    expect((await timers()).map(t => t.delay)).toEqual([4500]);
    const initial = await page.locator('.gs-home-product-pill[data-active="true"]').getAttribute('href');
    // Stay on the first product for the first four seconds of the actual timer.
    await page.waitForFunction(() => { const t = (window as unknown as { __carouselTimers: { started: number }[] }).__carouselTimers[0]; return performance.now() - t.started >= 4000; });
    await expect(page.locator('.gs-home-product-pill[data-active="true"]')).toHaveAttribute('href', initial!);
    expect((await timers())[0].ticks).toHaveLength(0);
    await expect.poll(async () => (await timers())[0].ticks.length, { timeout: 6500 }).toBe(2);
    const ticks = (await timers())[0].ticks;
    expect(ticks[0]).toBeGreaterThanOrEqual(4400);
    expect(ticks[0]).toBeLessThan(5500);
    expect(ticks[1] - ticks[0]).toBeGreaterThanOrEqual(4400);
    expect(ticks[1] - ticks[0]).toBeLessThan(5500);
    await expect(page.locator('.gs-home-product-pill').nth(2)).toHaveAttribute('data-active', 'true');
    await testInfo.attach('native-timer-evidence', { body: JSON.stringify({ width, colorScheme, timers: await timers() }, null, 2), contentType: 'application/json' });

    await page.locator('.gs-home-map-heading').hover();
    await staysPaused(page);
    // Existing behaviour deliberately remains paused even after pointer exit.
    await page.mouse.move(0, 0);
    await expect(page.locator('.gs-home-carousel-note')).toContainText('暂停');
    await expect(page.locator('.gs-home-products a').nth(1)).toHaveAttribute('href', /\/zh\//);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('keyboard focus pauses; selecting a product still previews it', async ({ page }) => {
  await openMap(page);
  const second = page.locator('.gs-home-product-pill').nth(1);
  await second.focus();
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('data-active', 'true');
  await staysPaused(page);
});

test('reduced motion disables autoplay, including a live preference change', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMap(page);
  const first = page.locator('.gs-home-product-pill').first();
  await expect(page.locator('.gs-home-carousel-note')).toContainText('关闭自动轮换');
  await page.waitForTimeout(4800);
  await expect(first).toHaveAttribute('data-active', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.gs-home-product-pill').nth(1)).toHaveAttribute('data-active', 'true', { timeout: 6000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const href = await page.locator('.gs-home-product-pill[data-active="true"]').getAttribute('href');
  await page.waitForTimeout(4800);
  await expect(page.locator('.gs-home-product-pill[data-active="true"]')).toHaveAttribute('href', href!);
  await expect(page.locator('.gs-home-product-jelly')).toHaveCSS('animation-name', 'none');
});
