import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const fixture = require("../scripts/e2e-fixture.cjs");

test("mobile shared currency control fits the viewport and preserves the selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/zh/ai-pricing/${fixture.productSlug}/${fixture.planSlug}`);
  await page.getByRole("button", { name: "打开菜单" }).click();
  const currency = page.getByRole("combobox", { name: /^展示币种/ }).filter({ visible: true });
  await expect(currency).toBeVisible();
  await page.keyboard.press("Tab");
  await currency.focus();
  await expect(currency).toHaveCSS("outline-style", "solid");
  const rect = await currency.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(390);
  expect(rect.height).toBeGreaterThanOrEqual(44);
  await currency.click();
  const options = page.getByRole("listbox", { name: "展示币种", exact: true });
  await expect(options).toBeVisible();
  const menuRect = await options.boundingBox();
  expect(menuRect.x).toBeGreaterThanOrEqual(0);
  expect(menuRect.x + menuRect.width).toBeLessThanOrEqual(390);
  expect(menuRect.y).toBeGreaterThanOrEqual(0);
  expect(menuRect.y + menuRect.height).toBeLessThanOrEqual(844);
  await options.getByRole("option", { name: "USD", exact: true }).click();
  await expect(options).toBeHidden();
  await expect(currency).toHaveText("USD");
  await page.getByRole("button", { name: "关闭菜单" }).click();
  await page.reload();
  await page.getByRole("button", { name: "打开菜单" }).click();
  await expect(currency).toHaveText("USD");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
