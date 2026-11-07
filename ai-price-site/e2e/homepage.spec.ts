import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
const local=process.env.GEOSUB_V3_TEST_ORIGIN;
const evidence=process.env.GEOSUB_V3_EVIDENCE;
if(local)test.use({baseURL:local,channel:"chrome"});
test.beforeEach(async({context})=>{
  await context.route("**/*",route=>["localhost","127.0.0.1"].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
test("homepage uses approved V3.1 hero copy and source contains no retired guide URL",async({page,request})=>{
  const response=await request.get("/zh");expect(response.status()).toBe(200);
  expect(await response.text()).not.toContain("/guides/gift-card-guide");
  await page.goto("/zh");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading",{level:1})).toHaveText("同一个订阅，换个地区能省多少");
  await expect(page.getByText("比较 AI 与流媒体订阅在全球各地区的真实价格，每天自动核验。",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"最近变价"})).toHaveCount(0);
});
for(const width of [1280,390])for(const colorScheme of ["light","dark"] as const){
 test(`fictional homepage ${width} ${colorScheme}: data, keyboard, currency and overflow`,async({page})=>{
  test.skip(!local,"Run with the explicitly enabled local fictional fixture.");
  await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({colorScheme,reducedMotion:"reduce"});
  await page.goto("/zh",{waitUntil:"networkidle"});await page.evaluate(()=>document.fonts.ready);
  const consent=page.getByRole("button",{name:"拒绝统计"});if(await consent.isVisible())await consent.click();
  await expect(page.getByRole("note")).toContainText("虚构测试数据");
  const dark=colorScheme==="dark", surface=dark?"rgb(26, 29, 32)":"rgb(255, 255, 255)";
  await expect(page.locator(".gs-home-map-panel")).toHaveCSS("background-color",surface);
  await expect(page.locator(".gs-home-map-stage")).toHaveCSS("background-color",surface);
  await expect(page.locator(".gs-home-land").first()).toHaveCSS("color",dark?"rgb(53, 58, 64)":"rgb(228, 228, 222)");
  for(const [tone,color] of Object.entries(dark?{low:"rgb(163, 230, 53)",high:"rgb(251, 146, 60)",baseline:"rgb(169, 175, 184)"}:{low:"rgb(101, 163, 13)",high:"rgb(234, 88, 12)",baseline:"rgb(61, 68, 80)"})) {
    await expect(page.locator(`.gs-home-point > [data-tone="${tone}"]:not([data-lowest="true"])`).first()).toHaveCSS("background-color",color);
  }
  const bubble=page.locator(".gs-home-bubble");
  for(const tone of ["low","high","baseline"]) {
    if(width===1280)await page.locator(`.gs-home-point:has(> [data-tone="${tone}"])`).first().click();
    else await page.getByLabel("地图查看地区").selectOption(tone==="high"?"AU":tone==="baseline"?"US":"PH");
    const expected=tone==="high"?(dark?"rgb(253, 186, 116)":"rgb(154, 52, 18)"):tone==="baseline"?(dark?"rgb(169, 175, 184)":"rgb(61, 68, 80)"):(dark?"rgb(190, 242, 100)":"rgb(63, 98, 18)");
    await expect(bubble.locator(":scope > small")).toHaveCSS("color",expected);
    if(width===1280&&dark)await expect(bubble).toHaveCSS("background-color",tone==="high"?"rgb(58, 31, 20)":tone==="baseline"?"rgb(35, 39, 43)":"rgb(28, 36, 16)");
  }

  await expect(page.getByLabel("收录统计")).toContainText("82");
  await expect(page.getByRole("link").filter({hasText:"查看全部 AI 订阅"})).toContainText("最多能省 15% · Suno Pro");
  await expect(page.getByRole("link").filter({hasText:"查看全部流媒体"})).toContainText("最多能省 15% · YouTube Premium 个人版");
  await expect(page.getByText(/代表套餐最多省/)).toHaveCount(0);
  await expect(page.getByRole("list",{name:"订阅省钱排名"})).toContainText("标准版");
  await expect(page.getByRole("list",{name:"订阅省钱排名"})).toContainText("月度会员");
  const price=page.locator('[data-gs-price-cycle="true"]').filter({hasText:"¥ 119.00"}).last();
  await expect(price).toContainText("¥ 119.00 / 月");
  await expect(price.locator('[data-gs-cycle]')).toBeHidden();
  await expect(price.locator('.gs-sr-only')).toContainText('/ 月');

  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const ranks=page.getByRole("list",{name:"订阅省钱排名"});await expect(ranks.getByRole("listitem")).toHaveCount(6);await page.getByRole("button",{name:/加载更多/}).click();await expect(ranks.getByRole("listitem")).toHaveCount(8);expect(await ranks.locator(".gs-home-rank").allTextContents()).toEqual(["1","2","3","4","5","6","7","8"]);await expect(ranks.locator("[inert], [aria-hidden=\"true\"] a")).toHaveCount(0);
  const filter=page.getByRole("tablist",{name:"排行榜分类"});await filter.getByRole("tab",{name:"AI 订阅",exact:true}).click();await expect(ranks.getByRole("listitem")).toHaveCount(4);
  await page.keyboard.press("ArrowRight");await expect(filter.getByRole("tab",{name:"流媒体",exact:true})).toHaveAttribute("aria-selected","true");await expect(ranks).toContainText("Netflix");
  await filter.getByRole("tab",{name:"全部",exact:true}).click();
  const products=page.getByRole("navigation",{name:"地图产品"});await products.getByRole("link",{name:/Claude/}).focus();
  await expect(page.getByText("已按系统设置关闭自动轮换",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"折合为 ¥ CNY",exact:true}).click();await page.getByRole("option",{name:"USD · 美元",exact:true}).click();
  await expect(page.getByRole("button",{name:"折合为 $ USD",exact:true})).toBeVisible();await expect(ranks).toContainText("$ 17.00");
  await page.getByRole("button",{name:"折合为 $ USD",exact:true}).click();await page.getByRole("option",{name:"JPY · 日元",exact:true}).click();
  await expect(ranks).toContainText("JP¥ 2,550.00");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"折合为 ¥ JPY",exact:true}).click();await page.getByRole("option",{name:"GBP · 英镑",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"GBP 汇率不可用"})).toBeVisible();
  await page.getByRole("button",{name:"折合为 $ USD",exact:true}).click();await page.getByRole("option",{name:"CNY · 人民币",exact:true}).click();
  const countries=page.getByRole("region",{name:"哪些国家整体更便宜"});await expect(countries.getByRole("link").filter({hasText:"加拿大"})).toHaveCount(0);await expect(countries.getByRole("link").filter({hasText:"菲律宾"})).toHaveCount(1);
  await expect(countries).toContainText("订阅价格的中位水平与美国相同");
  // All rebuilt savings displays use whole percentages, including cards and map.
  for(const selector of [".gs-home-ranking", ".gs-home-categories", ".gs-home-countries", ".gs-home-bubble"]){
    expect(await page.locator(selector).innerText()).not.toMatch(/\d+\.\d+%/);
  }
  await expect(countries).toContainText("便宜约");
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
 await expect(page.getByRole("list",{name:"订阅省钱排名"})).toContainText("119.00");await expect(page.getByLabel("收录统计")).toContainText("82");await context.close();
});
test("carousel rotates once, then focus pauses it; search preserves logo position",async({page})=>{
 test.skip(!local,"Local fictional fixture only");
 await page.emulateMedia({reducedMotion:"no-preference"});await page.goto("/zh");
 await page.mouse.move(0,0);const tabs=page.getByRole("navigation",{name:"地图产品"});
 await expect(tabs.getByRole("link",{name:/Claude/})).toHaveAttribute("data-active","true",{timeout:9000});
 await tabs.getByRole("link",{name:/ChatGPT/}).focus();await page.waitForTimeout(4800);
 await expect(tabs.getByRole("link",{name:/ChatGPT/})).toHaveAttribute("data-active","true");
 const logo=page.getByRole("link",{name:"GeoSub 首页",exact:true});const before=await logo.boundingBox();
 await page.getByRole("button",{name:"搜索产品或国家",exact:true}).click();await expect(page.getByRole("dialog",{name:"搜索",exact:true})).toBeVisible();
 expect((await logo.boundingBox())?.x).toBe(before?.x);await page.keyboard.press("Escape");
});
test("search minimum follows the homepage display currency without a rates request",async({page})=>{
 test.skip(!local,"Local fictional fixture only");
 await page.route("**/api/search?**",route=>route.fulfill({json:{results:[{id:"fictional",kind:"plan",title:"虚构搜索套餐",subtitle:"仅测试",href:"/zh/ai-pricing/chatgpt/plus",minimumUsd:20,cycle:"monthly"}]}}));
 await page.goto("/zh");await page.getByLabel("首页搜索产品或国家").fill("虚构");await page.getByRole("button",{name:"搜索",exact:true}).click();
 await expect(page.getByRole("option",{name:/虚构搜索套餐/})).toContainText("¥ 140.00");await page.keyboard.press("Escape");
 await page.getByRole("button",{name:"折合为 ¥ CNY",exact:true}).click();await page.getByRole("option",{name:"USD · 美元",exact:true}).click();
 await page.getByRole("button",{name:"搜索产品或国家",exact:true}).click();await page.getByRole("combobox",{name:"搜索产品或国家"}).fill("虚构");await expect(page.getByRole("option",{name:/虚构搜索套餐/})).toContainText("$ 20.00");
});

