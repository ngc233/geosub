import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { startHomepageFixtureServer } from "./helpers/homepage-fixture-server";
test.use({launchOptions:{ignoreDefaultArgs:["--hide-scrollbars"]}});
const evidence=process.env.GEOSUB_V2_EVIDENCE || "/tmp/geosub-v2-evidence";
const baseline=process.env.GEOSUB_V2_BASELINE || "http://127.0.0.1:3142";
const sample="http://127.0.0.1:3144/zh";
test.beforeEach(async({context})=>{
  mkdirSync(evidence,{recursive:true});
  await context.route("**/*",route=>["127.0.0.1","localhost"].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
for(const width of [1280,390])for(const colorScheme of ["light","dark"] as const){
  test(`frame ${width} ${colorScheme}: new chrome, keyboard, footer and viewport`,async({page})=>{
    await page.setViewportSize({width,height:width===390?844:720}); await page.emulateMedia({colorScheme});
    await page.goto("/zh",{waitUntil:"networkidle"}); await page.evaluate(()=>document.fonts.ready);
    await expect(page.getByRole("banner").getByRole("button",{name:/折合为|分享价格图|官方入口/})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:path.join(evidence,`home-${width}-${colorScheme}.png`),fullPage:true});
    await page.keyboard.press("/"); await expect(page.getByRole("combobox",{name:"搜索产品或国家"})).toBeFocused();
    await page.keyboard.press("Escape"); await expect(page.getByRole("dialog",{name:"搜索",exact:true})).toHaveCount(0);
    if(width===390){
      const menu=page.getByRole("button",{name:"打开菜单"});await menu.click();
      await expect(page.getByRole("dialog",{name:"菜单",exact:true})).toBeVisible();
      await page.screenshot({path:path.join(evidence,`drawer-${colorScheme}.png`)});
      await page.keyboard.press("Escape");await expect(menu).toBeFocused();
      await menu.click();await page.mouse.click(5,400);await expect(page.getByRole("dialog",{name:"菜单",exact:true})).toHaveCount(0);
      const group=page.getByRole("contentinfo").getByRole("button",{name:"展开指南"});await group.scrollIntoViewIfNeeded();await expect(group).toHaveAttribute("aria-expanded","false");await group.click();await expect(group).toHaveAttribute("aria-expanded","true");
    }else{
      await expect(page.getByRole("navigation",{name:"主导航"}).getByRole("link",{name:"首页",exact:true})).toHaveAttribute("aria-current","page");
    }
  });
  test(`locked ${width} ${colorScheme}: Plus and English chrome are pixel-identical`,async({browser},testInfo)=>{
    test.skip(testInfo.project.name !== "local-chrome-acceptance", "Pixel comparison requires the separately retained main preview; run playwright.chrome.config.ts locally.");
    for(const route of ["/zh/ai-pricing/chatgpt/plus","/en"]){
      const values=[];
      for(const origin of [baseline,"http://127.0.0.1:3143"]){
        const context=await browser.newContext({viewport:{width,height:width===390?844:720},colorScheme,reducedMotion:"reduce"});
        await context.route("**/*",r=>["127.0.0.1","localhost"].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
        const p=await context.newPage();await p.goto(origin+route,{waitUntil:"networkidle"});await p.evaluate(()=>document.fonts.ready);
        const name=route==="/en"?"en":"plus";const stage=origin===baseline?"baseline":"v2";
        const text=await p.locator("main").first().innerText();
        const meta=await p.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.getAttribute("content"),h1:[...document.querySelectorAll("h1")].map(x=>x.textContent)}));
        const links=await p.locator("header a,footer a").evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,href:node.getAttribute("href"),rel:node.getAttribute("rel")})));
        const images=[];
        const header=p.getByRole("banner");await header.scrollIntoViewIfNeeded();images.push(await header.screenshot({path:path.join(evidence,`${name}-${stage}-banner-${width}-${colorScheme}.png`),animations:"disabled"}));
        // Tall locator screenshots resize the viewport and can move sticky chrome/scrollbars.
        // Fixed viewport slices cover the complete footer without changing the layout viewport.
        const footer=p.getByRole("contentinfo");
        const top=await footer.evaluate(el=>el.getBoundingClientRect().top+scrollY);
        for(const slice of ["start","end"]){
          await p.evaluate(({top,slice})=>window.scrollTo({top:slice==="start"?top-64:document.documentElement.scrollHeight,behavior:"instant"}),{top,slice});
          await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          images.push(await p.screenshot({path:path.join(evidence,`${name}-${stage}-footer-${slice}-${width}-${colorScheme}.png`),animations:"disabled"}));
        }
        values.push({text,meta,links,images});await context.close();
      }
      expect(values[1].text).toEqual(values[0].text);expect(values[1].meta).toEqual(values[0].meta);expect(values[1].links).toEqual(values[0].links);
      for(let i=0;i<values[0].images.length;i++)expect(values[1].images[i].equals(values[0].images[i]),`${route} ${i}: PNG bytes`).toBe(true);
    }
  });
  test(`controls ${width} ${colorScheme}: shared state, keyboard and disclosure`,async({page},testInfo)=>{
    test.skip(testInfo.project.name !== "local-chrome-acceptance", "Controls require the separately guarded local sample; run playwright.chrome.config.ts locally.");
    await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({colorScheme});await page.goto(sample,{waitUntil:"networkidle"});
    const section=page.getByRole("region",{name:"V2 共用控件"});await expect(section).toBeVisible();await section.scrollIntoViewIfNeeded();
    await section.getByRole("button",{name:"折合为 ¥ CNY"}).first().click();
    await page.getByRole("option",{name:"USD · 美元",exact:true}).click();
    await expect(section.getByRole("button",{name:"折合为 $ USD"})).toHaveCount(2);
    await section.getByRole("tab",{name:"全部",exact:true}).focus();await page.keyboard.press("ArrowRight");await expect(section.getByRole("tab",{name:"比美国便宜"})).toHaveAttribute("aria-selected","true");
    const disclosure=section.getByRole("button",{name:"查看测试证据"});await disclosure.click();await expect(disclosure).toHaveAttribute("aria-expanded","true");await expect(section.getByRole("button",{name:"证据中的可聚焦按钮"})).toBeVisible();
    await expect(section.getByRole("complementary",{name:"推广位"})).toHaveCount(0);
    await section.screenshot({path:path.join(evidence,`controls-${width}-${colorScheme}.png`),animations:"disabled"});
    await section.getByRole("button",{name:"分享价格图"}).click();await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");await expect(section.getByRole("button",{name:"分享价格图"})).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
test("search: three groups, arrow selection, navigation, error and empty states",async({page})=>{
  const fixture=["product","plan","country"].map((kind,i)=>({id:kind,kind,title:`测试${kind}`,subtitle:"仅测试交互",href:["/zh/ai-pricing/chatgpt","/zh/ai-pricing/chatgpt/plus","/zh/countries/india"][i],minimumUsd:i+1,cycle:"monthly"}));
  await page.route("**/api/search?**",r=>r.fulfill({json:{results:fixture}}));await page.goto("/zh");await page.keyboard.press("/");
  const input=page.getByRole("combobox",{name:"搜索产品或国家"});await input.fill("测试");await expect(page.getByRole("option")).toHaveCount(3);
  for(const name of ["产品","套餐","国家"])await expect(page.getByRole("group",{name,exact:true})).toBeVisible();
  await input.press("ArrowDown");await expect(page.getByRole("option").nth(1)).toHaveAttribute("aria-selected","true");await input.press("Enter");await page.waitForURL("**/zh/ai-pricing/chatgpt/plus");
  await page.goto("/zh");await page.route("**/api/search?**",r=>r.fulfill({status:503,json:{results:[]}}));await page.keyboard.press("/");await input.fill("失败");await expect(page.getByRole("button",{name:"重试",exact:true})).toBeVisible();
  await page.route("**/api/search?**",r=>r.fulfill({json:{results:[]}}));await page.getByRole("button",{name:"重试",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"没有找到"})).toBeVisible();
});
test("real local data: report result availability; never invent prices",async({request})=>{
  const report=[];for(const query of ["chatgpt","netflix","印度","土耳其","日本","菲律宾"]){const response=await request.get(`/api/search?locale=zh&view=chrome&q=${encodeURIComponent(query)}`);expect(response.ok()).toBe(true);const data=await response.json();for(const item of data.results)expect(item.minimumUsd).toBeGreaterThan(0);report.push({query,results:data.results});}
  writeFileSync(path.join(evidence,"search-data.json"),JSON.stringify(report,null,2));
});

test("direct entry places the underline on the active route",async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto("/zh/ai-pricing",{waitUntil:"networkidle"});
 const nav=page.getByRole("navigation",{name:"主导航"});const active=nav.getByRole("button",{name:"数字订阅",exact:true});
 await expect(active).toHaveAttribute("aria-current","page");
 const link=await active.boundingBox();const indicator=await nav.locator(':scope > span[aria-hidden="true"]').boundingBox();
 expect(Math.abs(indicator!.x-link!.x)).toBeLessThan(1);expect(Math.abs(indicator!.width-link!.width)).toBeLessThan(1);
});

