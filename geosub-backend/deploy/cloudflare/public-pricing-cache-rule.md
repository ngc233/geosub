# GeoSub public pricing cache rule

GeoSub sends a short shared-cache policy on canonical public pricing pages:

```text
CDN-Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600
```

Browsers still receive Next.js' no-cache policy. Only the CDN may reuse the HTML,
for at most five minutes before revalidation. Admin pages, API routes, mutation
requests and URLs with query strings are excluded by the application.

Cloudflare does not cache HTML by default. GeoSub's Cloudflare zone currently
uses the Free plan, where the Rules language `matches` regular-expression
operator is unavailable. Create one Cache Rule with the Free-compatible
expression below. The explicit root-path set prevents category-prefix matches,
while the wildcard clauses admit only descendants of those canonical roots.

```rules
(http.request.method in {"GET" "HEAD"} and
 http.request.uri.query eq "" and
 (
   http.request.uri.path in {
     "/zh/ai-pricing" "/zh/streaming-pricing"
     "/zh-tw/ai-pricing" "/zh-tw/streaming-pricing"
     "/en/ai-pricing" "/en/streaming-pricing"
     "/ja/ai-pricing" "/ja/streaming-pricing"
     "/ko/ai-pricing" "/ko/streaming-pricing"
     "/es/ai-pricing" "/es/streaming-pricing"
     "/tr/ai-pricing" "/tr/streaming-pricing"
     "/ar/ai-pricing" "/ar/streaming-pricing"
     "/fr/ai-pricing" "/fr/streaming-pricing"
     "/it/ai-pricing" "/it/streaming-pricing"
     "/de/ai-pricing" "/de/streaming-pricing"
     "/pt/ai-pricing" "/pt/streaming-pricing"
   } or
   http.request.uri.path wildcard "/zh/ai-pricing/*" or
   http.request.uri.path wildcard "/zh/streaming-pricing/*" or
   http.request.uri.path wildcard "/zh-tw/ai-pricing/*" or
   http.request.uri.path wildcard "/zh-tw/streaming-pricing/*" or
   http.request.uri.path wildcard "/en/ai-pricing/*" or
   http.request.uri.path wildcard "/en/streaming-pricing/*" or
   http.request.uri.path wildcard "/ja/ai-pricing/*" or
   http.request.uri.path wildcard "/ja/streaming-pricing/*" or
   http.request.uri.path wildcard "/ko/ai-pricing/*" or
   http.request.uri.path wildcard "/ko/streaming-pricing/*" or
   http.request.uri.path wildcard "/es/ai-pricing/*" or
   http.request.uri.path wildcard "/es/streaming-pricing/*" or
   http.request.uri.path wildcard "/tr/ai-pricing/*" or
   http.request.uri.path wildcard "/tr/streaming-pricing/*" or
   http.request.uri.path wildcard "/ar/ai-pricing/*" or
   http.request.uri.path wildcard "/ar/streaming-pricing/*" or
   http.request.uri.path wildcard "/fr/ai-pricing/*" or
   http.request.uri.path wildcard "/fr/streaming-pricing/*" or
   http.request.uri.path wildcard "/it/ai-pricing/*" or
   http.request.uri.path wildcard "/it/streaming-pricing/*" or
   http.request.uri.path wildcard "/de/ai-pricing/*" or
   http.request.uri.path wildcard "/de/streaming-pricing/*" or
   http.request.uri.path wildcard "/pt/ai-pricing/*" or
   http.request.uri.path wildcard "/pt/streaming-pricing/*"
 ))
```

Use these settings:

```text
Cache eligibility: Eligible for cache
Edge TTL: Use cache-control header if present
Browser TTL: Respect existing headers
Cache key: Default
```

Keep `/admin`, `/admin-login`, `/api` and any URL with a query string outside
this rule. Do not add a catch-all HTML cache rule.

After enabling the rule, request the same canonical pricing URL twice from the
same client and inspect its response headers. The application must expose
`CDN-Cache-Control` with `s-maxage=300`, and `CF-Cache-Status` must move from
`MISS` to `HIT` (or already be `HIT`). Then verify that a pricing URL with a
query string and representative `/admin`, `/admin-login` and `/api` URLs remain
outside this rule. `DYNAMIC` means the request is not eligible for cache, while
`BYPASS` usually indicates a conflicting rule, cookie or origin header.

Rollback is immediate: disable this single Cloudflare Cache Rule. No code or
database rollback is required.

Official references:

- https://developers.cloudflare.com/cache/concepts/cdn-cache-control/
- https://developers.cloudflare.com/cache/concepts/cache-responses/
- https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
- https://developers.cloudflare.com/ruleset-engine/rules-language/operators/
