# GeoSub public pricing cache rule

GeoSub sends a short shared-cache policy on canonical public pricing pages:

```text
CDN-Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600
```

Browsers still receive Next.js' no-cache policy. Only the CDN may reuse the HTML,
for at most five minutes before revalidation. Admin pages, API routes, mutation
requests and URLs with query strings are excluded by the application.

Cloudflare does not cache HTML by default. Create one Cache Rule with these
conditions:

```text
Request method is in GET, HEAD
URI Path matches regex ^/(zh|zh-tw|en|ja|ko|es|tr|ar|fr|it|de|pt)/(ai-pricing|streaming-pricing)(/.*)?$
Query String equals ""
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

After deployment, request the same canonical pricing URL twice and inspect its
response headers. The application must expose `CDN-Cache-Control` with
`s-maxage=300`. `CF-Cache-Status` normally moves from `MISS` to `HIT`; `DYNAMIC`
means the request is not eligible for cache, while `BYPASS` usually indicates a
conflicting rule, cookie or origin header.

Rollback is immediate: disable this single Cloudflare Cache Rule. No code or
database rollback is required.

Official references:

- https://developers.cloudflare.com/cache/concepts/cdn-cache-control/
- https://developers.cloudflare.com/cache/concepts/cache-responses/
- https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
