import { test, expect } from "@playwright/test";

// Fault/empty fixtures live only in the isolated local test database. No app
// runtime switch, route interception or production code fault injection.
const scenario = process.env.HOMEPAGE_HISTORY_SCENARIO || "normal";
test("complete homepage response stays bounded and changes fail closed", async ({ page, request }) => {
  const started = performance.now();
  const response = await request.get("/zh", { timeout: 15_000 });
  const html = await response.text();
  expect(response.status()).toBe(200);
  expect(performance.now() - started).toBeLessThan(12_000);
  expect(html).toContain("同一个订阅");
  await page.goto("/zh");
  await expect(page.locator("h1")).toBeVisible();
  const count = await page.locator(".gs-home-change-row").count();
  expect(count).toBeLessThanOrEqual(6);
  if (["slow", "failure", "empty", "overflow"].includes(scenario)) {
    await expect(page.locator(".gs-home-recent")).toHaveCount(0);
  } else if (scenario === "fixture") {
    await expect(page.locator(".gs-home-recent")).toBeVisible();
    await expect(page.locator(".gs-home-recent a")).toHaveCount(7); // six events + history index
  }
  await expect(page.locator(".gs-home-disclaimer")).toBeVisible();
});
