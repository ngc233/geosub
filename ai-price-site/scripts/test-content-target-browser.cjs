/* Local browser acceptance against an already built, loopback-only test server.
 * Creates a synthetic Claude fixture only when target and product namespaces are empty.
 * Never use a production DB or public server; cleanup only IDs created by this test.
 */
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes, scryptSync, createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const readDb = new PrismaClient({ adapter:new PrismaPg({ connectionString:process.env.DATABASE_URL }) });
const factMode=process.env.GEOSUB_CONTENT_FACTS_TEST==='true';
const url = new URL(process.env.DATABASE_URL);
const origin = new URL(process.env.GEOSUB_CONTENT_TEST_ORIGIN);
assert(['127.0.0.1', 'localhost'].includes(url.hostname) && /^\/geosub_release_\d{8}$/.test(url.pathname));
assert(origin.protocol === 'http:' && origin.hostname === '127.0.0.1' && origin.port && origin.pathname === '/');
const evidenceDir = path.resolve(process.env.GEOSUB_CONTENT_TEST_EVIDENCE);
fs.mkdirSync(evidenceDir, { recursive: true });
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', source)(name => name in mocks ? mocks[name] : name==='./prisma'?{prisma:readDb}:name==='server-only'?{}:name.startsWith('.')?load(path.resolve(path.dirname(file),name.replace(/\.ts$/,'')+'.ts')):require(name), module.exports, module);
  return module.exports;
}
const tokens = load('lib/content-fact-tokens.ts');
  const registry = load('lib/content-target-registry.ts');
