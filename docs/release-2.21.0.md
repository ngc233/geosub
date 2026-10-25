# 2.21.0 — Apple Music global official Web coverage

Expand the Apple Music automatic pipeline from the original five markets to all 172 markets in Apple's current availability inventory, covering 458 actual monthly Individual/Family/Student plan-market combinations. Fifty-eight markets have no Student offer and publish their available two-plan group atomically. The original five HTML identities and genuine v2 samples are retained.

New markets use Apple's anonymous Web subscription-offers response, bound to the reviewed country storefront, canonical product ID/type, P1M renewal, actual charge currency and evidence hash. Trial prices are excluded. JSON evidence retains its actual endpoint separately from the public country URL. Independent-sample, stability, freshness, FX and US-baseline gates are unchanged. The existing job's schedule is preserved during configuration expansion.

Scope: collector and Apple-specific configuration only; no schema/migrations, default-country currency changes, iOS changes, website redesign, index promotion or unrelated job changes. Collector deployment requires CI, equal database inputs, a fresh verified standard backup before the separate idempotent job configuration transaction, and live dry-run/scheduled result checks. Website deployment is unnecessary for unchanged runtime inputs. Standard retained collector rollback is available; published prices and evidence are retained. Public completion is only claimed after real stable samples and page/report verification, not upon deployment.

Validation and deployment outcomes are recorded in the task's private evidence and final operator report; this document describes the candidate behavior.
