import { test, expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

const snapshotId = '30000000-0000-4000-8000-000000000001';
const examples = [
  { path: '/zh/price-history', active: 'history', summary: '选择产品', open: true },
  { path: '/zh/price-history/chatgpt', active: 'history', summary: '选择产品', open: false },
  { path: `/zh/price-records/${snapshotId}`, active: null, summary: '记录标识与内容校验值', open: false },
] as const;
const widths = [1280, 390, 768, 820, 1024];
const themes = ['light', 'dark'] as const;
const navigationLinks = [
  { text: '按国家找订阅', path: 'countries' },
  { text: '价格变化记录', path: 'price-history' },
  { text: '数据来源', path: 'data-sources' },
];

async function localReadOnly(context: BrowserContext, origins: string[]) {
  for (const origin of origins) {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) throw new Error('Loopback previews only');
    await context.addCookies([{ name: 'geosub_analytics_consent', value: `denied.${Math.floor(Date.now() / 1000)}`, url: origin }]);
  }
  await context.route('**/*', route => {
    const request = route.request();
    return origins.includes(new URL(request.url()).origin) && ['GET', 'HEAD'].includes(request.method())
      ? route.continue() : route.abort();
  });
}

test.beforeEach(async ({ context, baseURL }, testInfo) => {
  await localReadOnly(context, [new URL(baseURL!).origin, new URL(testInfo.config.metadata.failureBaseURL as string).origin]);
});

function navigation(page: Page) {
  return page.locator('main').getByRole('navigation', { name: '价格探索', exact: true });
}

async function expectOriginalLinks(nav: Locator, active: 'history' | null) {
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link')).toHaveCount(3);
  expect(await nav.getByRole('link').evaluateAll(links => links.map(link => ({
    text: link.textContent?.trim(), href: link.getAttribute('href'), rel: link.getAttribute('rel'),
    target: link.getAttribute('target'), current: link.getAttribute('aria-current'),
  })))).toEqual(navigationLinks.map((link, index) => ({
    text: link.text, href: `/zh/${link.path}`, rel: null, target: null,
    current: active === 'history' && index === 1 ? 'page' : null,
  })));
}

