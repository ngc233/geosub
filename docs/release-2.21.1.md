# 2.21.1 — Apple Music publication artwork gate

Apple Music's automatic publication would expose a product without the reviewed local app icon required by the existing published-product logo gate. The deployed 2.20.0 website's asset registry confirms the missing entry; the local published-product fixture reproduces the failed gate.

Add only Apple Music's verified official Apple Inc. App Store artwork (app 1108187390, bundle com.apple.Music), a local thumbnail and complete provenance/checksum record under the existing owner-approved nominative-identification policy. Include it in the existing explicit artwork-maintenance list so later refreshes retain it. Existing products' image bytes and registry entries remain unchanged. No price, data, layout, cache, SEO or collection rules change.

Website-only patch; the deployed 2.21.0 global collector continues. Standard release/CI/build, actual local asset/logo gate, four representative page states and standard production health checks are required. Database inputs are unchanged, so no migration/backfill or production data change is needed. The retained 2.20.0 website is the rollback target; all registered content-contract files are byte-identical except VERSION, with the exact rollback fingerprint pair recorded.
