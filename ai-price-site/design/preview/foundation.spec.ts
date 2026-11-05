import { expect, test } from "@playwright/test";

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    test(`SSR, font budget, interaction and no overflow: ${width} ${colorScheme}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 844 }, colorScheme });
      const page = await context.newPage();
      const errors: string[] = [];
      const fonts: Array<{ url: string; bytes: Promise<number> }> = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => {
        if (response.request().resourceType() === "font") fonts.push({ url: response.url(), bytes: response.body().then(body => body.length) });
      });
      await page.goto("/zh");
      await page.evaluate(() => document.fonts.ready);
      const number = page.locator('[aria-label="数字滚动"] [data-size="hero"]');
      await expect(number.locator('[aria-hidden="true"]')).toHaveText("¥ 12.34");
      expect(fonts.length).toBe(2);
      expect(fonts.every(font => font.url.startsWith("http://127.0.0.1:3140/") && font.url.endsWith(".woff2"))).toBe(true);
      expect((await Promise.all(fonts.map(font => font.bytes))).reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(50000);
      await page.getByRole("button", { name: "切换为 98.76", exact: true }).click();
      await expect(number.locator('[aria-hidden="true"]')).toHaveText("¥ 98.76");
      await expect(number).toHaveCSS("opacity", "1");
      await page.getByRole("button", { name: "切换为 0.00", exact: true }).click();
      await expect(number.locator('[aria-hidden="true"]')).toHaveText("¥ 0.00");
      await page.getByRole("button", { name: "查看样例说明", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "查看样例说明", exact: true })).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("#preview-details")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}

test("server HTML keeps final values visible when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/zh");
  await expect(page.getByText("¥ 12.34", { exact: true })).toBeVisible();
  await context.close();
});

test("rapid numeric changes keep the same node and settle; passive refresh does not roll", async ({ page }) => {
  await page.goto("/zh");
  const visual = page.locator('[data-size="hero"] [aria-hidden="true"]');
  const original = await visual.elementHandle();
  const entrance = await page.getByText("内容 1", { exact: true }).elementHandle();
  await page.getByRole("button", { name: "切换为 98.76", exact: true }).click();
  await page.getByRole("button", { name: "切换为 0.00", exact: true }).click();
  await expect(visual).toHaveText("¥ 0.00");
  expect(await original!.evaluate(node => node.isConnected)).toBe(true);
  await page.getByRole("button", { name: "非交互数据刷新示例" }).click();
  expect(await visual.textContent()).toBe("¥ 45.67");
  await page.getByRole("button", { name: "重播进场与脉冲" }).click();
  expect(await entrance!.evaluate(node => node.isConnected)).toBe(true);
});

test("user changes roll through readable intermediate numbers without fading", async ({ page }) => {
  await page.goto("/zh");
  const frames = await page.evaluate(() => new Promise<Array<{ value: number; opacity: string }>>(resolve => {
    const number = document.querySelector('[data-size="hero"] [aria-hidden="true"]')!;
    const button = [...document.querySelectorAll("button")].find(el => el.textContent === "切换为 98.76")!;
    const frames: Array<{ value: number; opacity: string }> = [];
    const start = performance.now(); button.click();
    const read = () => {
      frames.push({ value: Number(number.textContent?.replace(/[^\d.]/g, "")), opacity: getComputedStyle(number).opacity });
      if (performance.now() - start < 800) requestAnimationFrame(read); else resolve(frames);
    };
    requestAnimationFrame(read);
  }));
  expect(frames.some(frame => frame.value > 12.34 && frame.value < 98.76)).toBe(true);
  expect(frames.at(-1)?.value).toBe(98.76);
  expect(frames.every(frame => frame.opacity === "1")).toBe(true);
});

test("reduced motion snaps values and suppresses entrance and pulse movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/zh");
  await page.getByRole("button", { name: "切换为 98.76", exact: true }).click();
  expect(await page.locator('[data-size="hero"] [aria-hidden="true"]').textContent()).toBe("¥ 98.76");
  await page.getByRole("button", { name: "重播进场与脉冲" }).click();
  for (const node of await page.locator("[data-gs-enter]").all()) {
    await expect(node).toHaveCSS("transform", "none");
    await expect(node).toHaveCSS("opacity", "1");
  }
  expect(await page.locator("[data-gs-pulse]").evaluate(el => getComputedStyle(el, "::after").animationName)).toBe("none");
});