for (const width of [1280,390]) for (const colorScheme of ["light","dark"] as const) {
  test(`scrollbar and overlay logo position: ${width} ${colorScheme}`, async ({page}) => {
    await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme});
    await page.goto("/zh",{waitUntil:"networkidle"});
    // Force a non-overlay scrollbar even on macOS; otherwise this regression can pass vacuously.
    await page.addStyleTag({content:"html::-webkit-scrollbar { width:12px; }"});
    expect(await page.evaluate(()=>innerWidth-document.documentElement.clientWidth)).toBe(12);
    const logo=page.locator('header a[aria-label="GeoSub 首页"]');
    const before=(await logo.boundingBox())!.x;
    const stable=async()=>expect((await logo.boundingBox())!.x).toBe(before);
    await page.getByRole("button",{name:"搜索产品或国家"}).click();await expect(page.getByRole("dialog",{name:"搜索",exact:true})).toBeVisible();await stable();
    await page.keyboard.press("Escape");await stable();
    if(width===390){
      await page.getByRole("button",{name:"打开菜单"}).click();await expect(page.getByRole("dialog",{name:"菜单",exact:true})).toBeVisible();await stable();
      const dropdown=page.getByRole("navigation",{name:"手机导航"}).getByRole("button",{name:"数字订阅",exact:true});
      await dropdown.click();await expect(dropdown).toHaveAttribute("aria-expanded","true");await stable();
      await page.screenshot({path:path.join(evidence,`menu-expanded-${width}-${colorScheme}.png`)});
      await page.keyboard.press("Escape");await stable();await page.keyboard.press("Escape");
    } else {
      const dropdown=page.getByRole("navigation",{name:"主导航"}).getByRole("button",{name:"数字订阅",exact:true});
      await expect(dropdown).toHaveAttribute("href","/zh/ai-pricing");await dropdown.click();await expect(dropdown).toHaveAttribute("aria-expanded","true");await stable();
      await page.screenshot({path:path.join(evidence,`menu-expanded-${width}-${colorScheme}.png`)});
      await dropdown.press("Escape");await expect(dropdown).toHaveAttribute("aria-expanded","false");await stable();
    }
  });
  test(`search suggestions refill and rerun: ${width} ${colorScheme}`,async({page})=>{
    await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme});
    const queries:string[]=[];
    await page.route("**/api/search?**",route=>{queries.push(new URL(route.request().url()).searchParams.get("q")!);return route.fulfill({json:{results:[]}});});
    await page.goto("/zh");await page.keyboard.press("/");const input=page.getByRole("combobox",{name:"搜索产品或国家",exact:true});await input.fill("xyz");
    const suggestions=page.getByLabel("搜索建议");await expect(suggestions.getByRole("button")).toHaveCount(4);
    await expect(suggestions.getByRole("link",{name:"联系我们"})).toHaveAttribute("href","/zh/contact");
    await page.screenshot({path:path.join(evidence,`search-empty-${width}-${colorScheme}.png`)});
    for(const term of ["ChatGPT","Claude","Netflix","印度"]){
      await suggestions.getByRole("button",{name:term,exact:true}).click();await expect(input).toHaveValue(term);await expect(input).toBeFocused();
      await expect.poll(()=>queries.at(-1)).toBe(term);await expect(suggestions).toBeVisible();
    }
    const before=queries.length;await suggestions.getByRole("button",{name:"印度",exact:true}).click();await expect.poll(()=>queries.length).toBe(before+1);
  });
}

