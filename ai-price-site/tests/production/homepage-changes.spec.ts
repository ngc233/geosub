import { test, expect } from "@playwright/test";
test.beforeEach(async({context})=>{await context.route('**/*',route=>['127.0.0.1','localhost','[::1]'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());});
for(const width of [1280,390])for(const colorScheme of ['light','dark']as const){
 test(`recent changes ${width} ${colorScheme}`,async({page},info)=>{
  await page.setViewportSize({width,height:width===390?844:900});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto('/zh',{waitUntil:'networkidle'});expect(response?.status()).toBe(200);
  const html=await response!.text();expect(html).toContain('最近变价');
  const consent=page.getByRole('button',{name:'拒绝统计',exact:true});if(await consent.isVisible())await consent.click();
  const recent=page.getByRole('region',{name:'最近变价'});await expect(recent).toBeVisible();
  const links=recent.locator('.gs-home-change-row');await expect(links).toHaveCount(6);
  await expect(links.first()).toContainText('ChatGPT Plus');await expect(links.first()).toContainText('−20%');
  await expect(links.nth(1)).toContainText('+10%');await expect(recent).toContainText('不含汇率波动');
  const dates=await links.locator('time').evaluateAll(es=>es.map(e=>e.getAttribute('datetime')!));expect(dates).toEqual([...dates].sort().reverse());
  expect(await links.first().evaluate(e=>getComputedStyle(e).minHeight)).toBe('44px');
  expect(await links.first().locator('.gs-home-change-icon').evaluate(e=>e.getBoundingClientRect().width)).toBe(28);
  await recent.getByRole('link',{name:'价格历史',exact:true}).focus();await page.keyboard.press('Tab');await expect(links.first()).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const target=await links.first().getAttribute('href');expect(target).toBe('/zh/price-history/chatgpt');
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const note=document.createElement('div');note.textContent='虚构测试数据 · 本地 UI 验收';note.style.cssText='position:fixed;top:0;left:0;z-index:99999;background:#fff;color:#000;font:12px sans-serif;padding:4px;pointer-events:none';document.body.append(note);});
  await info.attach(`homepage-${width}-${colorScheme}`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await links.first().click();await expect(page).toHaveURL(/\/zh\/price-history\/chatgpt$/);await expect(page.getByRole('heading',{name:'已确认的调价',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
 });
}
test('no eligible history hides the entire section',async({page})=>{
 const origin=process.env.GEOSUB_CHANGES_EMPTY_ORIGIN??'http://127.0.0.1:3187';
 expect(['127.0.0.1','localhost']).toContain(new URL(origin!).hostname);
 await page.goto(origin!+'/zh',{waitUntil:'networkidle'});
 await expect(page.locator('#home-recent-changes')).toHaveCount(0);
 await expect(page.locator('.gs-home-change-list')).toHaveCount(0);
 await expect(page.locator('h1')).toHaveText('同一个订阅，换个地区能省多少');
});
