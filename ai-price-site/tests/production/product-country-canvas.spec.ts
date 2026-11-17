import { test, expect, type BrowserContext, type Locator, type Page, type Request, type Response } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Existing local fictional prices cover these four routes. The other three
// configured pilots are tested as missing-data responses, not claimed as visual
// or historical-price-event coverage. Never point this suite at production.
const examples = [
  { path: '/zh/ai-pricing/chatgpt/regions/philippines', product: 'chatgpt', country: 'ph', title: 'ChatGPT 菲律宾价格与套餐' },
  { path: '/zh/ai-pricing/chatgpt/regions/india', product: 'chatgpt', country: 'in', title: 'ChatGPT 印度价格与套餐' },
  { path: '/zh/ai-pricing/gemini/regions/japan', product: 'gemini', country: 'jp', title: 'Gemini 日本价格与套餐' },
  { path: '/zh/streaming-pricing/netflix/regions/india', product: 'netflix', country: 'in', title: 'Netflix 印度价格与套餐' },
];

// Only these exact checked-in SVG bytes may use a data URL. Do not turn this
// into a generic data:image allowlist or permit external image requests.
const inlineFlagAssets = new Map(['ph', 'in', 'jp', 'kr', 'th'].map(code => {
  const bytes = readFileSync(join(process.cwd(), 'public/flags', `${code}.svg`));
  return [code, { bytes, source: `data:image/svg+xml;base64,${bytes.toString('base64')}` }] as const;
}));
const permittedFlagSources = new Set<string>([...inlineFlagAssets.values()].map(asset => asset.source));

async function localReadOnly(context: BrowserContext, baseURL: string | undefined) {
  if (!baseURL || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname)) {
    throw new Error('Local production build and fictional fixture required');
  }
  await context.addCookies([{ name: 'geosub_analytics_consent', value: `denied.${Math.floor(Date.now() / 1000)}`, url: baseURL }]);
  await context.route('**/*', route => {
    const request = route.request();
    const local = new URL(request.url()).origin === new URL(baseURL).origin;
    const checkedFlag = request.resourceType() === 'image' && permittedFlagSources.has(request.url());
    return (local || checkedFlag) && ['GET', 'HEAD'].includes(request.method())
      ? route.continue() : route.abort();
  });
}

test.beforeEach(async ({ context, baseURL }) => { await localReadOnly(context, baseURL); });

