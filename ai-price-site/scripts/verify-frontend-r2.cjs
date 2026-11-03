// Read-only browser checks against a local preview with real cached prices.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const origin = process.env.R2_ORIGIN || 'http://127.0.0.1:3136';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw Error('Local preview only');
const out = path.resolve(process.env.R2_OUTPUT || '../output/r2-browser');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const width of [1280, 390]) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 720 }, colorScheme: theme, reducedMotion: 'reduce' });
      await context.addCookies([{ name: 'geosub_analytics_consent', value: `denied.${Math.floor(Date.now() / 1000)}`, url: origin }]);
      const page = await context.newPage();
      // The preview DB is read-only. Keep visit counters outside UI verification.
      await page.route('**/api/page-views', route => route.fulfill({ status: 204 }));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/zh/ai-pricing/chatgpt/plus');
      await page.locator('.gs-r2-record').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('main').count(), 1);
      assert.equal(await page.locator('.gs-r2-table-head > span').count(), 10);
      assert.equal(await page.locator('.gs-r2-faq details[open]').count(), 0);
      if (width === 390) {
        const cards = await page.locator('.gs-r2-metric').evaluateAll(cards => cards.map(card => { const b = card.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width,bottom:b.bottom}; }));
        assert.ok(cards[1].y >= cards[0].bottom && cards[2].y >= cards[1].bottom, 'Mobile summary must stack vertically');
      }
      await page.screenshot({ path: path.join(out, `plus-${width}-${theme}.png`), fullPage: false });
      await page.screenshot({ path: path.join(out, `plus-${width}-${theme}-full.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, 'Page overflow');
      assert.equal(await page.locator('.gs-r2-compare-bar').count(), 0);
      const firstRow = page.locator('.gs-r2-record').first();
      if (await firstRow.locator('button.gs-r2-row-button').getAttribute('aria-expanded') !== 'true') await firstRow.locator('button.gs-r2-row-button').click();
      await firstRow.locator('.gs-r2-evidence').waitFor();
      assert.equal(await firstRow.locator('input').isChecked(), false, 'Evidence must not toggle comparison');
      const targetSize = await firstRow.locator('.gs-r2-checkbox').boundingBox();
      assert.ok(targetSize.width >= 44 && targetSize.height >= 44);
      await firstRow.locator('input').check();
      assert.equal(await firstRow.locator('button').first().getAttribute('aria-expanded'), 'true');
      await page.locator('.gs-r2-record input').nth(1).check();
      assert.equal(await page.locator('.gs-primary').isEnabled(), true);
      await page.locator('.gs-r2-record input').nth(2).check();
      assert.equal(await page.locator('.gs-r2-record input').nth(3).isDisabled(), true);
      await page.locator('.gs-primary').click();
      await page.locator('dialog[open]').waitFor();
      assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true);
      await page.screenshot({ path: path.join(out, `comparison-${width}-${theme}.png`), fullPage: false });
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').getAttribute('open'), null);
      assert.equal(await page.locator('.gs-primary').evaluate(el => el === document.activeElement), true);
      await page.locator('.gs-r2-selected button').first().click();
      assert.equal(await page.locator('.gs-r2-record input').nth(3).isEnabled(), true);
      await page.locator('.gs-r2-compare-bar').getByText('清空比较', { exact: true }).click();
      await firstRow.locator('button.gs-r2-row-button').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `evidence-${width}-${theme}.png`), fullPage: false });
      // All regions have evidence and selection controls, including paged rows.
      await page.locator('.gs-r2-more').click();
      assert.equal(await page.locator('.gs-r2-record').count(), 20);
      await page.locator('.gs-r2-search input').fill('NOT_A_REGION');
      await page.locator('.gs-r2-empty').waitFor();
      await page.locator('.gs-r2-search input').fill('US');
      assert.equal(await page.locator('.gs-r2-record').count(), 1);
      await page.locator('.gs-r2-search input').fill('');
      await page.locator('.gs-r2-table-toolbar select').selectOption('desc');
      const topPrice = await page.locator('.gs-r2-row-price').first().textContent();
      assert.equal(topPrice, await page.locator('[data-price-summary="highest"] > strong').textContent());
      await page.locator('.gs-r2-table-toolbar select').selectOption('asc');
      const lowest = await page.locator('.gs-r2-row-price').first().textContent();
      assert.equal(lowest, await page.locator('[data-price-summary="lowest"] > strong').textContent());
      results.push({ width, theme, overflow, pageErrors: errors, interactions: 'evidence, 0/1/2/3 selections, limit, remove, compare, focus, Escape, pagination, search, empty, sorting', lowest, highest: topPrice });
      assert.deepEqual(errors, []);
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([{ name: 'geosub_analytics_consent', value: `denied.${Math.floor(Date.now() / 1000)}`, url: origin }]);
    const page = await context.newPage();
    await page.goto(origin + '/en/ai-pricing/chatgpt/plus');
    await page.locator('.gs-r2-record').first().waitFor();
    assert.ok((await page.locator('h1').textContent()).includes('ChatGPT Plus'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:path.join(out,'plus-en-390.png'),fullPage:true});
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.locator('.gs-header-currency-mobile select').selectOption('EUR');
    await page.getByRole('button', { name: 'Close menu', exact: true }).click();
    assert.ok((await page.locator('.gs-r2-row-price').first().textContent()).includes('€'));
    assert.equal(await page.locator('.gs-r2-row-price').first().textContent(), await page.locator('[data-price-summary="lowest"] > strong').textContent());
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.getByRole('link', { name: 'Countries', exact: true }).filter({visible:true}).click();
    await page.waitForURL('**/en/countries');
    assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).getAttribute('aria-expanded'), 'false');
    results.push({ english: 'passed', currency: 'EUR shared summary/table', mobileNavigation: 'Countries and drawer close' });
    await context.close();
  } finally { await browser.close(); fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(results, null, 2)); }
  console.log(JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
