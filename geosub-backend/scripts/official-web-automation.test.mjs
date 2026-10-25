import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSpotifyOfficialHtml, fetchSpotifyOfficialSnapshot, spotifyMarkets } from './lib/spotify-official-web.mjs';
import { decideOfficialWebReview, assertAutomaticWebSource, reviewOfficialWebMarket } from './lib/official-web-auto-review.mjs';
import { refreshOfficialWebPublication } from './refresh-official-web-publication.mjs';
import { createHmac } from 'node:crypto';
import { collectMarketSnapshots, validateSnapshot } from './collect-official-web-prices.mjs';

export function spotifyPage(change = () => {}) {
  const props = { metadata:{country:'US',market:'us'},basePageProps:{country:'US',market:'us'},
    components:[{attributes:{plans:[
      {planId:'PREMIUM_INDIVIDUAL',planIdentifier:'premium-individual',header:'Premium Individual',
        isRecurringProduct:true,hasNonRecurringProduct:false,primaryPriceDescription:'$0 for 2 months',
        secondaryPriceDescription:'$12.99 / month after',legalDisclaimer:'Free for 2 months, then $12.99 per month after.',
        button:{href:'https://www.spotify.com/us/purchase/offer/trial?country=US'}},
      {planId:'PREMIUM_FAMILY',planIdentifier:'premium-family',header:'Premium Family',
        isRecurringProduct:true,hasNonRecurringProduct:false,primaryPriceDescription:'$21.99 / month',
        legalDisclaimer:'For up to 6 family members residing at the same address.',
        button:{href:'https://www.spotify.com/us/purchase/offer/family?country=US'}},
    ]}}] };
  change(props);
  return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({props:{pageProps:props}})}</script>`;
}
const context = {countryCode:'US',currency:'USD',finalUrl:'https://www.spotify.com/us/premium/'};
const parse = (change, extra={}) => parseSpotifyOfficialHtml(spotifyPage(change),{...context,...extra});

const worldFixtures=JSON.parse(readFileSync(new URL('./fixtures/spotify-world.json',import.meta.url)));
for(const fixture of worldFixtures) test(`official ${fixture.country_code} purchase evidence parses its actual monthly prices`,()=>{
  const market=spotifyMarkets[fixture.country_code];
  const result=parseSpotifyOfficialHtml(`<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:fixture.props}})}</script>`,
    {countryCode:fixture.country_code,currency:market.currency,finalUrl:fixture.source_url});
  assert.equal(result.complete,true,result.issues.join(','));
  assert.deepEqual(result.candidates.map(c=>c.plan_slug),market.plan_slugs);
  assert.deepEqual(result.candidates.map(c=>c.raw_price),fixture.prices);
});
test('world allowlist covers every discovered region or records a distinct unsupported catalog',()=>{
  assert.equal(Object.keys(spotifyMarkets).length,184);
  assert.equal(worldFixtures.length,184);
  assert.equal(Object.values(spotifyMarkets).reduce((n,m)=>n+m.plan_slugs.length,0),363);
  const registry=JSON.parse(readFileSync(new URL('../data/spotify-official-markets.json',import.meta.url)));
  assert.equal(registry.official_region_count,worldFixtures.length+registry.excluded_markets.length);
  assert.deepEqual(registry.excluded_markets,[]);
});
test('Standard and Platinum cannot be relabelled from Individual, Student, Family or another account capacity',()=>{
  for(const code of ['AE','ID','IN','SA','ZA']) {
    const fixture=worldFixtures.find(f=>f.country_code===code),market=spotifyMarkets[code];
    for(const mutate of [
      cards=>cards[0].planId='PREMIUM_INDIVIDUAL',
      cards=>cards[0].planIdentifier='premium-standard_student',
      cards=>cards[0].header='Premium Individual',
      cards=>cards[1].planId='PREMIUM_FAMILY',
      cards=>cards[1].benefits[0].children='Up to 6 Platinum accounts',
      cards=>cards[0].benefits[0].children='3 Standard accounts',
      cards=>cards[0].hasNonRecurringProduct=true,
    ]) {
      const props=structuredClone(fixture.props);mutate(props.components.storefront.plans);
      const result=parseSpotifyOfficialHtml(`<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:props}})}</script>`,
        {countryCode:code,currency:market.currency,finalUrl:fixture.source_url});
      assert.equal(result.complete,false,code);
    }
  }
});
test('localized prices fail closed for annual billing, other currencies, conflicting renewal and malformed amounts',()=>{
  for(const code of ['DE','FR','JP','TW','BR','AR','KR','PT','AE','ID','IN','SA','ZA']) {
    const fixture=worldFixtures.find(f=>f.country_code===code),market=spotifyMarkets[code];
    for(const mutate of [
      p=>p.metadata.country='XX',
      p=>p.components.storefront.plans[0].isRecurringProduct=false,
      p=>p.components.storefront.plans[0].secondaryPriceDescription='999 / year',
      p=>p.components.storefront.plans[0].secondaryPriceDescription='EUR 999 / month',
      p=>{const card=p.components.storefront.plans[0];card.secondaryPriceDescription=(card.secondaryPriceDescription||card.primaryPriceDescription).replace(/\d[\d,.]*/,'1,2,3');},
      p=>{const card=p.components.storefront.plans[0];card.legalDisclaimer=(card.secondaryPriceDescription||card.primaryPriceDescription).replace(/\d[\d,.]*/,'999');},
      p=>p.components.storefront.plans[0].button.href='https://www.spotify.com/us/purchase/?country=US',
    ]) {
      const props=structuredClone(fixture.props);mutate(props);
      const result=parseSpotifyOfficialHtml(`<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:props}})}</script>`,
        {countryCode:code,currency:market.currency,finalUrl:fixture.source_url});
      assert.equal(result.complete,false,code);
    }
  }
});
test('Family 4 cannot replace the canonical six-account Family price',()=>{
  const fixture=worldFixtures.find(f=>f.country_code==='PT'),market=spotifyMarkets.PT;
  for(const mutate of [
    cards=>cards.filter(c=>!c.header.endsWith('6')),
    cards=>cards.map(c=>({...c,benefits:[]})),
    cards=>[...cards,cards.find(c=>c.header.endsWith('6'))],
  ]) {
    const props=structuredClone(fixture.props);props.components.storefront.plans=mutate(props.components.storefront.plans);
    const result=parseSpotifyOfficialHtml(`<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:props}})}</script>`,
      {countryCode:'PT',currency:market.currency,finalUrl:fixture.source_url});
    assert.equal(result.complete,false);
  }
});
test('a missing regional Family is optional only for explicitly allowlisted individual-only markets',()=>{
  const source=JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json',import.meta.url))).sources.spotify;
  const fixture=worldFixtures.find(f=>f.country_code==='KR'),market=source.markets.find(m=>m.country_code==='KR');
  const parser_result=parseSpotifyOfficialHtml(`<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:fixture.props}})}</script>`,
    {countryCode:'KR',currency:market.currency,finalUrl:market.url});
  const snapshot={ok:true,http_status:200,parser_result};
  assert.deepEqual(validateSnapshot(source,market,snapshot),[]);
  assert.ok(validateSnapshot(source,source.markets[0],snapshot).includes('required_plan_set_mismatch'));
  assert.throws(()=>assertAutomaticWebSource({...source,markets:source.markets.map(m=>m.country_code==='KR'?{...m,required_plan_slugs:['individual','family']}:m)}));
});
test('one unavailable country does not discard adjacent snapshots or reorder the US baseline',async()=>{
  const markets=Array.from({length:9},(_,i)=>({country_code:String(i)}));
  let active=0,maxActive=0;
  const outcomes=[];
  for await(const item of collectMarketSnapshots({fetch_mode:'structured_http'},markets,null,async({market})=>{
    active++;maxActive=Math.max(maxActive,active);
    await new Promise(resolve=>setTimeout(resolve,2));active--;
    if(market.country_code==='2') throw Error('network unavailable');
    return market.country_code;
  })) outcomes.push(item);
  assert.equal(maxActive,4);
  assert.deepEqual(outcomes.map(o=>o.market.country_code),markets.map(m=>m.country_code));
  assert.equal(outcomes.filter(o=>o.result.status==='fulfilled').length,8);
  assert.match(outcomes[2].result.reason.message,/unavailable/);
});

test('Spotify parses allowlisted regional recurring prices without treating promotions as prices',()=>{
  for (const [countryCode,currency,path,symbol,individual,family] of [
    ['NG','NGN','ng','₦','1,600','2,500'],
    ['GB','GBP','uk','£','12.99','21.99'],
    ['AU','AUD','au','$','15.99','27.99'],
  ]) {
    const result=parse(p=>{
      p.metadata.country=p.basePageProps.country=countryCode;
      p.metadata.market=p.basePageProps.market=path;
      for (const card of p.components[0].attributes.plans) {
        card.button.href=`https://www.spotify.com/${path}/purchase/offer/test?country=${countryCode}`;
        const amount=card.planId==='PREMIUM_INDIVIDUAL'?individual:family;
        card.secondaryPriceDescription=`${symbol}${amount}/month after`;
        card.legalDisclaimer=`Then ${symbol}${amount} per month.`;
      }
    },{countryCode,currency,finalUrl:`https://www.spotify.com/${path}/premium/`});
    assert.equal(result.complete,true,`${countryCode}: ${result.issues.join(',')}`);
    assert.deepEqual(result.candidates.map(row=>row.raw_price),[Number(individual.replaceAll(',','')),Number(family.replaceAll(',',''))]);
  }
});