test('one Chinese route stylesheet carries the unchanged numeral subset; English loads neither', async ({ browser, baseURL }) => {
  const source = readFileSync(join(process.cwd(), 'app/public-product-country.css'), 'utf8');
  const baseCSS = readFileSync(join(process.cwd(), 'app/public-base.css'), 'utf8');
  const fontHash = createHash('sha256').update(readFileSync(join(process.cwd(), 'assets/fonts/web/geosub-price-numerals-700.woff2'))).digest('hex');
  const family = 'GeoSub Product Country Price';
  const originalFace = [...baseCSS.matchAll(/@font-face\s*\{[^}]+\}/g)].map(match => match[0]).find(face => face.includes('geosub-price-numerals-700.woff2'))!;
  expect(originalFace).toBeTruthy();
  expect(source).toContain('.gs-product-country');
  for (const item of examples) for (const locale of ['zh', 'en']) {
    // A new context per route prevents a previously loaded font from masking
    // either a missing shared face or a duplicate network font download.
    const context = await browser.newContext({ baseURL });
    await localReadOnly(context, baseURL);
    const page = await context.newPage();
    const stylesheets = new Map<string, Promise<{ status: number; body: string }>>();
    const fontRequests: string[] = [];
    const fontResponses: Promise<{ url: string; status: number; sha256: string }>[] = [];
    // Capture the responses used by the browser, rather than fetching CSS again
    // with the API client. Request interception disables its HTTP cache, so a
    // missing response cannot be mistaken for proof that no CSS was downloaded.
    const onResponse = (response: Response) => {
      if (response.request().resourceType() === 'stylesheet') {
        stylesheets.set(response.url(), response.text().then(body => ({ status: response.status(), body })));
      }
      if (response.request().resourceType() === 'font' && /^https?:/.test(response.url())) {
        fontResponses.push(response.body().then(body => ({
          url: response.url(), status: response.status(), sha256: createHash('sha256').update(body).digest('hex'),
        })));
      }
    };
    const onRequest = (request: Request) => { if (request.resourceType() === 'font' && /^https?:/.test(request.url())) fontRequests.push(request.url()); };
    page.on('request', onRequest);
    page.on('response', onResponse);
    try {
      const path = item.path.replace(/^\/zh\//, `/${locale}/`);
      expect((await page.goto(path, { waitUntil: 'networkidle' }))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      const inline = page.locator('style[data-gs-auxiliary="productCountry"]');
      await expect(inline).toHaveCount(0);
      const linked = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
      expect(linked.length).toBeGreaterThan(0);
      for (const url of linked) {
        expect(new URL(url).origin).toBe(new URL(baseURL!).origin);
        expect(stylesheets.has(url), `browser stylesheet response missing: ${url}`).toBe(true);
      }
      const downloadedCSS = await Promise.all(stylesheets.values());
      for (const result of downloadedCSS) {
        expect(result.status).toBe(200);
      }
      const loadedRules = await page.evaluate(({ routeSource, responses, fontFamily, originalFontFace, inlineStyles }) => {
        const inspect = (text: string) => {
          // Unadopted CSSStyleSheets parse the exact response without applying
          // it again or causing resource downloads during this inspection.
          const sheet = new CSSStyleSheet(); sheet.replaceSync(text);
          const selectors: string[] = [];
          const fontFaces: { family: string; src: string; weight: string; style: string; display: string; unicodeRange: string }[] = [];
          const visit = (rules: CSSRuleList) => {
            for (const rule of [...rules]) {
              if (rule.type === CSSRule.STYLE_RULE) selectors.push((rule as CSSStyleRule).selectorText);
              if (rule.type === CSSRule.FONT_FACE_RULE) {
                const style = (rule as CSSFontFaceRule).style;
                fontFaces.push({
                  family: style.getPropertyValue('font-family').replaceAll('"', '').trim(), src: style.getPropertyValue('src'),
                  weight: style.getPropertyValue('font-weight'), style: style.getPropertyValue('font-style'),
                  display: style.getPropertyValue('font-display'), unicodeRange: style.getPropertyValue('unicode-range'),
                });
              }
              if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
            }
          };
          visit(sheet.cssRules); return { selectors, fontFaces };
        };
        const route = inspect(routeSource);
        // V4 already has a .gs-product-country country cell in its product
        // matrix. It is shared CSS, not this route. The new route's compound
        // root and prefixed classes identify only this route's stylesheet.
        const routeClasses = [...new Set(route.selectors.flatMap(selector => selector.match(/\.gs-product-country-[a-zA-Z0-9_-]+/g) || []))];
        const isRouteSelector = (selector: string) => {
          const classes: string[] = selector.match(/\.[a-zA-Z_][a-zA-Z0-9_-]*/g) || [];
          const compoundRoot = selector.split(/[\s>+~,]+/).some(compound => {
            const names: string[] = compound.match(/\.[a-zA-Z_][a-zA-Z0-9_-]*/g) || [];
            return names.includes('.gs-public-unified') && names.includes('.gs-product-country');
          });
          return compoundRoot || routeClasses.some(name => classes.includes(name));
        };
        const linked = responses.map(inspect).map(sheet => ({
          matchingSelectors: sheet.selectors.filter(isRouteSelector),
          matchingFontFaces: sheet.fontFaces.filter(face => face.family === fontFamily),
          presentClasses: [...new Set(sheet.selectors.flatMap(selector => selector.match(/\.gs-product-country-[a-zA-Z0-9_-]+/g) || []))],
        }));
        const original = inspect(originalFontFace).fontFaces[0];
        return {
          routeClasses,
          routeSheets: linked.filter(sheet => sheet.matchingSelectors.length > 0),
          facesOutsideRoute: linked.filter(sheet => !sheet.matchingSelectors.length).flatMap(sheet => sheet.matchingFontFaces),
          routeFontFaces: route.fontFaces,
          originalDescriptors: { weight: original.weight, style: original.style, display: original.display, unicodeRange: original.unicodeRange },
          inlineRouteSelectors: inlineStyles.map(inspect).flatMap(sheet => sheet.selectors).filter(isRouteSelector),
          inlineRouteFaces: inlineStyles.map(inspect).flatMap(sheet => sheet.fontFaces).filter(face => face.family === fontFamily),
        };
      }, { routeSource: source, responses: downloadedCSS.map(result => result.body), fontFamily: family, originalFontFace: originalFace, inlineStyles: await page.locator('style').allTextContents() });
      expect(loadedRules.routeClasses).toContain('.gs-product-country-content');
      expect(loadedRules.routeClasses).toContain('.gs-product-country-table');
      expect(loadedRules.facesOutsideRoute).toEqual([]);
      expect(loadedRules.inlineRouteSelectors).toEqual([]); expect(loadedRules.inlineRouteFaces).toEqual([]);
      expect(loadedRules.routeFontFaces).toHaveLength(1);
      expect(loadedRules.routeSheets).toHaveLength(locale === 'zh' ? 1 : 0);
      const preloads = page.locator('head link[rel="preload"][as="font"]');
      const fonts = await Promise.all(fontResponses);
      await expect(preloads).toHaveCount(0);
      expect(fontRequests).toEqual([]); expect(fonts).toEqual([]);
      const faces = await page.evaluate(name => [...document.fonts].filter(face => face.family.replaceAll('"', '') === name).map(face => ({
        weight: face.weight, style: face.style, display: face.display, unicodeRange: face.unicodeRange, status: face.status,
      })), family);
      if (locale === 'zh') {
        const routeSheet = loadedRules.routeSheets[0];
        expect(routeSheet.presentClasses.sort()).toEqual(loadedRules.routeClasses.sort());
        expect(routeSheet.matchingFontFaces).toHaveLength(1);
        // Check both source and the browser's actual downloaded CSS bytes:
        // minification may serialize declarations, but may not change the font.
        for (const face of [loadedRules.routeFontFaces[0], routeSheet.matchingFontFaces[0]]) {
          expect(face.family).toBe(family);
          expect({ weight: face.weight, style: face.style, display: face.display, unicodeRange: face.unicodeRange }).toEqual(loadedRules.originalDescriptors);
          const embeddedFont = face.src.match(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/)?.[1];
          expect(embeddedFont).toBeTruthy();
          expect(createHash('sha256').update(Buffer.from(embeddedFont!, 'base64')).digest('hex')).toBe(fontHash);
        }
        expect(faces).toEqual([{ ...loadedRules.originalDescriptors, status: 'loaded' }]);
        expect(await page.evaluate(name => document.fonts.check(`700 16px "${name}"`, '0123456789'), family)).toBe(true);
        const numbers = page.locator('.gs-product-country [data-gs-number]');
        expect(await numbers.count()).toBeGreaterThan(0);
        const numberFonts = await numbers.evaluateAll((elements, name) => elements.map(element => {
          const probe = document.createElement('span');
          probe.style.fontFamily = 'var(--gs-font-body)'; element.append(probe);
          const expectedFallback = getComputedStyle(probe).fontFamily;
          probe.remove();
          const fonts = getComputedStyle(element).fontFamily.split(',').map(value => value.trim());
          return { expectedFamily: name, actualFamily: fonts[0].replaceAll('"', ''), expectedFallback, actualFallback: fonts.slice(1).join(', ') };
        }), family);
        for (const font of numberFonts) {
          expect(font.actualFamily).toBe(font.expectedFamily);
          expect(font.actualFallback).toBe(font.expectedFallback);
        }
      } else {
        expect(faces).toEqual([]);
        for (const result of downloadedCSS) expect(result.body).not.toContain(family);
      }
    } finally {
      page.off('request', onRequest); page.off('response', onResponse); await context.close();
    }
  }
});

async function open(page: Page, path: string) {
  expect((await page.goto(path, { waitUntil: 'networkidle' }))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.gs-product-country')).toHaveCount(1);
}

async function tokenColor(page: Page, token: string) {
  return page.locator('.gs-product-country').evaluate((root, name) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`; root.append(probe);
    const value = getComputedStyle(probe).color; probe.remove(); return value;
  }, token);
}

async function focusWithoutClipping(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  await expect(target).toBeFocused();
  const result = await target.evaluate(element => {
    const style = getComputedStyle(element), box = element.getBoundingClientRect();
    const extent = parseFloat(style.outlineWidth) + Math.max(0, parseFloat(style.outlineOffset));
    const clips: string[] = [];
    for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      const s = getComputedStyle(ancestor), r = ancestor.getBoundingClientRect();
      const margin = parseFloat(s.overflowClipMargin) || 0;
      if (/(hidden|clip|auto|scroll)/.test(s.overflowX) && (box.left - extent < r.left - margin - 0.5 || box.right + extent > r.right + margin + 0.5)) clips.push(`${ancestor.className}:x`);
      if (/(hidden|clip|auto|scroll)/.test(s.overflowY) && (box.top - extent < r.top - margin - 0.5 || box.bottom + extent > r.bottom + margin + 0.5)) clips.push(`${ancestor.className}:y`);
    }
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), clips };
  });
  expect(result.style).toBe('solid');
  expect(result.width).toBe(3);
  expect(result.offset).toBe(2);
  expect(result.clips).toEqual([]);
}

for (const width of [1280, 390]) for (const colorScheme of ['light', 'dark'] as const) {
  test(`product-country four routes: complete responsive prices and local decorative identity ${width} ${colorScheme}`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ colorScheme });
    const errors: string[] = [], externalAssets: string[] = [], flagHttpRequests: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      const checkedFlag = request.resourceType() === 'image' && permittedFlagSources.has(request.url());
      if (['image', 'font'].includes(request.resourceType()) && url.origin !== new URL(baseURL!).origin && !checkedFlag) externalAssets.push(request.url());
      if (/^https?:$/.test(url.protocol) && url.pathname.startsWith('/flags/')) flagHttpRequests.push(request.url());
    });
    for (const item of examples) {
      await open(page, item.path);
      const root = page.locator('.gs-product-country');
      await expect(root.locator('h1')).toHaveText(item.title);
      await expect(root.locator('main')).toHaveCount(0);
      const brand = root.locator('.gs-product-country-brand');
      await expect(brand).toHaveAttribute('aria-hidden', 'true');
      await expect(brand).toHaveAttribute('data-brand-source', 'approved-local');
      await expect(brand.locator('img')).toHaveAttribute('alt', '');
      // The small decorative logo loads on first view, but should not compete
      // at high priority with the styles needed to paint the page text.
      await expect(brand.locator('img')).toHaveAttribute('fetchpriority', 'low');
      await expect(brand.locator('img')).toHaveAttribute('loading', 'eager');
      await expect(brand.locator('img')).toBeInViewport();
      expect(await brand.locator('img').getAttribute('src')).toMatch(/^\/brand-assets\//);
      const flag = root.locator('.gs-home-flag');
      await expect(flag).toHaveAttribute('aria-hidden', 'true');
      const flagImage = flag.locator('img');
      await expect(flagImage).toHaveAttribute('alt', '');
      await expect(flagImage).toHaveAttribute('aria-hidden', 'true');
      await expect(flagImage).toHaveAttribute('width', '28');
      await expect(flagImage).toHaveAttribute('height', '20');
      await expect(flagImage).toHaveCSS('width', '28px');
      // The approved prototype retains 28x20 intrinsic attributes, while the
      // shared .gs-home-flag rule paints at --gs-space-14; only its width is
      // raised to 28px by the local eyebrow rule.
      await expect(flagImage).toHaveCSS('height', '14px');
      const expectedFlag = inlineFlagAssets.get(item.country)!;
      const flagSource = await flagImage.getAttribute('src');
      expect(flagSource).toBe(expectedFlag.source);
      expect(Buffer.from(flagSource!.split(',')[1], 'base64')).toEqual(expectedFlag.bytes);
      expect(await flagImage.evaluate((image: HTMLImageElement) => image.decode().then(() => true, () => false))).toBe(true);
      for (const image of await root.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
      }
      const table = root.locator('.gs-product-country-table'), rows = table.locator('tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);
      await expect(table.locator('thead th')).toHaveCount(5);
      await expect(table.locator('thead th').last()).toHaveAttribute('aria-label', '查看全球套餐比较');
      await expect(root.locator('.gs-product-country-plan-link')).toHaveCount(await rows.count());
      for (const row of await rows.all()) {
        await expect(row.locator('td')).toHaveCount(5);
        await expect(row.locator('.gs-product-country-plan')).not.toHaveText('');
        await expect(row.locator('.gs-product-country-local')).toContainText('全球价格位次');
        await expect(row.locator('.gs-product-country-usd')).toContainText('$');
        await expect(row.locator('.gs-product-country-trust')).toHaveText('已核验');
        await expect(row.locator('.gs-product-country-plan-link')).toHaveText('查看全球套餐比较');
        expect(await row.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        if (width === 390) {
          expect(await row.evaluate(el => getComputedStyle(el).display)).not.toBe('table-row');
          for (const cell of await row.locator('td').all()) await expect(cell).toBeVisible();
          const corners = await row.evaluate(el => { const s = getComputedStyle(el); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius, s.borderBottomRightRadius].map(parseFloat); });
          expect(corners.every(radius => radius > 0)).toBe(true);
        }
      }
      expect(await table.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(root.locator('.gs-product-country-decision')).toHaveCount(3);
      for (const title of ['怎么选', '当地价格怎么理解', '订阅前确认', '数据说明']) await expect(root.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(root.locator('.gs-product-country-summary')).toHaveCSS('background-color', await tokenColor(page, '--gs-surface'));
      if (item.product === 'netflix') {
        await expect(root.locator('[data-purchase-eligibility]')).toContainText('App Store 续费价格 · 现有 Apple 计费用户');
        await expect(root.locator('[data-purchase-eligibility] a')).toHaveAttribute('href', 'https://help.netflix.com/en/node/25097');
        await expect(root.locator('.gs-product-country-usd').filter({ hasText: '暂无同套餐美国参考价' }).first()).toBeVisible();
      }
    }
    expect(externalAssets).toEqual([]); expect(flagHttpRequests).toEqual([]); expect(errors).toEqual([]);
  });

  test(`row hover stays rounded and still; shared buttons and keyboard focus remain usable ${width} ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ colorScheme });
    for (const item of examples) {
      await open(page, item.path);
      const root = page.locator('.gs-product-country'), row = root.locator('tbody tr').first();
      await row.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
      const before = await row.boundingBox(); await row.hover();
      await expect(row).toHaveCSS('transform', 'none'); await expect(row).toHaveCSS('box-shadow', 'none');
      if (width === 390) {
        await expect(row).toHaveCSS('background-color', await tokenColor(page, '--gs-row-hover'));
      } else {
        // A colored rectangular tr behind rounded cells would leak square
        // corners. Inspect the actual painted layers, not just border-radius.
        await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(row.locator('td').first()).toHaveCSS('background-color', await tokenColor(page, '--gs-row-hover'));
      }
      const after = await row.boundingBox();
      expect(after).toEqual(before);
      const corners = await row.evaluate(el => {
        const first = getComputedStyle(el.firstElementChild!), last = getComputedStyle(el.lastElementChild!);
        return [first.borderTopLeftRadius, first.borderBottomLeftRadius, last.borderTopRightRadius, last.borderBottomRightRadius].map(parseFloat);
      });
      if (width === 1280) expect(corners.every(radius => radius > 0)).toBe(true);
      const buttons = root.locator('[data-gs-ui="button"]');
      expect(await buttons.count()).toBeGreaterThan(1);
      for (const button of await buttons.all()) {
        const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThanOrEqual(44);
        await expect(button).toHaveCSS('cursor', 'pointer');
        expect(await button.evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThan(0);
      }
      // Start a real keyboard sequence, then inspect every content link's focus
      // outline, including inline evidence/eligibility links inside panels.
      await page.keyboard.press('Tab');
      for (const link of await root.locator('a').all()) await focusWithoutClipping(link);
      const firstPlan = root.locator('.gs-product-country-plan-link').first();
      await firstPlan.focus();
      await expect(firstPlan).toHaveCSS('outline-width', '3px');
      await expect(firstPlan).toHaveCSS('outline-offset', '2px');
      const href = await firstPlan.getAttribute('href'); expect(href).toMatch(new RegExp(`^/zh/(ai-pricing|streaming-pricing)/${item.product}/[^/]+$`));
      await firstPlan.press('Enter'); await expect(page).toHaveURL(new RegExp(`${href}$`));
      await page.waitForLoadState('networkidle');
    }
  });
}