test("canvas controls: outer focus ring, flat row hover, selected segment and exact desktop dimensions",async({page})=>{
 test.skip(!local,"Local fixture supplies the representative rows.");
 await page.setViewportSize({width:1280,height:720});await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});await page.goto("/zh");
 const field=page.locator(".gs-home-search-field"), input=page.getByLabel("首页搜索产品或国家");
 await input.focus();await expect(input).toHaveCSS("outline-style","none");await expect(field).toHaveCSS("border-top-color","rgb(77, 124, 15)");await expect(field).toHaveCSS("box-shadow","rgb(77, 124, 15) 0px 0px 0px 1px");
 const row=page.getByRole("list",{name:"订阅省钱排名"}).getByRole("listitem").first();await row.scrollIntoViewIfNeeded();const before=await row.boundingBox();await row.hover();await expect(row).toHaveCSS("background-color","rgb(248, 251, 239)");await expect(row).toHaveCSS("transform","none");await expect(row).toHaveCSS("box-shadow","none");expect(await row.boundingBox()).toEqual(before);
 const segments=page.getByRole("tablist",{name:"排行榜分类"});await expect(segments).toHaveCSS("background-color","rgb(255, 255, 255)");await expect(segments).toHaveCSS("border-top-width","1px");await expect(segments.getByRole("tab",{name:"全部",exact:true})).toHaveCSS("font-weight","700");
 await expect(page.locator(".gs-home-intro h1")).toHaveCSS("font-size","48px");await expect(page.locator(".gs-home-intro h1")).toHaveCSS("line-height","57.6px");
 expect((await page.locator(".gs-home-search").boundingBox())?.width).toBe(620);expect((await field.boundingBox())?.height).toBe(52);expect(before?.height).toBe(56);
 const map=await page.locator(".gs-home-map-stage").boundingBox();expect(map!.width/map!.height).toBeCloseTo(60/22,3);
 await page.getByRole("button",{name:"搜索产品或国家",exact:true}).click();const modal=page.getByRole("combobox",{name:"搜索产品或国家",exact:true});await expect(modal).toBeFocused();await expect(modal).toHaveCSS("outline-style","none");await expect(modal.locator("..")).toHaveCSS("box-shadow","rgb(77, 124, 15) 0px 0px 0px 1px");await page.keyboard.press("Escape");
});