test('Spotify maps explicit canonical IDs and regular monthly prices, excluding intro zero', () => {
  const result=parse(); assert.equal(result.complete,true);
  assert.deepEqual(result.candidates.map(x=>[x.plan_slug,x.raw_price,x.billing_cycle]),[['individual',12.99,'monthly'],['family',21.99,'monthly']]);
});
test('Spotify reads named storefront cards without treating benefits comparison as price evidence', () => {
  const result=parse(props=>{
    const cards=props.components[0].attributes.plans;
    props.components={benefitsComparison:{plans:[{planId:'PREMIUM_INDIVIDUAL',primaryPriceDescription:'$1 / month'}]},
      storefront:{plans:cards}};
  });
  assert.equal(result.complete,true,result.issues.join(','));
  assert.deepEqual(result.candidates.map(x=>x.raw_price),[12.99,21.99]);
  assert.equal(parse(props=>{props.components={benefitsComparison:{plans:[]}}}).complete,false);
});
for (const [name,change,extra] of [
  ['wrong market',p=>p.metadata.country='GB'],
  ['redirect',()=>{},{finalUrl:'https://www.spotify.com/gb/premium/'}],
  ['wrong currency',()=>{},{currency:'EUR'}],
  ['annual',p=>p.components[0].attributes.plans[0].secondaryPriceDescription='$120.00 / year'],
  ['missing renewal',p=>p.components[0].attributes.plans[0].secondaryPriceDescription=null],
  ['one-time item',p=>p.components[0].attributes.plans[1].isRecurringProduct=false],
  ['contradictory renewal',p=>p.components[0].attributes.plans[0].legalDisclaimer='Then $15.99 per month'],
  ['missing plan',p=>p.components[0].attributes.plans.pop()],
  ['duplicate plan',p=>p.components[0].attributes.plans.push({...p.components[0].attributes.plans[1]})],
  ['wrong identity',p=>p.components[0].attributes.plans[0].planIdentifier='premium-student'],
  ['wrong purchase country',p=>p.components[0].attributes.plans[0].button.href='https://www.spotify.com/us/purchase/?country=GB'],
]) test(`Spotify rejects ${name}`,()=>assert.equal(parse(change,extra).complete,false));

