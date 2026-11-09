import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const fixture = require("../scripts/e2e-fixture.cjs");

test("mobile currency dialog stays inside the viewport in dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/zh/ai-pricing/${fixture.productSlug}/${fixture.planSlug}`);

  const currencyButton = page.getByRole("button", { name: /^折合为 / });
  await currencyButton.click();

  const currencyMenu = page.getByRole("dialog", { name: "选择币种", exact: true });
  await expect(currencyMenu).toBeVisible();
  await expect(currencyMenu).not.toHaveCSS("background-color", "rgb(255, 255, 255)");

  // Measure the settled dialog, after its existing entrance animation finishes.
  await currencyMenu.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });

  const menuGeometry = await currencyMenu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      clientHeight: element.clientHeight,
      left: rect.left,
      position: getComputedStyle(element).position,
      right: rect.right,
      scrollHeight: element.scrollHeight,
      top: rect.top,
    };
  });
  expect(menuGeometry.position).toBe("fixed");
  expect(menuGeometry.left).toBeGreaterThanOrEqual(0);
  expect(menuGeometry.top).toBeGreaterThanOrEqual(0);
  expect(menuGeometry.right).toBeLessThanOrEqual(390);
  expect(menuGeometry.bottom).toBeLessThanOrEqual(844);
  expect(menuGeometry.scrollHeight).toBeGreaterThan(menuGeometry.clientHeight);

  await page.keyboard.press("Escape");
  await expect(currencyMenu).toBeHidden();
  await expect(currencyButton).toHaveAttribute("aria-haspopup", "dialog");
  await expect(currencyButton).toBeFocused();
});