test("canvas review: exact desktop metrics, +N, semantic bubbles, clamp and motion tokens",async({page})=>{
 test.skip(!local,"Local fixture only");await page.setViewportSize({width:1280,height:720});await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});await page.goto("/zh");
 const field=page.locator('.gs-home-search-field');await expect(field).toHaveCSS('border-radius','14px');await expect(field).toHaveCSS('border-top-color','rgb(217, 217, 211)');await expect(page.locator('.gs-home-search button')).toHaveCSS('background-color','rgb(163, 230, 53)');
 const normal=page.locator('.gs-home-point > span').first(),lowest=page.locator('.gs-home-low-marker > [data-lowest]');
 expect((await normal.boundingBox())?.width).toBe(12);expect((await lowest.boundingBox())?.width).toBe(18);
 const tab=page.getByRole('navigation',{name:'地图产品'}).getByRole('link').first();expect((await tab.boundingBox())?.height).toBe(44);await expect(tab).toHaveCSS('background-color','rgba(0, 0, 0, 0)');const jelly=page.locator('.gs-home-product-jelly');await expect(jelly).toHaveCSS('background-color','rgb(236, 252, 203)');await expect(jelly).toHaveCSS('border-top-color','rgb(163, 230, 53)');
 const segment=page.getByRole('tablist',{name:'排行榜分类'}).getByRole('tab').first();const box=await segment.boundingBox();expect(box?.width).toBe(96);expect(box?.height).toBe(44);
 const category=page.locator('.gs-home-categories .gs-home-card').first();await expect(category).toHaveCSS('border-radius','18px');await expect(category).toHaveCSS('padding','22px');expect((await category.locator('.gs-home-product-mark').first().boundingBox())?.width).toBe(34);
 await expect(page.locator('.gs-home-brand-more')).toHaveCount(2);await expect(category.locator('.gs-home-brand-more')).toHaveText('+1');await expect(category.locator('.gs-home-brand-more')).toHaveCSS('font-size','11px');await expect(category.locator('.gs-home-brand-more')).toHaveCSS('font-weight','700');await expect(category.locator('.gs-home-brand-more')).toHaveCSS('color','rgb(61, 68, 80)');
 await expect(page.locator('.gs-home-country-card').first()).toHaveCSS('border-radius','14px');expect((await page.locator('.gs-home-country-card').first().boundingBox())!.width).toBeGreaterThanOrEqual(340);expect((await page.locator('.gs-home-guides .gs-home-card').first().boundingBox())!.width).toBeGreaterThanOrEqual(280);
 await page.keyboard.press('Tab');await tab.focus();await expect(tab).toHaveCSS('outline-width','3px');await expect(tab).toHaveCSS('outline-color','rgb(77, 124, 15)');
 for(const region of ['英国','日本','澳大利亚']) {await page.getByRole('button',{name:new RegExp(`^${region} `)}).click();const bubble=await page.locator('.gs-home-bubble').boundingBox(),visual=await page.locator('.gs-home-map-visual').boundingBox();expect(bubble!.x).toBeGreaterThanOrEqual(visual!.x);expect(bubble!.x+bubble!.width).toBeLessThanOrEqual(visual!.x+visual!.width);expect(bubble!.y).toBeGreaterThanOrEqual(visual!.y);}
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('.gs-home-low-marker')).toHaveCSS('transition-duration','0.48s, 0.48s');expect(await page.locator('.gs-home-map').evaluate(e=>getComputedStyle(e).getPropertyValue('--gs-motion-carousel-ease').trim())).toBe('linear');
 await page.emulateMedia({colorScheme:'dark'});await expect(category.locator('.gs-home-category-avatar').first()).toHaveCSS('border-color','rgb(26, 29, 32)');await expect(category.locator('.gs-home-category-avatar').first()).toHaveCSS('border-radius','50%');
});

