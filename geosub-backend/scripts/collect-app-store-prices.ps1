param(
  [string]$ProductSlug = "chatgpt",
  [string]$AppId = "6448311069",
  [string]$AppStoreUrl,
  [string[]]$CountryCodes = @("ALL"),
  [string[]]$ExcludedCountryCodes = @("CN"),
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [string]$ChromePath = $env:CHROME_PATH,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ChromePath)) {
  if ($IsLinux) {
    foreach ($candidate in @("/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/usr/bin/microsoft-edge")) {
      if (Test-Path -LiteralPath $candidate) {
        $ChromePath = $candidate
        break
      }
    }
  } else {
    foreach ($candidate in @("C:\Program Files\Google\Chrome\Application\chrome.exe", "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")) {
      if (Test-Path -LiteralPath $candidate) {
        $ChromePath = $candidate
        break
      }
    }
  }
}

$CountryCodes = @(
  $CountryCodes |
    ForEach-Object { $_ -split "," } |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ }
)

$ExcludedCountryCodes = @(
  $ExcludedCountryCodes |
    ForEach-Object { $_ -split "," } |
    ForEach-Object { $_.Trim().ToUpperInvariant() } |
    Where-Object { $_ }
)

$CollectAllCountries = $CountryCodes.Count -eq 0 -or @($CountryCodes | Where-Object { $_.ToUpperInvariant() -in @("ALL", "*") }).Count -gt 0

function Quote-SqlString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return "'" + $Value.Replace("'", "''") + "'"
}

function Normalize-Slug {
  param([string]$Value)

  $slug = $Value.Trim().ToLowerInvariant()
  $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
  $slug = [regex]::Replace($slug, "^-+|-+$", "")
  $slug = [regex]::Replace($slug, "-+", "-")

  if ([string]::IsNullOrWhiteSpace($slug)) {
    return "plan"
  }

  return $slug
}

function Get-PlanSlugFromItemName {
  param(
    [string]$ItemName,
    [string]$ProductName
  )

  $clean = $ItemName
  if (![string]::IsNullOrWhiteSpace($ProductName)) {
    $clean = [regex]::Replace($clean, [regex]::Escape($ProductName), "", "IgnoreCase").Trim()
  }

  $clean = [regex]::Replace($clean, "\b(subscription|monthly|month|annual|yearly|year)\b", "", "IgnoreCase").Trim()
  $clean = [regex]::Replace($clean, "\s+", " ").Trim()

  if ([string]::IsNullOrWhiteSpace($clean)) {
    $clean = $ItemName
  }

  if ($clean -match "(?i)\bplus\b") { return "plus" }
  if ($clean -match "(?i)\bpro\b" -and $clean -notmatch "(?i)\bpro\s*[0-9]+x\b") { return "pro" }
  if ($clean -match "(?i)\bteam\b") { return "team" }
  if ($clean -match "(?i)\bbasic\b") { return "basic" }
  if ($clean -match "(?i)\bpremium\b") { return "premium" }
  if ($clean -match "(?i)\bstandard\b") { return "standard" }

  return Normalize-Slug -Value $clean
}

function Should-IgnoreInAppPurchase {
  param([string]$ItemName)

  if ([string]::IsNullOrWhiteSpace($ItemName)) {
    return $true
  }

  $normalized = $ItemName.Trim()

  if ($normalized -match "(?i)\b(credit|credits|coin|coins|token|tokens|point|points|pack|bundle|top[- ]?up|one[- ]?time)\b") {
    return $true
  }

  # App Store IAP lists sometimes mix subscription plans with standalone storage tiers
  # such as "30 GB" or "100 GB". Keep real plan names like "Google AI Pro (5 TB)".
  if ($normalized -match "(?i)^\d+(?:\.\d+)?\s?(?:gb|tb|gib|tib|t)$") {
    return $true
  }

  return $false
}

