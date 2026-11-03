import assert from "node:assert/strict";
import test from "node:test";
import {usesUnifiedPublicStyle} from "./public-style-rollout.ts";

test("Chinese public pages and recovery states share approved style while other locales, admin and RSS remain isolated",()=>{
  for(const path of ["/zh/ai-pricing/claude/pro","/zh/streaming-pricing/netflix/premium/","/zh/streaming-pricing/spotify/platinum","/zh/streaming-pricing/goodshort/weekly-vip"])
    assert(usesUnifiedPublicStyle(path),path);
  assert(usesUnifiedPublicStyle("/zh/ai-pricing/chatgpt/regions/turkey"));
  assert(usesUnifiedPublicStyle("/zh/streaming-pricing/netflix/regions/india"));
  assert(usesUnifiedPublicStyle("/zh/price-records/10000000-0000-4000-8000-000000000001"));
  assert(usesUnifiedPublicStyle("/zh/price-records/not-a-record"));
  assert(usesUnifiedPublicStyle("/zh/tools/codex-reset"));
  assert(usesUnifiedPublicStyle("/style-preview/codex-reset"));
  for(const path of ["/zh/about","/zh/contact","/zh/privacy","/zh/terms","/zh/tools/currency-converter","/zh/tools/currency-converter/usd-cny"])
    assert(usesUnifiedPublicStyle(path),path);
  assert(usesUnifiedPublicStyle("/zh/tools/codex-reset/extra"));
  for(const path of ["/en/tools/codex-reset","/zh/tools/codex-reset/rss.xml"])
    assert.equal(usesUnifiedPublicStyle(path),false,path);
  for(const path of ["/zh/ai-pricing/chatgpt/regions/turkey/extra","/zh/price-records/id/extra","/zh/price-records","/zh/contact/extra","/zh/tools/currency-converter/usd-cny/extra","/zh/not-a-public-page","/zh/vpn"])
    assert(usesUnifiedPublicStyle(path),path+" recovery presentation must not publish this route");
  for(const path of ["/en/ai-pricing/claude/pro","/en/ai-pricing/chatgpt/regions/turkey","/en/price-records/10000000-0000-4000-8000-000000000001","/en/tools/currency-converter","/en/about","/admin/products","/admin-login"])
    assert.equal(usesUnifiedPublicStyle(path),false,path);
});