test('390px fictional long KRW display keeps amount and cycle inside the local-price cell', async ({ page }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme });
    await open(page, examples[0].path);
    const row = page.locator('.gs-product-country-table tbody tr').first();
    const number = row.locator('.gs-product-country-local .gs-product-country-number');
    const amount = number.locator(':scope > span').first(), cycle = number.locator('[data-gs-cycle]');
    await expect(cycle).toHaveCount(1); const originalCycle = await cycle.textContent();
    const fictionalAmount = 'KRW 9,999,999,999.99';
    // DOM-only typography stress fixture. This is deliberately not a real KRW
    // price, database update, currency conversion or supported new pilot.
    await amount.evaluate((node, text) => { node.textContent = text; }, fictionalAmount);
    await expect(amount).toHaveText(fictionalAmount); await expect(cycle).toHaveText(originalCycle!);
    await expect(amount).toBeVisible(); await expect(cycle).toBeVisible();
    for (const target of [amount, cycle]) {
      const measurement = await target.evaluate(element => {
        const local = element.closest('.gs-product-country-local')!, cell = local.getBoundingClientRect();
        const usd = local.parentElement!.querySelector('.gs-product-country-usd')!.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(element);
        const rects = [...range.getClientRects()].filter(rect => rect.width && rect.height);
        return {
          inside: rects.length > 0 && rects.every(rect => rect.left >= cell.left && rect.right <= cell.right && rect.top >= cell.top && rect.bottom <= cell.bottom),
          clearOfUsd: rects.every(rect => rect.right <= usd.left),
          cellOverflow: local.scrollWidth > local.clientWidth,
        };
      });
      expect(measurement).toEqual({ inside: true, clearOfUsd: true, cellOverflow: false });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(row.locator('.gs-product-country-plan-link')).toBeVisible();
  }
});