function Get-AppStoreUrl {
  param(
    [string]$CountryCode,
    [string]$AppleAppId,
    [AllowNull()][string]$ConfiguredUrl
  )

  $storefront = $CountryCode.ToLowerInvariant()

  if (![string]::IsNullOrWhiteSpace($ConfiguredUrl)) {
    $normalized = $ConfiguredUrl.Trim()
    $normalized = [regex]::Replace(
      $normalized,
      "apps\.apple\.com/[a-z]{2}/",
      "apps.apple.com/$storefront/",
      [Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
    if ($normalized -notmatch "/id$AppleAppId(\?|$)") {
      return "https://apps.apple.com/$storefront/app/id$AppleAppId"
    }
    return $normalized
  }

  return "https://apps.apple.com/$storefront/app/id$AppleAppId"
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

function Get-AppStoreHtml {
  param(
    [string]$CountryCode,
    [string]$AppleAppId,
    [AllowNull()][string]$ConfiguredUrl
  )

  $url = Get-AppStoreUrl -CountryCode $CountryCode -AppleAppId $AppleAppId -ConfiguredUrl $ConfiguredUrl
  $response = Invoke-WebRequest `
    -Uri $url `
    -UseBasicParsing `
    -TimeoutSec 30 `
    -Headers @{
      "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
      "Accept-Language" = "en-US,en;q=0.9"
    }

  return [pscustomobject]@{
    Url = $url
    Html = $response.Content
  }
}

function Get-AppStoreRenderedPage {
  param(
    [string]$CountryCode,
    [string]$AppleAppId,
    [AllowNull()][string]$ConfiguredUrl
  )

  $scriptPath = Join-Path $PSScriptRoot "render-app-store-prices.mjs"
  $renderArgs = @(
    $scriptPath,
    "--country", $CountryCode,
    "--app-id", $AppleAppId,
    "--chrome-path", $ChromePath
  )

  if (![string]::IsNullOrWhiteSpace($ConfiguredUrl)) {
    $renderArgs += @("--url", $ConfiguredUrl)
  }

  $output = node @renderArgs

  if ($LASTEXITCODE -ne 0) {
    throw "Browser-rendered App Store collection failed with exit code $LASTEXITCODE."
  }

  $result = ($output -join "").Trim() | ConvertFrom-Json

  $items = @($result.items | ForEach-Object {
    [pscustomobject]@{
      Name = [string]$_.name
      PriceText = [string]$_.priceText
    }
  })

  return [pscustomobject]@{
    Url = [string]$result.url
    FinalUrl = [string]$result.finalUrl
    Status = $result.status
    Items = $items
    Ok = [bool]$result.ok
    ParserVersion = "app-store-rendered-iap-v1"
    CollectorName = "collect-app-store-prices.ps1/render-app-store-prices.mjs"
    CapturedAt = [string]$result.capturedAt
  }
}

function Parse-PriceNumber {
  param([string]$PriceText)

  $normalized = [System.Net.WebUtility]::HtmlDecode($PriceText)
  $normalized = $normalized -replace "[\u00A0\u202F]", " "
  $numberText = [regex]::Match($normalized, "[0-9][0-9\s.,]*").Value.Trim()

  if ([string]::IsNullOrWhiteSpace($numberText)) {
    return $null
  }

  $lowerText = $normalized.ToLowerInvariant()
  $multiplier = [decimal]1
  if ($lowerText -match "ribu") {
    $multiplier = [decimal]1000
  } elseif ($lowerText -match "juta") {
    $multiplier = [decimal]1000000
  }

  $numberText = [regex]::Replace($numberText, "\s+", " ")
  $lastDot = $numberText.LastIndexOf(".")
  $lastComma = $numberText.LastIndexOf(",")
  $decimalSeparator = $null

  if ($multiplier -gt 1 -and $lastComma -ge 0 -and $lastDot -lt 0) {
    $decimalSeparator = ","
  } elseif ($multiplier -gt 1 -and $lastDot -ge 0 -and $lastComma -lt 0) {
    $decimalSeparator = "."
  } elseif ($lastDot -ge 0 -and $lastComma -ge 0) {
    $decimalSeparator = if ($lastDot -gt $lastComma) { "." } else { "," }
  } elseif ($lastDot -ge 0) {
    $digitsAfter = $numberText.Length - $lastDot - 1
    if ($digitsAfter -gt 0 -and $digitsAfter -le 2) {
      $decimalSeparator = "."
    }
  } elseif ($lastComma -ge 0) {
    $digitsAfter = $numberText.Length - $lastComma - 1
    if ($digitsAfter -gt 0 -and $digitsAfter -le 2) {
      $decimalSeparator = ","
    }
  }

  if ($null -eq $decimalSeparator) {
    $numberText = $numberText.Replace(" ", "").Replace(".", "").Replace(",", "")
  } elseif ($decimalSeparator -eq ".") {
    $numberText = $numberText.Replace(" ", "").Replace(",", "")
  } else {
    $numberText = $numberText.Replace(" ", "").Replace(".", "").Replace(",", ".")
  }

  $parsed = [decimal]::Parse(
    $numberText,
    [Globalization.CultureInfo]::InvariantCulture
  )

  return $parsed * $multiplier
}

function Get-ObservedCurrency {
  param(
    [string]$PriceText,
    [string]$FallbackCurrency
  )

  $normalized = [System.Net.WebUtility]::HtmlDecode($PriceText).ToUpperInvariant()

  if ($normalized -match '\bUSD\b|US\$') {
    return "USD"
  }

  if ($normalized -match '\bEUR\b') {
    return "EUR"
  }

  if ($normalized -match '\bGBP\b') {
    return "GBP"
  }

  return $FallbackCurrency
}

function Format-ObservedPriceText {
  param(
    [string]$Currency,
    [decimal]$Price
  )

  $digits = if ($Currency -in @("JPY", "KRW", "VND")) { 0 } else { 2 }

  return "$Currency " + $Price.ToString(
    "N$digits",
    [Globalization.CultureInfo]::InvariantCulture
  )
}

function Get-InAppPurchases {
  param([string]$Html)

  $pattern = '<div class="text-pair[^"]*">\s*<span>(?<name>.*?)</span>\s*<span>(?<price>.*?)</span>'
  $matches = [regex]::Matches(
    $Html,
    $pattern,
    [Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [Text.RegularExpressions.RegexOptions]::Singleline
  )

  $items = @()
  foreach ($match in $matches) {
    $items += [pscustomobject]@{
      Name = [System.Net.WebUtility]::HtmlDecode($match.Groups["name"].Value.Trim())
      PriceText = [System.Net.WebUtility]::HtmlDecode($match.Groups["price"].Value.Trim())
    }
  }

  return $items
}

function Get-UsdRates {
  param([string[]]$Currencies)

  $quotes = @($Currencies | Where-Object { $_ -and $_ -ne "USD" } | Select-Object -Unique)
  $rates = @{ USD = 1.0 }
  $rateDate = (Get-Date).ToString("yyyy-MM-dd")

  if ($quotes.Count -gt 0) {
    $quoteList = ($quotes -join ",")
    $url = "https://api.frankfurter.app/latest?from=USD&to=$quoteList"
    try {
      $response = Invoke-RestMethod -Uri $url -TimeoutSec 30
      $rateDate = [string]$response.date

      foreach ($quote in $quotes) {
        if ($response.rates.PSObject.Properties.Name -contains $quote) {
          $rates[$quote] = [decimal]$response.rates.$quote
        }
      }
    } catch {
      Write-Warning "Frankfurter FX lookup failed: $($_.Exception.Message)"
    }

    $missingQuotes = @($quotes | Where-Object { !$rates.ContainsKey($_) })
    if ($missingQuotes.Count -gt 0) {
      try {
        $fallbackResponse = Invoke-RestMethod -Uri "https://open.er-api.com/v6/latest/USD" -TimeoutSec 30
        if ($fallbackResponse.time_last_update_utc) {
          $parsedDate = [datetime]::Parse([string]$fallbackResponse.time_last_update_utc)
          $rateDate = $parsedDate.ToString("yyyy-MM-dd")
        }

        foreach ($quote in $missingQuotes) {
          if ($fallbackResponse.rates.PSObject.Properties.Name -contains $quote) {
            $rates[$quote] = [decimal]$fallbackResponse.rates.$quote
          }
        }
      } catch {
        Write-Warning "Fallback FX lookup failed: $($_.Exception.Message)"
      }
    }

    $stillMissing = @($quotes | Where-Object { !$rates.ContainsKey($_) })
    if ($stillMissing.Count -gt 0) {
      throw "Missing FX rates for currencies: $($stillMissing -join ', ')."
    }
  }

  return [pscustomobject]@{
    Rates = $rates
    RateDate = $rateDate
  }
}

function Ensure-AppStoreSource {
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
    'apple-app-store',
    'Apple App Store',
    'A'::source_level,
    'app_store'::price_source_type,
    'Apple',
    'https://apps.apple.com/',
    'https://apps.apple.com/{country}/app/id$AppId',
    FALSE,
    FALSE,
    TRUE,
    'low'::risk_level,
    88,
    'active'::source_status,
    'Official Apple App Store public product page. In-app purchase prices are parsed from storefront HTML.',
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

function Ensure-Plan {
  param(
    [string]$ProductId,
    [string]$ProductName,
    [string]$ItemName,
    [hashtable]$PlansBySlug,
    [int]$SortOrder
  )

  $planSlug = Get-PlanSlugFromItemName -ItemName $ItemName -ProductName $ProductName

  if ($planSlug -eq "pro-20x" -and $PlansBySlug.ContainsKey("pro")) {
    $planSlug = "pro"
  }

  if ($PlansBySlug.ContainsKey($planSlug)) {
    $plan = $PlansBySlug[$planSlug]

    Invoke-Psql @"
UPDATE plans
SET
  name = $(Quote-SqlString $ItemName),
  status = 'published'::publish_status,
  sort_order = LEAST(sort_order, $SortOrder),
  updated_at = NOW()
WHERE id = $(Quote-SqlString $plan.id)::uuid;
"@

    $plan.name = $ItemName
    return $plan
  }

  $plan = Invoke-PsqlJson @"
WITH existing AS (
  SELECT id, slug, name
  FROM plans
  WHERE product_id = $(Quote-SqlString $ProductId)::uuid
    AND LOWER(name) = LOWER($(Quote-SqlString $ItemName))
  LIMIT 1
),
upserted AS (
  INSERT INTO plans (
    id,
    product_id,
    slug,
    name,
    billing_cycle,
    status,
    sort_order,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    $(Quote-SqlString $ProductId)::uuid,
    $(Quote-SqlString $planSlug),
    $(Quote-SqlString $ItemName),
    'monthly'::billing_cycle,
    'published'::publish_status,
    $SortOrder,
    NOW(),
    NOW()
  WHERE NOT EXISTS (SELECT 1 FROM existing)
  ON CONFLICT (product_id, slug)
  DO UPDATE SET
    name = EXCLUDED.name,
    status = 'published'::publish_status,
    sort_order = LEAST(plans.sort_order, EXCLUDED.sort_order),
    updated_at = NOW()
  RETURNING id, slug, name
),
selected AS (
  SELECT * FROM existing
  UNION ALL
  SELECT * FROM upserted
  LIMIT 1
)
SELECT row_to_json(selected) FROM selected;
"@

  $PlansBySlug[$plan.slug] = $plan
  Write-Host "Matched App Store item to plan: $ItemName -> $($plan.slug)"
  return $plan
}

function Get-ProductContext {
  param([string]$Slug, [string[]]$Countries)

  $countryWhereSql = ""
  $excludedArray = "ARRAY[" + (($ExcludedCountryCodes | ForEach-Object { Quote-SqlString $_.ToUpperInvariant() }) -join ",") + "]::text[]"

  if ($CollectAllCountries) {
    $countryWhereSql = "WHERE UPPER(code) <> ALL($excludedArray)"
  } else {
    $countryArray = "ARRAY[" + (($Countries | ForEach-Object { Quote-SqlString $_.ToUpperInvariant() }) -join ",") + "]::text[]"
    $countryWhereSql = "WHERE UPPER(code) = ANY($countryArray)"
  }

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
      $countryWhereSql
      ORDER BY sort_order NULLS LAST, code
    ) countries
  ), '[]'::json)
) AS context;
"@
}

function Insert-Observation {
  param(
    [string]$ProductId,
    [string]$PlanId,
    [string]$CountryId,
    [string]$SourceId,
    [string]$CountryCode,
    [string]$Currency,
    [decimal]$RawPrice,
    [decimal]$ConvertedUsd,
    [decimal]$FxRateToUsd,
    [string]$FxRateDate,
    [string]$SourceUrl,
    [string]$ObservedPriceText,
    [string]$ItemName,
    [object]$RawSnapshot,
    [string]$ParserVersion = "app-store-html-iap-v1",
    [string]$CollectorName = "collect-app-store-prices.ps1"
  )

  if ($DryRun) {
    Write-Host "[dry-run] $CountryCode $ItemName $ObservedPriceText -> USD $ConvertedUsd via $ParserVersion"
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
  AND billing_platform = 'ios'::billing_platform
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
    observed_price_text = $ObservedPriceText
    item_name = $ItemName
    app_store_country = $CountryCode
    fx_rate_to_usd = $FxRateToUsd
    fx_rate_date = $FxRateDate
    collector = $CollectorName
    parser = $ParserVersion
    raw_snapshot = $RawSnapshot
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
  $ConvertedUsd,
  NOW(),
  $(Quote-SqlString $SourceUrl),
  $(Quote-SqlString $CountryCode.ToLowerInvariant()),
  $(Quote-SqlString $CountryCode),
  'ios'::billing_platform,
  'list_price'::price_type,
  'unknown'::tax_included,
  $(Quote-SqlJson $payload),
  $(Quote-SqlString $ParserVersion),
  82,
  FALSE,
  'pending'::observation_status,
  NOW(),
  NOW()
);
"@

  return "inserted"
}

function Get-AvailabilityStatusFromError {
  param([string]$Message)

  if ($Message -match "(?i)\b(404|410|not found|not available|country or region)\b") {
    return "not_available"
  }

  if ($Message -match "(?i)\b(403|429|captcha|forbidden|rate limit|blocked)\b") {
    return "blocked"
  }

  return "unknown_error"
}

function Record-AppStoreAvailability {
  param(
    [string]$ProductId,
    [string]$SourceId,
    [string]$CountryId,
    [string]$CountryCode,
    [string]$Status,
    [AllowNull()][string]$SourceUrl,
    [AllowNull()][string]$FinalUrl,
    [AllowNull()][object]$HttpStatus,
    [int]$ItemCount,
    [int]$SubscriptionItemCount,
    [int]$IgnoredItemCount,
    [AllowNull()][string]$Reason,
    [object]$RawPayload
  )

  if ($DryRun) {
    Write-Host "[dry-run] availability $CountryCode $Status items=$ItemCount subscriptions=$SubscriptionItemCount ignored=$IgnoredItemCount $Reason"
    return
  }

  $httpStatusSql = "NULL"
  if ($null -ne $HttpStatus -and "$HttpStatus" -match "^\d+$") {
    $httpStatusSql = [string][int]$HttpStatus
  }

  Invoke-Psql @"
INSERT INTO app_store_availability_checks (
  id,
  product_id,
  source_id,
  country_id,
  billing_platform,
  status,
  app_store_id,
  storefront,
  source_url,
  final_url,
  http_status,
  item_count,
  subscription_item_count,
  ignored_item_count,
  reason,
  raw_payload,
  checked_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  $(Quote-SqlString $ProductId)::uuid,
  $(Quote-SqlString $SourceId)::uuid,
  $(Quote-SqlString $CountryId)::uuid,
  'ios'::billing_platform,
  $(Quote-SqlString $Status),
  $(Quote-SqlString $AppId),
  $(Quote-SqlString $CountryCode),
  $(Quote-SqlString $SourceUrl),
  $(Quote-SqlString $FinalUrl),
  $httpStatusSql,
  $ItemCount,
  $SubscriptionItemCount,
  $IgnoredItemCount,
  $(Quote-SqlString $Reason),
  $(Quote-SqlJson $RawPayload),
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (product_id, country_id, billing_platform)
DO UPDATE SET
  source_id = EXCLUDED.source_id,
  status = EXCLUDED.status,
  app_store_id = EXCLUDED.app_store_id,
  storefront = EXCLUDED.storefront,
  source_url = EXCLUDED.source_url,
  final_url = EXCLUDED.final_url,
  http_status = EXCLUDED.http_status,
  item_count = EXCLUDED.item_count,
  subscription_item_count = EXCLUDED.subscription_item_count,
  ignored_item_count = EXCLUDED.ignored_item_count,
  reason = EXCLUDED.reason,
  raw_payload = EXCLUDED.raw_payload,
  checked_at = EXCLUDED.checked_at,
  updated_at = NOW();
"@
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

if ($CollectAllCountries) {
  $CountryCodes = @($context.countries | ForEach-Object { $_.code.ToUpperInvariant() })
  Write-Host "App Store country mode: ALL. Countries from database: $($CountryCodes.Count). Excluded: $($ExcludedCountryCodes -join ',')."
} else {
  $missingCountries = @($CountryCodes | Where-Object { !$countriesByCode.ContainsKey($_.ToUpperInvariant()) })
  if ($missingCountries.Count -gt 0) {
    throw "Missing countries in database: $($missingCountries -join ', ')"
  }
}

$sourceId = Ensure-AppStoreSource
$currencies = @($countriesByCode.Values | ForEach-Object { $_.currency.ToUpperInvariant() } | Select-Object -Unique)
$usdRates = Get-UsdRates -Currencies $currencies

$summary = @{
  inserted = 0
  skipped = 0
  dryRun = 0
  missing = 0
  availability = 0
}

foreach ($countryCode in $CountryCodes) {
  $code = $countryCode.ToUpperInvariant()
  $country = $countriesByCode[$code]
  $currency = $country.currency.ToUpperInvariant()
  $usdToCurrency = [decimal]$usdRates.Rates[$currency]

  if ($usdToCurrency -le 0) {
    throw "Missing FX rate USD -> $currency."
  }

  $parserVersion = "app-store-html-iap-v1"
  $collectorName = "collect-app-store-prices.ps1"
  $page = $null
  $items = @()

  try {
    $page = Get-AppStoreHtml -CountryCode $code -AppleAppId $AppId -ConfiguredUrl $AppStoreUrl
    $items = @(Get-InAppPurchases -Html $page.Html)

    if ($items.Count -eq 0) {
      throw "No in-app purchases found in static App Store HTML."
    }
  } catch {
    Write-Host "Static App Store collection failed for $code. Falling back to browser rendering."
    Write-Host $_.Exception.Message

    try {
      $renderedPage = Get-AppStoreRenderedPage -CountryCode $code -AppleAppId $AppId -ConfiguredUrl $AppStoreUrl
    } catch {
      $message = $_.Exception.Message
      $status = Get-AvailabilityStatusFromError -Message $message
      Write-Host "App Store availability check failed for ${code}: $message"
      Record-AppStoreAvailability `
        -ProductId $context.product.id `
        -SourceId $sourceId `
        -CountryId $country.id `
        -CountryCode $code `
        -Status $status `
        -SourceUrl (Get-AppStoreUrl -CountryCode $code -AppleAppId $AppId -ConfiguredUrl $AppStoreUrl) `
        -FinalUrl $null `
        -HttpStatus $null `
        -ItemCount 0 `
        -SubscriptionItemCount 0 `
        -IgnoredItemCount 0 `
        -Reason $message `
        -RawPayload @{
          country = $code
          appStoreId = $AppId
          configuredUrl = $AppStoreUrl
          collector = "collect-app-store-prices.ps1/render-app-store-prices.mjs"
          error = $message
        }
      $summary.availability += 1
      continue
    }

    $page = [pscustomobject]@{
      Url = $renderedPage.Url
      FinalUrl = $renderedPage.FinalUrl
      Status = $renderedPage.Status
    }
    $items = @($renderedPage.Items)
    $parserVersion = $renderedPage.ParserVersion
    $collectorName = $renderedPage.CollectorName
  }

  $selectedItemsBySlug = @{}
  $ignoredItemCount = 0
  foreach ($item in $items) {
    if (Should-IgnoreInAppPurchase -ItemName $item.Name) {
      Write-Host "Ignoring non-subscription App Store item: $code $($item.Name)"
      $ignoredItemCount += 1
      continue
    }

    $observedCurrency = Get-ObservedCurrency -PriceText $item.PriceText -FallbackCurrency $currency
    $rawPrice = Parse-PriceNumber -PriceText $item.PriceText
    if ($null -eq $rawPrice) {
      Write-Host "Could not parse price: $code $($item.Name) $($item.PriceText)"
      $summary.missing += 1
      continue
    }

    $planSlug = Get-PlanSlugFromItemName -ItemName $item.Name -ProductName $context.product.name
    if (
      !$selectedItemsBySlug.ContainsKey($planSlug) -or
      $rawPrice -lt [decimal]$selectedItemsBySlug[$planSlug].RawPrice
    ) {
      $selectedItemsBySlug[$planSlug] = [pscustomobject]@{
        Item = $item
        RawPrice = $rawPrice
        Currency = $observedCurrency
      }
    }
  }

  $subscriptionItemCount = $selectedItemsBySlug.Count
  $availabilityStatus = "available_with_prices"
  $availabilityReason = "App Store page is available and subscription prices were parsed."

  if ($items.Count -eq 0) {
    $availabilityStatus = "available_no_iap"
    $availabilityReason = "App Store page is available, but no in-app purchase items were found."
  } elseif ($subscriptionItemCount -eq 0) {
    $availabilityStatus = "available_no_iap"
    $availabilityReason = "App Store in-app purchases were found, but none looked like recurring subscription prices."
  }

  Record-AppStoreAvailability `
    -ProductId $context.product.id `
    -SourceId $sourceId `
    -CountryId $country.id `
    -CountryCode $code `
    -Status $availabilityStatus `
    -SourceUrl $page.Url `
    -FinalUrl $page.FinalUrl `
    -HttpStatus $page.Status `
    -ItemCount $items.Count `
    -SubscriptionItemCount $subscriptionItemCount `
    -IgnoredItemCount $ignoredItemCount `
    -Reason $availabilityReason `
    -RawPayload @{
      country = $code
      appStoreId = $AppId
      sourceUrl = $page.Url
      finalUrl = $page.FinalUrl
      httpStatus = $page.Status
      itemCount = $items.Count
      subscriptionItemCount = $subscriptionItemCount
      ignoredItemCount = $ignoredItemCount
      collector = $collectorName
      parser = $parserVersion
      items = $items
    }
  $summary.availability += 1

  if ($subscriptionItemCount -eq 0) {
    Write-Host "No subscription App Store prices found for $code. Availability recorded as $availabilityStatus."
    continue
  }

  $planSortOrder = 10
  foreach ($entry in @($selectedItemsBySlug.Values | Sort-Object RawPrice)) {
    $item = $entry.Item
    $rawPrice = [decimal]$entry.RawPrice
    $observedCurrency = [string]$entry.Currency
    $plan = Ensure-Plan `
      -ProductId $context.product.id `
      -ProductName $context.product.name `
      -ItemName $item.Name `
      -PlansBySlug $plansBySlug `
      -SortOrder $planSortOrder
    $planSortOrder += 10

    if ($observedCurrency -eq "USD") {
      $convertedUsd = [math]::Round($rawPrice, 2)
      $fxRateToUsd = [decimal]1
    } else {
      $observedUsdToCurrency = if ($observedCurrency -eq $currency) {
        $usdToCurrency
      } else {
        [decimal]$usdRates.Rates[$observedCurrency]
      }

      if ($observedUsdToCurrency -le 0) {
        throw "Missing FX rate USD -> $observedCurrency."
      }

      $convertedUsd = [math]::Round(($rawPrice / $observedUsdToCurrency), 2)
      $fxRateToUsd = [math]::Round((1 / $observedUsdToCurrency), 8)
    }

    $observedPriceText = Format-ObservedPriceText -Currency $observedCurrency -Price $rawPrice
    $rawSnapshot = @{
      country = $code
      sourceUrl = $page.Url
      inAppPurchases = $items
      originalObservedPriceText = $item.PriceText
      observedCurrency = $observedCurrency
      usdToCurrency = $usdToCurrency
      fxProvider = "frankfurter"
      parserVersion = $parserVersion
    }

    $result = Insert-Observation `
      -ProductId $context.product.id `
      -PlanId $plan.id `
      -CountryId $country.id `
      -SourceId $sourceId `
      -CountryCode $code `
      -Currency $observedCurrency `
      -RawPrice $rawPrice `
      -ConvertedUsd $convertedUsd `
      -FxRateToUsd $fxRateToUsd `
      -FxRateDate $usdRates.RateDate `
      -SourceUrl $page.Url `
      -ObservedPriceText $observedPriceText `
      -ItemName $item.Name `
      -RawSnapshot $rawSnapshot `
      -ParserVersion $parserVersion `
      -CollectorName $collectorName

    if ($result -eq "inserted") { $summary.inserted += 1 }
    elseif ($result -eq "skipped") { $summary.skipped += 1 }
    elseif ($result -eq "dry-run") { $summary.dryRun += 1 }
  }
}

Write-Host "App Store collection complete. Inserted: $($summary.inserted). Skipped: $($summary.skipped). Dry-run: $($summary.dryRun). Missing: $($summary.missing). Availability checks: $($summary.availability)."