async function expectGeometry(page: Page, nav: Locator) {
  await nav.scrollIntoViewIfNeeded();
  const result = await nav.evaluate(element => {
    const links = [...element.querySelectorAll('a')];
    const boxes = links.map(link => link.getBoundingClientRect());
    const overlap = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) > Math.max(a.left, b.left) + 0.5 &&
      Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 0.5;
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      overlaps: boxes.flatMap((box, i) => boxes.flatMap((other, j) => i < j && overlap(box, other) ? [[i, j]] : [])),
      controls: links.map((link, index) => {
        const rect = boxes[index], style = getComputedStyle(link);
        const textRects: DOMRect[] = [];
        const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent?.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          textRects.push(...range.getClientRects());
        }
        const contained = textRects.every(text => text.left >= rect.left - 0.5 && text.right <= rect.right + 0.5 &&
          text.top >= rect.top - 0.5 && text.bottom <= rect.bottom + 0.5);
        const obscured = [[rect.left + 3, rect.top + rect.height / 2], [rect.right - 3, rect.top + rect.height / 2],
          [rect.left + rect.width / 2, rect.top + 3], [rect.left + rect.width / 2, rect.bottom - 3]].some(([x, y]) => {
          const hit = document.elementFromPoint(x, y); return !hit || !link.contains(hit);
        });
        return { width: rect.width, height: rect.height, contained, obscured, cursor: style.cursor,
          radii: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius].map(parseFloat) };
      }),
    };
  });
  expect(result.overflow).toBe(false); expect(result.overlaps).toEqual([]);
  for (const control of result.controls) {
    expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44);
    expect(control.radii).toEqual([12, 12, 12, 12]);
    expect(control.cursor).toBe('pointer'); expect(control.contained).toBe(true); expect(control.obscured).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function expectKeyboardFocus(page: Page, nav: Locator) {
  const links = nav.getByRole('link');
  // macOS WebKit follows Safari's native link-navigation shortcut. Plain Tab
  // skips links unless the user's full keyboard navigation setting is enabled.
  const macWebKit = process.platform === 'darwin' && page.context().browser()?.browserType().name() === 'webkit';
  const previous = macWebKit ? 'Alt+Shift+Tab' : 'Shift+Tab', next = macWebKit ? 'Alt+Tab' : 'Tab';
  await links.first().focus();
  // Return to the first link through real keyboard navigation, so focus-visible
  // is tested in keyboard modality rather than forced by a CSS class.
  await page.keyboard.press(previous); await page.keyboard.press(next);
  for (let index = 0; index < 3; index++) {
    const link = links.nth(index);
    await expect(link).toBeFocused();
    const focus = await link.evaluate(element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      const expansion = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      const ring = { left: rect.left - expansion, right: rect.right + expansion, top: rect.top - expansion, bottom: rect.bottom + expansion };
      const clipping: string[] = [];
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const parentStyle = getComputedStyle(parent), box = parent.getBoundingClientRect();
        if (['hidden', 'clip', 'auto', 'scroll'].includes(parentStyle.overflowX) && (ring.left < box.left || ring.right > box.right)) clipping.push(`${parent.tagName}:x`);
        if (['hidden', 'clip', 'auto', 'scroll'].includes(parentStyle.overflowY) && (ring.top < box.top || ring.bottom > box.bottom)) clipping.push(`${parent.tagName}:y`);
      }
      const coveredByAdjacentLink = [...element.parentElement!.querySelectorAll('a')].some(other => {
        if (other === element) return false;
        const box = other.getBoundingClientRect();
        return Math.min(ring.right, box.right) > Math.max(ring.left, box.left) && Math.min(ring.bottom, box.bottom) > Math.max(ring.top, box.top);
      });
      return { visible: element.matches(':focus-visible'), width: style.outlineWidth, offset: style.outlineOffset,
        style: style.outlineStyle, clipping, coveredByAdjacentLink,
        inViewport: ring.left >= 0 && ring.right <= innerWidth && ring.top >= 0 && ring.bottom <= innerHeight };
    });
    expect(focus).toEqual({ visible: true, width: '3px', offset: '2px', style: 'solid', clipping: [], coveredByAdjacentLink: false, inViewport: true });
    if (index < 2) await page.keyboard.press(next);
  }
}

async function expectHover(page: Page, nav: Locator) {
  await nav.scrollIntoViewIfNeeded();
  for (const link of await nav.getByRole('link').all()) {
    await page.mouse.move(0, 0);
    // Finish the shared 120ms feedback before taking the default-state sample.
    await link.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)); });
    const before = await link.boundingBox();
    const background = await link.evaluate(element => getComputedStyle(element).backgroundColor);
    await link.hover();
    await expect.poll(() => link.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(background);
    await link.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)); });
    expect(await link.boundingBox()).toEqual(before);
    expect(await link.evaluate(element => ({ radius: getComputedStyle(element).borderTopLeftRadius,
      transform: getComputedStyle(element).transform, background: getComputedStyle(element).backgroundColor })))
      .toEqual({ radius: '12px', transform: 'none', background: expect.not.stringMatching(/^rgba\(0, 0, 0, 0\)$|^transparent$/) });
  }
  await expectGeometry(page, nav);
}

async function exerciseDisclosure(page: Page, example: typeof examples[number]) {
  const summary = page.locator('main summary').filter({ hasText: example.summary });
  await expect(summary).toHaveCount(1);
  const details = summary.locator('..');
  await expect(details).toHaveJSProperty('open', example.open);
  await summary.click(); await expect(details).toHaveJSProperty('open', !example.open);
  await summary.press('Enter'); await expect(details).toHaveJSProperty('open', example.open);
  await summary.press('Space'); await expect(details).toHaveJSProperty('open', !example.open);
  await expectGeometry(page, navigation(page));
  await summary.press('Space'); await expect(details).toHaveJSProperty('open', example.open);
  await expectGeometry(page, navigation(page));
}

