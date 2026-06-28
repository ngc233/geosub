param(
  [string]$ProductSlug = "chatgpt",
  [string]$AppId = "6448311069",
  [string[]]$CountryCodes = @("US", "CA", "JP", "PH"),
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

$planMatchers = @(
  @{
    PlanSlug = "plus"
    ItemName = "ChatGPT Plus"
    Match = { param($name, $priceText) $name -eq "ChatGPT Plus" -and $priceText -notmatch "200" }
  },
  @{
    PlanSlug = "pro"
    ItemName = "ChatGPT Pro 20x"
    Match = { param($name, $priceText) $name -eq "ChatGPT Pro 20x" }
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

function Get-AppStoreHtml {
  param(
    [string]$CountryCode,
    [string]$AppleAppId
  )

  $storefront = $CountryCode.ToLowerInvariant()
  $url = "https://apps.apple.com/$storefront/app/chatgpt/id$AppleAppId"
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
    [string]$AppleAppId
  )

  $scriptPath = Join-Path $PSScriptRoot "render-app-store-prices.mjs"
  $output = node $scriptPath `
    --country $CountryCode `
    --app-id $AppleAppId `
    --chrome-path $ChromePath

  if ($LASTEXITCODE -ne 0) {
    throw "Browser-rendered App Store collection failed with exit code $LASTEXITCODE."
  }

  $result = ($output -join "").Trim() | ConvertFrom-Json
  if (!$result.ok) {
    throw "Browser-rendered App Store collection did not find in-app purchases for $CountryCode."
  }

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
    ParserVersion = "app-store-rendered-iap-v1"
    CollectorName = "collect-app-store-prices.ps1/render-app-store-prices.mjs"
    CapturedAt = [string]$result.capturedAt
  }
}

function Parse-PriceNumber {
  param([string]$PriceText)

  $normalized = [System.Net.WebUtility]::HtmlDecode($PriceText)
  $numberText = [regex]::Match($normalized, "[0-9][0-9,]*(\.[0-9]+)?").Value

  if ([string]::IsNullOrWhiteSpace($numberText)) {
    return $null
  }

  return [decimal]::Parse(
    $numberText.Replace(",", ""),
    [Globalization.CultureInfo]::InvariantCulture
  )
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
    $response = Invoke-RestMethod -Uri $url -TimeoutSec 30
    $rateDate = [string]$response.date

    foreach ($quote in $quotes) {
      $rates[$quote] = [decimal]$response.rates.$quote
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
    'https://apps.apple.com/{country}/app/chatgpt/id$AppId',
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

$sourceId = Ensure-AppStoreSource
$currencies = @($countriesByCode.Values | ForEach-Object { $_.currency.ToUpperInvariant() } | Select-Object -Unique)
$usdRates = Get-UsdRates -Currencies $currencies

$summary = @{
  inserted = 0
  skipped = 0
  dryRun = 0
  missing = 0
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

  try {
    $page = Get-AppStoreHtml -CountryCode $code -AppleAppId $AppId
    $items = @(Get-InAppPurchases -Html $page.Html)

    if ($items.Count -eq 0) {
      throw "No in-app purchases found in static App Store HTML."
    }
  } catch {
    Write-Host "Static App Store collection failed for $code. Falling back to browser rendering."
    Write-Host $_.Exception.Message

    $renderedPage = Get-AppStoreRenderedPage -CountryCode $code -AppleAppId $AppId
    $page = [pscustomobject]@{
      Url = $renderedPage.Url
      FinalUrl = $renderedPage.FinalUrl
      Status = $renderedPage.Status
    }
    $items = @($renderedPage.Items)
    $parserVersion = $renderedPage.ParserVersion
    $collectorName = $renderedPage.CollectorName
  }

  foreach ($matcher in $planMatchers) {
    $plan = $plansBySlug[$matcher.PlanSlug]
    if ($null -eq $plan) {
      throw "Plan '$($matcher.PlanSlug)' not found."
    }

    $item = $items | Where-Object { & $matcher.Match $_.Name $_.PriceText } | Select-Object -First 1

    if ($null -eq $item) {
      Write-Host "Missing App Store item: $code $($matcher.ItemName)"
      $summary.missing += 1
      continue
    }

    $rawPrice = Parse-PriceNumber -PriceText $item.PriceText
    if ($null -eq $rawPrice) {
      Write-Host "Could not parse price: $code $($item.Name) $($item.PriceText)"
      $summary.missing += 1
      continue
    }

    $convertedUsd = [math]::Round(($rawPrice / $usdToCurrency), 2)
    $fxRateToUsd = [math]::Round((1 / $usdToCurrency), 8)
    $observedPriceText = Format-ObservedPriceText -Currency $currency -Price $rawPrice
    $rawSnapshot = @{
      country = $code
      sourceUrl = $page.Url
      inAppPurchases = $items
      originalObservedPriceText = $item.PriceText
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
      -Currency $currency `
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

Write-Host "App Store collection complete. Inserted: $($summary.inserted). Skipped: $($summary.skipped). Dry-run: $($summary.dryRun). Missing: $($summary.missing)."