test('fetch is bounded, refuses redirects, verifies HTML and hashes evidence',async()=>{
  const snapshot=await fetchSpotifyOfficialSnapshot({url:context.finalUrl,country_code:'US',currency:'USD',locale:'en-US'},async(url,options)=>{
    assert.equal(options.redirect,'error');assert.ok(options.signal);
    return new Response(spotifyPage(),{headers:{'content-type':'text/html'}});
  });
  assert.equal(snapshot.parser_result.complete,true);assert.match(snapshot.content_hash,/^[a-f0-9]{64}$/);
  await assert.rejects(fetchSpotifyOfficialSnapshot({url:context.finalUrl,country_code:'US',currency:'USD',locale:'en-US'},async()=>new Response('{}',{headers:{'content-type':'application/json'}})),/unavailable/);
});

const now=new Date('2026-10-22T12:00:00Z');
export function stableSamples(hours=[0,12,24],price=12.99) {
  return hours.map((hour,index)=>({id:`sample${index}`,raw_price:price,currency:'USD',source_level:'A',confidence_score:82,
    status:'pending',evidence_ok:true,anomaly_flag:false,observed_at:new Date(now-hour*3_600_000),
    raw_payload:{publication_eligible:true,billing_cycle:'monthly',automatic_rule:'spotify-regional-monthly-stability-v2',
      requested_country:'US',source_url:context.finalUrl,final_url:context.finalUrl,render_mode:'structured_http'}}));
}
test('three independent observations approve, record supporting IDs, and ignore FX',()=>{
  const result=decideOfficialWebReview(stableSamples(),null,now);
  assert.equal(result.decision,'approved');assert.deepEqual(result.observationIds,['sample0','sample1','sample2']);
});
test('regional review accepts only evidence from its own country and currency',()=>{
  const market={country_code:'NG',currency:'NGN',url:'https://www.spotify.com/ng/premium/'};
  const rows=stableSamples().map(row=>({...row,raw_price:1600,currency:'NGN',
    raw_payload:{...row.raw_payload,requested_country:'NG',source_url:market.url,final_url:market.url}}));
  assert.equal(decideOfficialWebReview(rows,null,now,market).decision,'approved');
  rows[1].raw_payload.requested_country='US';
  assert.equal(decideOfficialWebReview(rows,null,now,market).decision,'isolated');
});
test('retries, duplicate capture times, insufficient span and old evidence never pass',()=>{
  for(const hours of [[0],[0,0,0],[0,1,2],[0,5,24],[50,62,74],[0,12,200]])
    assert.notEqual(decideOfficialWebReview(stableSamples(hours),null,now).decision,'approved',String(hours));
});
test('wrong currency/cycle, missing evidence, anomaly and conflicting sample stay isolated',()=>{
  for(const mutate of [s=>s[1].currency='CAD',s=>s[1].raw_payload.billing_cycle='yearly',
    s=>s[1].evidence_ok=false,s=>s[1].anomaly_flag=true,s=>s[1].raw_price=9,
    s=>s[1].raw_payload.publication_eligible=false,s=>s[1].confidence_score=20]){
    const rows=stableSamples();mutate(rows);assert.equal(decideOfficialWebReview(rows,null,now).decision,'isolated');
  }
});
test('a large real change needs five stable samples over 72h and then recovers automatically',()=>{
  const baseline={local_price:8};
  assert.notEqual(decideOfficialWebReview(stableSamples(),baseline,now).decision,'approved');
  assert.equal(decideOfficialWebReview(stableSamples([0,18,36,54,72]),baseline,now).decision,'approved');
  assert.notEqual(decideOfficialWebReview(stableSamples([0,12,24,36,48]),baseline,now).decision,'approved');
  const scheduled=decideOfficialWebReview(stableSamples([0,12,24,36,48,60,72]),baseline,now);
  assert.equal(scheduled.decision,'approved');assert.equal(scheduled.observationIds.length,7);
});
test('an older anomaly ceases blocking after three newer independent clean samples',()=>{
  const rows=stableSamples([0,12,24,36]);rows[3].anomaly_flag=true;
  assert.equal(decideOfficialWebReview(rows,null,now).decision,'approved');
});
test('only explicitly configured source/product/markets may use automatic Web approval',()=>{
  const config=JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json',import.meta.url)));
  assert.doesNotThrow(()=>assertAutomaticWebSource(config.sources.spotify));
  assert.doesNotThrow(()=>assertAutomaticWebSource(config.sources['apple-music']));
  assert.throws(()=>assertAutomaticWebSource({...config.sources.spotify,product_slug:'chatgpt'}));
});