for (const width of [1280,390]) for (const colorScheme of ["light","dark"] as const) {
  test(`search minimum equals the destination overview: ${width} ${colorScheme}`, async({page})=>{
    await page.addInitScript(()=>localStorage.setItem("geosub-public-display-currency","USD"));
    await page.setViewportSize({width,height:844}); await page.emulateMedia({colorScheme,reducedMotion:"reduce"});
    await page.goto("/zh"); await page.getByRole("button",{name:"搜索产品或国家",exact:true}).click();
    const responsePromise=page.waitForResponse(response=>response.url().includes("/api/search?") && response.url().includes("view=chrome"));
    await page.getByRole("combobox",{name:"搜索产品或国家"}).fill("E2E Atlas");
    const response=await responsePromise; expect(response.ok()).toBe(true);
    const data=await response.json(); const result=data.results.find((item: {kind:string})=>item.kind==="product");
    expect(result,"repository E2E product must have a real search result").toBeTruthy();
    const option=page.getByRole("group",{name:"产品",exact:true}).getByRole("option").filter({hasText:result.title});
    const price=option.locator('[data-gs-price] > span[aria-hidden="true"]');
    await expect(price).toHaveText(`$ ${result.minimumUsd.toFixed(2)}`);
    const displayedPrice=await price.innerText();
    await page.screenshot({path:path.join(evidence,`search-minimum-${width}-${colorScheme}.png`)});
    await option.click(); await expect(page).toHaveURL(new RegExp(result.href+"$"));
    // V4 exposes each plan's minimum in its overview card. Compare the
    // cheapest displayed card, not the featured plan or its US reference.
    const summary=page.getByRole("region",{name:"套餐概览",exact:true});
    await expect(summary).toHaveCount(1);
    await expect(summary).toBeVisible();
    const minima=summary.locator('.gs-product-plan-price [data-gs-price] > span[aria-hidden="true"]');
    await expect(minima.first()).toBeVisible();
    const amounts=(await minima.allInnerTexts()).map(text=>{
      expect(text).toMatch(/^\$\s*[\d,]+\.\d{2}$/);
      return Number(text.replace(/[\s$,]/g,""));
    });
    expect(Math.min(...amounts)).toBe(Number(displayedPrice.replace(/[\s$,]/g,"")));
    await page.screenshot({path:path.join(evidence,`destination-minimum-${width}-${colorScheme}.png`)});
  });
}

