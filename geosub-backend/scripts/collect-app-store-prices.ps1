param(
  [string]$ProductSlug = "chatgpt",
  [string]$AppId,
  [string]$AppStoreUrl,
  [string[]]$CountryCodes = @("DEFAULT"),
  [string[]]$ExcludedCountryCodes = @("CN", "HK"),
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
$DefaultAppStoreCountryCodes = @(
  "US", "CA", "MX", "BR", "AR", "CL", "CO",
  "GB", "DE", "FR", "ES", "IT", "NL", "SE", "NO", "DK", "CH", "PL", "TR",
  "JP", "KR", "TW", "SG", "MY", "TH", "ID", "PH", "VN", "IN", "PK",
  "AU", "NZ", "AE", "SA", "IL", "ZA", "EG", "NG", "KE"
)
$CollectDefaultCountries = -not $CollectAllCountries -and @($CountryCodes | Where-Object { $_.ToUpperInvariant() -eq "DEFAULT" }).Count -gt 0

if ($CollectDefaultCountries) {
  $CountryCodes = @($DefaultAppStoreCountryCodes | Where-Object { $_ -notin $ExcludedCountryCodes })
}

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

function Load-ProductPlanSpecs {
  $specPath = Join-Path $PSScriptRoot "..\data\product-plan-specs.json"
  if (!(Test-Path -LiteralPath $specPath)) {
    return $null
  }

  $specJson = [IO.File]::ReadAllText($specPath, [Text.Encoding]::UTF8)
  return $specJson | ConvertFrom-Json
}

function Get-ProductPlanSpec {
  param(
    [AllowNull()][object]$Specs,
    [string]$ProductSlug
  )

  if ($null -eq $Specs) {
    return $null
  }

  $propertyName = $ProductSlug.ToLowerInvariant()
  if ($Specs.PSObject.Properties.Name -contains $propertyName) {
    return $Specs.$propertyName
  }

  return $null
}

function Normalize-PlanMatchText {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  $text = [System.Net.WebUtility]::HtmlDecode($Value).ToLowerInvariant()
  $decomposed = $text.Normalize([Text.NormalizationForm]::FormD)
  $builder = [Text.StringBuilder]::new()
  foreach ($character in $decomposed.ToCharArray()) {
    $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($character)
    if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($character)
    }
  }
  $text = $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
  $text = [regex]::Replace($text, "[^\p{L}\p{N}]+", " ")
  $text = [regex]::Replace($text, "\s+", " ").Trim()
  return $text
}

function Test-AppStoreItemMatchesProduct {
  param(
    [string]$ItemName,
    [string]$ProductName,
    [AllowNull()][object]$ProductSpec = $null
  )

  if ($null -ne $ProductSpec) {
    return $true
  }

  $itemText = Normalize-PlanMatchText -Value $ItemName
  $productText = Normalize-PlanMatchText -Value $ProductName
  if ([string]::IsNullOrWhiteSpace($itemText) -or [string]::IsNullOrWhiteSpace($productText)) {
    return $true
  }

  $knownBrands = @(
    @{ Name = "chatgpt"; ProductAliases = @("chatgpt", "openai") },
    @{ Name = "openai"; ProductAliases = @("chatgpt", "openai") },
    @{ Name = "claude"; ProductAliases = @("claude", "anthropic") },
    @{ Name = "anthropic"; ProductAliases = @("claude", "anthropic") },
    @{ Name = "gemini"; ProductAliases = @("gemini", "google ai") },
    @{ Name = "google ai"; ProductAliases = @("gemini", "google ai") },
    @{ Name = "grok"; ProductAliases = @("grok", "supergrok", "xai") },
    @{ Name = "supergrok"; ProductAliases = @("grok", "supergrok", "xai") },
    @{ Name = "xai"; ProductAliases = @("grok", "supergrok", "xai") },
    @{ Name = "manus"; ProductAliases = @("manus") },
    @{ Name = "netflix"; ProductAliases = @("netflix") },
    @{ Name = "spotify"; ProductAliases = @("spotify") },
    @{ Name = "youtube"; ProductAliases = @("youtube") },
    @{ Name = "disney"; ProductAliases = @("disney") }
  )

  foreach ($brand in $knownBrands) {
    $brandText = [string]$brand.Name
    $itemHasBrand = $itemText -eq $brandText -or $itemText.Contains($brandText)
    if (!$itemHasBrand) {
      continue
    }

    $productHasBrand = $false
    foreach ($alias in @($brand.ProductAliases)) {
      $aliasText = Normalize-PlanMatchText -Value ([string]$alias)
      if ($productText -eq $aliasText -or $productText.Contains($aliasText)) {
        $productHasBrand = $true
        break
      }
    }

    if (!$productHasBrand) {
      return $false
    }
  }

  return $true
}

