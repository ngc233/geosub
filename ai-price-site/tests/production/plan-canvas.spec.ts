import { test, expect } from "@playwright/test";
// Handwritten local fixture: ChatGPT Pro (12 countries), Netflix Premium
// (no US), and explicitly fictional nominal/PPP incomes. Never production.
const route = "/zh/ai-pricing/chatgpt/pro";
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "geosub_analytics_consent", value: `denied.${Math.floor(Date.now()/1000)}`, domain: "127.0.0.1", path: "/" }]);
});
test("canonical minimum, raw distribution, currency and region filters agree", async ({ page }) => {
  const errors:string[]=[];page.on("pageerror", error=>errors.push(error.message));
  await page.goto(route);
  await expect(page.locator(".gs-plan-row")).toHaveCount(9);
  await expect(page.locator(".gs-plan-hero-price [data-gs-price] > [aria-hidden]").first()).toHaveText("¥ 642.60");
  await expect(page.locator(".gs-plan-distribution-note")).toHaveText("6 / 12 个地区比美国便宜");
  const hero = page.locator(".gs-plan-hero-price [data-gs-price]");
  expect(await hero.evaluate(el => getComputedStyle(el).fontFamily)).toContain("GeoSub Price Numerals");
  await page.getByRole("button", {name:/折合为/}).click();
  await page.getByRole("option", {name:/^HKD ·/}).click();
  await expect(hero).toContainText("HK$");
  expect(await hero.evaluate(el => getComputedStyle(el).fontFamily)).not.toContain("GeoSub Price Numerals");
  await page.getByRole("button", {name:/折合为/}).click();
  await page.getByRole("option", {name:/^USD ·/}).click();
  await expect(page.locator(".gs-plan-hero-price [data-gs-price] > [aria-hidden]").first()).toHaveText("$ 91.80");
  await expect(page.locator(".gs-plan-row").first().locator("[data-gs-price] > [aria-hidden]").first()).toHaveText("$ 91.80");
  await page.getByRole("tab",{name:"比美国便宜",exact:true}).click();
  await expect(page.locator(".gs-plan-row")).toHaveCount(6);
  await page.getByRole("tab",{name:"比美国贵",exact:true}).click();
  await expect(page.locator(".gs-plan-row")).toHaveCount(5);
  await page.getByRole("tab",{name:"全部",exact:true}).click();
  await page.getByRole("searchbox",{name:"找地区"}).fill("日本");
  await expect(page.locator(".gs-plan-row")).toHaveCount(1);
  await expect(page.locator(".gs-plan-row")).toHaveAttribute("data-country","JP");
  await page.getByRole("searchbox",{name:"找地区"}).fill("不存在的地区");
  await expect(page.getByRole("status")).toContainText("没有符合条件");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test("keyboard evidence, expansion height and reduced motion remain usable", async ({ page }) => {
  await page.goto(route);
  const first=page.locator(".gs-plan-region-panel .gs-disclosure-header").first();
  await first.focus();await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded","true");
  await expect(page.locator('[data-gs-disclosure][data-open="true"] .gs-plan-evidence')).toContainText("CI App Store fixture");
  const before=(await page.locator(".gs-plan-list-viewport").boundingBox())!.height;
  await page.getByRole("button",{name:"展开全部 12 个地区"}).click();
  await expect(page.locator(".gs-plan-row")).toHaveCount(12);
  await expect(page.locator(".gs-plan-list-viewport")).toHaveCSS("transition-duration","0.22s");
  await expect.poll(async()=>(await page.locator(".gs-plan-list-viewport").boundingBox())!.height).toBeGreaterThan(before);
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(page.locator(".gs-plan-list-viewport")).toHaveCSS("transition-duration","0s");
  await page.getByRole("button",{name:"收起地区"}).click();
  await expect(page.locator(".gs-plan-row")).toHaveCount(9);
  const all=page.getByRole("tab",{name:"全部",exact:true});await all.focus();await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab",{name:"比美国便宜",exact:true})).toBeFocused();
  await expect(page.locator(".gs-plan-row")).toHaveCount(6);
});
test("income calculation uses nominal data only and sparse source hides the block", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator(".gs-plan-work-row")).toHaveCount(5);
  await expect(page.locator(".gs-plan-work-sources > small")).toHaveCount(1);
  await expect(page.locator(".gs-plan-work-row small")).toHaveCount(5);
  for (const note of await page.locator(".gs-plan-work-row > small").all()) expect((await note.boundingBox())!.height).toBeLessThan(20);
  await expect(page.locator(".gs-plan-work-row").first()).not.toContainText("来源：");
  await expect(page.locator(".gs-plan-work")).toContainText("虚构测试数据");
  await expect(page.locator(".gs-plan-work-rows")).not.toContainText("菲律宾");
  await expect(page.locator(".gs-plan-work-rows")).not.toContainText("巴西");
  const japan=page.locator(".gs-plan-work-row").filter({hasText:"日本"});
  await expect(japan).toContainText("3.3 小时");
  await expect(japan.locator(".gs-plan-work-price")).toHaveText("¥ 642.60");
  await expect(japan).toHaveAttribute("data-lowest","true");
  await page.getByRole("button",{name:/折合为/}).click();await page.getByRole("option",{name:/^USD ·/}).click();
  await expect(japan.locator(".gs-plan-work-price")).toHaveText("$ 91.80");
  await expect(japan).toContainText("名义人均 GDP · 2025");
  await page.goto("/zh/ai-pricing/chatgpt/go");
  await expect(page.locator(".gs-plan-work")).toHaveCount(0);
});
test("missing US creates no fabricated baseline or percentage", async ({ page }) => {
  await page.goto("/zh/streaming-pricing/netflix/premium");
  await expect(page.locator(".gs-plan-lowest")).toContainText("美国基准缺失");
  await expect(page.locator(".gs-plan-us-marker")).toHaveCount(0);
  await expect(page.getByRole("tab",{name:"比美国便宜",exact:true})).toHaveCount(0);
  await expect(page.locator(".gs-plan-lowest")).not.toContainText(/比美国低\s*\d+%/);
  await expect(page.locator(".gs-plan-work")).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("currency modal restores focus and the share trigger remains accessible", async ({ page }) => {
  await page.goto(route);const trigger=page.getByRole("button",{name:/折合为/});
  if (page.viewportSize()!.width === 390) {
    for (const icon of await trigger.locator("svg").all()) expect((await icon.boundingBox())!.width).toBe(16);
  }
  await trigger.focus();await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);await expect(trigger).toBeFocused();
  await page.getByRole("button",{name:"分享价格图",exact:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("SSR shows real prices and original H1 without JavaScript; locked pages never opt in", async ({ browser, baseURL }) => {
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  await page.goto(`${baseURL}${route}`);await expect(page.locator(".gs-plan-hero-price")).toContainText("642.60");
  await expect(page.locator("h1")).toHaveText("ChatGPT Pro 200 全球价格对比");
  for(const path of ["/zh/ai-pricing/chatgpt/plus","/en/ai-pricing/chatgpt/pro","/en"]){await page.goto(`${baseURL}${path}`);await expect(page.locator(".gs-plan-scope")).toHaveCount(0);}
  await context.close();
});

test("compact plan guidance preserves full editorial text and responsive reading order", async ({ page }) => {
  await page.goto(route);
  const details=page.locator(".gs-plan-details"), summary=details.locator(":scope > summary");
  await expect(details).not.toHaveAttribute("open");await expect(page.locator(".gs-plan-editorial")).toBeHidden();
  await expect(page.locator(".gs-plan-fit-summary h2")).toHaveText("ChatGPT Pro 200 适合谁");
  if(page.viewportSize()!.width===1280) expect((await page.locator(".gs-plan-fit").boundingBox())!.height).toBeLessThan(240);
  const original=await details.textContent();await summary.focus();await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");await expect(page.locator(".gs-plan-editorial")).toBeVisible();
  expect(await details.textContent()).toBe(original);
  await expect(page.locator(".gs-plan-editorial h2")).toContainText("适合谁");
  await expect(page.locator(".gs-plan-editorial h3")).toHaveCount(2);
  await expect(page.locator(".gs-plan-guide-links a")).toHaveCount(3);
  await expect(page.locator(".gs-plan-editorial > section > div:nth-child(2) > div").first()).toHaveCSS("box-shadow", "none");
  await expect(page.locator(".gs-plan-editorial > section > div:nth-child(2) > div").first()).toHaveCSS("flex-direction", page.viewportSize()!.width === 390 ? "column" : "row");
  await expect(page.locator(".gs-plan-guidance")).toHaveAttribute("data-has-notes", "false");
  await expect(page.locator(".gs-plan-notes")).toHaveCount(0);
  // Read both rectangles in the same frame: native focus can scroll between separate protocol calls.
  const [intro, links] = await page.evaluate(() => [".gs-plan-buy-intro", ".gs-plan-guide-links"].map(selector => {
    const r=document.querySelector(selector)!.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
  }));
  if (page.viewportSize()!.width === 390) expect(links.y).toBeGreaterThan(intro.y + intro.height - 1);
  else expect(links.x).toBeGreaterThan(intro.x + intro.width - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await summary.focus();await page.keyboard.press("Space");await expect(details).not.toHaveAttribute("open");
});

test("plan navigation uses canvas link buttons and supplemental controls follow the theme", async ({ page }) => {
  await page.goto(route);
  const nav=page.getByRole("navigation",{name:"套餐切换",exact:true});
  await expect(nav.getByRole("link")).toHaveText(["Go","Plus"]);
  await expect(page.locator('.gs-plan-details [aria-current="page"]')).toHaveText("Pro 200");
  await expect(page.locator('.gs-plan-details [aria-current="page"]')).toBeHidden();
  await expect(page.locator('.gs-plan-fit [role="tablist"]')).toHaveCount(0);
  for(const a of await nav.getByRole("link").all()) {
    expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(a).toHaveCSS("box-shadow","none");
    await expect(a).toHaveCSS("font-size","14px");await expect(a).toHaveCSS("border-radius","10px");await expect(a).toHaveCSS("padding-left","14px");
  }
  const go=nav.getByRole("link",{name:"Go",exact:true});await go.focus();
  await expect(go).toHaveCSS("outline-style","solid");await page.keyboard.press("Tab");
  await expect(nav.getByRole("link",{name:"Plus",exact:true})).toBeFocused();
  await go.focus();await page.keyboard.press("Enter");await expect(page).toHaveURL(/\/chatgpt\/go$/);
  await page.goto(route);await page.locator('.gs-plan-more > summary').click();
  const tabs=page.locator('.gs-plan-more [role="tablist"]');
  for(const label of ["收入负担","双维判断","价格位置"]) {
    const tab=tabs.getByRole("tab",{name:label,exact:true});await tab.click();
    await expect(tab).toHaveAttribute("aria-selected","true");
    await expect(tab).toHaveCSS("box-shadow","none");
    await expect(tab).toHaveCSS("white-space","nowrap");
    if(label === "收入负担") for(const name of ["最易承受","最难承受"]) {
      const sort=page.locator('.gs-plan-more').getByRole("button",{name,exact:true});await sort.click();
      await expect(sort).toHaveAttribute("aria-pressed","true");await expect(sort).toHaveCSS("box-shadow","none");
      expect((await sort.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect.poll(()=>tab.evaluate(el=>{
      const probe=document.createElement('span');probe.style.background='var(--gs-accent-soft)';el.append(probe);
      const expected=getComputedStyle(probe).backgroundColor;probe.remove();return getComputedStyle(el).backgroundColor===expected;
    })).toBe(true);
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
