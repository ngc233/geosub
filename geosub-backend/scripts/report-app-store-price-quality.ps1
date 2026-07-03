param(
  [string]$ProductSlug = "chatgpt",
  [int]$RecentDays = 7,
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin"
)

$ErrorActionPreference = "Stop"

function Quote-SqlString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return "'" + $Value.Replace("'", "''") + "'"
}

function Invoke-PsqlReport {
  param([string]$Title, [string]$Sql)

  Write-Host ""
  Write-Host "=== $Title ==="

  $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1

  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed with exit code $LASTEXITCODE."
  }
}

$productSql = Quote-SqlString $ProductSlug

Write-Host "App Store price quality report"
Write-Host "Product: $ProductSlug"
Write-Host "Recent window: $RecentDays day(s)"

Invoke-PsqlReport -Title "Configured Plans" -Sql @"
SELECT
  product.slug AS product,
  plan.slug AS plan,
  plan.name,
  plan.sort_order,
  plan.status
FROM plans plan
JOIN products product ON product.id = plan.product_id
WHERE product.slug = $productSql
ORDER BY plan.sort_order, plan.slug;
"@

Invoke-PsqlReport -Title "Recent Observation Coverage" -Sql @"
WITH latest_observations AS (
  SELECT DISTINCT ON (observation.plan_id, observation.country_id)
    observation.*
  FROM price_observations observation
  JOIN products product ON product.id = observation.product_id
  WHERE product.slug = $productSql
    AND observation.billing_platform = 'ios'
    AND observation.observed_at >= NOW() - MAKE_INTERVAL(days => $RecentDays)
  ORDER BY observation.plan_id, observation.country_id, observation.observed_at DESC, observation.created_at DESC
)
SELECT
  plan.slug AS plan,
  COUNT(*) AS observations,
  COUNT(DISTINCT country.code) AS countries,
  COUNT(*) FILTER (WHERE latest_observations.status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE latest_observations.status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE COALESCE(latest_observations.anomaly_flag, FALSE)) AS anomalies,
  ROUND(MIN(latest_observations.converted_usd), 2) AS min_usd,
  ROUND(MAX(latest_observations.converted_usd), 2) AS max_usd,
  MAX(latest_observations.observed_at) AS latest_observed_at
FROM latest_observations
JOIN plans plan ON plan.id = latest_observations.plan_id
JOIN countries country ON country.id = latest_observations.country_id
GROUP BY plan.slug, plan.sort_order
ORDER BY plan.sort_order, plan.slug;
"@

Invoke-PsqlReport -Title "Pending Review Reasons" -Sql @"
SELECT
  COALESCE(
    observation.raw_payload ->> 'auto_review_reason_code',
    CASE WHEN COALESCE(observation.anomaly_flag, FALSE) THEN 'collector_anomaly' ELSE 'pending_no_decision' END
  ) AS reason,
  COUNT(*) AS observations,
  COUNT(DISTINCT country.code) AS countries
FROM price_observations observation
JOIN products product ON product.id = observation.product_id
JOIN countries country ON country.id = observation.country_id
WHERE product.slug = $productSql
  AND observation.billing_platform = 'ios'
  AND observation.status = 'pending'
GROUP BY reason
ORDER BY observations DESC, reason;
"@

Invoke-PsqlReport -Title "Recent Collector Anomalies" -Sql @"
WITH latest_observations AS (
  SELECT DISTINCT ON (observation.plan_id, observation.country_id)
    observation.*
  FROM price_observations observation
  JOIN products product ON product.id = observation.product_id
  WHERE product.slug = $productSql
    AND observation.billing_platform = 'ios'
    AND observation.observed_at >= NOW() - MAKE_INTERVAL(days => $RecentDays)
  ORDER BY observation.plan_id, observation.country_id, observation.observed_at DESC, observation.created_at DESC
)
SELECT
  plan.slug AS plan,
  country.code AS country,
  latest_observations.currency,
  latest_observations.raw_price,
  ROUND(latest_observations.converted_usd, 2) AS usd,
  latest_observations.anomaly_reason,
  latest_observations.observed_at
FROM latest_observations
JOIN plans plan ON plan.id = latest_observations.plan_id
JOIN countries country ON country.id = latest_observations.country_id
WHERE COALESCE(latest_observations.anomaly_flag, FALSE)
ORDER BY latest_observations.observed_at DESC
LIMIT 25;
"@

Invoke-PsqlReport -Title "Published Coverage" -Sql @"
SELECT
  plan.slug AS plan,
  COUNT(*) AS published_prices,
  COUNT(DISTINCT country.code) AS countries,
  MAX(region_price.last_checked_at) AS latest_checked_at
FROM region_prices region_price
JOIN products product ON product.id = region_price.product_id
JOIN plans plan ON plan.id = region_price.plan_id
JOIN countries country ON country.id = region_price.country_id
WHERE product.slug = $productSql
  AND region_price.billing_platform = 'ios'
  AND region_price.status = 'published'
GROUP BY plan.slug, plan.sort_order
ORDER BY plan.sort_order, plan.slug;
"@
