import { test, expect } from "@playwright/test";
import type { GameResponse } from "../lib/game-offers";

const path = "/zh/games/gta-6";
const overview = "/zh/games";
const api = "/api/games/gta-6/offers";

test.skip(process.env.GEOSUB_GAME_TEST !== "1", "Requires the approved two-market local game dataset.");

test("Chinese homepage game category card and HK deep link work without hero banner clutter", async ({
  page,
  request,
}) => {
  for (const platform of ["ps5", "xbox"]) {
    const response = await request.get(`${api}?platform=${platform}`);
    expect(response.ok()).toBe(true);
    const data: GameResponse = await response.json();
    expect(data.full_games).toContainEqual(
      expect.objectContaining({
        market: "HK",
        edition: "standard",
        status: "fresh",
        price: expect.objectContaining({ public_price: expect.any(String) }),
      }),
    );
  }
  await page.goto("/zh");
  await expect(page.getByRole("link", { name: "GTA 6 港服比价", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "按分类找" }).getByRole("heading", { name: "游戏", exact: true })).toBeVisible();

  await page.goto(`${path}?region=HK`);
  await expect(page.locator('[data-code="HK"] .quote-local')).toBeVisible();
  await expect(page.locator('[data-code="US"] .quote-local')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);

  await page.goto("/en");
  await expect(page.getByRole("link", { name: "游戏比价", exact: true })).toHaveCount(0);
});

