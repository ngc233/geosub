import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`approved homepage and search: ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
      await page.emulateMedia({ colorScheme: theme });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/zh");
      const rejectAnalytics = page.getByRole("button", { name: "拒绝统计" });
      if (await rejectAnalytics.isVisible()) await rejectAnalytics.click();

      const pageColor = theme === "light" ? "rgb(244, 245, 240)" : "rgb(20, 25, 28)";
      const surfaceColor = theme === "light" ? "rgb(255, 255, 255)" : "rgb(29, 36, 39)";
      await expect(page.locator(".gs-public-shell")).toHaveCSS("background-color", pageColor);
      const products = page.locator(".gs-home-products");
      await expect(products.getByRole("heading", { name: "按产品找价格" })).toBeVisible();
      await expect(products).toHaveCSS("background-color", surfaceColor);
      const aiLink = products.getByRole("link", { name: "AI 订阅", exact: true });
      await expect(aiLink).toHaveAttribute("href", "/zh/ai-pricing");
      await page.keyboard.press("Tab");
      await aiLink.focus();
      await expect(aiLink).toHaveCSS("outline-style", "solid");
      await expect(aiLink).toHaveCSS("outline-width", "2px");

      const searchButton = page.locator("[data-public-header]").getByRole("button", { name: "搜索", exact: true });
      await searchButton.click();
      const searchDialog = page.getByRole("dialog", { name: "搜索 GeoSub" });
      await expect(searchDialog).toBeVisible();
      await expect(searchDialog).toHaveCSS("background-color", surfaceColor);
      await expect(searchDialog.getByRole("textbox")).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      expect(await searchDialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Escape");
      await expect(searchDialog).toBeHidden();
      await expect(searchButton).toBeFocused();

      if (width === 390) {
        await page.getByRole("button", { name: "打开菜单" }).click();
        const close = page.getByRole("button", { name: "关闭菜单" });
        await expect(close).toHaveAttribute("aria-expanded", "true");
        await close.click();
        await expect(page.getByRole("button", { name: "打开菜单" })).toHaveAttribute("aria-expanded", "false");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(errors).toEqual([]);
    });
  }
}
