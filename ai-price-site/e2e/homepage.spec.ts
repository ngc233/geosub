import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
const local=process.env.GEOSUB_V3_TEST_ORIGIN;
const evidence=process.env.GEOSUB_V3_EVIDENCE;
if(local)test.use({baseURL:local,channel:"chrome"});
test.beforeEach(async({context})=>{
  await context.route("**/*",route=>["localhost","127.0.0.1"].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
test("homepage keeps SEO text and source contains no retired guide URL",async({page,request})=>{
  const response=await request.get("/zh");expect(response.status()).toBe(200);
  expect(await response.text()).not.toContain("/guides/gift-card-guide");
  await page.goto("/zh");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading",{level:1})).toHaveText("别只看标价，看清数字订阅的真实地区成本");
  await expect(page.getByText("比较经过核验的地区价格、税费、汇率与本地购买力，快速判断哪里更便宜，数据是否仍然可信。",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"最近变价"})).toHaveCount(0);
});
for(const width of [1280,390])for(const colorScheme of ["light","dark"] as const){
 test(`fictional homepage ${width} ${colorScheme}: data, keyboard, currency and overflow`,async({page})=>{
  test.skip(!local,"Run with the explicitly enabled local fictional fixture.");
  await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({colorScheme,reducedMotion:"reduce"});
  await page.goto("/zh",{waitUntil:"networkidle"});await page.evaluate(()=>document.fonts.ready);
  const consent=page.getByRole("button",{name:"拒绝统计"});if(await consent.isVisible())await consent.click();
  await expect(page.getByRole("note")).toContainText("虚构测试数据");
  await expect(page.getByLabel("收录统计")).toContainText("62");
  await expect(page.getByRole("link").filter({hasText:"查看全部 AI 订阅"})).toContainText("最多省：ChatGPT Plus 15%");
  await expect(page.getByRole("link").filter({hasText:"查看全部流媒体"})).toContainText("最多省：YouTube Premium 个人版 15%");
  await expect(page.getByText(/代表套餐最多省/)).toHaveCount(0);
  await expect(page.getByRole("list",{name:"订阅省钱排名"})).toContainText("标准版");
  await expect(page.getByRole("list",{name:"订阅省钱排名"})).toContainText("月度会员");
  const price=page.locator('[data-gs-price-cycle="true"]').filter({hasText:"¥ 119.00"}).last();
  await expect(price).toContainText("¥ 119.00 / 月");
  const inline=await price.evaluate(element=>{const amount=element.querySelector('span[aria-hidden]')!,cycle=element.querySelector('small')!;const a=amount.getBoundingClientRect(),c=cycle.getBoundingClientRect();return c.x>=a.right&&c.top<a.bottom;});
  expect(inline).toBe(true);

  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const ranks=page.getByRole("list",{name:"订阅省钱排名"});await expect(ranks.getByRole("listitem")).toHaveCount(6);
  const filter=page.getByRole("tablist",{name:"排行榜分类"});await filter.getByRole("tab",{name:"AI 订阅",exact:true}).click();await expect(ranks.getByRole("listitem")).toHaveCount(3);
  await page.keyboard.press("ArrowRight");await expect(filter.getByRole("tab",{name:"流媒体",exact:true})).toHaveAttribute("aria-selected","true");await expect(ranks).toContainText("Netflix");
  await filter.getByRole("tab",{name:"全部",exact:true}).click();
  const products=page.getByRole("tablist",{name:"地图产品"});await products.getByRole("tab",{name:/Claude/}).click();
  await expect(page.getByText("已按系统设置关闭自动轮换",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"折合为 CNY",exact:true}).click();await page.getByRole("option",{name:"USD · 美元",exact:true}).click();
  await expect(page.getByRole("button",{name:"折合为 USD",exact:true})).toBeVisible();await expect(ranks).toContainText("$ 17.00");
  await page.getByRole("button",{name:"折合为 USD",exact:true}).click();await page.getByRole("option",{name:"JPY · 日元",exact:true}).click();
  await expect(ranks).toContainText("JP¥ 2,550.00");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"折合为 JPY",exact:true}).click();await page.getByRole("option",{name:"GBP · 英镑",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"GBP 汇率不可用"})).toBeVisible();
  await page.getByRole("button",{name:"折合为 USD",exact:true}).click();await page.getByRole("option",{name:"CNY · 人民币",exact:true}).click();
  const countries=page.getByRole("region",{name:"哪些国家整体更便宜"});await expect(countries.getByRole("link").filter({hasText:"加拿大"})).toHaveCount(0);await expect(countries.getByRole("link").filter({hasText:"菲律宾"})).toHaveCount(1);
  await expect(countries).toContainText("订阅价格的中位水平与美国相同");
  if(evidence){
    // Full-page capture includes off-screen lazy images; decode those first so
    // the evidence shows the same flags a reviewer sees while scrolling.
    await page.locator("main img").evaluateAll(async images=>{
      await Promise.all(images.map(async image=>{const img=image as HTMLImageElement;img.loading="eager";try{await img.decode();}catch{/* The component renders its asset fallback. */}}));
    });
    mkdirSync(evidence,{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.addStyleTag({content:"nextjs-portal { display:none }"});await page.screenshot({path:`${evidence}/home-${width}-${colorScheme}-fictional.png`,fullPage:true});}
 });
}
test("fictional prices and statistics exist with JavaScript disabled",async({browser})=>{
 test.skip(!local,"Local fictional fixture only");const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(`${local}/zh`);
 await expect(page.getByRole("list",{name:"订阅省钱排名"})).toContainText("119.00");await expect(page.getByLabel("收录统计")).toContainText("62");await context.close();
});
test("carousel rotates once, then a click pauses it; search preserves logo position",async({page})=>{
 test.skip(!local,"Local fictional fixture only");
 await page.emulateMedia({reducedMotion:"no-preference"});await page.goto("/zh");
 await page.mouse.move(0,0);const tabs=page.getByRole("tablist",{name:"地图产品"});
 await expect(tabs.getByRole("tab",{name:/Claude/})).toHaveAttribute("aria-selected","true",{timeout:9000});
 await tabs.getByRole("tab",{name:/ChatGPT/}).click();await page.waitForTimeout(4800);
 await expect(tabs.getByRole("tab",{name:/ChatGPT/})).toHaveAttribute("aria-selected","true");
 const logo=page.getByRole("link",{name:"GeoSub 首页",exact:true});const before=await logo.boundingBox();
 await page.getByRole("button",{name:"搜索产品或国家",exact:true}).click();await expect(page.getByRole("dialog",{name:"搜索",exact:true})).toBeVisible();
 expect((await logo.boundingBox())?.x).toBe(before?.x);await page.keyboard.press("Escape");
});
test("search minimum follows the homepage display currency without a rates request",async({page})=>{
 test.skip(!local,"Local fictional fixture only");
 await page.route("**/api/search?**",route=>route.fulfill({json:{results:[{id:"fictional",kind:"plan",title:"虚构搜索套餐",subtitle:"仅测试",href:"/zh/ai-pricing/chatgpt/plus",minimumUsd:20,cycle:"monthly"}]}}));
 await page.goto("/zh");await page.getByLabel("首页搜索产品或国家").fill("虚构");await page.getByRole("button",{name:"搜索",exact:true}).click();
 await expect(page.getByRole("option",{name:/虚构搜索套餐/})).toContainText("¥ 140.00");await page.keyboard.press("Escape");
 await page.getByRole("button",{name:"折合为 CNY",exact:true}).click();await page.getByRole("option",{name:"USD · 美元",exact:true}).click();
 await page.getByRole("button",{name:"搜索产品或国家",exact:true}).click();await page.getByRole("combobox",{name:"搜索产品或国家"}).fill("虚构");await expect(page.getByRole("option",{name:/虚构搜索套餐/})).toContainText("$ 20.00");
});
