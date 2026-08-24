# Google English ChatGPT Pro 5x metadata experiment

Status: scheduled for production deployment on 2026-08-25

## Why this page

- Google Search Console window: 2026-07-25 through 2026-08-21.
- Page: `/en/ai-pricing/chatgpt/pro-5x`.
- Observed page performance: 184 impressions, 0 clicks, average position 2.38.
- Query visibility is incomplete: 95.5% of site query impressions are hidden by Search Console privacy thresholds.
- The only confirmed query-level cannibalization involved this plan page and the Philippines country page. This is evidence of one overlap, not proof that all country pages should be removed.

## Technical prerequisite

Legacy `?plan=` URLs already return a one-hop `308 Permanent Redirect` to stable plan URLs in production. Verified on 2026-08-25 for:

- `/en/ai-pricing/chatgpt?plan=pro-5x`
- `/en/ai-pricing/claude?plan=max-5x`

The experiment therefore does not change URL structure, canonical tags, robots rules, page body, or structured data.

## Hypothesis

The generic title explains the page topic but gives little reason to click. A title and description that expose the comparison range, reviewed-region count, source context, and analytical dimensions should better communicate what the page adds beyond a search-result price snippet.

## Variant

Only `locale=en`, `product=chatgpt`, `plan=pro-5x` is eligible.

- Title pattern: `ChatGPT Pro 5x Prices: $100–$127 in 39 Regions`
- Description pattern: current exact minimum and maximum App Store prices and countries, followed by reviewed-region count, tax, FX, and affordability coverage.

The values are generated from the same canonical plan dataset as the page. If statistics are unavailable, the experiment is disabled and the normal metadata template is used.

## Measurement

Start date: 2026-08-25. Treat the deployment day as day zero rather than a complete observation day.

Earliest decision date: seven complete settled-data days after Google first recrawls the variant. Do not use the deployment day as a full observation day.

Primary metric:

- Google organic CTR for `/en/ai-pricing/chatgpt/pro-5x`.

Guardrails:

- Impressions and average position must be reviewed alongside CTR.
- Separate ordinary natural-language queries from quoted exact-price verification queries where Search Console exposes them.
- Do not roll the metadata change out to other plan pages during the observation window.
- Do not change this page URL, canonical, robots policy, primary heading, or core body copy during the observation window.

Decision rule:

- Keep and consider a second-page replication if CTR improves without a material loss of impressions or ranking.
- Revert or revise if CTR remains zero after a meaningful impression sample, or if ranking/impressions deteriorate materially.
- Mark the result inconclusive if the settled observation window has too few impressions or recrawl is not confirmed.