test('regional publication waits for FX and uses local currency with an existing US baseline',async()=>{
  const source=JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json',import.meta.url))).sources.spotify;
  const market=source.markets.find(item=>item.country_code==='NG');
  const database={product:{id:'product'},plans:new Map([['individual',{id:'individual'}],['family',{id:'family'}]]),
    countries:new Map([['NG',{id:'nigeria'}]])};
  const calls=[];
  const observedAt=new Date(Date.now()-60_000);
  const client={query:async(sql,params=[])=>{
    calls.push({sql,params});
    if(sql.includes('AS product_status')) return {rows:[{product_status:'published',source_status:'active',source_type:'official_page',source_key:source.source_key,base_url:source.base_url}]};
    if(sql.includes('status::text,billing_cycle::text FROM plans')) return {rows:[{status:'published',billing_cycle:'monthly'}]};
    if(sql.includes('FROM region_prices WHERE product_id=')) return {rows:[]};
    if(sql.includes('FROM price_observations o')) {
      const price=params[1]==='individual'?1600:2500;
      return {rows:[0,12,24].map((hours,index)=>({id:`${params[1]}-${index}`,raw_price:price,currency:'NGN',
        observed_at:new Date(observedAt.getTime()-hours*3_600_000),source_level:'A',confidence_score:82,status:'pending',evidence_ok:true,
        raw_payload:{publication_eligible:true,billing_cycle:'monthly',automatic_rule:source.auto_review.rule_id,
          requested_country:'NG',source_url:market.url,final_url:market.url,render_mode:'structured_http',availability_note:'Official NG Web price'}}))};
    }
    if(sql.includes('FROM exchange_rates')) return {rows:client.fxAvailable?[{rate:'1000',rate_date:'2026-10-25'}]:[]};
    if(sql.includes('SELECT price_usd FROM region_prices')) return {rows:client.baselineAvailable?[{price_usd:params[0]==='individual'?'12.99':'21.99'}]:[]};
    if(sql.includes('RETURNING id')) return {rows:[{id:'published-price'}]};
    return {rows:[]};
  },fxAvailable:false,baselineAvailable:false};
  const unavailable=await reviewOfficialWebMarket({client,source,market,database,sourceId:'source'});
  assert.equal(unavailable.published,0);
  assert.equal(unavailable.decisions[0].reason,'current_exchange_rate_missing');
  assert.equal(calls.some(call=>call.sql.includes('INSERT INTO region_prices')),false);
  calls.length=0;client.fxAvailable=true;
  const noBaseline=await reviewOfficialWebMarket({client,source,market,database,sourceId:'source'});
  assert.equal(noBaseline.published,0);
  assert.equal(noBaseline.decisions[0].reason,'published_us_baseline_missing');
  assert.equal(calls.some(call=>call.sql.includes('INSERT INTO region_prices')),false);
  calls.length=0;client.baselineAvailable=true;
  const available=await reviewOfficialWebMarket({client,source,market,database,sourceId:'source'});
  assert.equal(available.published,2);
  const writes=calls.filter(call=>call.sql.includes('INSERT INTO region_prices'));
  assert.equal(writes.length,2);
  assert.deepEqual(writes.map(call=>[call.params[9],call.params[10],call.params[11]]),
    [['NGN',1.6,12.99],['NGN',2.5,21.99]]);
});