for(const colorScheme of ['light','dark'] as const)test(`mobile canvas ${colorScheme}: map, every price and saving, touch alternative`,async({page})=>{
 test.skip(!local,"Local fixture only");await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.goto('/zh');
 await expect(page.locator('.gs-home-map-stage > svg')).toBeVisible();expect(await page.locator('.gs-home-map-stage circle').evaluate(e=>{const svg=e.closest('svg')!;return Number(e.getAttribute('r'))*2*svg.getBoundingClientRect().width/600;})).toBeCloseTo(3,3);const stage=await page.locator('.gs-home-map-stage').boundingBox();expect(stage!.width/stage!.height).toBeCloseTo(60/22,3);await expect(page.locator('.gs-home-us')).toBeVisible();
 await page.getByLabel('地图查看地区').selectOption('AU');await expect(page.locator('.gs-home-bubble > small')).toContainText('澳大利亚');await expect(page.locator('.gs-home-bubble-values > span')).toHaveText('+19%');
 await page.getByRole('button',{name:/加载更多/}).click();
 const rows=page.getByRole('list',{name:'订阅省钱排名'}).getByRole('listitem');await expect(rows).toHaveCount(8);
 expect((await rows.first().boundingBox())!.height).toBeLessThanOrEqual(70);expect(await rows.first().locator('a').evaluate(e=>parseFloat(getComputedStyle(e,'::after').height))).toBeGreaterThanOrEqual(44);
 for(const row of await rows.all()){await row.scrollIntoViewIfNeeded();for(const selector of ['.gs-home-row-price','.gs-comparison-label']){const target=row.locator(selector);await expect(target).toBeVisible();const rect=await target.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(390);}}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const width of [1280,390])for(const colorScheme of ['light','dark'] as const)test(`local brand logos and decorative flags ${width} ${colorScheme}`,async({page})=>{
 test.skip(!local,'Local fictional fixture only');
 const externalImages:string[]=[];page.on('request',request=>{if(request.resourceType()==='image'&&!['localhost','127.0.0.1'].includes(new URL(request.url()).hostname))externalImages.push(request.url());});
 await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.goto('/zh',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/加载更多/}).click();
 // Force off-screen local assets to decode, so lazy loading cannot hide broken logos.
 const images=page.locator('.gs-home img');expect(await images.count()).toBe(38);
 await images.evaluateAll(async elements=>{await Promise.all(elements.map(async e=>{const img=e as HTMLImageElement;img.loading='eager';await img.decode();}));});
 expect(await images.evaluateAll(elements=>elements.every(e=>{const img=e as HTMLImageElement;return img.complete&&img.naturalWidth>0&&img.alt===''&&img.getAttribute('aria-hidden')==='true'&&new URL(img.src).origin===location.origin&&['/brand-assets/thumbs/','/flags/'].some(prefix=>new URL(img.src).pathname.startsWith(prefix));}))).toBe(true);
 expect(externalImages).toEqual([]);
 for(const [selector,count,size] of [['.gs-home-product-pill-mark',8,20],['.gs-home-ranking-mark',8,28],['.gs-home-category-avatars .gs-home-product-mark',6,34],['.gs-home-country-code',6,28]] as const){
  const marks=page.locator(selector);await expect(marks).toHaveCount(count);
  for(const mark of await marks.all()){await expect(mark).toHaveAttribute('aria-hidden','true');await expect(mark).toHaveText('');const box=await mark.boundingBox();expect(box!.width).toBe(size);expect(box!.height).toBe(size);await expect(mark.locator('img')).toHaveCount(1);}
 }
 for(const slug of ['chatgpt','claude','gemini','netflix','youtube-premium','mubi','suno','deezer'])await expect(page.locator(`.gs-home-ranking-mark img[src^="/brand-assets/thumbs/${slug}.webp"]`)).toHaveCount(1);
 for(const code of ['ph','tr','ca','jp','in','br'])await expect(page.locator(`.gs-home-country-code img[src$="/flags/${code}.svg"]`)).toHaveCount(1);
 await expect(page.locator('.gs-home-us img')).toHaveAttribute('src',/\/flags\/us\.svg$/);await expect(page.locator('.gs-home-bubble > small img')).toHaveAttribute('src',/\/flags\/ph\.svg$/);
 await expect(page.locator('.gs-home-region-price .gs-home-flag img')).toHaveCount(8);
 const link=page.locator('.gs-home-product-name[href="/zh/ai-pricing/chatgpt/plus"]');await expect(link).toHaveText('ChatGPTPlus');await expect(link).toHaveAccessibleName('ChatGPTPlus');
 await expect(page.locator('.gs-home-brand-more')).toHaveCount(2);await expect(page.locator('.gs-home-brand-more').first()).toHaveCSS('font-size','11px');await expect(page.locator('.gs-home-brand-more').first()).toHaveCSS('font-weight','700');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const width of [1280,390])for(const colorScheme of ['light','dark'] as const)test(`round4 circular logos and direct navigation ${width} ${colorScheme}`,async({page})=>{
 test.skip(!local,'Local fictional fixture only');test.setTimeout(60000); // Five independent navigation checks, including cold local routes.
 await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
 const openHome=async()=>{await page.goto('/zh',{waitUntil:'networkidle'});const consent=page.getByRole('button',{name:'拒绝统计'});if(await consent.isVisible())await consent.click();};
 await openHome();await page.getByRole('button',{name:/加载更多/}).click();await expect(page.locator('.gs-home a a')).toHaveCount(0);await expect(page.locator('.gs-home-product-pill')).toHaveCount(8);
 // seo-home.cjs checks all 76 links before consent dismissal removes its privacy link.
 for(const selector of ['.gs-home-category-avatar','.gs-home-category-avatar .gs-home-brand-logo','.gs-home-category-avatar img','.gs-home-category-avatars .gs-home-brand-more','.gs-home-product-pill-mark','.gs-home-product-pill-mark .gs-home-brand-logo','.gs-home-product-pill-mark img']){
  for(const element of await page.locator(selector).all()){await expect(element).toHaveCSS('border-top-left-radius','50%');await expect(element).toHaveCSS('overflow','hidden');const box=await element.boundingBox();expect(box!.width).toBe(box!.height);}
 }
 for(const element of await page.locator('.gs-home-category-avatar,.gs-home-brand-more').all()){await expect(element).toHaveCSS('border-top-width','2px');await expect(element).toHaveCSS('border-top-color',colorScheme==='dark'?'rgb(26, 29, 32)':'rgb(255, 255, 255)');}
 for(const element of await page.locator('.gs-home-category-avatar img,.gs-home-product-pill-mark img').all()){await expect(element).toHaveCSS('object-fit','cover');await expect(element).toHaveCSS('padding','0px');}
 // Real pointer hit testing catches card overlays intercepting individual logos.
 for(const selector of ['.gs-home-product-pill-mark','.gs-home-ranking-mark','.gs-home-category-avatar'])for(const mark of await page.locator(selector).all()){
  await mark.scrollIntoViewIfNeeded();expect(await mark.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('a');return hit?.getAttribute('href')===e.closest('a')?.getAttribute('href');})).toBe(true);
 }
 await expect(page.locator('.gs-home-category-product-link')).toHaveCount(6);
 // Isolate keyboard focus from the mouse left at the earlier load-more click.
 await page.mouse.move(0,0);
 const capsule=page.getByRole('navigation',{name:'地图产品'}).getByRole('link',{name:'Claude',exact:true});await capsule.focus();await expect(capsule).toHaveAttribute('data-active','true');await expect(page.locator('.gs-home-map-caption')).toContainText('Claude Pro');await expect(capsule).toHaveCSS('outline-width','3px');
 // Keyboard Enter and actual logo clicks must navigate, not just change the map.
 const target=await capsule.getAttribute('href');await capsule.press('Enter');await expect(page).toHaveURL(new RegExp(target+'$'),{timeout:15000});
 for(const selector of ['.gs-home-product-pill-mark','.gs-home-ranking-mark','.gs-home-category-avatar','.gs-home-category-title']){
  await openHome();const element=page.locator(selector).first();const href=await element.evaluate(e=>(e.closest('a')??e.closest('article')?.querySelector('.gs-home-category-link'))?.getAttribute('href'));expect(href).toBeTruthy();await element.scrollIntoViewIfNeeded();const box=await element.boundingBox();await page.mouse.click(box!.x+box!.width/2,box!.y+box!.height/2);await expect(page).toHaveURL(new RegExp(href+'/?$'),{timeout:15000});
 }
});

