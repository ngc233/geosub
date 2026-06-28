param(
  [string]$ProductSlug = "chatgpt",
  [string]$PackageName = "com.openai.chatgpt",
  [string[]]$CountryCodes = @("US"),
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

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

function Ensure-GooglePlaySource {
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
    'google-play-chatgpt',
    'Google Play ChatGPT',
    'B'::source_level,
    'google_play'::price_source_type,
    'Google Play',
    'https://play.google.com/store/apps/details?id=$PackageName',
    'https://play.google.com/store/apps/details?id=$PackageName&hl=en_US&gl={country}',
    TRUE,
    FALSE,
    TRUE,
    'low'::risk_level,
    72,
    'active'::source_status,
    'Google Play public product page. Current public page exposes in-app purchase price range, not plan-specific subscription prices.',
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

function Get-GooglePlayPage {
  param([string]$CountryCode)

  $url = "https://play.google.com/store/apps/details?id=$PackageName&hl=en_US&gl=$CountryCode"
  $response = Invoke-WebRequest `
    -Uri $url `
    -UseBasicParsing `
    -TimeoutSec 30 `
    -Headers @{
      "User-Agent" = $userAgent
      "Accept-Language" = "en-US,en;q=0.9"
    }

  return [pscustomobject]@{
    Url = $url
    FinalUrl = [string]$response.BaseResponse.ResponseUri
    StatusCode = [int]$response.StatusCode
    Html = $response.Content
  }
}

function Get-ContentHash {
  param([string]$Content)

  $bytes = [Text.Encoding]::UTF8.GetBytes($Content)
  $hash = [Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
  return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Parse-UsdPriceRange {
  param([string]$Html)

  $decoded = [System.Text.RegularExpressions.Regex]::Unescape($Html)
  $match = [regex]::Match($decoded, '\$(?<min>[0-9][0-9,]*(\.[0-9]+)?)\s*-\s*\$(?<max>[0-9][0-9,]*(\.[0-9]+)?)\s+per item')

  if (!$match.Success) {
    return $null
  }

  return [pscustomobject]@{
    Currency = "USD"
    MinPrice = [decimal]::Parse($match.Groups["min"].Value.Replace(",", ""), [Globalization.CultureInfo]::InvariantCulture)
    MaxPrice = [decimal]::Parse($match.Groups["max"].Value.Replace(",", ""), [Globalization.CultureInfo]::InvariantCulture)
    Text = $match.Value
  }
}

function Insert-RangeEvidence {
  param(
    [string]$ProductId,
    [string]$CountryId,
    [string]$CountryCode,
    [string]$SourceId,
    [object]$Page,
    [object]$Range
  )

  if ($DryRun) {
    Write-Host "[dry-run] $CountryCode Google Play range $($Range.Text). Plan-specific price not available on public page."
    return "dry-run"
  }

  $existing = 0
  if (!$Force) {
    $check = Invoke-PsqlJson @"
SELECT json_build_object('count', COUNT(*)) AS result
FROM price_observations
WHERE product_id = $(Quote-SqlString $ProductId)::uuid
  AND country_id = $(Quote-SqlString $CountryId)::uuid
  AND billing_platform = 'android'::billing_platform
  AND parser_version = 'google-play-iap-range-v1'
  AND observed_at::date = CURRENT_DATE;
"@
    $existing = [int]$check.count
  }

  if ($existing -gt 0) {
    return "skipped"
  }

  $contentHash = Get-ContentHash -Content $Page.Html
  $snippetStart = [Math]::Max(0, $Page.Html.IndexOf($Range.Text) - 500)
  if ($snippetStart -lt 0) { $snippetStart = 0 }
  $snippetLength = [Math]::Min(1200, $Page.Html.Length - $snippetStart)
  $snippet = $Page.Html.Substring($snippetStart, $snippetLength)

  $payload = @{
    observed_price_text = $Range.Text
    min_price = $Range.MinPrice
    max_price = $Range.MaxPrice
    currency = $Range.Currency
    country = $CountryCode
    package_name = $PackageName
    collector = "collect-google-play-prices.ps1"
    parser = "google-play-iap-range-v1"
    note = "Public Google Play page exposes only an in-app purchase price range. It is stored as evidence and is not eligible for auto-approval."
    snippet = $snippet
  }

  $inserted = Invoke-PsqlJson @"
WITH inserted AS (
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
    anomaly_reason,
    status,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    $(Quote-SqlString $ProductId)::uuid,
    NULL,
    $(Quote-SqlString $CountryId)::uuid,
    $(Quote-SqlString $SourceId)::uuid,
    'B'::source_level,
    $($Range.MaxPrice),
    $(Quote-SqlString $Range.Currency),
    $($Range.MaxPrice),
    NOW(),
    $(Quote-SqlString $Page.Url),
    'en-us',
    $(Quote-SqlString $CountryCode),
    'android'::billing_platform,
    'list_price'::price_type,
    'unknown'::tax_included,
    $(Quote-SqlJson $payload),
    'google-play-iap-range-v1',
    55,
    TRUE,
    'Google Play public page shows only an in-app purchase range, not plan-specific subscription prices.',
    'ignored'::observation_status,
    NOW(),
    NOW()
  )
  RETURNING id
)
SELECT row_to_json(inserted) FROM inserted;
"@

  Invoke-Psql @"
INSERT INTO source_evidence (
  id,
  observation_id,
  evidence_type,
  storage_url,
  content_hash,
  captured_at,
  http_status,
  final_url,
  user_agent,
  country_context,
  note,
  created_at
)
VALUES (
  gen_random_uuid(),
  $(Quote-SqlString $inserted.id)::uuid,
  'html'::evidence_type,
  NULL,
  $(Quote-SqlString $contentHash),
  NOW(),
  $($Page.StatusCode),
  $(Quote-SqlString $Page.FinalUrl),
  $(Quote-SqlString $userAgent),
  $(Quote-SqlString $CountryCode),
  'Google Play page evidence for in-app purchase price range.',
  NOW()
);
"@

  return "inserted"
}

$context = Get-ProductContext -Slug $ProductSlug -Countries $CountryCodes
if ($null -eq $context.product) {
  throw "Product '$ProductSlug' not found."
}

$countriesByCode = @{}
foreach ($country in @($context.countries)) {
  $countriesByCode[$country.code.ToUpperInvariant()] = $country
}

$missingCountries = @($CountryCodes | Where-Object { !$countriesByCode.ContainsKey($_.ToUpperInvariant()) })
if ($missingCountries.Count -gt 0) {
  throw "Missing countries in database: $($missingCountries -join ', ')"
}

$sourceId = Ensure-GooglePlaySource
$summary = @{
  inserted = 0
  skipped = 0
  dryRun = 0
  missing = 0
}

foreach ($countryCode in $CountryCodes) {
  $code = $countryCode.ToUpperInvariant()
  $country = $countriesByCode[$code]
  $page = Get-GooglePlayPage -CountryCode $code
  $range = Parse-UsdPriceRange -Html $page.Html

  if ($null -eq $range) {
    Write-Host "No parseable Google Play in-app purchase range found for $code."
    $summary.missing += 1
    continue
  }

  $result = Insert-RangeEvidence `
    -ProductId $context.product.id `
    -CountryId $country.id `
    -CountryCode $code `
    -SourceId $sourceId `
    -Page $page `
    -Range $range

  if ($result -eq "inserted") { $summary.inserted += 1 }
  elseif ($result -eq "skipped") { $summary.skipped += 1 }
  elseif ($result -eq "dry-run") { $summary.dryRun += 1 }
}

Write-Host "Google Play evidence collection complete. Inserted: $($summary.inserted). Skipped: $($summary.skipped). Dry-run: $($summary.dryRun). Missing: $($summary.missing)."
