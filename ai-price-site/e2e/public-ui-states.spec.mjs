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

  // The repository CI seed has no eligible DATA-1 representatives. Empty
  // sections must stay absent, rather than falling back to legacy category data.
  await expect(page.getByRole("heading", { name: "按分类找", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "省钱排行榜", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("收录统计")).toHaveCount(0);
  const guideCard = page.getByRole("heading", { name: "如何阅读地区价格", level: 3, exact: true }).locator("xpath=ancestor::a[1]");
  await expect(guideCard).toHaveAttribute("href", "/zh/guides/price-guide");
  await expect(guideCard.locator(".gs-home-guide-category")).toHaveText("价格指南");
  await expect(guideCard).toBeVisible();
  await expect(guideCard).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await guideCard.focus();
  await expect(guideCard).toBeFocused();

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(guideCard).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(guideCard).not.toHaveCSS("color", "rgb(0, 0, 0)");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await page.getByRole("button", { name: "搜索产品或国家", exact: true }).click();
  const searchDialog = page.getByRole("dialog", { name: "搜索", exact: true });
  await expect(searchDialog).toBeVisible();
  await expect(searchDialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.keyboard.press("Escape");
  await expect(searchDialog).toBeHidden();

  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: "搜索产品或国家", exact: true }).click();
  await expect(searchDialog).toBeVisible();
  expect(await getRenderedBackgroundRgb(searchDialog)).toEqual([26, 29, 32]);
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