function Resolve-PlanSpec {
  param(
    [AllowNull()][object]$ProductSpec,
    [string]$ItemName,
    [string]$ProductName
  )

  if ($null -eq $ProductSpec -or $null -eq $ProductSpec.plans) {
    return $null
  }

  $itemText = Normalize-PlanMatchText -Value $ItemName
  $productText = Normalize-PlanMatchText -Value $ProductName

  if (![string]::IsNullOrWhiteSpace($productText)) {
    $itemText = [regex]::Replace($itemText, "\b$([regex]::Escape($productText))\b", "").Trim()
    $itemText = [regex]::Replace($itemText, "\s+", " ").Trim()
  }

  $planMatches = @()
  foreach ($plan in @($ProductSpec.plans)) {
    $aliases = @($plan.aliases)
    $aliases += @($plan.slug, $plan.name)

    foreach ($alias in $aliases) {
      $aliasText = Normalize-PlanMatchText -Value ([string]$alias)
      if ([string]::IsNullOrWhiteSpace($aliasText)) {
        continue
      }

      if ($itemText -eq $aliasText -or $itemText -match "\b$([regex]::Escape($aliasText))\b") {
        $planMatches += [pscustomobject]@{
          Plan = $plan
          AliasLength = $aliasText.Length
        }
      }
    }
  }

  if ($planMatches.Count -gt 0) {
    return @($planMatches | Sort-Object -Property AliasLength -Descending)[0].Plan
  }

  return $null
}

function Get-PlanSlugFromItemName {
  param(
    [string]$ItemName,
    [string]$ProductName,
    [AllowNull()][object]$ProductSpec = $null
  )

  $planSpec = Resolve-PlanSpec -ProductSpec $ProductSpec -ItemName $ItemName -ProductName $ProductName
  if ($null -ne $planSpec) {
    return [string]$planSpec.slug
  }

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
  param(
    [string]$ItemName,
    [AllowNull()][string]$CountryCode = $null
  )

  if ([string]::IsNullOrWhiteSpace($ItemName)) {
    return $true
  }

  $normalized = $ItemName.Trim()

  if ($normalized -match "(?i)\b(credit|credits|coin|coins|token|tokens|point|points|pack|bundle|top[- ]?up|one[- ]?time)\b") {
    return $true
  }

  if ($normalized -match "(?i)\bpremier\s+access\b") {
    return $true
  }

  # GeoSub's public ranking compares recurring monthly prices. Explicit annual
  # purchases must not become separate plans or compete with monthly variants.
  if (
    $normalized -match "(?i)\b(annual|annually|yearly|year|anual|anualmente|annuel|annuelle|annuale|annuo|jaarabonnement|jaarlijks|jahresabo|jahrlich|jährlich|årsabonnement|årsabonnemang)\b" -or
    $normalized -match "(年度|年額|年费|年費|연간)"
  ) {
    return $true
  }

  # App Store pages can expose a US-only IAP in other storefronts. Keep it
  # only for the US instead of presenting it as a locally available price.
  if (
    $normalized -match "(?i)\b(?:us|u\.s\.)\s*only\b" -and
    ![string]::IsNullOrWhiteSpace($CountryCode) -and
    $CountryCode.ToUpperInvariant() -ne "US"
  ) {
    return $true
  }

  # App Store IAP lists sometimes mix subscription plans with standalone storage tiers
  # such as "30 GB" or "100 GB". Keep real plan names like "Google AI Pro (5 TB)".
  if ($normalized -match "(?i)^\d+(?:\.\d+)?\s?(?:mb|gb|tb|mo|go|to|gib|tib|t)$") {
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
    if ($normalized -match "apps\.apple\.com/[a-z]{2}/") {
      $normalized = [regex]::Replace(
        $normalized,
        "apps\.apple\.com/[a-z]{2}/",
        "apps.apple.com/$storefront/",
        [Text.RegularExpressions.RegexOptions]::IgnoreCase
      )
    } else {
      $normalized = [regex]::Replace(
        $normalized,
        "apps\.apple\.com/",
        "apps.apple.com/$storefront/",
        [Text.RegularExpressions.RegexOptions]::IgnoreCase
      )
    }
    if ($normalized -notmatch "/id$AppleAppId(\?|$)") {
      return "https://apps.apple.com/$storefront/app/id$AppleAppId"
    }
    return $normalized
  }

  return "https://apps.apple.com/$storefront/app/id$AppleAppId"
}

function Get-AppStoreIdFromUrl {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  if ($Value -match "/id(\d+)") {
    return $Matches[1]
  }

  return $null
}

function Quote-SqlJson {
  param([object]$Value)

  $json = $Value | ConvertTo-Json -Depth 20 -Compress
  return (Quote-SqlString $json) + "::jsonb"
}