test('publication invalidation uses current loopback build and a job-bound HMAC without external credentials',async()=>{
  const job='12345678-1234-4234-8234-123456789abc',secret='b'.repeat(32),calls=[];
  const env={GEOSUB_WEB_RUNTIME_FILE:'/runtime/web.json'};
  const read=file=>file===env.GEOSUB_WEB_RUNTIME_FILE
    ? JSON.stringify({app:'/retained/web/ai-price-site',dist:'.next',healthUrl:'http://127.0.0.1:3002/api/health'})
    : JSON.stringify({preview:{previewModeId:secret}});
  const http=async(url,options)=>{calls.push({url,options});return new Response(null,{status:204});};
  assert.deepEqual(await refreshOfficialWebPublication([job,job],env,http,read),{jobs:1});
  assert.equal(calls.length,1);assert.equal(calls[0].url,'http://127.0.0.1:3002/api/internal/revalidate/collector-success');
  assert.equal(calls[0].options.redirect,'error');
  assert.equal(calls[0].options.headers['x-geosub-collector-publication'],job+'.'+createHmac('sha256',secret).update(`collector-publication-v1:${job}`).digest('hex'));
  assert.deepEqual(JSON.parse(calls[0].options.body),{jobId:job});
  assert.equal(calls[0].options.headers.Authorization,undefined);
  let attempts=0;
  await assert.rejects(refreshOfficialWebPublication([job],env,async()=>{attempts++;throw Error('timeout');},read),/3 attempts/);
  assert.equal(attempts,3);
  await assert.rejects(refreshOfficialWebPublication([job],env,http,()=>JSON.stringify({app:'/web',dist:'.next',healthUrl:'https://outside.test/'})),/Loopback/);
});

