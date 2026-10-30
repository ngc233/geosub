# GeoSub 2.23.0 — first SEO expansion

Website release based on the 2.22.0 production commit `ccb66ca6d1bbfd9a21c108c5afafde58a49229cf` and SEO implementation `5111f2c`. The candidate adds up to 42 sitemap URLs across the two existing indexable languages. Sixteen subscription plans for Crunchyroll, Viki, Poe, Kimi, Leonardo AI and Captions contribute 32 URLs. Four eligible country hubs and their directory can contribute another ten. The content and coverage checks are specified in [the SEO policy](SEO_POLICY.md). Gemini's Japan pilot stays in preview.

## Verification and rollout

The pre-release worktree passed the production build, 1,010 unit tests and an HTTP replay of the 42 eligible URLs against restored data. The replay identified all 42 as direct 200 responses with self-referencing canonicals and bilingual alternates. Expired exchange rates removed the ten country URLs from the sitemap and kept their pages noindex in the separate current-time check. Production eligibility depends on fresh evidence and the effective promotion list. Compare the production URL sets before and after the standard website upgrade, recheck the released pages, and track the two groups separately for 14–21 days.

## Compatibility and rollback

There are no SQL or Prisma migration changes in this release. The collector stays on its existing deployment. For the retained website, every contract file was exported from the exact 2.22.0 commit and compared byte for byte with the candidate. Only VERSION differs. The production rollback pair permits the English ChatGPT plain-text target. The two older fixture pairs retain their existing target and fact scopes. Each fixture file was decoded and checked against its SHA-256, and the production contract implementation matched all three forward-to-retained pairs. Reversing the production pair selected the default closed policy.

Record the GitHub CI result and verified deployment attempt separately. Use the standard rolling rollback to the retained 2.22.0 website if the sitemap, indexability or public health checks fail.
