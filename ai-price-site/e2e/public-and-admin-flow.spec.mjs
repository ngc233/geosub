import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const fixture = require("../scripts/e2e-fixture.cjs");
const e2eDir = dirname(fileURLToPath(import.meta.url));
const readFixtureStateScript = resolve(
  e2eDir,
  "..",
  "scripts",
  "read-e2e-fixture-state.cjs",
);

function readFixtureState() {
  return JSON.parse(
    execFileSync(process.execPath, [readFixtureStateScript], {
      encoding: "utf8",
      env: process.env,
    }),
  );
}

test("visitor can move from home to an AI detail and switch language", async ({
  page,
}) => {
  await page.goto("/zh");

  await page.locator('a[href="/zh/ai-pricing"]').first().click();
  await expect(page).toHaveURL(/\/zh\/ai-pricing$/);

  const detailPath = `/zh/ai-pricing/${fixture.productSlug}/${fixture.planSlug}`;
  const productLink = page.locator(`a[href="${detailPath}"]`);
  await expect(productLink).toContainText(fixture.productName);
  await productLink.click();

  await expect(page).toHaveURL(new RegExp(`${detailPath}$`));
  await expect(page.locator("h1").first()).toContainText(fixture.productName);

  await page.locator('header button[aria-haspopup="menu"]').last().click();
  const englishPath = `/en/ai-pricing/${fixture.productSlug}/${fixture.planSlug}`;
  await page.locator(`header a[href="${englishPath}"]`).click();

  await expect(page).toHaveURL(new RegExp(`${englishPath}$`));
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.locator("h1").first()).toContainText(fixture.productName);
});

test("visitor can preview and dismiss a price share card", async ({ page }) => {
  const detailPath = `/zh/ai-pricing/${fixture.productSlug}/${fixture.planSlug}`;
  await page.goto(detailPath);

  await page.locator('[data-track-event="open_share_modal"]').click();

  const dialog = page.getByRole("dialog", { name: "分享价格图" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("svg").first()).toBeVisible();
  await expect(dialog.getByText(fixture.productName, { exact: false }).first()).toBeVisible();
  await expect(dialog.locator('[data-track-event="download_share_image"]')).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("admin can log in and approve a pending observation", async ({ page }) => {
  await page.goto("/admin-login");
  await page.locator('input[name="email"]').fill(fixture.adminEmail);
  await page.locator('input[name="password"]').fill(fixture.adminPassword);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto(`/admin/review?q=${fixture.productSlug}`);
  const productSummary = page
    .getByRole("heading", { name: fixture.productName, exact: true })
    .locator("xpath=ancestor::summary[1]");
  const productDetails = productSummary.locator("xpath=parent::details");
  await expect(productDetails).toBeVisible();
  await productSummary.click();

  const observationInput = page.locator(
    `input[name="id"][value="${fixture.observationId}"]`,
  );
  await expect(observationInput.first()).toBeAttached();

  const overrideDetails = observationInput
    .last()
    .locator("xpath=ancestor::details[1]");
  await overrideDetails.locator("summary").click();
  await observationInput
    .last()
    .locator("xpath=parent::form")
    .locator('button[type="submit"]')
    .click();

  await expect.poll(readFixtureState).toEqual({
    observation_status: "approved",
    published_region_count: 1,
  });
  await page.reload();
  await expect(observationInput).toHaveCount(0);
});