function Invoke-Psql {
  param([string]$Sql)

  $nodeBridge = Join-Path $PSScriptRoot "db-query.mjs"
  if (Test-Path -LiteralPath $nodeBridge) {
    $nodeOutput = $Sql | node $nodeBridge --exec 2>&1
    $nodeExitCode = $LASTEXITCODE
    if ($nodeExitCode -eq 0) {
      return
    }
    if ($nodeExitCode -ne 78 -and $nodeExitCode -ne 79) {
      throw "direct database command failed with exit code $nodeExitCode. $($nodeOutput -join "`n")"
    }
  }

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

  $nodeBridge = Join-Path $PSScriptRoot "db-query.mjs"
  if (Test-Path -LiteralPath $nodeBridge) {
    $nodeOutput = $Sql | node $nodeBridge --json 2>&1
    $nodeExitCode = $LASTEXITCODE
    if ($nodeExitCode -eq 0) {
      $nodeText = ($nodeOutput -join "").Trim()
      if ([string]::IsNullOrWhiteSpace($nodeText)) {
        return $null
      }
      return $nodeText | ConvertFrom-Json
    }
    if ($nodeExitCode -ne 78 -and $nodeExitCode -ne 79) {
      throw "direct database json query failed with exit code $nodeExitCode. $($nodeOutput -join "`n")"
    }
  }

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

function Get-AppStoreJobConfig {
  param([string]$ProductSlug)

  return Invoke-PsqlJson @"
SELECT COALESCE(row_to_json(job_row), '{}'::json) AS context
FROM (
  SELECT
    job.job_config ->> 'app_store_id' AS app_store_id,
    job.job_config ->> 'url' AS app_store_url
  FROM collector_jobs job
  JOIN products product ON product.id = job.product_id
  WHERE product.slug = $(Quote-SqlString $ProductSlug)
    AND job.status = 'active'
    AND job.job_config ->> 'collector_kind' = 'app_store'
  ORDER BY
    CASE WHEN job.job_config ? 'country_codes' THEN 1 ELSE 0 END,
    job.last_run_at DESC NULLS LAST,
    job.created_at DESC
  LIMIT 1
) job_row;
"@
}

function Get-Utf8ResponseContent {
  param([object]$Response)

  $bytes = $null

  try {
    if (
      $Response.BaseResponse -and
      $Response.BaseResponse.PSObject.Properties.Name -contains "Content" -and
      $Response.BaseResponse.Content
    ) {
      $bytes = $Response.BaseResponse.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
    }
  } catch {
    $bytes = $null
  }

  if ($null -eq $bytes -and $Response.RawContentStream) {
    $stream = $Response.RawContentStream
    $originalPosition = if ($stream.CanSeek) { $stream.Position } else { $null }
    $memory = New-Object IO.MemoryStream
    try {
      if ($stream.CanSeek) {
        $stream.Position = 0
      }
      $stream.CopyTo($memory)
      $bytes = $memory.ToArray()
    } finally {
      if ($null -ne $originalPosition -and $stream.CanSeek) {
        $stream.Position = $originalPosition
      }
      $memory.Dispose()
    }
  }

  if ($null -ne $bytes -and $bytes.Length -gt 0) {
    try {
      $strictUtf8 = New-Object Text.UTF8Encoding($false, $true)
      return $strictUtf8.GetString($bytes)
    } catch {
      # Preserve the platform decoder only when the response is not valid UTF-8.
    }
  }

  return [string]$Response.Content
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
    Html = Get-Utf8ResponseContent -Response $response
  }
}