// Shared menu tests run against the standard production-mode E2E application.
for(const width of [1280,390]) for(const colorScheme of ["light","dark"] as const) {
 test(`round5 menus ${width} ${colorScheme}`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?720:844});await page.emulateMedia({colorScheme,reducedMotion:"no-preference"});
  await page.goto("/zh",{waitUntil:"networkidle"});
  const consent=page.getByRole("button",{name:"拒绝统计",exact:true});if(await consent.isVisible())await consent.click();
  if(width===390)await page.getByRole("button",{name:"打开菜单",exact:true}).click();
  const chrome=width===390?page.getByRole("dialog",{name:"菜单",exact:true}):page.getByRole("banner");
  const language=chrome.getByRole("button",{name:"简体中文",exact:true});
  const languagePanel=chrome.locator('.gs-language .gs-popover');
  const nav=chrome.getByRole("button",{name:"数字订阅",exact:true});
  const navPanel=nav.locator('..').locator('.gs-popover');
  await nav.click();await expect(navPanel).toHaveAttribute("data-open","true");
  await language.click();await expect(nav).toHaveAttribute("aria-expanded","false");await expect(navPanel).toHaveAttribute("inert","");
  await expect(languagePanel).toHaveAttribute("data-open","true");await expect(languagePanel).not.toHaveAttribute("inert");
  await expect(languagePanel.locator('a')).toHaveCount(12); // Existing locale list: preserve the 76-link SEO contract.
  expect(await languagePanel.evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);
  await expect(languagePanel.locator('a[aria-current="true"] svg')).toHaveCount(1);
  await page.screenshot({path:path.join(evidence,`round5-language-${width}-${colorScheme}.png`),animations:"disabled"});
  // Clicking a noninteractive heading/blank part of the page closes the language panel.
  if(width===390)await chrome.locator('.gs-dialog-heading strong').click();else await page.locator('h1').click();
  await expect(language).toHaveAttribute("aria-expanded","false");
  await language.click();await nav.click();await expect(language).toHaveAttribute("aria-expanded","false");await expect(navPanel).toHaveAttribute("data-open","true");
  await expect.poll(()=>nav.locator('.gs-nav-chevron').evaluate(e=>getComputedStyle(e).rotate)).toBe("180deg");
  expect(await navPanel.evaluate(e=>getComputedStyle(e).transitionProperty)).toContain("opacity");
  await expect.poll(()=>navPanel.evaluate(e=>getComputedStyle(e).opacity)).toBe("1");
  await page.screenshot({path:path.join(evidence,`round5-navigation-${width}-${colorScheme}.png`),animations:"disabled"});
  await language.click();await languagePanel.locator('a[aria-current="true"]').click();
  if(width===390){await expect(chrome).toHaveCount(0);await page.getByRole("button",{name:"打开菜单",exact:true}).click();}
  await language.click();await languagePanel.locator('a').first().focus();await page.keyboard.press("Escape");
  await expect(language).toBeFocused();await expect(languagePanel).toHaveAttribute("inert","");
  if(width===390)await page.keyboard.press("Escape");
  else {await language.click();await page.getByRole("button",{name:"搜索产品或国家",exact:true}).click();await expect(language).toHaveAttribute("aria-expanded","false");await page.keyboard.press("Escape");}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}


