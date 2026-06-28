param(
  [string]$ProductSlug = "chatgpt",
  [string[]]$CountryCodes = @("US"),
  [string]$PricingUrl = "https://chatgpt.com/pricing",
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$webPlanPrices = @(
  @{
    PlanSlug = "plus"
    PlanName = "ChatGPT Plus"
    Currency = "USD"
    RawPrice = [decimal]20.00
    BillingCycle = "monthly"
  },
  @{
    PlanSlug = "pro"
    PlanName = "ChatGPT Pro"
    Currency = "USD"
    RawPrice = [decimal]200.00
    BillingCycle = "monthly"
  }
)

function Quote-SqlString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return "'" + $Value.Replace("'", "''") + "'"
}

function Quote-SqlJson {
  param([object]$Value)

  $json = $Value | ConvertTo-Json -Depth 20 -Compress
  return (Quote-SqlString $json) + "::jsonb"
}

function Invoke-Psql {
  param([string]$Sql)

  $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed with exit code $LASTEXITCODE."
  }
}

function Invoke-PsqlJson {
  param([string]$Sql)

  $result = $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q `
    -t `
    -A

  $text = ($result -join "").Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  return $text | ConvertFrom-Json
}

function Ensure-WebSource {
  $source = Invoke-PsqlJson @"
WITH upserted AS (
  INSERT INTO price_sources (
    id,
    source_key,
    name,
    source_level,
    type,
    provider,
    base_url,
    country_url_pattern,
    requires_javascript,
    requires_account,
    requires_geo,
    terms_risk,
    reliability_score,
    status,
    note,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    'openai-chatgpt-web-pricing',
    'OpenAI ChatGPT Web Pricing',
    'A'::source_level,
    'official_page'::price_source_type,
    'OpenAI',
    $(Quote-SqlString $PricingUrl),
    $(Quote-SqlString $PricingUrl),
    TRUE,
    FALSE,
    FALSE,
    'low'::risk_level,
    90,
    'active'::source_status,
    'Official ChatGPT pricing page. The first collector version records configured official USD monthly web prices because the public page is dynamically rendered.',
    NOW(),
    NOW()
  )
  ON CONFLICT (source_key)
  DO UPDATE SET
    name = EXCLUDED.name,
    source_level = EXCLUDED.source_level,
    type = EXCLUDED.type,
    provider = EXCLUDED.provider,
    base_url = EXCLUDED.base_url,
    country_url_pattern = EXCLUDED.country_url_pattern,
    reliability_score = EXCLUDED.reliability_score,
    status = 'active'::source_status,
    note = EXCLUDED.note,
    updated_at = NOW()
  RETURNING id
)
SELECT row_to_json(upserted) FROM upserted;
"@

  return [string]$source.id
}

function Get-ProductContext {
  param([string]$Slug, [string[]]$Countries)

  $countryArray = "ARRAY[" + (($Countries | ForEach-Object { Quote-SqlString $_.ToUpperInvariant() }) -join ",") + "]::text[]"

  return Invoke-PsqlJson @"
SELECT json_build_object(
  'product', (
    SELECT row_to_json(p)
    FROM (
      SELECT id, slug, name
      FROM products
      WHERE slug = $(Quote-SqlString $Slug)
      LIMIT 1
    ) p
  ),
  'plans', COALESCE((
    SELECT json_agg(row_to_json(plans))
    FROM (
      SELECT id, slug, name
      FROM plans
      WHERE product_id = (SELECT id FROM products WHERE slug = $(Quote-SqlString $Slug) LIMIT 1)
    ) plans
  ), '[]'::json),
  'countries', COALESCE((
    SELECT json_agg(row_to_json(countries))
    FROM (
      SELECT id, code, currency
      FROM countries
      WHERE UPPER(code) = ANY($countryArray)
    ) countries
  ), '[]'::json)
) AS context;
"@
}

function Test-PricingPage {
  try {
    $response = Invoke-WebRequest -Uri $PricingUrl -UseBasicParsing -TimeoutSec 30
    return [pscustomobject]@{
      ok = $true
      statusCode = [int]$response.StatusCode
      finalUrl = [string]$response.BaseResponse.ResponseUri
      contentLength = [int]$response.Content.Length
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      statusCode = $null
      finalUrl = $PricingUrl
      error = $_.Exception.Message
    }
  }
}

function Format-ObservedPriceText {
  param(
    [string]$Currency,
    [decimal]$Price
  )

  return "$Currency " + $Price.ToString("N2", [Globalization.CultureInfo]::InvariantCulture)
}