function Get-AppStoreRenderedPage {
  param(
    [string]$CountryCode,
    [string]$AppleAppId,
    [AllowNull()][string]$ConfiguredUrl
  )

  $scriptPath = Join-Path $PSScriptRoot "render-app-store-prices.mjs"
  $outputPath = Join-Path ([IO.Path]::GetTempPath()) "geosub-app-store-$([Guid]::NewGuid().ToString('N')).json"
  $renderArgs = @(
    $scriptPath,
    "--country", $CountryCode,
    "--app-id", $AppleAppId,
    "--chrome-path", $ChromePath,
    "--output-file", $outputPath
  )

  if (![string]::IsNullOrWhiteSpace($ConfiguredUrl)) {
    $renderArgs += @("--url", $ConfiguredUrl)
  }

  try {
    node @renderArgs

    if ($LASTEXITCODE -ne 0) {
      throw "Browser-rendered App Store collection failed with exit code $LASTEXITCODE."
    }

    if (!(Test-Path -LiteralPath $outputPath)) {
      throw "Browser-rendered App Store collection did not produce a result file."
    }

    $resultJson = [IO.File]::ReadAllText($outputPath, [Text.Encoding]::UTF8).Trim()
    if ([string]::IsNullOrWhiteSpace($resultJson)) {
      throw "Browser-rendered App Store collection produced an empty result file."
    }

    $result = $resultJson | ConvertFrom-Json
  } finally {
    Remove-Item -LiteralPath $outputPath -Force -ErrorAction SilentlyContinue
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
  $normalized = [regex]::Replace($normalized, "(?<=[0-9])[^0-9.,]+(?=[0-9])", " ")
  $numberMatches = [regex]::Matches($normalized, "[0-9](?:[0-9\s.,]*[0-9])?")
  $numberText = @($numberMatches | Sort-Object { $_.Value.Length } -Descending | Select-Object -First 1).Value.Trim()

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

  if ($normalized -match 'USD|US\s?\$') {
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
    $quoteSqlArray = "ARRAY[" + (($quotes | ForEach-Object { Quote-SqlString $_ }) -join ",") + "]::text[]"
    try {
      $databaseRateMap = Invoke-PsqlJson @"
SELECT COALESCE(
  jsonb_object_agg(
    rate_row.quote_currency,
    jsonb_build_object(
      'rate', rate_row.rate,
      'rate_date', rate_row.rate_date,
      'fetched_at', rate_row.fetched_at
    )
  ),
  '{}'::jsonb
)
FROM (
  SELECT DISTINCT ON (quote_currency)
    quote_currency, rate, rate_date, fetched_at
  FROM latest_exchange_rates
  WHERE base_currency = 'USD'
    AND quote_currency = ANY($quoteSqlArray)
    AND fetched_at >= NOW() - INTERVAL '18 hours'
    AND rate > 0
  ORDER BY quote_currency, fetched_at DESC, rate_date DESC
) rate_row;
"@

      $databaseRateCount = 0
      foreach ($rateProperty in @($databaseRateMap.PSObject.Properties)) {
        $quote = [string]$rateProperty.Name
        $databaseRate = $rateProperty.Value
        if ($quote -and $null -ne $databaseRate.rate) {
          $rates[$quote] = [decimal]$databaseRate.rate
          $databaseRateCount += 1
          if ($databaseRate.rate_date) {
            $rateDate = ([datetime]$databaseRate.rate_date).ToString("yyyy-MM-dd")
          }
        }
      }

      Write-Host "Loaded $databaseRateCount/$($quotes.Count) fresh FX rates from the database."
    } catch {
      Write-Warning "Database FX lookup failed: $($_.Exception.Message)"
    }

    $missingQuotes = @($quotes | Where-Object { !$rates.ContainsKey($_) })
    if ($missingQuotes.Count -gt 0) {
      $quoteList = ($missingQuotes -join ",")
      $url = "https://api.frankfurter.app/latest?from=USD&to=$quoteList"
      try {
        $response = Invoke-RestMethod -Uri $url -TimeoutSec 30
        $rateDate = [string]$response.date

        foreach ($quote in $missingQuotes) {
          if ($response.rates.PSObject.Properties.Name -contains $quote) {
            $rates[$quote] = [decimal]$response.rates.$quote
          }
        }
      } catch {
        Write-Warning "Frankfurter FX lookup failed: $($_.Exception.Message)"
      }
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
      throw "Missing fresh FX rates for currencies: $($stillMissing -join ', '). Run the exchange-rate sync first."
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
    [int]$SortOrder,
    [AllowNull()][object]$ProductSpec = $null
  )

  $planSpec = Resolve-PlanSpec -ProductSpec $ProductSpec -ItemName $ItemName -ProductName $ProductName
  $planSlug = Get-PlanSlugFromItemName -ItemName $ItemName -ProductName $ProductName -ProductSpec $ProductSpec
  $planName = if ($null -ne $planSpec -and ![string]::IsNullOrWhiteSpace([string]$planSpec.name)) {
    [string]$planSpec.name
  } else {
    $ItemName
  }
  $effectiveSortOrder = if ($null -ne $planSpec -and $planSpec.PSObject.Properties.Name -contains "sort_order") {
    [int]$planSpec.sort_order
  } else {
    $SortOrder
  }

  if ($planSlug -eq "pro-20x" -and $PlansBySlug.ContainsKey("pro")) {
    $planSlug = "pro"
  }

  if ($PlansBySlug.ContainsKey($planSlug)) {
    $plan = $PlansBySlug[$planSlug]

    Invoke-Psql @"
UPDATE plans
SET
  name = $(Quote-SqlString $planName),
  status = 'published'::publish_status,
  sort_order = $effectiveSortOrder,
  updated_at = NOW()
WHERE id = $(Quote-SqlString $plan.id)::uuid;
"@

    $plan.name = $planName
    $plan.sort_order = $effectiveSortOrder
    return $plan
  }

  $plan = Invoke-PsqlJson @"
WITH existing AS (
  SELECT id, slug, name, sort_order
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
    $(Quote-SqlString $planName),
    'monthly'::billing_cycle,
    'published'::publish_status,
    $effectiveSortOrder,
    NOW(),
    NOW()
  WHERE NOT EXISTS (SELECT 1 FROM existing)
  ON CONFLICT (product_id, slug)
  DO UPDATE SET
    name = EXCLUDED.name,
    status = 'published'::publish_status,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW()
  RETURNING id, slug, name, sort_order
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
      SELECT id, slug, name, sort_order
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

function Get-AppStoreExpectedRange {
  param(
    [AllowNull()][object]$PlanSpec = $null
  )

  if (
    $null -eq $PlanSpec -or
    !($PlanSpec.PSObject.Properties.Name -contains "expected_monthly_usd_min") -or
    !($PlanSpec.PSObject.Properties.Name -contains "expected_monthly_usd_max") -or
    $null -eq $PlanSpec.expected_monthly_usd_min -or
    $null -eq $PlanSpec.expected_monthly_usd_max
  ) {
    return $null
  }

  $tolerancePercent = [decimal]3
  if (
    $PlanSpec.PSObject.Properties.Name -contains "expected_range_tolerance_percent" -and
    $null -ne $PlanSpec.expected_range_tolerance_percent
  ) {
    $tolerancePercent = [math]::Max([decimal]0, [decimal]$PlanSpec.expected_range_tolerance_percent)
  }

  $toleranceRatio = $tolerancePercent / [decimal]100
  $expectedMin = [decimal]$PlanSpec.expected_monthly_usd_min
  $expectedMax = [decimal]$PlanSpec.expected_monthly_usd_max

  return [pscustomobject]@{
    Min = [math]::Max([decimal]0, $expectedMin * ([decimal]1 - $toleranceRatio))
    Max = $expectedMax * ([decimal]1 + $toleranceRatio)
    TolerancePercent = $tolerancePercent
  }
}

function Get-AppStorePriceSelectionStrategy {
  param(
    [AllowNull()][object]$PlanSpec = $null
  )

  if (
    $null -ne $PlanSpec -and
    $PlanSpec.PSObject.Properties.Name -contains "price_selection_strategy" -and
    ![string]::IsNullOrWhiteSpace([string]$PlanSpec.price_selection_strategy)
  ) {
    return ([string]$PlanSpec.price_selection_strategy).Trim().ToLowerInvariant()
  }

  return "consensus"
}

function Get-AppStoreObservationAnomaly {
  param(
    [string]$CountryCurrency,
    [string]$ObservedCurrency,
    [decimal]$ConvertedUsd,
    [string]$OriginalObservedPriceText,
    [AllowNull()][object]$PriceSelection = $null,
    [AllowNull()][object]$PlanSpec = $null
  )

  $reasons = @()
  $normalizedText = ""
  if (![string]::IsNullOrWhiteSpace($OriginalObservedPriceText)) {
    $normalizedText = [System.Net.WebUtility]::HtmlDecode($OriginalObservedPriceText).ToUpperInvariant()
  }

  if ($ConvertedUsd -lt [decimal]1) {
    $reasons += "Converted App Store price is below 1 USD. Check whether the price text or currency was parsed incorrectly."
  }

  if ($normalizedText -match "USD|US\s?\$" -and $ObservedCurrency -ne "USD") {
    $reasons += "Original App Store price text contains USD, but the observation currency is $ObservedCurrency."
  }

  if (
    $ObservedCurrency -eq "USD" -and
    $CountryCurrency -ne "USD" -and
    $normalizedText -notmatch "USD|US\s?\$"
  ) {
    $reasons += "Parsed currency is USD for a non-USD storefront, but the original price text did not explicitly contain USD."
  }

  $expectedRange = Get-AppStoreExpectedRange -PlanSpec $PlanSpec
  if ($null -ne $expectedRange) {
    if ($ConvertedUsd -lt [decimal]$expectedRange.Min) {
      $reasons += "Converted App Store price is below the expected range for $($PlanSpec.slug). This may indicate a currency or decimal parsing error."
    }

    if ($ConvertedUsd -gt [decimal]$expectedRange.Max) {
      $reasons += "Converted App Store price is above the expected range for $($PlanSpec.slug). This may indicate a currency, billing-cycle, or decimal parsing error."
    }
  }

  if ($null -ne $PriceSelection) {
    $variantCount = if ($null -ne $PriceSelection.variantCount) { [int]$PriceSelection.variantCount } else { 0 }
    $selectedCount = if ($null -ne $PriceSelection.selectedCount) { [int]$PriceSelection.selectedCount } else { 0 }
    $runnerUpCount = if ($null -ne $PriceSelection.runnerUpCount) { [int]$PriceSelection.runnerUpCount } else { 0 }
    $selectedPenalty = if ($null -ne $PriceSelection.expectedFitPenalty) { [decimal]$PriceSelection.expectedFitPenalty } else { [decimal]0 }
    $runnerUpPenalty = if ($null -ne $PriceSelection.runnerUpExpectedFitPenalty) { [decimal]$PriceSelection.runnerUpExpectedFitPenalty } else { [decimal]0 }
    $selectionStrategy = Get-AppStorePriceSelectionStrategy -PlanSpec $PlanSpec
    $hasExplicitTierStrategy = $selectionStrategy -eq "lowest_in_expected_range" -and $selectedPenalty -eq 0

    if (
      !$hasExplicitTierStrategy -and
      $variantCount -gt 1 -and
      $selectedCount -le $runnerUpCount -and
      ($null -eq $PlanSpec -or $selectedPenalty -ge $runnerUpPenalty)
    ) {
      $reasons += "Multiple App Store prices matched this plan without a clear consensus. This may indicate monthly/yearly or tier parsing ambiguity."
    }
  }

  return [pscustomobject]@{
    Flag = $reasons.Count -gt 0
    Reason = if ($reasons.Count -gt 0) { $reasons -join " " } else { $null }
  }
}

function Get-AppStorePriceSelectionPenalty {
  param(
    [AllowNull()][object]$PlanSpec = $null,
    [string]$Currency,
    [decimal]$RawPrice,
    [string]$CountryCurrency,
    [decimal]$UsdToCurrency,
    [AllowNull()][object]$UsdRates = $null
  )

  if ($null -eq $PlanSpec) {
    return [decimal]0
  }

  $expectedRange = Get-AppStoreExpectedRange -PlanSpec $PlanSpec
  if ($null -eq $expectedRange) {
    return [decimal]0
  }

  $convertedUsd = $null
  if ($Currency -eq "USD") {
    $convertedUsd = [decimal]$RawPrice
  } elseif ($Currency -eq $CountryCurrency -and $UsdToCurrency -gt 0) {
    $convertedUsd = [decimal]$RawPrice / [decimal]$UsdToCurrency
  } elseif ($null -ne $UsdRates -and $null -ne $UsdRates.Rates) {
    $rateProperty = $UsdRates.Rates.PSObject.Properties[$Currency]
    if ($null -ne $rateProperty -and [decimal]$rateProperty.Value -gt 0) {
      $convertedUsd = [decimal]$RawPrice / [decimal]$rateProperty.Value
    }
  }

  if ($null -eq $convertedUsd) {
    return [decimal]999999
  }

  $expectedMin = [decimal]$expectedRange.Min
  $expectedMax = [decimal]$expectedRange.Max

  if ($convertedUsd -ge $expectedMin -and $convertedUsd -le $expectedMax) {
    return [decimal]0
  }

  if ($convertedUsd -lt $expectedMin) {
    return [math]::Round(($expectedMin - $convertedUsd), 4)
  }

  return [math]::Round(($convertedUsd - $expectedMax), 4)
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
    [bool]$AnomalyFlag = $false,
    [AllowNull()][string]$AnomalyReason,
    [string]$ParserVersion = "app-store-html-iap-v1",
    [string]$CollectorName = "collect-app-store-prices.ps1"
  )

  if ($DryRun) {
    $anomalyText = if ($AnomalyFlag) { " anomaly=$AnomalyReason" } else { "" }
    Write-Host "[dry-run] $CountryCode $ItemName $ObservedPriceText -> USD $ConvertedUsd via $ParserVersion$anomalyText"
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

  if ($AnomalyFlag) {
    $payload.anomaly_reason = $AnomalyReason
    $payload.review_note = $AnomalyReason
  }

  $anomalyFlagSql = if ($AnomalyFlag) { "TRUE" } else { "FALSE" }

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
  anomaly_reason,
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
  $anomalyFlagSql,
  $(Quote-SqlString $AnomalyReason),
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

function Record-AppStorePlanAvailability {
  param(
    [string]$ProductId,
    [string]$PlanId,
    [string]$CountryId,
    [string]$CountryCode,
    [string]$PlanSlug,
    [bool]$Found
  )

  $status = if ($Found) { "available" } else { "pending_absence" }
  $reason = if ($Found) {
    "Canonical plan was present in the latest successful App Store storefront collection."
  } else {
    "Canonical plan was not present in the latest successful App Store storefront collection."
  }

  if ($DryRun) {
    Write-Host "[dry-run] plan availability $CountryCode $PlanSlug $status"
    return
  }

  Invoke-Psql @"
INSERT INTO app_store_plan_availability_checks (
  id,
  product_id,
  plan_id,
  country_id,
  billing_platform,
  status,
  consecutive_missing_count,
  reason,
  checked_at,
  last_seen_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  $(Quote-SqlString $ProductId)::uuid,
  $(Quote-SqlString $PlanId)::uuid,
  $(Quote-SqlString $CountryId)::uuid,
  'ios'::billing_platform,
  $(Quote-SqlString $status),
  $(if ($Found) { 0 } else { 1 }),
  $(Quote-SqlString $reason),
  NOW(),
  $(if ($Found) { "NOW()" } else { "NULL" }),
  NOW(),
  NOW()
)
ON CONFLICT (plan_id, country_id, billing_platform)
DO UPDATE SET
  product_id = EXCLUDED.product_id,
  consecutive_missing_count = CASE
    WHEN EXCLUDED.status = 'available' THEN 0
    ELSE app_store_plan_availability_checks.consecutive_missing_count + 1
  END,
  status = CASE
    WHEN EXCLUDED.status = 'available' THEN 'available'
    WHEN app_store_plan_availability_checks.consecutive_missing_count + 1 >= 3
      THEN 'confirmed_absent'
    ELSE 'pending_absence'
  END,
  reason = EXCLUDED.reason,
  checked_at = NOW(),
  last_seen_at = CASE
    WHEN EXCLUDED.status = 'available' THEN NOW()
    ELSE app_store_plan_availability_checks.last_seen_at
  END,
  updated_at = NOW();
"@
}

$context = Get-ProductContext -Slug $ProductSlug -Countries $CountryCodes
if ($null -eq $context.product) {
  throw "Product '$ProductSlug' not found."
}

$appStoreJobConfig = Get-AppStoreJobConfig -ProductSlug $ProductSlug
if ([string]::IsNullOrWhiteSpace($AppId) -and $null -ne $appStoreJobConfig -and ![string]::IsNullOrWhiteSpace($appStoreJobConfig.app_store_id)) {
  $AppId = [string]$appStoreJobConfig.app_store_id
}

if ([string]::IsNullOrWhiteSpace($AppStoreUrl) -and $null -ne $appStoreJobConfig -and ![string]::IsNullOrWhiteSpace($appStoreJobConfig.app_store_url)) {
  $AppStoreUrl = [string]$appStoreJobConfig.app_store_url
}

if ([string]::IsNullOrWhiteSpace($AppId)) {
  $AppId = Get-AppStoreIdFromUrl -Value $AppStoreUrl
}

if ([string]::IsNullOrWhiteSpace($AppId)) {
  throw "App Store app id is required for product '$ProductSlug'. Pass -AppId, pass -AppStoreUrl with /id..., or create an active app_store collector job."
}

Write-Host "Using App Store app id $AppId for $ProductSlug."

$productPlanSpecs = Load-ProductPlanSpecs
$productPlanSpec = Get-ProductPlanSpec -Specs $productPlanSpecs -ProductSlug $ProductSlug
if ($null -ne $productPlanSpec) {
  Write-Host "Product plan spec loaded for $ProductSlug. Plans: $(@($productPlanSpec.plans).Count)."
} else {
  Write-Host "No product plan spec found for $ProductSlug. Falling back to name-based plan matching."
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
} elseif ($CollectDefaultCountries) {
  Write-Host "App Store country mode: DEFAULT. Countries: $($CountryCodes.Count). Excluded: $($ExcludedCountryCodes -join ',')."
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
  confirmedStorefronts = 0
  transientFailures = 0
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
  $renderedPageHadNoItems = $false

  try {
    $renderedPage = Get-AppStoreRenderedPage -CountryCode $code -AppleAppId $AppId -ConfiguredUrl $AppStoreUrl
    if ($renderedPage.Items.Count -eq 0) {
      $renderedPageHadNoItems = $true
      throw "No in-app purchases found in rendered App Store page."
    }

    $page = [pscustomobject]@{
      Url = $renderedPage.Url
      FinalUrl = $renderedPage.FinalUrl
      Status = $renderedPage.Status
    }
    $items = @($renderedPage.Items)
    $parserVersion = $renderedPage.ParserVersion
    $collectorName = $renderedPage.CollectorName
  } catch {
    Write-Host "Rendered App Store collection failed for $code. Falling back to static HTML."
    Write-Host $_.Exception.Message
    try {
      $page = Get-AppStoreHtml -CountryCode $code -AppleAppId $AppId -ConfiguredUrl $AppStoreUrl
      $items = @(Get-InAppPurchases -Html $page.Html)

      if ($items.Count -eq 0 -and !$renderedPageHadNoItems) {
        throw "No in-app purchases found in static App Store HTML."
      }
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
      if ($status -eq "not_available") {
        $summary.confirmedStorefronts += 1
      } else {
        $summary.transientFailures += 1
      }
      continue
    }
  }

  $candidateItemsBySlug = @{}
  $ignoredItemCount = 0
  foreach ($item in $items) {
    if (Should-IgnoreInAppPurchase -ItemName $item.Name -CountryCode $code) {
      Write-Host "Ignoring non-subscription App Store item: $code $($item.Name)"
      $ignoredItemCount += 1
      continue
    }

    if (!(Test-AppStoreItemMatchesProduct -ItemName $item.Name -ProductName $context.product.name -ProductSpec $productPlanSpec)) {
      Write-Host "Ignoring App Store item that appears to belong to another product: $code $($item.Name)"
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

    $planSpec = Resolve-PlanSpec -ProductSpec $productPlanSpec -ItemName $item.Name -ProductName $context.product.name
    if ($null -ne $productPlanSpec -and $null -eq $planSpec) {
      Write-Host "Ignoring unmatched App Store item for known product spec: $code $($item.Name)"
      $ignoredItemCount += 1
      continue
    }

    $planSlug = if ($null -ne $planSpec) {
      [string]$planSpec.slug
    } else {
      Get-PlanSlugFromItemName -ItemName $item.Name -ProductName $context.product.name
    }
    if (!$candidateItemsBySlug.ContainsKey($planSlug)) {
      $candidateItemsBySlug[$planSlug] = @()
    }

    $candidateItemsBySlug[$planSlug] += [pscustomobject]@{
      Item = $item
      RawPrice = $rawPrice
      Currency = $observedCurrency
      PlanSpec = $planSpec
    }
  }

  $selectedItemsBySlug = @{}
  foreach ($planSlug in $candidateItemsBySlug.Keys) {
    $groups = @(
      $candidateItemsBySlug[$planSlug] |
        Group-Object -Property Currency, RawPrice |
        Sort-Object `
          @{
            Expression = {
              $strategy = Get-AppStorePriceSelectionStrategy -PlanSpec $_.Group[0].PlanSpec
              if ($strategy -eq "lowest_in_expected_range") { [decimal]0 } else { -[decimal]$_.Count }
            }
            Descending = $false
          },
          @{
            Expression = {
              Get-AppStorePriceSelectionPenalty `
                -PlanSpec $_.Group[0].PlanSpec `
                -Currency ([string]$_.Group[0].Currency) `
                -RawPrice ([decimal]$_.Group[0].RawPrice) `
                -CountryCurrency $currency `
                -UsdToCurrency $usdToCurrency `
                -UsdRates $usdRates
            }
            Descending = $false
          },
          @{
            Expression = {
              $strategy = Get-AppStorePriceSelectionStrategy -PlanSpec $_.Group[0].PlanSpec
              if ($strategy -eq "lowest_in_expected_range") { [decimal]$_.Group[0].RawPrice } else { [decimal]0 }
            }
            Descending = $false
          },
          @{ Expression = "Count"; Descending = $true },
          @{ Expression = { [decimal]$_.Group[0].RawPrice }; Descending = $false }
    )

    if ($groups.Count -gt 0) {
      $selected = $groups[0].Group[0]
      $priceVariants = @($groups | ForEach-Object {
        $variantPenalty = Get-AppStorePriceSelectionPenalty `
          -PlanSpec $_.Group[0].PlanSpec `
          -Currency ([string]$_.Group[0].Currency) `
          -RawPrice ([decimal]$_.Group[0].RawPrice) `
          -CountryCurrency $currency `
          -UsdToCurrency $usdToCurrency `
          -UsdRates $usdRates

        [pscustomobject]@{
          currency = [string]$_.Group[0].Currency
          rawPrice = [decimal]$_.Group[0].RawPrice
          count = [int]$_.Count
          expectedFitPenalty = [decimal]$variantPenalty
        }
      })

      $runnerUpCount = if ($priceVariants.Count -gt 1) { [int]$priceVariants[1].count } else { 0 }
      $runnerUpPenalty = if ($priceVariants.Count -gt 1) { [decimal]$priceVariants[1].expectedFitPenalty } else { [decimal]0 }
      $selectionPenalty = Get-AppStorePriceSelectionPenalty `
        -PlanSpec $selected.PlanSpec `
        -Currency ([string]$selected.Currency) `
        -RawPrice ([decimal]$selected.RawPrice) `
        -CountryCurrency $currency `
        -UsdToCurrency $usdToCurrency `
        -UsdRates $usdRates
      $selected | Add-Member -NotePropertyName PriceSelection -NotePropertyValue @{
        selectedCurrency = [string]$selected.Currency
        selectedRawPrice = [decimal]$selected.RawPrice
        selectedCount = [int]$priceVariants[0].count
        runnerUpCount = $runnerUpCount
        variantCount = [int]$priceVariants.Count
        expectedFitPenalty = [decimal]$selectionPenalty
        runnerUpExpectedFitPenalty = [decimal]$runnerUpPenalty
        variants = $priceVariants
      } -Force
      $selectedItemsBySlug[$planSlug] = $selected
      if ($groups.Count -gt 1) {
        $variants = @($groups | ForEach-Object {
          "$($_.Group[0].Currency) $($_.Group[0].RawPrice) x$($_.Count)"
        })
        Write-Host "Multiple App Store prices for $code $planSlug. Selected modal price: $($variants[0]). Variants: $($variants -join '; ')"
      }
    }
  }

  $subscriptionItemCount = $selectedItemsBySlug.Count
  $availabilityStatus = "available_with_prices"
  $availabilityReason = "App Store page is available and subscription prices were parsed."

  if ($items.Count -eq 0) {
    $availabilityStatus = "available_no_iap"
    $availabilityReason = "App Store page was fetched by both rendered and static collectors, but no in-app purchase items were found."
  } elseif ($subscriptionItemCount -eq 0) {
    $availabilityStatus = "available_unmatched_items"
    $availabilityReason = "App Store in-app purchases were found, but none matched the maintained subscription plan specification."
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
  $summary.confirmedStorefronts += 1

  if ($subscriptionItemCount -gt 0 -and $null -ne $productPlanSpec) {
    foreach ($planSpec in @($productPlanSpec.plans)) {
      $planSlug = [string]$planSpec.slug
      if (!$plansBySlug.ContainsKey($planSlug)) {
        continue
      }

      Record-AppStorePlanAvailability `
        -ProductId $context.product.id `
        -PlanId $plansBySlug[$planSlug].id `
        -CountryId $country.id `
        -CountryCode $code `
        -PlanSlug $planSlug `
        -Found ($selectedItemsBySlug.ContainsKey($planSlug))
    }
  }

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
      -SortOrder $planSortOrder `
      -ProductSpec $productPlanSpec
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

    $anomaly = Get-AppStoreObservationAnomaly `
      -CountryCurrency $currency `
      -ObservedCurrency $observedCurrency `
      -ConvertedUsd $convertedUsd `
      -OriginalObservedPriceText $item.PriceText `
      -PriceSelection $entry.PriceSelection `
      -PlanSpec (Resolve-PlanSpec -ProductSpec $productPlanSpec -ItemName $item.Name -ProductName $context.product.name)

    $observedPriceText = Format-ObservedPriceText -Currency $observedCurrency -Price $rawPrice
    $rawSnapshot = @{
      country = $code
      sourceUrl = $page.Url
      inAppPurchases = $items
      originalObservedPriceText = $item.PriceText
      observedCurrency = $observedCurrency
      planSpecSlug = $plan.slug
      priceSelection = $entry.PriceSelection
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
      -AnomalyFlag $anomaly.Flag `
      -AnomalyReason $anomaly.Reason `
      -ParserVersion $parserVersion `
      -CollectorName $collectorName

    if ($result -eq "inserted") { $summary.inserted += 1 }
    elseif ($result -eq "skipped") { $summary.skipped += 1 }
    elseif ($result -eq "dry-run") { $summary.dryRun += 1 }
  }
}

$summaryText = "Inserted: $($summary.inserted). Skipped: $($summary.skipped). Dry-run: $($summary.dryRun). Missing: $($summary.missing). Confirmed storefronts: $($summary.confirmedStorefronts). Transient failures: $($summary.transientFailures)."
if ($summary.transientFailures -gt 0) {
  throw "App Store collection incomplete. $summaryText Temporary storefront failures must be retried."
}

Write-Host "App Store collection complete. $summaryText"
