import { test, expect } from "@playwright/test";
import type { GameResponse } from "../lib/game-offers";
const path = "/zh/games/gta-6";
const api = "/api/games/gta-6/offers";
test.skip(process.env.GEOSUB_GAME_TEST !== "1", "Requires the approved two-market local game dataset.");

test("published API and first server HTML agree on every platform and edition", async ({ request }) => {
  for (const platform of ["ps5", "xbox", "pc"]) {
    const response = await request.get(api + "?platform=" + platform);
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const data: GameResponse = await response.json();
    expect(data.full_games).toHaveLength(platform === "pc" ? 0 : 4);
    expect(data.upgrades).toHaveLength(platform === "pc" ? 0 : 2);
    for (const edition of ["standard", "ultimate"]) {
      const response = await request.get(path + "?platform=" + platform + "&edition=" + edition);
      expect(response.ok()).toBe(true);
      const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      if (platform === "pc") {
        expect(html).toContain('data-console="xbox"');
        continue;
      }
      for (const r of data.full_games.filter((r) => r.edition === edition)) {
        expect(r.price).not.toBeNull();
        expect(html).toContain(r.store_url);
        expect(html).toContain(r.price!.converted_public_price!);
      }
    }
  }
  for (const url of [api, api + "?platform=unknown", api + "?platform=ps5&display_currency=BAD"])
    expect((await request.get(url)).status()).toBe(400);
  expect((await request.get("/api/games/unknown/offers?platform=ps5")).status()).toBe(404);
});
for (const width of [1280, 390, 320])
  for (const colorScheme of ["light", "dark"] as const) {
    test("game page at " + width + "px in " + colorScheme, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto(path);
      const hero = page.locator(".game-selectors");
      await expect(page.locator("#quote-insight")).toContainText("已核验 2 个地区");
      await expect(page.locator(".lowest-offer")).toHaveAttribute("data-code", "HK");
      if (width <= 390) {
        const [p, e] = await hero
          .locator(".game-field")
          .evaluateAll((fields) =>
            fields.map((f) => ({
              top: f.getBoundingClientRect().top,
              bottom: f.getBoundingClientRect().bottom,
            })),
          );
        expect(e.top).toBeGreaterThanOrEqual(p.bottom);
      }
      await hero.getByRole("tab", { name: "Xbox", exact: true }).click();
      await expect(page.locator(".upgrade-note")).toContainText("HK$140");
      await hero.getByRole("tab", { name: "终极版", exact: true }).click();
      await expect(page.locator('[data-code="HK"] .quote-local')).toHaveText("HK$708");
      await page.getByRole("tablist", { name: "版本对照地区" }).getByRole("tab", { name: "美国" }).click();
      await expect(page.locator(".edition-option[aria-current] [data-buy]")).toHaveAttribute(
        "href",
        /en-US.*9pn8dw2wtff8/i,
      );
      await expect(page.locator(".upgrade-note")).toContainText("US$20");
      await page.locator("#currency-trigger").click();
      await page.locator('[data-currency="USD"]').click();
      await expect(page.locator('[data-code="US"] .quote-fx strong')).toHaveText("US$99.99");
      await page.getByRole("button", { name: "查看香港报价依据" }).click();
      await expect(page.locator("#details-HK")).toContainText("核价");
      await hero.getByRole("tab", { name: /PC/ }).click();
      await expect(page.locator("#pc-state")).toBeVisible();
      await expect(page.locator("#regions")).toHaveCount(0);
      await expect(page.locator("#pc-state button")).toHaveCount(2);
      await page.locator('[data-console="ps5"]').click();
      await expect(page.locator(".upgrade-note")).toContainText("无法购买");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await hero.getByRole("tab", { name: "PS5", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(hero.getByRole("tab", { name: "Xbox", exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  }
test("an expired US quote keeps the store link and removes savings and edition premium", async ({
  page,
  request,
}) => {
  const data: GameResponse = await (await request.get(api + "?platform=ps5")).json();
  for (const row of data.full_games.filter((r) => r.market === "US" && r.edition === "standard")) {
    row.status = "stale_expired";
    row.price = null;
  }
  await page.route("**/api/games/gta-6/offers?**", (r) => r.fulfill({ json: data }));
  await page.goto(path + "?editionRegion=US");
  await expect(page.locator("#quote-insight")).toContainText("美国商店暂缺有效报价");
  await expect(page.locator(".lowest-offer, .edition-premium")).toHaveCount(0);
  await expect(page.locator('[data-code="US"] .shop-link')).toHaveAttribute("href", /^https:/);
});
test("a promo expires in an open offline tab while the other region stays available", async ({
  page,
  request,
}) => {
  const data: GameResponse = await (await request.get(api + "?platform=xbox")).json();
  const at = Date.now(),
    deadline = new Date(at + 60_000).toISOString();
  data.as_of = new Date(at).toISOString();
  await page.clock.install({ time: new Date(at) });
  const row = data.full_games.find((r) => r.market === "HK" && r.edition === "standard")!;
  row.valid_until = row.price!.promo_ends_at = deadline;
  row.price!.public_price = "500.00";
  row.price!.converted_public_price = "425.92";
  data.next_change_at = deadline;
  let offline = false;
  await page.route("**/api/games/gta-6/offers?**", (route) =>
    offline ? route.abort() : route.fulfill({ json: data }),
  );
  await page.goto(path + "?platform=xbox");
  await expect(page.locator('[data-code="HK"] .quote-local')).toHaveText("HK$500");
  offline = true;
  await page.clock.fastForward(65_000);
  await expect(page.locator('[data-code="HK"] .quote-local')).toHaveText("暂未获取到最新报价", {
    timeout: 6500,
  });
  await expect(page.locator("#quote-insight")).toContainText("香港商店暂缺有效报价");
  await expect(page.locator('[data-code="US"] .quote-local')).toHaveText("US$79.99");
});

test("sources, empty filters, and the sticky selection remain usable", async ({ page }) => {
  await page.goto(path);
  await page.getByRole("button", { name: "报价来源" }).click();
  await expect(page.locator(".game-source-list a")).toHaveCount(8);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await page.getByRole("searchbox", { name: "找地区" }).fill("no such store");
  await expect(page.locator("#empty-rows")).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.locator(".quote-main")).toHaveCount(2);
  await page.getByRole("link", { name: "版本区别", exact: true }).click();
  const menu = page.locator("#chapter-switcher");
  await menu.locator("summary").click();
  await menu.getByRole("tab", { name: "Xbox", exact: true }).click();
  await menu.getByRole("tab", { name: "终极版", exact: true }).click();
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(page.locator(".edition-option[aria-current] h3")).toContainText("终极版");
  await menu.locator("summary").click();
  await menu.getByRole("tab", { name: /PC/ }).click();
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(page.locator("#pc-state")).toBeVisible();
});