// Apple uses the same stability decision, with its own exact source identity.
import {parseAppleMusicOfficialHtml,fetchAppleMusicOfficialSnapshot,appleMusicRule} from './lib/apple-music-official-web.mjs';
const appleConfig=JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json',import.meta.url))).sources['apple-music'];
const appleFixtures=JSON.parse(readFileSync(new URL('./fixtures/apple-music-plans.json',import.meta.url)));
for(const fixture of appleFixtures) test(`Apple Music ${fixture.country_code} real official tile evidence`,()=>{
  const market=appleConfig.markets.find(m=>m.country_code===fixture.country_code);
  const result=parseAppleMusicOfficialHtml(fixture.html,{countryCode:market.country_code,currency:market.currency,finalUrl:market.url});
  assert.equal(result.complete,true,result.issues.join(','));
  const expected={US:[11.99,19.99,6.99],BR:[23.9,40.9,12.9],TR:[89.99,149.99,49.99],JP:[1180,1980,680],DE:[11.99,19.99,6.99]};
  assert.deepEqual(result.candidates.map(c=>c.raw_price),expected[market.country_code]);
  assert.deepEqual(result.candidates.map(c=>c.plan_slug),['individual','family','student']);
});
const appleUs=appleConfig.markets[0];
const appleHtml=appleFixtures[0].html;
for(const [label,change,context] of [
  ['missing plan',h=>h.replace('id="student"','id="apple-one"')],
  ['duplicate plan',h=>h.replace('</section>','<li id="individual"><h3>Individual</h3></li></section>')],
  ['wrong identity',h=>h.replace('>Individual<','>Apple One<')],
  ['annual',h=>h.replace('$11.99/month','$11.99/year')],
  ['trial only',h=>h.replace('$11.99/month','first month free')],
  ['conflicting price',h=>h.replace('$11.99/month','$10.99/month then $11.99/month')],
  ['mixed currency',h=>h.replace('$11.99/month','$11.99/month or €9.99')],
  ['wrong locale',h=>h.replaceAll('en-US','en-GB')],
  ['wrong currency',h=>h,{currency:'EUR'}],
  ['redirected country',h=>h,{finalUrl:'https://www.apple.com/br/apple-music/'}],
]) test(`Apple Music rejects ${label}`,()=>assert.equal(parseAppleMusicOfficialHtml(change(appleHtml),
  {countryCode:'US',currency:'USD',finalUrl:appleUs.url,...context}).complete,false));
