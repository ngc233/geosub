import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
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
    await section.getByRole("button",{name:"折合为 CNY"}).first().click();
    const input=page.getByRole("combobox",{name:"搜索币种"});await input.fill("美元");await input.press("Enter");
    await expect(section.getByRole("button",{name:"折合为 USD"})).toHaveCount(2);
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
    await page.goto("/zh");await page.keyboard.press("/");const input=page.getByRole("combobox");await input.fill("xyz");
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
