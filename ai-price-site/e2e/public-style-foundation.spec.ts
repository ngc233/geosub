import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Feed the real styles to the browser; assertions observe rendered behavior.
const styles = ["tokens", "base", "components", "motion"].map(name =>
  readFileSync(path.join(process.cwd(), `app/public-${name}.css`), "utf8"),
).join("\n");

test.beforeEach(async ({ page }) => {
  await page.setContent(`<!doctype html><html><body>
    <section id="legacy"><button id="legacy-button">Legacy</button><p>Existing language and admin content</p></section>
    <section class="gs-public-unified" id="u1">
      <h1>隔离样式测试</h1><button data-gs-ui="button" id="button">查看价格</button>
      <article data-gs-motion-card id="card" tabindex="0">价格 <strong id="price">19.99 USD</strong></article>
      <div class="gs-r2-row-list"><div class="gs-r2-price-row" id="row">地区价格 19.99 USD</div></div>
      <div role="listbox" id="menu">CNY 人民币</div>
    </section></body></html>`);
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    test(`isolation, immediate price visibility and keyboard focus: ${width} ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme });
      const readLegacy = () => page.locator("#legacy-button").evaluate(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return { font: style.font, color: style.color, background: style.backgroundColor, width: rect.width, height: rect.height };
      });
      const before = await readLegacy();
      await page.addStyleTag({ content: styles });
      expect(await readLegacy()).toEqual(before);
      await expect(page.locator("#price")).toBeVisible();
      await expect(page.locator("#row")).toHaveCSS("opacity", "1");
      await expect(page.locator(".gs-r2-row-list")).toHaveCSS("animation-name", "none");
      await page.locator("#legacy-button").focus();
      await page.keyboard.press("Tab");
      await expect(page.locator("#button")).toBeFocused();
      await expect(page.locator("#button")).toHaveCSS("outline-style", "solid");
      expect((await page.locator("#button").boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test("hover lifts the card and deepens its shadow, press feedback stays local", async ({ page }) => {
  await page.addStyleTag({ content: styles });
  const card = page.locator("#card");
  const before = await card.evaluate(element => getComputedStyle(element).boxShadow);
  await card.hover();
  await expect(card).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -2)");
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe(before);
  await expect(card).toHaveCSS("transition-duration", "0.12s, 0.12s, 0.12s");
  await page.locator("#button").hover();
  await page.mouse.down();
  await expect(page.locator("#button")).toHaveCSS("scale", "0.98");
  await page.mouse.up();
});

test("reduced motion disables animations, transitions and hover/press transforms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({ content: styles });
  await page.locator("#card").hover();
  await expect(page.locator("#card")).toHaveCSS("transform", "none");
  await expect(page.locator("#card")).toHaveCSS("transition-duration", "0s");
  await expect(page.locator("#menu")).toHaveCSS("animation-name", "none");
  await page.locator("#button").hover();
  await page.mouse.down();
  await expect(page.locator("#button")).toHaveCSS("scale", "none");
  await page.mouse.up();
  await expect(page.locator("#price")).toBeVisible();
});