test('390px touch activates the original plan destination in both themes', async ({ browser, baseURL }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 }, colorScheme });
    try {
      await localReadOnly(context, baseURL);
      const page = await context.newPage();
      for (const item of examples) {
        await open(page, item.path);
        const action = page.locator('.gs-product-country-plan-link').first();
        const href = await action.getAttribute('href');
        await action.scrollIntoViewIfNeeded(); await action.tap();
        await expect(page).toHaveURL(new RegExp(`${href}$`)); await page.waitForLoadState('networkidle');
      }
    } finally { await context.close(); }
  }
});

test('reduced motion disables transitions without hiding any price or action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const item of examples) {
    await open(page, item.path);
    for (const element of await page.locator('.gs-product-country [data-gs-motion-row], .gs-product-country [data-gs-ui="button"]').all()) {
      await expect(element).toHaveCSS('transition-duration', '0s'); await expect(element).toHaveCSS('animation-name', 'none');
    }
    const action = page.locator('.gs-product-country-plan-link').first();
    await action.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
    const before = await action.boundingBox(); await action.hover();
    // Production CSS may serialize an inert transform as matrix(1,0,0,1,0,0).
    // This button has static content: require the exact identity matrix and
    // unchanged geometry, rather than accepting any transform as harmless.
    const identity = await action.evaluate(element => {
      const transform = getComputedStyle(element).transform;
      return new DOMMatrixReadOnly(transform === 'none' ? undefined : transform).isIdentity;
    });
    expect(identity).toBe(true); expect(await action.boundingBox()).toEqual(before);
    await expect(action).toBeVisible();
    expect(await page.locator('.gs-product-country-table tbody tr:visible').count()).toBeGreaterThan(0);
  }
});