for (const width of [1280, 390, 320]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`shared game navigation at ${width}px in ${colorScheme}`, () => {
      const mobile = width < 768;
      test.use({ viewport: { width, height: mobile ? 844 : 720 }, colorScheme, hasTouch: mobile });

      test("the same menu opens and highlights the game, and stays out of Plus and English", async ({
        page,
      }) => {
        const navigation = page.getByRole("navigation", {
          name: mobile ? "手机导航" : "主导航",
          exact: true,
        });
        const gameLink = () => navigation.getByRole("link", { name: "游戏比价", exact: true });
        const openMenu = async () => {
          if (mobile) await page.getByRole("button", { name: "打开菜单", exact: true }).tap();
        };

        expect((await page.goto("/zh"))?.status()).toBe(200);
        await openMenu();
        const link = gameLink();
        await expect(link).toHaveCount(1);
        await expect(link).toHaveAttribute("href", overview);
        await expect(link).not.toHaveAttribute("aria-current", "page");
        const before = await navigation.getByRole("link").allTextContents();
        if (mobile) await link.tap();
        else await link.press("Enter");
        await expect(page).toHaveURL(new RegExp(`${overview}$`));
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.getByRole("heading", { name: "游戏比价", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "GTA 6", exact: true })).toBeVisible();
        await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
        await openMenu();
        await expect(gameLink()).toHaveAttribute("aria-current", "page");
        expect(await navigation.getByRole("link").allTextContents()).toEqual(before);
        if (mobile) await page.keyboard.press("Escape");

        const comparison = page.getByRole("table", { name: "GTA 6 各版本价格" });
        await expect(comparison.locator("tbody tr")).toHaveCount(4);
        const ultimate = comparison
          .getByRole("row")
          .filter({ has: page.getByRole("link", { name: /Xbox\s*终极版/ }) });
        if (process.env.GEOSUB_GAME_SAVINGS_TEST === "complete") {
          if (!mobile) {
            await expect(ultimate).toContainText("HK$708");
            await expect(ultimate).toContainText("US$99.99");
          }
          await expect(ultimate).toContainText("低 10%");
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

        const editionLink = ultimate.getByRole("link");
        if (mobile) await editionLink.tap();
        else await editionLink.press("Enter");
        await expect(page).toHaveURL(`${path}?platform=xbox&edition=ultimate`);
        await expect(page.locator("main")).toHaveCount(1);
        const crumbs = page.getByRole("navigation", { name: "面包屑" });
        await expect(crumbs.getByRole("link", { name: "游戏比价" })).toHaveAttribute("href", overview);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

        await page.goto("/zh");
        const categories = page.getByRole("region", { name: "按分类找" });
        const gameCard = categories
          .getByRole("article")
          .filter({ has: page.getByRole("heading", { name: "游戏", exact: true }) });
        const categoryLink = gameCard.getByRole("link", { name: /查看游戏比价/ });
        await expect(categoryLink).toHaveAttribute("href", overview);
        const savingsScenario = process.env.GEOSUB_GAME_SAVINGS_TEST;
        if (savingsScenario) {
          const saving = gameCard.locator(".gs-home-category-saving");
          if (savingsScenario === "complete" || savingsScenario === "standard-only") {
            const complete = savingsScenario === "complete";
            await expect(saving).toBeVisible();
            await expect(saving.locator("strong")).toHaveText(complete ? "10%" : "9%");
            await expect(
              categoryLink.getByText(complete ? "PS5 终极版" : "PS5 标准版", { exact: true }),
            ).toBeVisible();
          } else {
            await expect(saving).toHaveCount(0);
            await expect(categoryLink.getByText("查看游戏比价")).toBeVisible();
          }
        }
        const logo = gameCard.locator("img");
        await expect(logo).toHaveAttribute("src", /^\/brand-assets\/thumbs\/gta-6\.webp\?/);
        await expect(logo).toHaveAttribute("alt", "");
        if (mobile) {
          await gameCard.scrollIntoViewIfNeeded();
          const box = await gameCard.boundingBox();
          expect(box).not.toBeNull();
          await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
        } else {
          await categoryLink.focus();
          await expect(categoryLink).toBeFocused();
          await page.keyboard.press("Enter");
        }
        await expect(page).toHaveURL(new RegExp(`${overview}$`));

        for (const route of ["/zh/ai-pricing/chatgpt/plus", "/en"]) {
          expect((await page.goto(route))?.status()).toBe(200);
          await expect(
            page.locator("header").first().locator(`a[href="${overview}"], a[href="${path}"]`),
          ).toHaveCount(0);
        }
      });
    });
  }
}

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
      const platformTabs = page.getByRole("tablist", { name: "游戏平台" });
      const editionTabs = page.getByRole("tablist", { name: "游戏版本" });

      await expect(page.locator("#quote-insight")).toContainText("已核验 2 个地区");
      await expect(page.locator(".lowest-offer")).toHaveAttribute("data-code", "HK");
      // PS5 upgrade is unavailable in sample data, so upgrade-note stays hidden
      await expect(page.locator(".upgrade-note")).toHaveCount(0);

      await platformTabs.getByRole("tab", { name: "Xbox", exact: true }).click();
      await expect(page.locator(".upgrade-note")).toContainText("HK$140");
      await editionTabs.getByRole("tab", { name: /终极版/ }).click();
      if (width >= 768) {
        await expect(page.locator('[data-code="HK"] .quote-local')).toContainText("HK$708");
        await expect(page.locator('[data-code="US"] .quote-local')).toContainText("US$99.99");
      }
      await expect
        .poll(() =>
          page.locator(".quote-sheet").evaluate((sheet) => sheet.scrollWidth <= sheet.clientWidth + 1),
        )
        .toBe(true);

      await page.getByRole("button", { name: /^折合为 / }).click();
      await page.getByRole("option", { name: /^USD\b/ }).click();
      await expect(page.locator('[data-code="US"] .quote-fx strong')).toContainText("$99.99");

      await page.getByRole("button", { name: "查看香港报价依据" }).click();
      await expect(page.locator("#details-HK")).toContainText("核价");

      await platformTabs.getByRole("tab", { name: /PC/ }).click();
      await expect(page.locator("#pc-state")).toBeVisible();
      await expect(page.locator("#regions")).toHaveCount(0);
      await expect(page.locator("#pc-state button")).toHaveCount(2);
      await page.locator('[data-console="ps5"]').click();
      await expect(page.locator(".upgrade-note")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
        true,
      );

      await platformTabs.getByRole("tab", { name: "PS5", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(platformTabs.getByRole("tab", { name: "Xbox", exact: true })).toHaveAttribute(
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
  await page.goto(path);
  await expect(page.locator("#quote-insight")).toContainText("美国商店暂缺有效报价");
  await expect(page.locator(".lowest-offer")).toHaveCount(0);
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

test("sources dialog and FAQ disclosures remain usable", async ({ page }) => {
  await page.goto(path);
  await page.getByRole("button", { name: "报价来源" }).click();
  await expect(page.locator(".gs-game-source-list a")).toHaveCount(8);
  await page.keyboard.press("Escape");
  const faq = page.locator("#guide details").first();
  await faq.locator("summary").click();
  await expect(faq).toHaveAttribute("open", "");
});
