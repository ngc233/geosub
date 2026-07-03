param(
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin"
)

$ErrorActionPreference = "Stop"

function Invoke-PsqlReport {
  param(
    [string]$Title,
    [string]$Sql
  )

  Write-Host ""
  Write-Host "=== $Title ==="

  $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1

  if ($LASTEXITCODE -ne 0) {
    throw "$Title failed with exit code $LASTEXITCODE."
  }
}

Write-Host "GeoSub price integrity audit"
Write-Host "Checks public App Store prices, active anomalies, and cross-country outliers."

Invoke-PsqlReport -Title "Active anomalous observations" -Sql @"
SELECT
  product.slug AS product,
  plan.slug AS plan,
  country.code AS country,
  COUNT(*) FILTER (WHERE observation.status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE observation.status = 'approved') AS approved
FROM price_observations observation
JOIN products product ON product.id = observation.product_id
JOIN plans plan ON plan.id = observation.plan_id
JOIN countries country ON country.id = observation.country_id
WHERE observation.billing_platform = 'ios'
  AND COALESCE(observation.anomaly_flag, FALSE) = TRUE
  AND observation.status IN ('pending', 'approved')
GROUP BY product.slug, plan.slug, country.code
ORDER BY pending DESC, approved DESC, product.slug, plan.slug, country.code
LIMIT 80;
"@

Invoke-PsqlReport -Title "Published prices linked to active anomalies" -Sql @"
WITH promoted AS (
  SELECT
    observation.raw_payload ->> 'promoted_region_price_id' AS region_price_id,
    BOOL_OR(observation.status IN ('pending', 'approved') AND COALESCE(observation.anomaly_flag, FALSE)) AS has_active_anomaly
  FROM price_observations observation
  WHERE observation.raw_payload ? 'promoted_region_price_id'
  GROUP BY observation.raw_payload ->> 'promoted_region_price_id'
)
SELECT
  product.slug AS product,
  plan.slug AS plan,
  country.code AS country,
  region_price.local_price,
  region_price.currency,
  region_price.price_usd,
  region_price.status
FROM region_prices region_price
JOIN promoted ON promoted.region_price_id = region_price.id::text
JOIN products product ON product.id = region_price.product_id
JOIN plans plan ON plan.id = region_price.plan_id
JOIN countries country ON country.id = region_price.country_id
WHERE region_price.billing_platform = 'ios'
  AND region_price.status = 'published'
  AND promoted.has_active_anomaly = TRUE
ORDER BY product.slug, plan.slug, country.code;
"@

Invoke-PsqlReport -Title "Published prices matching historical anomalous observations" -Sql @"
SELECT
  product.slug AS product,
  plan.slug AS plan,
  country.code AS country,
  region_price.local_price,
  region_price.currency,
  region_price.price_usd,
  COUNT(*) AS matching_anomalies,
  MAX(observation.observed_at)::DATE AS latest_anomaly_date,
  COUNT(clean_observation.id) AS clean_confirmations,
  CASE
    WHEN COUNT(clean_observation.id) > 0 THEN 'clean-confirmed'
    ELSE 'needs-repair-or-hide'
  END AS risk_state
FROM region_prices region_price
JOIN price_observations observation
  ON observation.product_id = region_price.product_id
 AND observation.plan_id = region_price.plan_id
 AND observation.country_id = region_price.country_id
 AND observation.billing_platform = region_price.billing_platform
 AND observation.price_type = region_price.price_type
 AND observation.currency IS NOT DISTINCT FROM region_price.currency
 AND observation.raw_price IS NOT DISTINCT FROM region_price.local_price
 AND observation.converted_usd IS NOT NULL
 AND ABS(observation.converted_usd - region_price.price_usd) <= GREATEST(0.01, region_price.price_usd * 0.02)
LEFT JOIN price_observations clean_observation
  ON clean_observation.product_id = region_price.product_id
 AND clean_observation.plan_id = region_price.plan_id
 AND clean_observation.country_id = region_price.country_id
 AND clean_observation.billing_platform = region_price.billing_platform
 AND clean_observation.price_type = region_price.price_type
 AND clean_observation.currency IS NOT DISTINCT FROM region_price.currency
 AND clean_observation.raw_price IS NOT DISTINCT FROM region_price.local_price
 AND clean_observation.converted_usd IS NOT NULL
 AND ABS(clean_observation.converted_usd - region_price.price_usd) <= GREATEST(0.01, region_price.price_usd * 0.02)
 AND COALESCE(clean_observation.anomaly_flag, FALSE) = FALSE
 AND clean_observation.observed_at >= NOW() - INTERVAL '30 days'
JOIN products product ON product.id = region_price.product_id
JOIN plans plan ON plan.id = region_price.plan_id
JOIN countries country ON country.id = region_price.country_id
WHERE region_price.billing_platform = 'ios'
  AND region_price.status = 'published'
  AND COALESCE(observation.anomaly_flag, FALSE) = TRUE
GROUP BY
  product.slug,
  plan.slug,
  country.code,
  region_price.local_price,
  region_price.currency,
  region_price.price_usd
ORDER BY risk_state DESC, latest_anomaly_date DESC, matching_anomalies DESC, product.slug, plan.slug, country.code
LIMIT 80;
"@

Invoke-PsqlReport -Title "Published global price outliers" -Sql @"
WITH published AS (
  SELECT
    region_price.*,
    product.slug AS product,
    plan.slug AS plan,
    country.code AS country
  FROM region_prices region_price
  JOIN products product ON product.id = region_price.product_id
  JOIN plans plan ON plan.id = region_price.plan_id
  JOIN countries country ON country.id = region_price.country_id
  WHERE region_price.status = 'published'
    AND region_price.billing_platform = 'ios'
    AND region_price.price_usd IS NOT NULL
    AND region_price.price_usd >= 1
),
stats AS (
  SELECT
    product_id,
    plan_id,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY price_usd)::numeric AS median_usd,
    COUNT(*) AS region_count
  FROM published
  GROUP BY product_id, plan_id
  HAVING COUNT(*) >= 8
)
SELECT
  published.product,
  published.plan,
  published.country,
  published.local_price,
  published.currency,
  published.price_usd,
  ROUND(stats.median_usd, 2) AS median_usd,
  ROUND((published.price_usd / NULLIF(stats.median_usd, 0)), 2) AS median_ratio
FROM published
JOIN stats
  ON stats.product_id = published.product_id
 AND stats.plan_id = published.plan_id
WHERE published.price_usd < stats.median_usd * 0.2
   OR published.price_usd > stats.median_usd * 3.5
ORDER BY published.product, published.plan, median_ratio DESC
LIMIT 80;
"@

Invoke-PsqlReport -Title "Published plan ranges" -Sql @"
SELECT
  product.slug AS product,
  plan.slug AS plan,
  COUNT(*) AS prices,
  ROUND(MIN(region_price.price_usd), 2) AS min_usd,
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY region_price.price_usd)::numeric, 2) AS median_usd,
  ROUND(MAX(region_price.price_usd), 2) AS max_usd
FROM region_prices region_price
JOIN products product ON product.id = region_price.product_id
JOIN plans plan ON plan.id = region_price.plan_id
WHERE region_price.status = 'published'
  AND region_price.billing_platform = 'ios'
  AND region_price.price_usd IS NOT NULL
GROUP BY product.slug, plan.slug
ORDER BY product.slug, plan.slug;
"@

Write-Host ""
Write-Host "Price integrity audit complete."