for(const width of [1280,390])for(const colorScheme of ['light','dark'] as const)test(`ranking load more ${width} ${colorScheme}`,async({page})=>{
 test.skip(!local,'Local fixture only');await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.goto('/zh',{waitUntil:'networkidle'});
 const ranking=page.getByRole('list',{name:'订阅省钱排名'}),items=ranking.getByRole('listitem'),all=ranking.locator('.gs-home-ranking-row');
 const button=page.getByRole('button',{name:/加载更多/});await expect(items).toHaveCount(6);await expect(all).toHaveCount(8);await expect(button).toContainText('还有 2 个产品');await expect(button).toHaveCSS('cursor','pointer');
 const links=await all.locator('a').evaluateAll(nodes=>nodes.map(a=>[a.getAttribute('href'),a.getAttribute('rel'),a.textContent]));
 await button.focus();await expect(button).toHaveCSS('outline-width','3px');await button.press('Enter');await expect(items).toHaveCount(8);await expect(items.nth(6).getByRole('link')).toBeFocused();await expect(button).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:'已显示 8 个，共 8 个产品'})).toHaveCount(1);
 expect(await all.locator('a').evaluateAll(nodes=>nodes.map(a=>[a.getAttribute('href'),a.getAttribute('rel'),a.textContent]))).toEqual(links);
 expect(await ranking.locator('.gs-home-rank').allTextContents()).toEqual(['1','2','3','4','5','6','7','8']);
 const tabs=page.getByRole('tablist',{name:'排行榜分类'});await tabs.getByRole('tab',{name:'AI 订阅',exact:true}).click();await expect(items).toHaveCount(4);await expect(button).toHaveCount(0);
 await tabs.getByRole('tab',{name:'全部',exact:true}).click();await expect(items).toHaveCount(6);await expect(button).toBeVisible();await button.click();await expect(items).toHaveCount(8);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