test('server HTML retains every table cell, disclosure-free explanation and destination without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    await localReadOnly(context, baseURL);
    const page = await context.newPage();
    for (const item of examples) {
      await open(page, item.path);
      const root = page.locator('.gs-product-country');
      await expect(root.getByRole('heading', { level: 1 })).toHaveText(item.title);
      expect(await root.locator('tbody tr').count()).toBeGreaterThan(0);
      await expect(root.locator('details')).toHaveCount(0);
      for (const explanation of await root.locator('.gs-product-country-decision p').all()) await expect(explanation).toBeVisible();
      for (const link of await root.locator('.gs-product-country-plan-link').all()) {
        await expect(link).toBeVisible(); expect(await link.getAttribute('href')).toContain(`/${item.product}/`);
      }
      expect(await root.locator('img').count()).toBeGreaterThanOrEqual(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } finally { await context.close(); }
});

test('missing local prices stay 404 instead of fabricating a successful pilot page', async ({ page }) => {
  for (const path of ['/zh/ai-pricing/claude/regions/south-korea', '/zh/ai-pricing/grok/regions/south-korea', '/zh/ai-pricing/grok/regions/thailand']) {
    expect((await page.goto(path, { waitUntil: 'networkidle' }))?.status()).toBe(404);
    await expect(page.locator('.gs-product-country')).toHaveCount(0);
  }
});