const core = load('lib/managed-content.ts', { './content-target-registry.ts': registry, './content-fact-tokens.ts':tokens });
const readback = load('lib/content-readback.ts', { './managed-content.ts': core });
const factRenderer=load('lib/managed-content-facts.ts');
const adapter=load('lib/pricing-detail-adapter.ts');
const db = new Client({ connectionString: url.href });
const actor = randomUUID(), product = randomUUID(), plan = randomUUID(), price = randomUUID(), source = randomUUID();
const email = 'content-browser-' + randomUUID() + '@invalid.example';
const password = randomBytes(24).toString('hex') + 'Aa!';
const salt = randomBytes(16).toString('hex');
const hash = 'scrypt:' + salt + ':' + scryptSync(password, salt, 64).toString('hex');
let created = false;
const deploymentAuditIds=[];
const results = [];
const opportunity = randomUUID();
const phase3 = Boolean(process.env.GEOSUB_CONTENT_RECOVERY_TOKEN);
async function state(id) { return (await db.query('SELECT value_json FROM site_settings WHERE setting_key=$1', [registry.getRegisteredContentTarget(id).storagePrefix + 'state'])).rows[0]?.value_json; }
async function publicProof(id, expectedModeGeneration) {
  const target = registry.getRegisteredContentTarget(id), current = await state(id);
  const revision = current?.version ? (await db.query('SELECT value_json FROM site_settings WHERE setting_key=$1', [target.storagePrefix + 'revision:' + current.version])).rows[0].value_json : null;
  const fence = (await db.query('SELECT value_json FROM site_settings WHERE setting_key=$1', [target.storagePrefix + 'fence'])).rows[0]?.value_json;
  const rendered=revision?.content && factMode ? factRenderer.renderFactContent(revision.content,id,factRenderer.projectClaudeFactProduct(await adapter.getPricingDetailProduct('claude',target.locale,true))) : {content:revision?.content??null,factsHash:undefined};
  const content=rendered.content;
  const response = await fetch(origin.origin + target.canonicalPath);
  assert.equal(response.status, 200);
  return readback.verifyContentHtml(await response.text(), { title: content ? content.title + ' - GeoSub' : undefined, heading: content?.heading, description: content?.description, content, factsHash:rendered.factsHash, version: current?.version ? String(current.version) : "baseline", modeGeneration: String(expectedModeGeneration ?? fence?.generation ?? 0) }, id);
}
(async () => {
  await db.connect();
  let browser;
  try {
    assert.equal(Number((await db.query("SELECT count(*) FROM products WHERE slug='claude'")).rows[0].count), 0, 'Requires an empty synthetic Claude fixture');
    assert.equal(Number((await db.query("SELECT count(*) FROM site_settings WHERE setting_key LIKE 'managed-content:v2:overview:%:claude:%'")).rows[0].count), 0);
    await db.query('BEGIN');
    await db.query("INSERT INTO admin_users(id,email,password_hash,role,status) VALUES($1,$2,$3,'owner','active')", [actor, email, hash]);
    await db.query("INSERT INTO products(id,slug,name,category,provider,status) VALUES($1,'claude','Claude','ai','Anthropic','published')", [product]);
    await db.query("INSERT INTO plans(id,product_id,slug,name,billing_cycle,status) VALUES($1,$2,'pro','Pro','monthly','published')", [plan, product]);
    await db.query("INSERT INTO price_sources(id,source_key,type,name,source_level,provider,status) VALUES($1,'synthetic-claude-browser','app_store','Synthetic Claude QA','A','QA fixture','active')", [source]);
    await db.query("INSERT INTO region_prices(id,product_id,plan_id,country_id,local_price,currency,price_usd,us_base_price,diff_vs_us_percent,billing_platform,price_type,primary_source_id,confidence_score,data_quality,status,last_checked_at,published_at) SELECT $1,$2,$3,id,20,'USD',20,20,0,'ios','list_price',$4,100,'verified','published',now(),now() FROM countries WHERE code='US'", [price, product, plan, source]);
    if(factMode)await db.query("INSERT INTO price_observations(product_id,plan_id,country_id,source_id,raw_price,currency,converted_usd,billing_platform,price_type,source_level,status,confidence_score,observed_at,raw_payload) SELECT product_id,plan_id,country_id,primary_source_id,local_price,currency,price_usd,billing_platform,price_type,'A','approved',100,last_checked_at,'{\"fx_rate_date\":\"2026-10-19\"}'::jsonb FROM region_prices WHERE id=$1",[price]);
    await db.query('COMMIT'); created = true;
    const factsBefore = (await db.query('SELECT to_jsonb(p) AS row FROM region_prices p ORDER BY id')).rows;
    const legacyBefore = (await db.query("SELECT setting_key,value_json FROM site_settings WHERE setting_key LIKE 'content-pilot:en:chatgpt:%' ORDER BY setting_key")).rows;
    browser = await chromium.launch({ headless: true, channel: process.env.GEOSUB_CONTENT_TEST_BROWSER_CHANNEL || undefined });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true, reducedMotion: 'reduce' });
    let externalRequestsBlocked = 0;
    await context.route('**/*', async route => {
      const request = new URL(route.request().url());
      if (request.origin === origin.origin || ['data:', 'blob:'].includes(request.protocol)) {
        if (request.pathname.startsWith('/admin/content') && route.request().method() === 'POST') await new Promise(resolve => setTimeout(resolve, 400));
        return route.continue();
      }
      externalRequestsBlocked++; return route.abort();
    });
    const page = await context.newPage();
    const browserErrors=[];page.on('pageerror',error=>browserErrors.push(error.message));
    await page.goto(origin.origin + '/admin-login');
    await page.locator('[name=email]').fill(email);
    await page.locator('[name=password]').fill(password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/admin');
    const initialEnglish = await publicProof('overview:en:claude');
    for (const id of ['overview:zh:claude', 'overview:en:claude']) {
      const target = registry.getRegisteredContentTarget(id), query = '?target=' + encodeURIComponent(id);
      const before = await (await fetch(origin.origin + target.canonicalPath)).text();
      await page.goto(origin.origin + '/admin/content/preview' + query);
      await page.getByText('请先保存草稿。', { exact: true }).waitFor();
      await page.goto(origin.origin + '/admin/content' + query);
      assert.equal(await page.locator('input[name=targetId]').first().inputValue(), id);
      const form = page.locator('form').filter({ has: page.locator('input[name=operation][value=draft]') });
      await form.locator('[name=heading]').fill(id.includes(':zh:') ? 'Claude 中文独立内容验收' : 'Claude independent English overview');
      if(factMode) {
        await form.locator('[name=title]').fill('{{product.name}} plans and pricing');
        await form.locator('[name=heading]').fill(id.includes(':zh:')?'{{product.name}} 中文独立内容验收':'{{product.name}} independent English overview');
        await form.locator('[name=description]').fill('{{unknown.price}}');
        await form.locator('button[type=submit]').click();
        await page.getByRole('alert').filter({hasText:'未登记的动态事实 token。'}).waitFor();
        await form.locator('[name=description]').fill('{{pro.price_range}} · {{pro.regions}}');
        await form.locator('[name=section0body]').fill('{{pro.price_date}} · {{pro.fx_date}} · {{max-5x.price_range}}');
        await form.locator('summary').filter({hasText:'FAQ'}).click();
        await form.locator('[name=faq0a]').fill('{{pro.regions}} · {{pro.price_range}}');
        await form.locator('summary').filter({hasText:'FAQ'}).click();
      }
      await form.locator('[name=sources]').fill('https://openai.com/');
      await form.locator('button[type=submit]').click();
      await expect(form.locator('button[type=submit]')).toBeDisabled();
      await page.getByRole('alert').filter({ hasText: '来源须为当前产品的官方 HTTPS 页面。' }).waitFor();
      assert.equal(await state(id), undefined);
      await form.locator('[name=sources]').fill('https://claude.com/pricing');
      await form.locator('button[type=submit]').click();
      await page.getByText('草稿已保存，访客页面未改变。请打开预览核对。', { exact: true }).waitFor();
      assert.equal((await state(id)).version, 0);
      assert.equal((await (await fetch(origin.origin + target.canonicalPath)).text()).includes(id.includes(':zh:') ? 'Claude 中文独立内容验收' : 'Claude independent English overview'), false);
      assert.ok(before.includes('data-content-kind="fallback"'));
      await page.goto(origin.origin + '/admin/content/preview' + query);
      await page.getByRole('heading', { name: id.includes(':zh:') ? 'Claude 中文独立内容验收' : 'Claude independent English overview', exact: true }).waitFor();
      await page.goto(origin.origin + '/admin/content' + query);
      const publish = page.locator('form').filter({ has: page.locator('input[name=operation][value=publish]') });
      await publish.locator('[name=reason]').fill('Synthetic local browser acceptance');
      await publish.locator('[name=reviewed]').check();
      await publish.locator('button[type=submit]').click();
      await page.getByText('本地版本已切换，应用缓存已失效。尚未执行公网 CDN 发布验收。', { exact: true }).waitFor();
      assert.equal((await state(id)).receipt, 'origin_invalidated');
      const proof = await publicProof(id);
      if(factMode){const html=await (await fetch(origin.origin+target.canonicalPath)).text();assert.ok(html.includes(target.locale==='zh'?'月付 App Store 数据不可用':'monthly App Store data unavailable'));}
      results.push({ target: id, localOriginProof: proof });
      if (target.locale === 'zh') assert.deepEqual((await publicProof('overview:en:claude')).outputHashes, initialEnglish.outputHashes);
      // Saved payloads survive page navigation; preview and public share the real template.
      for (const [name, width, height, scheme] of [['desktop-light',1280,720,'light'],['desktop-dark',1280,720,'dark'],['mobile-light',390,844,'light'],['mobile-dark',390,844,'dark']]) {
        await page.setViewportSize({ width, height }); await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(origin.origin + '/admin/content' + query);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Admin overflow');
        const selected = page.locator('nav[aria-label="内容目标"] a[aria-current=page]');
        await expect.poll(async () => { await selected.focus(); return selected.evaluate(el => el === document.activeElement); }).toBe(true);
        await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
        await expect(selected).toBeFocused();
        assert.ok(await selected.evaluate(el=>Number(getComputedStyle(el).fontWeight)>=600),'Visible selected target');
        if(factMode) {
          const help=page.locator('summary').filter({hasText:'动态事实 token（只读月付 App Store）'});
          await help.click();
          assert.equal(await help.evaluate(el=>el.parentElement.open),true);
          await help.focus();await page.keyboard.press('Space');
          assert.equal(await help.evaluate(el=>el.parentElement.open),false);
          await page.keyboard.press('Enter');
          assert.equal(await help.evaluate(el=>el.parentElement.open),true);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Expanded token help overflow');
          await help.scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(evidenceDir,target.locale+'-token-help-'+name+'.png')});
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(evidenceDir, target.locale + '-admin-' + name + '.png') });
        await page.goto(origin.origin + target.canonicalPath);
        const decline=page.getByRole('button',{name:/^(拒绝统计|Reject analytics)$/});
        if(await decline.isVisible())await decline.click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Public overflow');
        await page.screenshot({ path: path.join(evidenceDir, target.locale + '-public-' + name + '.png') });
        await page.locator('[data-managed-editorial=true]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(evidenceDir, target.locale + '-editorial-' + name + '.png') });
        const faq = page.locator('[data-managed-faq-question=true]').first();
        const answer = page.locator('[data-managed-faq-answer=true]').first();
        await answer.waitFor({ state: 'visible' });
        await (width === 390 ? faq.tap() : faq.click()); await answer.waitFor({ state: 'hidden' });
        await (width === 390 ? faq.tap() : faq.click()); await answer.waitFor({ state: 'visible' });
      }
    }
    if (phase3) {
      const token = process.env.GEOSUB_CONTENT_RECOVERY_TOKEN;
      const request = (supplied=token) => fetch(origin.origin + '/api/internal/content/recover', { method:'POST',headers:{'x-geosub-content-recovery':supplied} });
      assert.equal((await request('wrong-token')).status,404);
      await db.query("INSERT INTO search_opportunities(id,query,normalized_query,kind,status) VALUES($1,'Synthetic Claude content opportunity',$2,'content','open')",[opportunity,opportunity]);
      for(const id of ['overview:zh:claude','overview:en:claude']) {
        const target=registry.getRegisteredContentTarget(id),query='?target='+encodeURIComponent(id);
        await page.goto(origin.origin+'/admin/content/effects'+query);
        await page.getByRole('status').filter({hasText:'暂不能建立关联'}).waitFor();
        // Simulate a process that lost its lease after commit. A new runner
        // process must inspect saved state, never re-publish the draft.
        let current=await state(id);
        const previousVersion=current.version;
        const revKey=target.storagePrefix+'revision:'+previousVersion;
        const revision=(await db.query('SELECT value_json FROM site_settings WHERE setting_key=$1',[revKey])).rows[0].value_json;
        const content=core.parseOverviewContent({...revision.content,heading:target.locale==='zh'?'Claude 中文恢复后的独立概览':'Claude recovered English overview'},id);
        const nextRevision={...revision,version:previousVersion+1,previousVersion,content,hash:createHash('sha256').update(JSON.stringify(content)).digest('hex'),reason:'Synthetic committed pointer before lost process',createdAt:new Date().toISOString()};
        // Synthetic crash fixture: commit a new reviewed pointer without executing
        // the cache step, then let the real recovery HTTP endpoint take over.
        const oldAttempt=(await db.query('SELECT value_json FROM site_settings WHERE setting_key=$1',[target.storagePrefix+'attempt:'+current.attemptId])).rows[0].value_json;
        const lost={...oldAttempt,id:randomUUID(),version:nextRevision.version,number:1,previousAttemptId:null,status:'pending',evidence:undefined,createdAt:Date.now(),finishedAt:null};
        await db.query('BEGIN');
        await db.query("INSERT INTO site_settings(setting_key,group_name,label,value_json,is_public) VALUES($1,'managed-content-v2-revision','Synthetic crash revision',$2::jsonb,false)",[target.storagePrefix+'revision:'+nextRevision.version,JSON.stringify(nextRevision)]);
        await db.query("INSERT INTO site_settings(setting_key,group_name,label,value_json,is_public) VALUES($1,'managed-content-v2-attempt','Synthetic abandoned attempt',$2::jsonb,false)",[target.storagePrefix+'attempt:'+lost.id,JSON.stringify(lost)]);
        current={...current,version:nextRevision.version,attemptId:lost.id};
        await db.query('UPDATE site_settings SET value_json=$2::jsonb WHERE setting_key=$1',[target.storagePrefix+'state',JSON.stringify(current)]);
        await db.query("UPDATE site_settings SET value_json=jsonb_set(value_json,'{epoch}',to_jsonb((value_json->>'epoch')::int+1)) WHERE setting_key=$1",[target.storagePrefix+'fence']);
        await db.query('COMMIT');
        const key=target.storagePrefix+'attempt:'+current.attemptId;
        const attempt=(await db.query('SELECT value_json FROM site_settings WHERE setting_key=$1',[key])).rows[0].value_json;
        const pending={...current,receipt:'pending'};
        const abandoned={...attempt,status:'running',owner:randomUUID(),leaseUntil:Date.now()-1,finishedAt:null};
        await db.query('UPDATE site_settings SET value_json=$2::jsonb WHERE setting_key=$1',[target.storagePrefix+'state',JSON.stringify(pending)]);
        await db.query('UPDATE site_settings SET value_json=$2::jsonb WHERE setting_key=$1',[key,JSON.stringify(abandoned)]);
        const revisionsBefore=(await db.query("SELECT setting_key,value_json FROM site_settings WHERE setting_key LIKE $1 ORDER BY setting_key",[target.storagePrefix+'revision:%'])).rows;
        const other=id==='overview:zh:claude'?'overview:en:claude':'overview:zh:claude',otherBefore=await state(other);
        const {spawnSync}=require('node:child_process');
        const runner=spawnSync(process.execPath,['scripts/recover-content-local.cjs','--once'],{env:{...process.env,GEOSUB_CONTENT_RECOVERY_ORIGIN:origin.origin},encoding:'utf8',timeout:25000});
        assert.equal(runner.status,0,runner.stderr);
        const result=JSON.parse(runner.stdout.trim());
        assert.equal(result.results.find(r=>r.targetId===id).status,'origin_invalidated');
        assert.equal((await state(id)).version,current.version);
        assert.equal((await state(id)).receipt,'origin_invalidated');
        assert.deepEqual((await db.query("SELECT setting_key,value_json FROM site_settings WHERE setting_key LIKE $1 ORDER BY setting_key",[target.storagePrefix+'revision:%'])).rows,revisionsBefore);
        assert.deepEqual(await state(other),otherBefore);
        assert.equal((await db.query('SELECT value_json FROM site_settings WHERE setting_key=$1',[key])).rows[0].value_json.failure,'lease_expired');
        const proof=await publicProof(id);
        // Complete public/CDN receipt is a deliberate MOCK fixture for the
        // association UI. The real local runner above never emits verified.
        const recovered=await state(id),latestKey=target.storagePrefix+'attempt:'+recovered.attemptId;
        const latest=(await db.query('SELECT value_json FROM site_settings WHERE setting_key=$1',[latestKey])).rows[0].value_json;
        const mockEvidence={status:'verified',stage:'complete',origin:proof,public:proof,purge:{acceptedAt:new Date().toISOString(),url:'https://geosub.org'+target.canonicalPath}};
        await db.query('UPDATE site_settings SET value_json=$2::jsonb WHERE setting_key=$1',[latestKey,JSON.stringify({...latest,status:'verified',evidence:mockEvidence})]);
        await db.query('UPDATE site_settings SET value_json=$2::jsonb WHERE setting_key=$1',[target.storagePrefix+'state',JSON.stringify({...recovered,receipt:'verified'})]);
        await page.goto(origin.origin+'/admin/content/effects'+query);
        const linkForm=page.locator('form').filter({has:page.locator('[name=operation][value=link]')});
        await linkForm.locator('[name=hypothesis]').fill('Synthetic local acceptance; public receipt is mocked');
        await linkForm.locator('[name=version]').evaluate(el=>el.value='9999');
        await linkForm.getByRole('button',{name:'关联当前版本'}).click();
        await page.getByRole('alert').filter({hasText:'内容版本已切换'}).waitFor();
        await linkForm.locator('[name=version]').evaluate((el,v)=>el.value=String(v),recovered.version);
        await linkForm.getByRole('button',{name:'关联当前版本'}).click();
        await expect(linkForm.getByRole('button')).toBeDisabled();
        await page.getByRole('status').filter({hasText:'记录已保存'}).waitFor();
        const capture=page.locator('form').filter({has:page.locator('[name=operation][value=capture]')});
        await capture.getByRole('button',{name:'保存本次证据观察'}).click();
        await page.getByRole('status').filter({hasText:'记录已保存'}).last().waitFor();
        const observation=page.locator('summary').filter({hasText:'证据不足'});
        await observation.click();
        await page.getByText('14个完整观察日尚未结束。',{exact:true}).waitFor();
        await observation.focus();await page.keyboard.press('Space');
        assert.equal(await observation.evaluate(el=>el.parentElement.open),false);
        await page.keyboard.press('Enter');
        assert.equal(await observation.evaluate(el=>el.parentElement.open),true);
        const proofDetails=page.locator('summary').filter({hasText:'关联凭据'});
        await proofDetails.click();
        for(const [name,width,height,scheme] of [['desktop-light',1280,720,'light'],['desktop-dark',1280,720,'dark'],['mobile-light',390,844,'light'],['mobile-dark',390,844,'dark']]) {
          await page.setViewportSize({width,height});await page.emulateMedia({colorScheme:scheme,reducedMotion:'reduce'});
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Effects overflow');
          const selected=page.locator('nav[aria-label="效果观察目标"] a[aria-current=page]');
          await selected.focus();await expect(selected).toBeFocused();
        assert.ok(await selected.evaluate(el=>Number(getComputedStyle(el).fontWeight)>=600),'Visible selected target');
          if(width===390) {await proofDetails.tap();await proofDetails.tap();}
          await page.evaluate(()=>scrollTo(0,0));
          await page.screenshot({path:path.join(evidenceDir,target.locale+'-effects-'+name+'.png'),fullPage:true});
        }
        await page.getByRole('link',{name:'内容版本',exact:true}).click();
        assert.equal(new URL(page.url()).searchParams.get('target'),id);
        results.push({target:id,restartedWorker:true,HTTPRecovery:true,localReceipt:'origin_invalidated',effectAssociation:true,fullPublicReceipt:'MOCK',effectInsufficient:true,staleVersionError:true,fourStateEffects:true});
      }
      assert.equal(Number((await db.query("SELECT count(*) FROM site_settings WHERE group_name='content-effect-v2-link' AND value_json->>'actor'=$1",[actor])).rows[0].count),2);
    }
    if(factMode) {
      const beforeRows=(await db.query("SELECT setting_key,value_json FROM site_settings WHERE setting_key LIKE 'managed-content:v2:overview:%:claude:%' AND setting_key NOT LIKE '%attempt:%' ORDER BY setting_key")).rows;
      const auditsBeforeFacts=(await db.query('SELECT id,to_jsonb(a) AS row FROM audit_logs a ORDER BY id')).rows;
      const originalProofs=await Promise.all(['overview:zh:claude','overview:en:claude'].map(id=>publicProof(id)));
      const otherPrices=(await db.query('SELECT to_jsonb(p) AS row FROM region_prices p WHERE id<>$1 ORDER BY id',[price])).rows;
      await db.query("UPDATE region_prices SET local_price=30,price_usd=30,last_checked_at='2026-10-22T12:00:00Z' WHERE id=$1",[price]);
      await db.query("INSERT INTO price_observations(product_id,plan_id,country_id,source_id,raw_price,currency,converted_usd,billing_platform,price_type,source_level,status,confidence_score,observed_at,raw_payload) SELECT product_id,plan_id,country_id,primary_source_id,local_price,currency,price_usd,billing_platform,price_type,'A','approved',100,last_checked_at,'{\"fx_rate_date\":\"2026-10-21\"}'::jsonb FROM region_prices WHERE id=$1",[price]);
      // A real existing OWNER action invalidates the canonical product price tag.
      // No test endpoint or production token is added to exercise invalidation.
      await page.goto(origin.origin+'/admin/products/'+product+'/edit');
      const save=page.locator('form').filter({has:page.locator('input[name=id][value="'+product+'"]')});
      await save.getByRole('button',{name:'保存修改',exact:true}).click();
      await page.waitForURL('**/admin/products');
      for(const [index,id] of ['overview:zh:claude','overview:en:claude'].entries()) {
        const proof=await publicProof(id);assert.notEqual(proof.factsHash,originalProofs[index].factsHash);
        const html=await (await fetch(origin.origin+registry.getRegisteredContentTarget(id).canonicalPath)).text();
        assert.ok(html.includes('$30.00–$30.00'));assert.ok(html.includes('2026-10-22'));assert.ok(html.includes('2026-10-21'));
        assert.equal(html.includes('{{pro.'),false);
        await page.goto(origin.origin+'/admin/content/effects?target='+encodeURIComponent(id));
        const capture=page.locator('form').filter({has:page.locator('[name=operation][value=capture]')});
        await capture.getByRole('button',{name:'保存本次证据观察'}).click();
        await page.getByRole('status').filter({hasText:'记录已保存'}).last().waitFor();
        const lastCheck=(await db.query("SELECT value_json FROM site_settings WHERE group_name='content-effect-v2-check' AND value_json->>'targetId'=$1 ORDER BY created_at DESC LIMIT 1",[id])).rows[0].value_json;
        assert.equal(lastCheck.result.status,'insufficient');
      }
      assert.deepEqual((await db.query("SELECT setting_key,value_json FROM site_settings WHERE setting_key LIKE 'managed-content:v2:overview:%:claude:%' AND setting_key NOT LIKE '%attempt:%' ORDER BY setting_key")).rows,beforeRows);
      assert.deepEqual((await db.query('SELECT to_jsonb(p) AS row FROM region_prices p WHERE id<>$1 ORDER BY id',[price])).rows,otherPrices);
      const auditsAfterFacts=new Map((await db.query('SELECT id,to_jsonb(a) AS row FROM audit_logs a ORDER BY id')).rows.map(r=>[r.id,r.row]));
      for(const row of auditsBeforeFacts)assert.deepEqual(auditsAfterFacts.get(row.id),row.row,'Existing audit history immutable across fact refresh');
      const expectedPrices=(await db.query('SELECT to_jsonb(p) AS row FROM region_prices p ORDER BY id')).rows;
      factsBefore.splice(0,factsBefore.length,...expectedPrices);
      results.push({dynamicFactTokens:true,bothLocales:true,metadataAndHtmlAndFaqJsonLd:true,formalPriceTagInvalidation:'real OWNER save action',changedPrice:30,priceCollectedAt:'2026-10-22',fxRateDate:'2026-10-21',contentAndAuditHistoryPreserved:true,unrelatedPricesUnchanged:true,effectsAfterFactChange:'insufficient',unknownTokenRejected:true,tokenHelpExpandedKeyboardAndFourStates:true});
    }
    // Chinese rollback retains history and leaves the other language unchanged.
    const beforeRollbackZh=await state('overview:zh:claude'),beforeRollbackEn=await state('overview:en:claude');
    await page.goto(origin.origin + '/admin/content?target=overview%3Azh%3Aclaude');
    const rollback = page.locator('form').filter({ has: page.locator('[name=operation][value=rollback]') });
    await rollback.locator('[name=version]').selectOption('0');
    await rollback.locator('[name=reason]').fill('Restore code default in Chinese only'); await rollback.locator('[name=reviewed]').check();
    await rollback.locator('button[type=submit]').click();
    await page.getByText('本地版本已切换，应用缓存已失效。尚未执行公网 CDN 发布验收。', { exact: true }).waitFor();
    assert.equal((await state('overview:zh:claude')).version, beforeRollbackZh.version+1);
    assert.equal((await state('overview:en:claude')).version, beforeRollbackEn.version);
    await publicProof('overview:zh:claude'); await publicProof('overview:en:claude');
    assert.deepEqual((await db.query('SELECT to_jsonb(p) AS row FROM region_prices p ORDER BY id')).rows, factsBefore);
    assert.deepEqual((await db.query("SELECT setting_key,value_json FROM site_settings WHERE setting_key LIKE 'content-pilot:en:chatgpt:%' ORDER BY setting_key")).rows, legacyBefore);
    assert.deepEqual(browserErrors,[],'No browser script errors');
    if(process.env.GEOSUB_CONTENT_DEPLOYMENT_TEST==='true') {
      const gate=require('./content-deploy-fence.cjs');
      const historyBefore=(await db.query("SELECT setting_key,to_jsonb(s) AS row FROM site_settings s WHERE setting_key LIKE 'managed-content:v2:overview:%:claude:revision:%' ORDER BY setting_key")).rows;
      const auditsBefore=(await db.query('SELECT id,to_jsonb(a) AS row FROM audit_logs a ORDER BY id')).rows;
      const proofsBefore=await Promise.all(['overview:zh:claude','overview:en:claude'].map(id=>publicProof(id)));
      const auditIdsBefore=new Set(auditsBefore.map(r=>r.id));
      const paused=await gate.pauseContentForDeployment(readDb,'upgrade');
      deploymentAuditIds.push(...(await db.query("SELECT id FROM audit_logs WHERE action='content_deploy_pause' ORDER BY id")).rows.map(r=>r.id).filter(id=>!auditIdsBefore.has(id)));
      assert.equal(paused.targets.filter(t=>t.id.endsWith(':claude')).length,2);
      const live=await gate.verifyContentOrigin(readDb,origin.origin);
      assert.equal(live.publicCdnVerified,false);assert.equal(live.targets.filter(t=>t.id.endsWith(':claude')).length,2);
      for(const [index,id] of ['overview:zh:claude','overview:en:claude'].entries()) {
        const proof=await publicProof(id,Number(live.targets.find(t=>t.id===id).generation));assert.equal(proof.version,proofsBefore[index].version);
        await page.goto(origin.origin+registry.getRegisteredContentTarget(id).canonicalPath);
      }
      await assert.rejects(gate.pauseContentForDeployment(readDb,'rollback'),/Rollback blocked/);
      await assert.rejects(gate.verifyClosedContent(readDb,{production:true}),/not verified/);
      assert.deepEqual((await db.query("SELECT setting_key,to_jsonb(s) AS row FROM site_settings s WHERE setting_key LIKE 'managed-content:v2:overview:%:claude:revision:%' ORDER BY setting_key")).rows,historyBefore);
      const auditsAfter=new Map((await db.query('SELECT id,to_jsonb(a) AS row FROM audit_logs a ORDER BY id')).rows.map(r=>[r.id,r.row]));
      for(const row of auditsBefore)assert.deepEqual(auditsAfter.get(row.id),row.row);
      results.push({deploymentFence:'both Claude targets closed atomically',originIdentity:'actual loopback HTTP',publishedVersionsPreserved:true,revisionAndAuditHistoryPreserved:true,unverifiedLocalRollbackRejected:true,productionAdmission:false,publicCdnVerified:false});
    }
    results.push({ browserScriptErrors:browserErrors.length, fourStateLayouts: true, keyboardFocus: true, overflow: false, faqExpanded: true, touch: true, pendingDisabled: true, emptyPreview: true, invalidSourceFeedback: true, reducedMotion: true, independentRollback: true, pricesUnchanged: true, pilotUnchanged: true, productionRequests: 0, externalRequestsBlocked });
    fs.writeFileSync(path.join(evidenceDir, 'browser-acceptance.json'), JSON.stringify(results, null, 2));
    console.log('PASS: real local login, draft/preview/publish/rollback, rendered readback, four UI states, keyboard/FAQ/overflow, price and pilot preservation');
  } finally {
    if (browser) await browser.close();
    if (created) {
      await db.query('BEGIN');
      if(deploymentAuditIds.length)await db.query('DELETE FROM audit_logs WHERE id=ANY($1::uuid[])',[deploymentAuditIds]);
      await db.query("DELETE FROM audit_logs WHERE new_value->>'attemptId' IN (SELECT value_json->>'id' FROM site_settings WHERE setting_key LIKE 'managed-content:v2:overview:%:claude:attempt:%')");
      await db.query("DELETE FROM site_settings WHERE group_name IN ('content-effect-v2-link','content-effect-v2-check') AND value_json->>'actor'=$1",[actor]);
      await db.query('DELETE FROM search_opportunities WHERE id=$1',[opportunity]);
      await db.query("DELETE FROM site_settings WHERE setting_key LIKE 'managed-content:v2:overview:%:claude:%'");
      await db.query('DELETE FROM audit_logs WHERE actor_id=$1', [actor]);
      await db.query('DELETE FROM price_observations WHERE product_id=$1',[product]);
      await db.query('DELETE FROM region_prices WHERE id=$1', [price]);
      await db.query('DELETE FROM plans WHERE id=$1', [plan]); await db.query('DELETE FROM products WHERE id=$1', [product]);
      await db.query('DELETE FROM price_sources WHERE id=$1', [source]); await db.query('DELETE FROM admin_users WHERE id=$1', [actor]);
      await db.query('COMMIT');
    } else await db.query('ROLLBACK');
    await db.end();await readDb.$disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
