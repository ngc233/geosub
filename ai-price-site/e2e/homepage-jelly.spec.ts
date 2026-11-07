import { test, expect, type Locator } from "@playwright/test";
const local=process.env.GEOSUB_V3_TEST_ORIGIN;
if(local)test.use({baseURL:local,channel:"chrome"});
test.beforeEach(async({context})=>{
 test.skip(!local,"Requires the explicitly enabled local fictional fixture.");
 await context.route("**/*",r=>["127.0.0.1","localhost"].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
});
const aligned=async(base:Locator,pill:Locator)=>{
 await expect.poll(async()=>{const a=await base.boundingBox(),b=await pill.boundingBox();return a&&b?Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height)):1000;}).toBeLessThan(0.5);
};
for(const width of [1280,390])for(const colorScheme of ["light","dark"] as const){
 test(`round6 jelly, cursors and retained disclaimer ${width} ${colorScheme}`,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({colorScheme,reducedMotion:"no-preference"});await page.goto('/zh',{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'拒绝统计'});if(await consent.isVisible())await consent.click();
  const products=page.getByRole('navigation',{name:'地图产品'}),pills=products.getByRole('link');
  const focusPill=async(i:number)=>{await page.mouse.move(0,0);await pills.nth(i).focus();};
  const base=products.locator('.gs-home-product-jelly');await expect(base).toHaveAttribute('aria-hidden','true');await expect(products).toHaveAttribute('data-jelly-ready','true');
  await focusPill(0);await aligned(base,pills.nth(0));
  await pills.nth(1).hover();await expect(pills.nth(1)).toHaveAttribute('data-active','true');await aligned(base,pills.nth(1));
  await expect(base).toHaveCSS('transition-timing-function','cubic-bezier(0.2, 0.8, 0.2, 1), cubic-bezier(0.2, 0.8, 0.2, 1), cubic-bezier(0.2, 0.8, 0.2, 1)');
  expect(await base.evaluate(e=>getComputedStyle(e).animationName)).toMatch(/^gs-pill-adhere-[ab]$/);
  expect(await pills.nth(1).locator('.gs-home-product-pill-mark').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await focusPill(0);const cycle=await products.getAttribute('data-jelly-cycle');
  await focusPill(2);await expect(products).not.toHaveAttribute('data-jelly-cycle',cycle!);await aligned(base,pills.nth(2));
  if(width===390){await focusPill(7);await aligned(base,pills.nth(7));await products.evaluate(e=>{e.scrollLeft=80;});await aligned(base,pills.nth(7));}
  // Reflow and font/viewport measurements must preserve the content-coordinate alignment.
  await page.setViewportSize({width:width===390?430:1152,height:844});await aligned(base,products.locator('[data-active="true"]'));
  await page.setViewportSize({width,height:width===390?844:720});await aligned(base,products.locator('[data-active="true"]'));
  const tabs=page.getByRole('tablist',{name:'排行榜分类'});const buttons=tabs.getByRole('tab');
  for(const button of await buttons.all())await expect(button).toHaveCSS('cursor','pointer');
  for(const point of await page.locator('.gs-home-point').all())await expect(point).toHaveCSS('cursor','pointer');
  if(width===390)await page.getByRole('button',{name:'打开菜单',exact:true}).click();
  const language=width===390?page.getByRole('dialog',{name:'菜单',exact:true}).getByRole('button',{name:'简体中文',exact:true}):page.getByRole('button',{name:'简体中文',exact:true});await expect(language).toHaveCSS('cursor','pointer');
  if(width===390)await page.keyboard.press('Escape');
  await buttons.nth(1).hover();await expect.poll(()=>buttons.nth(1).evaluate(e=>getComputedStyle(e).color)).toBe(await tabs.evaluate(e=>getComputedStyle(e).color));
  await buttons.nth(1).click();const slider=tabs.locator('.gs-segment-slider');
  await expect(slider).toHaveCSS('transition-timing-function','cubic-bezier(0.34, 1.56, 0.64, 1)');
  expect(await slider.evaluate(e=>getComputedStyle(e).animationName)).toMatch(/^gs-jelly-morph-[ab]$/);
  await buttons.nth(0).click();const segmentCycle=await tabs.getAttribute('data-jelly-cycle');await buttons.nth(2).click();await expect(tabs).not.toHaveAttribute('data-jelly-cycle',segmentCycle!);
  await expect(page.locator('nav[aria-label="价格与数据说明"]')).toHaveCount(0);await expect(page.getByText('查看 ChatGPT Plus 地区成本',{exact:true})).toHaveCount(0);await expect(page.locator('.gs-home-disclaimer')).toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});await focusPill(1);await aligned(base,pills.nth(1));
  for(const node of [base,slider,pills.nth(1).locator('.gs-home-product-pill-mark')]){await expect(node).toHaveCSS('animation-name','none');await expect(node).toHaveCSS('transition-duration','0s');}
  await buttons.nth(0).click();await expect(buttons.nth(0)).toHaveAttribute('aria-selected','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
test('round6 autoplay drives the same shared jelly base',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/zh',{waitUntil:'networkidle'});
 const products=page.getByRole('navigation',{name:'地图产品'});const second=products.getByRole('link',{name:'Claude',exact:true});
 await expect(second).toHaveAttribute('data-active','true',{timeout:9000});await aligned(products.locator('.gs-home-product-jelly'),second);
 await expect(second.locator('.gs-home-carousel-progress')).toHaveAttribute('data-running','true');
 await page.emulateMedia({reducedMotion:'reduce'});const current=await products.locator('[data-active="true"]').getAttribute('href');await page.waitForTimeout(4700);await expect(products.locator('[data-active="true"]')).toHaveAttribute('href',current!);
});

test('map highlight travels monotonically without overshoot or logo recoil',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/zh',{waitUntil:'networkidle'});await page.mouse.move(0,0);
 const products=page.getByRole('navigation',{name:'地图产品'});await products.getByRole('link').first().focus();await page.waitForTimeout(400);
 for(const target of [1,0]){
  const samples=await products.evaluate(async(container,target)=>{
   const base=container.querySelector<HTMLElement>('.gs-home-product-jelly')!,pills=container.querySelectorAll<HTMLAnchorElement>('.gs-home-product-pill');
   // Observe the actual leading edge, including individual scale and translation.
   const read=()=>{const box=base.getBoundingClientRect();return target===1?box.right:box.left;};
   const start=read();pills[target].focus();
   // Read the destination after the active label weight has committed.
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   const targetBox=pills[target].getBoundingClientRect();const end=target===1?targetBox.right:targetBox.left;
   const samples:number[]=[];const begin=performance.now();
   while(performance.now()-begin<500){await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));samples.push(read());}
   return {start,end,samples,logoAnimation:getComputedStyle(pills[target].querySelector('.gs-home-product-pill-mark')!).animationName};
  },target);
  const direction=Math.sign(samples.end-samples.start);expect(direction).not.toBe(0);
  let previous=samples.start;
  for(const value of samples.samples){expect(value).toBeGreaterThanOrEqual(Math.min(samples.start,samples.end)-0.5);expect(value).toBeLessThanOrEqual(Math.max(samples.start,samples.end)+0.5);expect((value-previous)*direction).toBeGreaterThanOrEqual(-0.5);previous=value;}
  expect(Math.abs(previous-samples.end)).toBeLessThan(0.5);expect(samples.logoAnimation).toBe('none');
 }
});