// The approved phone/desktop snapshots missed the narrow-tablet transition.
// Use the existing rendered fixture prices unchanged, including Pro 200 and
// Netflix Standard/Premium, and inspect painted text rather than scrollWidth:
// adjacent table cells can overlap while the table itself still fits the page.
for (const width of [390, 767, 768, 820, 1023, 1024, 1280]) for (const colorScheme of ['light', 'dark'] as const) {
  test(`price-cell boundary: original amounts, cycles and controls stay separate ${width} ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ colorScheme });
    for (const item of [examples[0], examples[3]]) {
      await open(page, item.path);
      const rows = page.locator('.gs-product-country-table tbody tr');
      const measurements = await rows.evaluateAll(elements => {
        const rect = (box: DOMRect) => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom });
        const characters = (element: Element) => {
          const result: Array<{ text: string; left: number; right: number; top: number; bottom: number }> = [];
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            let offset = 0;
            for (const character of node.textContent || '') {
              const range = document.createRange();
              range.setStart(node, offset); offset += character.length; range.setEnd(node, offset);
              if (!character.trim()) continue;
              for (const box of range.getClientRects()) {
                if (box.width && box.height) result.push({ text: character, ...rect(box) });
              }
            }
          }
          return result;
        };
        const inside = (character: ReturnType<typeof characters>[number], cell: DOMRect) =>
          character.left >= cell.left && character.right <= cell.right && character.top >= cell.top && character.bottom <= cell.bottom;
        return elements.map(row => {
          const localCell = row.querySelector('.gs-product-country-local')!, usdCell = row.querySelector('.gs-product-country-usd')!;
          const localNumber = localCell.querySelector('.gs-product-country-number')!, usdNumber = usdCell.querySelector('.gs-product-country-number')!;
          const amount = localNumber.querySelector(':scope > span')!, cycle = localNumber.querySelector('[data-gs-cycle]')!;
          const amountCharacters = characters(amount), cycleCharacters = characters(cycle), usdCharacters = characters(usdNumber);
          const localCharacters = [...amountCharacters, ...cycleCharacters];
          return {
            plan: row.querySelector('.gs-product-country-plan')!.textContent!.trim(),
            amount: amount.textContent, cycle: cycle.textContent, usd: usdNumber.textContent,
            amountCharacters: amountCharacters.length, cycleCharacters: cycleCharacters.length, usdCharacters: usdCharacters.length,
            outsideLocal: localCharacters.filter(character => !inside(character, localCell.getBoundingClientRect())),
            outsideUsd: usdCharacters.filter(character => !inside(character, usdCell.getBoundingClientRect())),
            overlaps: localCharacters.flatMap(local => usdCharacters.filter(usd =>
              Math.min(local.right, usd.right) > Math.max(local.left, usd.left) &&
              Math.min(local.bottom, usd.bottom) > Math.max(local.top, usd.top)
            ).map(usd => ({ local, usd }))),
          };
        });
      });
      expect(measurements.length).toBeGreaterThan(0);
      // Assert the originally observed defect first, so the pre-fix run fails
      // on real overlapping glyphs rather than an inferred layout breakpoint.
      expect(measurements.filter(row => row.overlaps.length), `${item.path}: local price/cycle overlaps USD`).toEqual([]);
      for (const row of measurements) {
        expect(row.amountCharacters, `${item.path} ${row.plan}: visible amount`).toBeGreaterThan(0);
        expect(row.cycleCharacters, `${item.path} ${row.plan}: visible billing cycle`).toBeGreaterThan(0);
        expect(row.usdCharacters, `${item.path} ${row.plan}: visible USD amount`).toBeGreaterThan(0);
        expect(row.outsideLocal, `${item.path} ${row.plan}: local amount/cycle stays in its own cell`).toEqual([]);
        expect(row.outsideUsd, `${item.path} ${row.plan}: USD stays in its own cell`).toEqual([]);
      }
      for (const row of await rows.all()) {
        await row.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
        const before = await row.boundingBox(); await row.hover();
        await expect(row).toHaveCSS('transform', 'none'); await expect(row).toHaveCSS('box-shadow', 'none');
        expect(await row.boundingBox()).toEqual(before);
        if (width <= 1023) {
          await expect(row).toHaveCSS('display', 'grid');
          await expect(row).toHaveCSS('background-color', await tokenColor(page, '--gs-row-hover'));
          expect(await row.evaluate(element => {
            const style = getComputedStyle(element);
            return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius].every(value => parseFloat(value) > 0);
          })).toBe(true);
        } else {
          await expect(row).toHaveCSS('display', 'table-row');
          await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
          for (const cell of await row.locator('td').all()) await expect(cell).toHaveCSS('background-color', await tokenColor(page, '--gs-row-hover'));
          expect(await row.evaluate(element => {
            const first = getComputedStyle(element.firstElementChild!), last = getComputedStyle(element.lastElementChild!);
            return [first.borderTopLeftRadius, first.borderBottomLeftRadius, last.borderTopRightRadius, last.borderBottomRightRadius].every(value => parseFloat(value) > 0);
          })).toBe(true);
        }
        const action = row.locator('.gs-product-country-plan-link');
        await expect(action).toHaveText('查看全球套餐比较'); await expect(action).toHaveCSS('cursor', 'pointer');
        const actionBox = await action.boundingBox();
        expect(actionBox!.width).toBeGreaterThanOrEqual(44); expect(actionBox!.height).toBeGreaterThanOrEqual(44);
        const content = await action.evaluate(element => {
          const box = element.getBoundingClientRect(), cell = element.closest('td')!.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(element);
          const content = [...range.getClientRects(), ...Array.from(element.querySelectorAll('svg'), icon => icon.getBoundingClientRect())].filter(rect => rect.width && rect.height);
          return {
            contentCount: content.length,
            contentInside: content.every(rect => rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom),
            buttonInsideCell: box.left >= cell.left && box.right <= cell.right && box.top >= cell.top && box.bottom <= cell.bottom,
            overflow: element.scrollWidth > element.clientWidth,
          };
        });
        expect(content.contentCount).toBeGreaterThan(0);
        expect(content).toMatchObject({ contentInside: true, buttonInsideCell: true, overflow: false });
        await action.hover();
        await expect(action).toHaveCSS('background-color', await tokenColor(page, '--gs-subtle'));
        expect(await action.evaluate(element => parseFloat(getComputedStyle(element).borderTopLeftRadius))).toBeGreaterThan(0);
        await page.keyboard.press('Tab');
        await action.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
        await focusWithoutClipping(action);
        const focus = await action.evaluate(element => {
          const box = element.getBoundingClientRect(), style = getComputedStyle(element);
          const extent = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
          const row = element.closest('tr')!, boundary = getComputedStyle(row).display === 'grid' ? row : element.closest('.gs-product-country-table-panel')!;
          const bounds = boundary.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return {
            insidePaintedBoundary: box.left - extent >= bounds.left && box.right + extent <= bounds.right && box.top - extent >= bounds.top && box.bottom + extent <= bounds.bottom,
            insideViewport: box.left - extent >= 0 && box.right + extent <= innerWidth && box.top - extent >= 0 && box.bottom + extent <= innerHeight,
            unobscured: hit === element || !!hit && element.contains(hit),
          };
        });
        expect(focus).toEqual({ insidePaintedBoundary: true, insideViewport: true, unobscured: true });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}
