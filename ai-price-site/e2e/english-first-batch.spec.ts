import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`English shared shell and original home content at ${width}px in ${colorScheme}`, async ({page})=>{
      await page.setViewportSize({width,height:840});
      await page.emulateMedia({colorScheme,reducedMotion:"reduce"});
      for (const route of ["/en","/en/ai-pricing"]) {
        await page.goto(route);
        await expect(page.locator("header.gs-header")).toBeVisible();
        await expect(page.locator("footer.gs-footer")).toBeVisible();
        await expect(page.locator("main h1")).toHaveCount(1);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
      await page.goto("/en");
      for (const text of [
        "See where prices came from, when they were collected and how they were reviewed.",
        "Put the monthly price in the context of local income.",
        "Separate actual price changes from currency movement.",
        "GeoSub provides independent price and cost comparisons. The platform checkout price is final.",
      ]) await expect(page.locator("main").getByText(text,{exact:true})).toBeVisible();
      await page.keyboard.press("/");
      await expect(page.getByRole("combobox",{name:"Search products or countries"})).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog",{name:"Search",exact:true})).toHaveCount(0);
      await page.goto("/en/streaming-pricing");
      await expect(page.locator("header.gs-header")).toHaveCount(0);
    });
  }
}
