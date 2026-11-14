import { test, expect } from '@playwright/test';
test.beforeEach(async ({ context }) => {
  await context.addCookies([{name:'geosub_analytics_consent',value:`denied.${Math.floor(Date.now()/1000)}`,domain:'127.0.0.1',path:'/'}]);
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
const pages = ['about','contact','privacy','terms','data-sources','tools/currency-converter','tools/currency-converter/usd-cny','price-history','price-history/chatgpt','price-records/30000000-0000-4000-8000-000000000001'];
for (const width of [1280,390]) for (const colorScheme of ['light','dark'] as const) {
  test(`auxiliary pages ${width} ${colorScheme}: readable, no overflow, article width and outer focus`, async ({ context }) => {
    const errors:string[]=[];
    for(const route of pages) {
      // Independent page visits avoid cancelling another page's in-flight prefetches.
      const page=await context.newPage();
      await page.setViewportSize({width,height:844}); await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
      page.on('pageerror',error=>errors.push(error.message));
      const pending=new Set<unknown>();let lastNetworkActivity=Date.now();
      page.on('request',request=>{pending.add(request);lastNetworkActivity=Date.now();});
      const finish=(request:unknown)=>{pending.delete(request);lastNetworkActivity=Date.now();};
      page.on('requestfinished',finish);page.on('requestfailed',finish);
      expect((await page.goto(`/zh/${route}`,{waitUntil:'networkidle'}))?.status(),route).toBe(200);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
      expect(await page.locator('main.gs-public-unified').evaluate(el=>getComputedStyle(el).backgroundColor),route).toBe(colorScheme==='dark'?'rgb(17, 19, 21)':'rgb(246, 246, 243)');
      if (await page.locator('.gs-aux-prose').count()) {
        expect((await page.locator('.gs-aux-prose').boundingBox())!.width).toBeLessThanOrEqual(680);
        if(width===390){await page.locator('.gs-guide-toc-mobile summary').click();await expect(page.locator('.gs-guide-toc-mobile button').first()).toBeVisible();}
        const button=page.locator(width===390?'.gs-guide-toc-mobile button':'.gs-guide-toc-desktop button').first();
        if(await button.count()){await button.click();await expect(page.locator('.gs-aux-prose :focus')).toBeVisible();}
      }
      // A previous networkidle event does not wait for prefetches triggered by scrolling.
      // Finish current requests before closing the page; keep every pageerror fatal.
      await expect.poll(()=>pending.size===0&&Date.now()-lastNetworkActivity>=500).toBe(true);
      expect(errors,route).toEqual([]);
      await page.close();
    }
    expect(errors).toEqual([]);
  });
}
test('converter uses the same local fixture rates; swap, quick amount, invalid, missing currency, keyboard and reduced motion',async({page})=>{
  await page.goto('/zh/tools/currency-converter');
  const font=await page.evaluate(async()=>{await document.fonts.ready;const f=[...document.fonts].find(face=>face.family.replaceAll('\"','')==='GeoSub Tool Numerals');return f?{status:f.status,display:f.display}:null;});expect(font).toEqual({status:'loaded',display:'swap'});
  const amount=page.locator('.gs-converter-amount input'),select=page.locator('.gs-converter-select select');
  await select.nth(0).selectOption('USD');await select.nth(1).selectOption('CNY');await amount.fill('10');
  await expect(page.locator('.gs-converter-result [aria-hidden="true"]')).toHaveText('¥ 72.00');
  await amount.focus();expect(await page.locator('.gs-converter-amount .gs-field').evaluate(el=>getComputedStyle(el).borderColor)).toBe('rgb(77, 124, 15)');
  expect(await amount.evaluate(el=>getComputedStyle(el).outlineWidth)).toBe('0px');
  await page.getByRole('button',{name:'交换原币种和目标币种'}).click();await expect(select.nth(0)).toHaveValue('CNY');await expect(select.nth(1)).toHaveValue('USD');
  await expect(page.locator('.gs-converter-result [aria-hidden="true"]')).toHaveText('$ 1.39');
  await page.emulateMedia({reducedMotion:'reduce'});await amount.fill('72');await expect(page.locator('.gs-converter-result [aria-hidden="true"]')).toHaveText('$ 10.00');
  await amount.fill('invalid');await expect(page.locator('.gs-converter-result [data-gs-number]')).toHaveCount(0);
  await amount.fill('-1');await expect(page.locator('.gs-converter-result [data-gs-number]')).toHaveCount(0);
  await page.locator('.gs-converter-quick button').first().click();await expect(amount).toHaveValue('4.99');await expect(select.nth(0)).toHaveValue('USD');
  await expect(select.nth(0).locator('option[value="KRW"]')).toHaveJSProperty('disabled',true);
});
test('contact API stays unchanged; error retains fields, retry succeeds without sending real mail',async({page})=>{
  await page.goto('/zh/contact');let attempts=0;let releaseFirst:()=>void=()=>{};const firstResponse=new Promise<void>(resolve=>{releaseFirst=resolve;});
  await page.route('**/api/contact-tickets',async route=>{attempts++;expect(route.request().method()).toBe('POST');const data=route.request().postDataJSON();expect(data.sourcePath).toBe('/zh/contact');expect(data.email).toBe('local-test@example.invalid');if(attempts===1)await firstResponse;await route.fulfill({status:attempts===1?503:200,contentType:'application/json',body:JSON.stringify(attempts===1?{error:'本地模拟失败，请重试'}:{ticketId:'LOCAL-FICTIONAL-TEST'})});});
  await page.locator('[name="name"]').focus();expect(await page.locator('[name="name"]').evaluate(el=>getComputedStyle(el).outlineWidth)).toBe('0px');expect(await page.locator('[name="name"]').evaluate(el=>getComputedStyle(el.parentElement!).borderColor)).toBe('rgb(77, 124, 15)');await page.locator('[name="name"]').fill('本地测试');await page.locator('[name="email"]').fill('local-test@example.invalid');await page.locator('[name="subject"]').fill('虚构工单测试');await page.locator('[name="message"]').fill('这是一段仅用于本地界面测试的虚构说明，不会发送到服务器。');
  await page.getByRole('button',{name:'提交工单'}).click();await expect(page.getByRole('button',{name:'正在提交'})).toBeDisabled();releaseFirst();await expect(page.locator('#contact-form [role="alert"]')).toHaveText('本地模拟失败，请重试');await expect(page.locator('[name="name"]')).toHaveValue('本地测试');
  await page.getByRole('button',{name:'提交工单'}).click();await expect(page.getByRole('heading',{name:'提交成功'})).toBeVisible();expect(attempts).toBe(2);await page.getByRole('button',{name:'再提交一条'}).click();await expect(page.locator('[name="name"]')).toBeVisible();
});
test('unknown Chinese routes are real HTTP 404, searchable and keyboard accessible',async({page,browser})=>{
  for(const path of ['/zh/v7-does-not-exist','/zh/price-history/v7-does-not-exist','/zh/tools/currency-converter/no-pair']) {
    expect((await page.goto(path))?.status()).toBe(404);await expect(page.getByRole('heading',{name:'这个页面不存在'})).toHaveCSS('font-size','26px');await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  }
  await page.getByRole('textbox',{name:'查找产品或国家'}).fill('不存在的测试产品');await page.locator('.gs-state-panel button[type="submit"]').click();await expect(page.getByRole('dialog',{name:'搜索',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'搜索',exact:true})).toHaveCount(0);
  expect(await page.locator('.gs-state-panel nav a').evaluateAll(links=>links.map(a=>a.getAttribute('href')))).toEqual(['/zh/ai-pricing/chatgpt/plus','/zh/streaming-pricing/netflix','/zh/streaming-pricing/youtube-premium','/zh']);
  const noScript = await browser.newContext({javaScriptEnabled:false});
  try {
    await noScript.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
    const staticPage = await noScript.newPage();
    expect((await staticPage.goto(new URL('/zh/v7-does-not-exist',page.url()).href))?.status()).toBe(404);
    await expect(staticPage.getByRole('heading',{name:'这个页面不存在'})).toHaveCSS('font-size','26px');
    await expect(staticPage.getByRole('link',{name:'返回首页',exact:true})).toBeVisible();
  } finally { await noScript.close(); }

});

test('expired and missing quotes never produce amounts; 20-hour quote retains the original warning and usable result',async({page})=>{
  for(const pair of ['usd-hkd','usd-sgd']) {
    await page.goto(`/zh/tools/currency-converter/${pair}`,{waitUntil:'networkidle'});
    await expect(page.locator('.gs-converter-result [data-gs-number]')).toHaveCount(0);
    await expect(page.locator('.gs-converter-result')).toContainText('当前汇率不可用');
    await expect(page.locator('.gs-tools-layout > section').first()).toContainText('当前汇率不可用');
    await expect(page.locator('.gs-tools-layout > section').first()).toContainText('不可用');
  }
  await page.goto('/zh/tools/currency-converter/usd-eur',{waitUntil:'networkidle'});
  await expect(page.locator('.gs-converter-result [aria-hidden="true"]')).toHaveText('€ 17.99');
  await expect(page.locator('.gs-converter footer')).toContainText('当前使用最近一次可用汇率');
  await expect(page.locator('.gs-converter-comparisons > div').filter({hasText:'KRW'})).toContainText('不可用');
});

test('confirmed fictional history retains original local values and both source records; empty history stays honest',async({page})=>{
  await page.goto('/zh/price-history/chatgpt',{waitUntil:'networkidle'});
  const events=page.getByRole('region',{name:'已确认的调价'});
  await expect(events).toContainText('本币涨价 +25%');
  await expect(events.getByRole('link',{name:'变化前快照'})).toHaveAttribute('href','/zh/price-records/30000000-0000-4000-8000-000000000001');
  await expect(events.getByRole('link',{name:'变化后快照'})).toHaveAttribute('href','/zh/price-records/30000000-0000-4000-8000-000000000002');
  await events.getByRole('link',{name:'变化前快照'}).click();
  await expect(page.locator('main.gs-evidence-page')).toContainText('US$20.00');
  await page.getByText('记录标识与内容校验值',{exact:true}).click();
  await expect(page.locator('details[open]')).toContainText('SHA-256:');
  await page.goto('/zh/price-history/claude',{waitUntil:'networkidle'});
  await expect(page.getByText('尚无可确认的调价事件',{exact:true})).toBeVisible();
});

test('auxiliary stylesheet is loaded only by the approved Chinese route families',async({page,request,browser})=>{
  for(const [route,expected] of [['/zh/tools/currency-converter',true],['/zh/price-history/chatgpt',true],['/zh/about',true],['/zh/ai-pricing/chatgpt/plus',false],['/en',false],['/en/tools/currency-converter',false]] as const){
    await page.goto(route,{waitUntil:'networkidle'});
    const urls=await page.locator('link[rel="stylesheet"]').evaluateAll(links=>links.map(link=>(link as HTMLLinkElement).href));
    const styles=await Promise.all(urls.map(async url=>(await request.get(url)).text()));
    const tools = route.startsWith('/zh/tools/'), article = route === '/zh/about';
    expect(styles.some(css=>css.includes('.gs-tools-layout')),route).toBe(tools);
    expect(styles.some(css=>css.includes('.gs-aux-layout')),route).toBe(false);
    expect(urls.some(url=>url.includes('v7-auxiliary-tools.css')),route).toBe(tools);
    expect(urls.some(url=>url.includes('v7-auxiliary-article.css')),route).toBe(false);
    expect(urls.some(url=>url.includes('v7-auxiliary-states.css')),route).toBe(false);
    expect(styles.some(css=>css.includes('.gs-state-page')),route).toBe(false);
    if(route.startsWith('/en'))expect(styles.some(css=>css.includes('.gs-home-ranking-row')),route).toBe(false);
    await expect(page.locator('style[data-gs-auxiliary]'),route).toHaveCount(expected&&!tools?1:0);
    if(expected&&!tools)expect(await page.locator('style[data-gs-auxiliary]').textContent()).toContain(article?'.gs-aux-layout':'.gs-evidence-page');
  }
  const noScript = await browser.newContext({javaScriptEnabled:false,viewport:{width:1280,height:720}});
  try {
    await noScript.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
    const staticPage = await noScript.newPage();
    for(const [route,kind,selector] of [['/zh/about','article','.gs-aux-prose'],['/zh/tools/currency-converter','tools','.gs-converter']] as const){
      expect((await staticPage.goto(new URL(route,page.url()).href))?.status()).toBe(200);
      await expect(staticPage.locator(kind==='article'?'style[data-gs-auxiliary="article"]':`link[rel="stylesheet"][href*="v7-auxiliary-${kind}.css"]`)).toHaveCount(1);
      await expect(staticPage.locator(selector)).toHaveCSS(kind==='article'?'width':'display',kind==='article'?'680px':'flex');
    }
  } finally { await noScript.close(); }

});