function Insert-Observation {
  param(
    [string]$ProductId,
    [string]$PlanId,
    [string]$CountryId,
    [string]$SourceId,
    [string]$CountryCode,
    [string]$PlanName,
    [string]$Currency,
    [decimal]$RawPrice,
    [string]$SourceUrl,
    [object]$PageCheck
  )

  $observedPriceText = Format-ObservedPriceText -Currency $Currency -Price $RawPrice

  if ($DryRun) {
    Write-Host "[dry-run] $CountryCode $PlanName $observedPriceText -> USD $RawPrice"
    return "dry-run"
  }

  $existing = 0
  if (!$Force) {
    $check = Invoke-PsqlJson @"
SELECT json_build_object('count', COUNT(*)) AS result
FROM price_observations
WHERE product_id = $(Quote-SqlString $ProductId)::uuid
  AND plan_id = $(Quote-SqlString $PlanId)::uuid
  AND country_id = $(Quote-SqlString $CountryId)::uuid
  AND billing_platform = 'web'::billing_platform
  AND status = 'pending'::observation_status
  AND raw_price = $RawPrice
  AND currency = $(Quote-SqlString $Currency)
  AND observed_at::date = CURRENT_DATE;
"@
    $existing = [int]$check.count
  }

  if ($existing -gt 0) {
    return "skipped"
  }

  $payload = @{
    observed_price_text = $observedPriceText
    plan_name = $PlanName
    country = $CountryCode
    collector = "collect-web-prices.ps1"
    parser = "official-web-config-v1"
    pricing_url = $SourceUrl
    page_check = $PageCheck
    note = "Configured official web USD monthly price. Upgrade path: browser-rendered and geo-aware collector."
  }

  Invoke-Psql @"
INSERT INTO price_observations (
  id,
  product_id,
  plan_id,
  country_id,
  source_id,
  source_level,
  raw_price,
  currency,
  converted_usd,
  observed_at,
  source_url,
  locale,
  ip_country,
  billing_platform,
  price_type,
  tax_included,
  raw_payload,
  parser_version,
  confidence_score,
  anomaly_flag,
  status,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  $(Quote-SqlString $ProductId)::uuid,
  $(Quote-SqlString $PlanId)::uuid,
  $(Quote-SqlString $CountryId)::uuid,
  $(Quote-SqlString $SourceId)::uuid,
  'A'::source_level,
  $RawPrice,
  $(Quote-SqlString $Currency),
  $RawPrice,
  NOW(),
  $(Quote-SqlString $SourceUrl),
  'en-us',
  $(Quote-SqlString $CountryCode),
  'web'::billing_platform,
  'list_price'::price_type,
  'unknown'::tax_included,
  $(Quote-SqlJson $payload),
  'official-web-config-v1',
  84,
  FALSE,
  'pending'::observation_status,
  NOW(),
  NOW()
);
"@

  return "inserted"
}

$context = Get-ProductContext -Slug $ProductSlug -Countries $CountryCodes
if ($null -eq $context.product) {
  throw "Product '$ProductSlug' not found."
}

$plansBySlug = @{}
foreach ($plan in @($context.plans)) {
  $plansBySlug[$plan.slug] = $plan
}

$countriesByCode = @{}
foreach ($country in @($context.countries)) {
  $countriesByCode[$country.code.ToUpperInvariant()] = $country
}

$missingCountries = @($CountryCodes | Where-Object { !$countriesByCode.ContainsKey($_.ToUpperInvariant()) })
if ($missingCountries.Count -gt 0) {
  throw "Missing countries in database: $($missingCountries -join ', ')"
}

$sourceId = Ensure-WebSource
$pageCheck = Test-PricingPage

$summary = @{
  inserted = 0
  skipped = 0
  dryRun = 0
  missing = 0
}

foreach ($countryCode in $CountryCodes) {
  $code = $countryCode.ToUpperInvariant()
  $country = $countriesByCode[$code]

  foreach ($price in $webPlanPrices) {
    $plan = $plansBySlug[$price.PlanSlug]
    if ($null -eq $plan) {
      Write-Host "Missing plan in database: $($price.PlanSlug)"
      $summary.missing += 1
      continue
    }

    $result = Insert-Observation `
      -ProductId $context.product.id `
      -PlanId $plan.id `
      -CountryId $country.id `
      -SourceId $sourceId `
      -CountryCode $code `
      -PlanName $price.PlanName `
      -Currency $price.Currency `
      -RawPrice $price.RawPrice `
      -SourceUrl $PricingUrl `
      -PageCheck $pageCheck

    if ($result -eq "inserted") { $summary.inserted += 1 }
    elseif ($result -eq "skipped") { $summary.skipped += 1 }
    elseif ($result -eq "dry-run") { $summary.dryRun += 1 }
  }
}

Write-Host "Web collection complete. Inserted: $($summary.inserted). Skipped: $($summary.skipped). Dry-run: $($summary.dryRun). Missing: $($summary.missing)."
