import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_PRICING_SHARED_CACHE_CONTROL,
  shouldCachePublicPricingResponse,
} from "./public-response-cache.ts";

function request(method: string, pathname: string, search = "") {
  return {
    method,
    headers: new Headers(),
    nextUrl: {
      pathname,
      search,
    },
  } as never;
}

test("shared pricing cache accepts only canonical public GET and HEAD routes", () => {
  assert.equal(
    shouldCachePublicPricingResponse(request("GET", "/zh/ai-pricing")),
    true,
  );
  assert.equal(
    shouldCachePublicPricingResponse(
      request("HEAD", "/en/streaming-pricing/netflix/premium"),
    ),
    true,
  );
  assert.equal(
    shouldCachePublicPricingResponse(request("POST", "/zh/ai-pricing")),
    false,
  );
  assert.equal(
    shouldCachePublicPricingResponse(
      request("GET", "/zh/ai-pricing/chatgpt", "?plan=plus"),
    ),
    false,
  );
  assert.equal(
    shouldCachePublicPricingResponse(request("GET", "/admin/prices")),
    false,
  );
  assert.equal(
    shouldCachePublicPricingResponse(request("GET", "/api/events")),
    false,
  );
});

test("shared pricing cache keeps browsers fresh and bounds shared staleness", () => {
  assert.match(PUBLIC_PRICING_SHARED_CACHE_CONTROL, /max-age=0/);
  assert.match(PUBLIC_PRICING_SHARED_CACHE_CONTROL, /s-maxage=300/);
  assert.match(
    PUBLIC_PRICING_SHARED_CACHE_CONTROL,
    /stale-while-revalidate=600/,
  );
});


test("managed content RSC and prefetch requests never share the HTML cache key", () => {
  for (const header of ["rsc", "next-router-state-tree", "next-router-prefetch"]) {
    const input = {method:"GET",nextUrl:{pathname:"/en/ai-pricing/chatgpt",search:""},headers:new Headers({[header]:"1"})};
    assert.equal(shouldCachePublicPricingResponse(input as never),false);
  }
  assert.equal(shouldCachePublicPricingResponse(request("GET","/en/ai-pricing/chatgpt")),true);
  assert.equal(shouldCachePublicPricingResponse(request("GET","/en/ai-pricing/chatgpt","?_rsc=test")),false);
});
