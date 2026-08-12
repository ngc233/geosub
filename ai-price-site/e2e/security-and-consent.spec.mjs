import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = dirname(fileURLToPath(import.meta.url));
const countEventsScript = resolve(e2eDir, "..", "scripts", "count-e2e-events.cjs");

function countEvents() {
  return Number(
    execFileSync(process.execPath, [countEventsScript], {
      encoding: "utf8",
      env: process.env,
    }).trim(),
  );
}

test("unauthenticated admin routes redirect to the login page", async ({ page }) => {
  await page.goto("/admin/review");

  await expect(page).toHaveURL(/\/admin-login$/);
  await expect(page.locator("form")).toBeVisible();
});

test("public browsing without consent creates no analytics identity or event", async ({
  page,
  request,
}) => {
  const eventRequests = [];
  page.on("request", (outgoingRequest) => {
    if (outgoingRequest.url().includes("/api/events")) {
      eventRequests.push(outgoingRequest.url());
    }
  });

  const before = countEvents();
  await page.goto("/zh/data-sources");
  await expect(page).toHaveURL(/\/zh\/data-sources$/);
  await expect(page.locator("main").first()).toBeVisible();
  await page.waitForTimeout(500);

  expect(eventRequests).toEqual([]);
  const cookies = await page.context().cookies();
  expect(cookies.some(({ name }) => name === "geosub_anon_id")).toBe(false);
  expect(cookies.some(({ name }) => name === "geosub_analytics_consent")).toBe(
    false,
  );

  const response = await request.post("/api/events", {
    data: {
      eventKey: "page_view",
      eventName: "E2E consent guard",
      pagePath: "/zh/data-sources",
      locale: "zh",
      source: "e2e",
    },
  });
  expect(response.status()).toBe(204);
  expect(countEvents()).toBe(before);
});
