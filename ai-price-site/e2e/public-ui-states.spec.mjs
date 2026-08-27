import { expect, test } from "@playwright/test";

async function getRenderedBackgroundRgb(locator) {
  return locator.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Canvas context is unavailable.");
    }
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  });
}

test("homepage and search remain usable across desktop mobile light and dark states", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/zh");

  const rejectAnalytics = page.getByRole("button", { name: "拒绝统计" });
  if (await rejectAnalytics.isVisible()) {
    await rejectAnalytics.click();
  }

  const categoryCard = page
    .getByRole("heading", { name: "AI 订阅", level: 3 })
    .locator("xpath=ancestor::a[1]");
  await expect(categoryCard).toBeVisible();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 248, 250)",
  );
  await expect(categoryCard).toHaveCSS("background-color", "rgb(255, 255, 255)");

  await categoryCard.hover();
  await expect
    .poll(() => categoryCard.evaluate((element) => getComputedStyle(element).translate))
    .not.toBe("none");
  await categoryCard.focus();
  await expect
    .poll(() => categoryCard.evaluate((element) => getComputedStyle(element).boxShadow))
    .not.toBe("none");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(9, 9, 11)",
  );
  await expect(categoryCard).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(categoryCard).not.toHaveCSS("color", "rgb(0, 0, 0)");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await page.getByRole("button", { name: "搜索" }).click();
  const searchDialog = page.getByRole("dialog", { name: "搜索 GeoSub" });
  await expect(searchDialog).toBeVisible();
  await expect(searchDialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.keyboard.press("Escape");
  await expect(searchDialog).toBeHidden();

  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: "搜索" }).click();
  await expect(searchDialog).toBeVisible();
  expect(await getRenderedBackgroundRgb(searchDialog)).toEqual([9, 9, 11]);
  await page.keyboard.press("Escape");

  const menuButton = page.getByRole("button", { name: "打开菜单" });
  await menuButton.click();
  const closeMenuButton = page.getByRole("button", { name: "关闭菜单" });
  await expect(closeMenuButton).not.toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await closeMenuButton.click();
});