// Empty DATA-1 is an expected CI state, never silently skip a missing trigger.
for(const width of [1280,390]) for(const colorScheme of ["light","dark"] as const) {
 test(`homepage currency empty state ${width} ${colorScheme}`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme});
  await page.goto("/zh");
  for(const preferred of ["CNY","USD"]) {
   await page.evaluate(value=>localStorage.setItem("geosub-public-display-currency",value),preferred);
   await page.reload();
   await expect(page.getByRole("note").filter({hasText:"虚构测试数据"})).toHaveCount(0);
   await expect(page.getByRole("region",{name:"代表套餐地区价格",exact:true})).toHaveCount(0);
   await expect(page.getByRole("heading",{name:"省钱排行榜",exact:true})).toHaveCount(0);
   await expect(page.getByRole("heading",{name:"按分类找",exact:true})).toHaveCount(0);
   await expect(page.getByLabel("收录统计")).toHaveCount(0);
   await expect(page.getByRole("button",{name:/^折合为 /})).toHaveCount(0);
   await expect(page.getByRole("dialog",{name:"选择币种",exact:true})).toHaveCount(0);
   await expect(page.getByRole("heading",{name:"如何阅读地区价格",exact:true})).toBeVisible();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

test.describe("currency with explicit fictional homepage data",()=>{
 let fixture: Awaited<ReturnType<typeof startHomepageFixtureServer>>;
 test.beforeAll(async()=>{test.setTimeout(150_000);fixture=await startHomepageFixtureServer();});
 test.afterAll(async()=>{await fixture?.stop();});
 for(const width of [1280,390]) for(const colorScheme of ["light","dark"] as const) {
  test(`round5 currency data ${width} ${colorScheme}`,async({page})=>{
   await page.setViewportSize({width,height:width===1280?720:844});await page.emulateMedia({colorScheme,reducedMotion:"no-preference"});
   await page.goto(`${fixture.origin}/zh`,{waitUntil:"networkidle"});
   await expect(page.getByRole("note")).toContainText("虚构测试数据");
   await expect(page.getByRole("list",{name:"订阅省钱排名"}).getByRole("listitem")).toHaveCount(6);
   await expect(page.locator('.gs-home-ranking')).toContainText('¥ 119.00');
   const consent=page.getByRole("button",{name:"拒绝统计",exact:true});if(await consent.isVisible())await consent.click();
  const currency=page.getByRole("button",{name:"折合为 ¥ CNY",exact:true});await currency.click();
  const dialog=page.getByRole("dialog",{name:"选择币种",exact:true});
  const list=dialog.getByRole("listbox",{name:"显示币种"});await expect(dialog.locator('input')).toHaveCount(0);
  const options=list.getByRole("option");await expect(options).toHaveCount(25);
  await expect(list.getByRole("option",{name:"CNY · 人民币",exact:true})).toBeFocused();
  const symbols=["$","¥","NT$","HK$","S$","€","¥","₩","A$","C$","RM","Rp","฿","₱","₫","₺","SAR","£","CHF","₹","R$","Mex$","AED","NZ$","R"];
  expect(await list.locator('.gs-currency-symbol').allTextContents()).toEqual(symbols);
  expect(await list.locator('.gs-currency-label strong').allTextContents()).toEqual(["USD","CNY","TWD","HKD","SGD","EUR","JPY","KRW","AUD","CAD","MYR","IDR","THB","PHP","VND","TRY","SAR","GBP","CHF","INR","BRL","MXN","AED","NZD","ZAR"]);
  for(const text of await list.locator('.gs-currency-label small').allTextContents())expect(text).toMatch(/[\u4e00-\u9fff]/);
  expect(await list.evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(width===1280?3:2);
  if(width===1280){expect(await dialog.evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);expect(await list.evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);}
  await page.screenshot({path:path.join(evidence,`round5-currency-${width}-${colorScheme}.png`),animations:"disabled"});
  await page.keyboard.press("ArrowDown");await expect(options.nth(width===1280?4:3)).toBeFocused();
  await page.keyboard.press("ArrowUp");await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowRight");await expect(options.nth(2)).toBeFocused();
  await page.keyboard.press("ArrowLeft");await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press("Home");await expect(options.first()).toBeFocused();await page.keyboard.press("Enter");
  const usd=page.getByRole("button",{name:"折合为 $ USD",exact:true});await expect(usd).toBeVisible();await expect(usd).toBeFocused();
  await expect(page.locator('.gs-home-ranking')).toContainText('$ 17.00');
  await usd.click();await expect(options.first()).toBeFocused();await page.keyboard.press("Escape");await expect(usd).toBeFocused();
  if(width===1280){await usd.click();await page.mouse.click(50,10);await expect(dialog).toHaveCount(0);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.reload();
   await expect(page.getByRole("button",{name:"折合为 $ USD",exact:true})).toBeVisible();
   await expect(page.locator('.gs-home-ranking')).toContainText('$ 17.00');
  });
 }
});

for(const route of ["/zh","/zh/ai-pricing"]) test(`round5 global header feedback and optimistic indicator ${route}`,async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.emulateMedia({reducedMotion:"no-preference"});await page.goto(route,{waitUntil:"networkidle"});
 const nav=page.getByRole("navigation",{name:"主导航"});const items=nav.locator('.gs-nav-item > a');
 expect(await page.locator('.gs-header-inner').evaluate(e=>e.getBoundingClientRect().height)).toBe(64);
 const before=await items.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().x));
 for(let i=0;i<await items.count();i++){
  await items.nth(i).hover();
  await expect.poll(()=>items.nth(i).evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  expect(await items.nth(i).evaluate(e=>getComputedStyle(e).webkitTextStrokeWidth)).toBe('0.35px');
  await expect.poll(()=>items.nth(i).evaluate(e=>getComputedStyle(e).color)).toBe(await page.locator('.gs-header').evaluate(e=>getComputedStyle(e).color));
  const after=await items.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().x));expect(after).toEqual(before);
 }
 const drop=nav.getByRole('button',{name:'数字订阅',exact:true});await drop.hover();
 await expect.poll(()=>drop.locator('.gs-nav-chevron').evaluate(e=>getComputedStyle(e).translate)).toBe('0px 1.5px');
 await drop.click();const panel=nav.locator('.gs-popover[data-open="true"]');
 await expect.poll(()=>drop.locator('.gs-nav-chevron').evaluate(e=>getComputedStyle(e).rotate)).toBe('180deg');
 expect(await panel.evaluate(e=>getComputedStyle(e).transitionDuration)).toContain('0.22s');
 expect((await panel.boundingBox())!.y).toBe(72);
 await drop.click();await expect(panel).toHaveCount(0);await page.waitForTimeout(250);
 await expect(nav.locator('.gs-popover').first()).toHaveAttribute('inert','');
 // Hold the real route response so the indicator must respond before pathname changes.
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/zh/countries?*',async r=>{await gate;await r.continue();});
 const target=nav.getByRole('link',{name:'国家价格',exact:true});await target.click();
 await expect(target).toHaveAttribute('aria-current','page');
 await expect.poll(async()=>Math.abs((await nav.locator('.gs-nav-indicator').boundingBox())!.x-(await target.boundingBox())!.x)).toBeLessThan(0.5);
 release();await page.waitForURL('**/zh/countries');
 await expect(target).toHaveAttribute('aria-current','page');
 await page.goBack();await expect(page).toHaveURL(new RegExp(route+'$'));
 await expect(nav.locator('[aria-current="page"]')).toHaveText(route==='/zh'?'首页':'数字订阅');
 await page.emulateMedia({reducedMotion:'reduce'});await drop.click();
 const open=nav.locator('.gs-popover[data-open="true"]');expect(await open.evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
});