test('Apple Music ignores FAQ, Apple One and offer prices outside canonical tiles',()=>{
  const h=appleHtml.replace('</section>','<li id="apple-one"><h3>Apple One</h3><p>$1/month</p></li></section>')+'<section>Individual $99/month, FAQ $0</section>';
  assert.equal(parseAppleMusicOfficialHtml(h,{countryCode:'US',currency:'USD',finalUrl:appleUs.url}).complete,true);
});
test('Apple Music only allowlists its exact five-market source; redirects and failed responses fail closed',async()=>{
  assert.doesNotThrow(()=>assertAutomaticWebSource(appleConfig));
  for(const mutate of [s=>s.source_key='spotify-official-web',s=>s.parser_version='apple-music-official-web-v1',
    s=>s.auto_review.rule_id='spotify-regional-monthly-stability-v2',s=>s.markets[0].currency='EUR',
    s=>s.markets[0].url='https://example.com/apple-music/',s=>s.markets.push({...s.markets[0]})]) {
    const s=structuredClone(appleConfig);mutate(s);assert.throws(()=>assertAutomaticWebSource(s));
  }
  let options;
  const snapshot=await fetchAppleMusicOfficialSnapshot(appleUs,async(url,o)=>{options=o;return new Response(appleHtml,{headers:{'content-type':'text/html'}});});
  assert.equal(options.redirect,'error');assert.equal(snapshot.parser_result.complete,true);assert.equal(snapshot.content_hash.length,64);
  await assert.rejects(fetchAppleMusicOfficialSnapshot({...appleUs,url:'https://example.com/'}),/unsupported_official_url/);
  await assert.rejects(fetchAppleMusicOfficialSnapshot(appleUs,async()=>new Response('',{status:503})),/unavailable/);
  await assert.rejects(fetchAppleMusicOfficialSnapshot(appleUs,async()=>new Response('a'.repeat(2*1024*1024+1),{headers:{'content-type':'text/html'}})),/too_large/);
});
test('Apple Music stability requires independent new-rule evidence, not legacy samples or forced retries',()=>{
  const now=new Date(),samples=[0,12,24].map((hours,i)=>({id:String(i),observed_at:new Date(+now-hours*3600000),raw_price:11.99,
    currency:'USD',status:'pending',source_level:'A',confidence_score:82,evidence_ok:true,
    raw_payload:{billing_cycle:'monthly',publication_eligible:true,automatic_rule:appleMusicRule,requested_country:'US',source_url:appleUs.url,final_url:appleUs.url,render_mode:'structured_http'}}));
  const decide=s=>decideOfficialWebReview(s,null,now,appleUs,appleMusicRule);
  assert.equal(decide(samples).decision,'approved');
  assert.equal(decide(samples.slice(0,2)).decision,'waiting');
  assert.equal(decide(samples.map(s=>({...s,observed_at:now}))).decision,'waiting');
  const old=structuredClone(samples);old[0].raw_payload.automatic_rule=null;assert.equal(decide(old).decision,'isolated');
  const anomaly=structuredClone(samples);anomaly[0].anomaly_flag=true;assert.equal(decide(anomaly).decision,'isolated');
  assert.equal(decideOfficialWebReview(samples,{local_price:5},now,appleUs,appleMusicRule).decision,'waiting');
});
