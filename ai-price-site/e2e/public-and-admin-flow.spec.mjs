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
  if ((await productDetails.getAttribute("open")) === null) {
    await productSummary.click();
  }
  await expect(productDetails).toHaveAttribute("open", "");

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
    .locator("xpath=ancestor::form[1]")
    .getByRole("button", { name: "覆盖入库", exact: true })
    .click();

  await expect.poll(readFixtureState).toEqual({
    observation_status: "approved",
    published_region_count: 1,
  });
  await page.reload();
  await expect(observationInput).toHaveCount(0);
});

test("a country click opens persistent price details while the map remains pannable", async ({ page }) => {
  await page.goto(`/en/ai-pricing/${fixture.productSlug}/${fixture.planSlug}`);
  const map = page.locator("[data-detail-geo-pricing]");
  await map.scrollIntoViewIfNeeded();
  const country = page.locator('[data-detail-map-country="US"]');
  await expect(country).toBeVisible();
  const point = await country.evaluate((path) => {
    const box = path.getBBox();
    for (let y = 0.1; y < 1; y += 0.1) for (let x = 0.1; x < 1; x += 0.1) {
      const local = new DOMPoint(box.x + box.width * x, box.y + box.height * y);
      if (!path.isPointInFill(local)) continue;
      const screen = local.matrixTransform(path.getScreenCTM());
      if (document.elementFromPoint(screen.x, screen.y) === path) return { x: screen.x, y: screen.y };
    }
    throw new Error("No accessible country shape point");
  });
  await page.mouse.click(point.x, point.y);
  const selection = page.locator("[data-detail-map-selection]");
  await expect(selection.getByRole("button")).toBeVisible();
  await expect(selection).toContainText("United States");
  await page.mouse.move(point.x + 40, point.y + 40);
  await expect(selection.getByRole("button")).toBeVisible();
  await selection.getByRole("button").click();
  await expect(selection).toBeHidden();
  const geometry = country.locator("..");
  const before = await geometry.getAttribute("transform");
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 35, point.y + 15, { steps: 5 });
  await page.mouse.up();
  await expect(geometry).not.toHaveAttribute("transform", before);
});