for (const example of examples) for (const width of widths) for (const colorScheme of themes) {
  test(`${example.path} ${width} ${colorScheme}: original links, rounded touch targets, hover, focus and disclosure`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 844 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' });
    expect((await page.goto(example.path, { waitUntil: 'networkidle' }))?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    const nav = navigation(page);
    await expectOriginalLinks(nav, example.active);
    await expectGeometry(page, nav); await expectHover(page, nav); await expectKeyboardFocus(page, nav);
    await exerciseDisclosure(page, example);
    await expectOriginalLinks(nav, example.active);
    expect(errors).toEqual([]);
  });
}

for (const width of [1280, 390]) for (const colorScheme of themes) {
  test(`reduced motion ${width} ${colorScheme}: the same controls and native disclosures remain usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 844 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const example of examples) {
      expect((await page.goto(example.path, { waitUntil: 'networkidle' }))?.status()).toBe(200);
      const nav = navigation(page); await expectOriginalLinks(nav, example.active);
      await expectGeometry(page, nav); await expectKeyboardFocus(page, nav);
      for (const link of await nav.getByRole('link').all()) {
        const before = await link.boundingBox();
        await link.hover();
        expect(await link.evaluate(element => {
          const style = getComputedStyle(element);
          // Production CSS combines transform:none + scale:none + translate:none
          // into scale(1)translate(0,0). Verify its exact geometry, not spelling.
          const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
          return { transition: style.transitionDuration, animation: style.animationName,
            matrix: [...matrix.toFloat64Array()], scale: style.scale, translate: style.translate, animations: element.getAnimations().length };
        })).toEqual({ transition: '0s', animation: 'none',
          matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], scale: 'none', translate: 'none', animations: 0 });
        expect(await link.boundingBox()).toEqual(before);
      }
      await exerciseDisclosure(page, example);
    }
  });

  test(`no JavaScript ${width} ${colorScheme}: links navigate and details open and close`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width, height: width === 1280 ? 720 : 844 }, colorScheme });
    await localReadOnly(context, [new URL(baseURL!).origin]);
    try {
      const page = await context.newPage();
      for (const example of examples) {
        expect((await page.goto(example.path, { waitUntil: 'networkidle' }))?.status()).toBe(200);
        const nav = navigation(page); await expectOriginalLinks(nav, example.active);
        await expectGeometry(page, nav); await expectKeyboardFocus(page, nav); await exerciseDisclosure(page, example);
        await nav.getByRole('link', { name: '价格变化记录', exact: true }).click();
        await expect(page).toHaveURL(new URL('/zh/price-history', baseURL!).href);
        await expect(page.locator('main h1')).toHaveText('价格变化记录');
      }
    } finally { await context.close(); }
  });

  test(`actual isolated read failure ${width} ${colorScheme}: keep original failure explanation and working navigation`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 844 }); await page.emulateMedia({ colorScheme });
    const failureBaseURL = testInfo.config.metadata.failureBaseURL as string;
    for (const example of examples) {
      expect((await page.goto(new URL(example.path, failureBaseURL).href, { waitUntil: 'networkidle' }))?.status()).toBe(200);
      await expect(page.locator('main [role="status"]')).toHaveText('暂时无法读取价格记录请稍后刷新重试。读取失败不代表没有价格或没有变化。');
      await expect(page.getByText('尚无可确认的调价事件', { exact: true })).toHaveCount(0);
      const nav = navigation(page);
      // The original failure branches do not claim a selected current page.
      await expectOriginalLinks(nav, null); await expectGeometry(page, nav); await expectHover(page, nav); await expectKeyboardFocus(page, nav);
    }
  });
}

test('existing fictional prices and empty/missing states retain their meaning and destinations', async ({ page }) => {
  await page.goto('/zh/price-history/chatgpt', { waitUntil: 'networkidle' });
  const events = page.getByRole('region', { name: '已确认的调价', exact: true });
  await expect(events).toContainText('本币涨价 +25%');
  await expect(events.getByRole('link', { name: '变化前快照', exact: true })).toHaveAttribute('href', `/zh/price-records/${snapshotId}`);
  await expect(events.getByRole('link', { name: '变化后快照', exact: true })).toHaveAttribute('href', '/zh/price-records/30000000-0000-4000-8000-000000000002');
  await events.getByRole('link', { name: '变化前快照', exact: true }).click();
  await expect(page.locator('main.gs-evidence-page')).toContainText('US$20.00');
  await page.getByText('记录标识与内容校验值', { exact: true }).click();
  await expect(page.locator('main details[open]')).toContainText(snapshotId);
  await expect(page.locator('main details[open]')).toContainText('SHA-256:');
  await page.goto('/zh/price-history/claude', { waitUntil: 'networkidle' });
  await expect(page.getByText('尚无可确认的调价事件', { exact: true })).toBeVisible();
  await expect(page.getByText('这不代表价格从未变化。旧记录可能未保存计费周期；我们保留原始观测，不补造缺失历史。', { exact: true })).toBeVisible();
  await expectOriginalLinks(navigation(page), 'history'); await expectGeometry(page, navigation(page));
  for (const path of ['/zh/price-history/evidence-navigation-nonexistent-product', '/zh/price-records/00000000-0000-4000-8000-000000000000']) {
    expect((await page.goto(path, { waitUntil: 'networkidle' }))?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: '这个页面不存在', exact: true })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  }
});

test('only Chinese evidence routes load the new rules; English, Plus and the country directory keep their own navigation', async ({ context }) => {
  const paths = [...examples.map(example => example.path), ...examples.map(example => example.path.replace('/zh/', '/en/')),
    '/zh/ai-pricing/chatgpt/plus', '/en', '/zh/countries'];
  for (const path of paths) {
    const page = await context.newPage();
    const downloadedCSS: Promise<{ status: number; text: string }>[] = [];
    page.on('response', response => {
      if (response.request().resourceType() === 'stylesheet') downloadedCSS.push(response.text().then(text => ({ status: response.status(), text })));
    });
    try {
      expect((await page.goto(path, { waitUntil: 'networkidle' }))?.status()).toBe(200);
      const sheets = await Promise.all(downloadedCSS);
      for (const sheet of sheets) expect(sheet.status).toBe(200);
      const chineseHistory = path === '/zh/price-history' || path.startsWith('/zh/price-history/');
      const chineseSnapshot = path.startsWith('/zh/price-records/');
      const chineseEvidence = chineseHistory || chineseSnapshot;
      expect(sheets.filter(sheet => sheet.text.includes('.gs-evidence-nav'))).toHaveLength(chineseHistory ? 1 : 0);
      const inline = await page.locator('style').allTextContents();
      expect(inline.filter(text => text.includes('.gs-evidence-nav'))).toHaveLength(chineseSnapshot ? 1 : 0);
      await expect(page.locator('style[data-gs-auxiliary="evidence"]')).toHaveCount(chineseSnapshot ? 1 : 0);
      if (chineseEvidence) {
        expect(inline.some(text => text.includes('.gs-country-index-nav'))).toBe(false);
        await expect(navigation(page).locator('[data-gs-ui="button"]')).toHaveCount(3);
      } else if (path.startsWith('/en/price-')) {
        const nav = page.getByRole('navigation', { name: 'Explore prices', exact: true });
        expect(await nav.getByRole('link').evaluateAll(links => links.map(link => ({
          text: link.textContent?.trim(), href: link.getAttribute('href'), rel: link.getAttribute('rel'), target: link.getAttribute('target'),
          current: link.getAttribute('aria-current'), ui: link.getAttribute('data-gs-ui'), radius: getComputedStyle(link).borderTopLeftRadius,
        })))).toEqual(['Browse by country', 'Price change records', 'Data sources'].map((text, index) => ({
          text, href: `/en/${navigationLinks[index].path}`, rel: null, target: null,
          current: path.startsWith('/en/price-history') && index === 1 ? 'page' : null, ui: null, radius: '0px',
        })));
      } else if (path === '/zh/countries') {
        await expect(page.locator('main nav.gs-country-index-nav [data-gs-ui="button"]')).toHaveCount(3);
        await expect(page.locator('main nav.gs-country-index-nav a[aria-current="page"]')).toHaveAttribute('href', '/zh/countries');
      }
    } finally { await page.close(); }
  }
});
