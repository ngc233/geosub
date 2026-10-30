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

function Get-BoundedEnvironmentInteger {
  param(
    [string]$Name,
    [int]$DefaultValue,
    [int]$Minimum,
    [int]$Maximum
  )

  $rawValue = [Environment]::GetEnvironmentVariable($Name)
  $parsedValue = 0
  if (
    [string]::IsNullOrWhiteSpace($rawValue) -or
    ![int]::TryParse($rawValue, [ref]$parsedValue)
  ) {
    return $DefaultValue
  }

  return [Math]::Min($Maximum, [Math]::Max($Minimum, $parsedValue))
}

function Test-EnvironmentFlagEnabled {
  param(
    [string]$Name,
    [bool]$DefaultValue = $true
  )

  $rawValue = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($rawValue)) {
    return $DefaultValue
  }

  return $rawValue.Trim().ToLowerInvariant() -notin @("0", "false", "no", "off", "disabled")
}

$AppStoreCollectionEnabled = Test-EnvironmentFlagEnabled -Name "GEOSUB_APP_STORE_COLLECTION_ENABLED"
if (!$AppStoreCollectionEnabled) {
  throw "App Store collection is disabled by GEOSUB_APP_STORE_COLLECTION_ENABLED. No storefront request was made."
}

$AppStoreRequestDelayMs = Get-BoundedEnvironmentInteger `
  -Name "GEOSUB_APP_STORE_REQUEST_DELAY_MS" `
  -DefaultValue 1000 `
  -Minimum 250 `
  -Maximum 10000
$AppStoreMaxRetries = Get-BoundedEnvironmentInteger `
  -Name "GEOSUB_APP_STORE_MAX_RETRIES" `
  -DefaultValue 2 `
  -Minimum 0 `
  -Maximum 5
$AppStoreCacheTtlMinutes = Get-BoundedEnvironmentInteger `
  -Name "GEOSUB_APP_STORE_CACHE_TTL_MINUTES" `
  -DefaultValue 720 `
  -Minimum 0 `
  -Maximum 1440
$AppStoreUserAgent = if ([string]::IsNullOrWhiteSpace($env:GEOSUB_APP_STORE_USER_AGENT)) {
  "GeoSubPriceResearch/2.8 (+https://geosub.org/data-sources; contact: https://geosub.org/zh/contact)"
} else {
  $env:GEOSUB_APP_STORE_USER_AGENT.Trim()
}
$AppStoreCacheDirectory = if ([string]::IsNullOrWhiteSpace($env:GEOSUB_APP_STORE_CACHE_DIR)) {
  Join-Path ([IO.Path]::GetTempPath()) "geosub-app-store-cache"
} else {
  $env:GEOSUB_APP_STORE_CACHE_DIR.Trim()
}
$script:LastAppStoreRequestAt = $null

[void][IO.Directory]::CreateDirectory($AppStoreCacheDirectory)

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
  . (Join-Path $PSScriptRoot "app-store-plan-specs.ps1")
  return Read-AppStorePlanSpecs
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
  $text = $text.Replace("+", " plus ")
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
  $matchProductName = if (
    $ProductSpec.PSObject.Properties.Name -contains "match_product_name" -and
    ![string]::IsNullOrWhiteSpace([string]$ProductSpec.match_product_name)
  ) {
    [string]$ProductSpec.match_product_name
  } else {
    $ProductName
  }
  $productText = Normalize-PlanMatchText -Value $matchProductName

  if ($ProductSpec.PSObject.Properties.Name -contains "excluded_aliases") {
    foreach ($excludedAlias in @($ProductSpec.excluded_aliases)) {
      $excludedText = Normalize-PlanMatchText -Value ([string]$excludedAlias)
      if (
        ![string]::IsNullOrWhiteSpace($excludedText) -and
        ($itemText -eq $excludedText -or $itemText -match "\b$([regex]::Escape($excludedText))\b")
      ) {
        return $null
      }
    }
  }

  if (![string]::IsNullOrWhiteSpace($productText)) {
    $itemText = [regex]::Replace($itemText, "\b$([regex]::Escape($productText))\b", "").Trim()
    $itemText = [regex]::Replace($itemText, "\s+", " ").Trim()
  }

  # Explicit labels prevent generic slugs such as pro from swallowing new tiers.
  $exactAliases = $ProductSpec.PSObject.Properties.Name -contains "exact_plan_aliases" -and $ProductSpec.exact_plan_aliases -eq $true
  $planMatches = @()
  foreach ($plan in @($ProductSpec.plans)) {
    $aliases = @($plan.aliases)
    if (!$exactAliases) { $aliases += @($plan.slug, $plan.name) }

    foreach ($alias in $aliases) {
      $aliasText = Normalize-PlanMatchText -Value ([string]$alias)
      if ([string]::IsNullOrWhiteSpace($aliasText)) {
        continue
      }

      if ($exactAliases -and ![string]::IsNullOrWhiteSpace($productText)) {
        $aliasText = [regex]::Replace($aliasText, "\b$([regex]::Escape($productText))\b", "").Trim()
        $aliasText = [regex]::Replace($aliasText, "\s+", " ").Trim()
      }
      if ($itemText -eq $aliasText -or (!$exactAliases -and $itemText -match "\b$([regex]::Escape($aliasText))\b")) {
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

function Test-ProductSpecCountryScope {
  param(
    [AllowNull()][object]$ProductSpec,
    [string]$ItemName,
    [string]$CountryCode
  )

  if (
    $null -eq $ProductSpec -or
    !($ProductSpec.PSObject.Properties.Name -contains "country_scoped_aliases")
  ) {
    return $true
  }

  $itemText = Normalize-PlanMatchText -Value $ItemName
  $country = $CountryCode.ToUpperInvariant()

  foreach ($scope in @($ProductSpec.country_scoped_aliases)) {
    $token = Normalize-PlanMatchText -Value ([string]$scope.token)
    if ([string]::IsNullOrWhiteSpace($token) -or $itemText -notmatch "\b$([regex]::Escape($token))\b") {
      continue
    }

    $allowedCountries = @($scope.country_codes | ForEach-Object { ([string]$_).ToUpperInvariant() })
    if ($country -notin $allowedCountries) {
      return $false
    }
  }

  return $true
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

  # Tip jars and novelty gifts are standalone purchases, even when the App
  # Store lists them beside recurring subscriptions.
  if (
    $normalized -match "(?i)\b(tip|tips|donation|donate|snack|snacks)\b" -or
    $normalized -match "(?i)\b(?:buy|grab)\b.+\bcoffee\b" -or
    $normalized -match "(?i)\bsend\b.+\bflower\b" -or
    $normalized -match "(?i)\btreat\b.+\bmeal\b"
  ) {
    return $true
  }

  if ($normalized -match "(?i)\bpremier\s+access\b") {
    return $true
  }

  # GeoSub's public ranking compares recurring monthly prices. Explicit annual
  # purchases must not become separate plans or compete with monthly variants.
  if (
    $normalized -match "(?i)\b(annual|annually|yearly|year|quarterly|quarter|anual|anualmente|trimestral|trimestre|annuel|annuelle|annuale|annuo|jaarabonnement|jaarlijks|jahresabo|jahrlich|jährlich|årsabonnement|årsabonnemang)\b" -or
    $normalized -match "(年度|年額|年费|年費|季度|季費|분기|연간)"
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

function Test-PlanAllowsIgnoredRecurringItem {
  param(
    [AllowNull()][object]$PlanSpec,
    [string]$ItemName
  )

  if (
    $null -eq $PlanSpec -or
    !($PlanSpec.PSObject.Properties.Name -contains "allow_recurring_consumable_terms") -or
    ![bool]$PlanSpec.allow_recurring_consumable_terms
  ) {
    return $false
  }

  $normalized = Normalize-PlanMatchText -Value $ItemName
  if ($normalized -match "\b(annual|annually|yearly|year|quarterly|quarter|one time)\b") {
    return $false
  }

  $billingCycle = ([string]$PlanSpec.billing_cycle).ToLowerInvariant()
  if ($billingCycle -eq "monthly") {
    return $normalized -match "\b(month|monthly)\b"
  }
  if ($billingCycle -eq "weekly") {
    return $normalized -match "\b(week|weekly)\b"
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

function Get-AppStoreCachePath {
  param(
    [string]$Kind,
    [string]$Url
  )

  $sha256 = [Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes("$Kind`n$Url")
    $hash = ([BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha256.Dispose()
  }

  return Join-Path $AppStoreCacheDirectory "$hash.$Kind"
}

function Get-FreshAppStoreCacheContent {
  param([string]$Path, [ref]$CapturedAt)

  if ($AppStoreCacheTtlMinutes -le 0 -or !(Test-Path -LiteralPath $Path)) {
    return $null
  }

  $cacheFile = Get-Item -LiteralPath $Path
  $cacheAge = (Get-Date).ToUniversalTime() - $cacheFile.LastWriteTimeUtc
  if ($cacheAge.TotalMinutes -lt 0 -or $cacheAge.TotalMinutes -ge $AppStoreCacheTtlMinutes) {
    return $null
  }

  $content = [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8)
  if ([string]::IsNullOrWhiteSpace($content)) {
    return $null
  }

  if ($null -ne $CapturedAt) { $CapturedAt.Value = $cacheFile.LastWriteTimeUtc.ToString("o") }
  return $content
}

function Set-AppStoreCacheContent {
  param(
    [string]$Path,
    [string]$Content,
    [DateTime]$CapturedAt = [DateTime]::MinValue
  )

  if ($AppStoreCacheTtlMinutes -le 0 -or [string]::IsNullOrWhiteSpace($Content)) {
    return
  }

  $temporaryPath = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
  try {
    [IO.File]::WriteAllText($temporaryPath, $Content, [Text.UTF8Encoding]::new($false))
    if ($CapturedAt -ne [DateTime]::MinValue) {
      [IO.File]::SetLastWriteTimeUtc($temporaryPath, $CapturedAt.ToUniversalTime())
    }
    Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
  } finally {
    Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
  }
}

function Wait-AppStoreRequestSlot {
  $now = Get-Date
  $remainingDelayMs = $AppStoreRequestDelayMs
  if ($null -ne $script:LastAppStoreRequestAt) {
    $elapsedMs = ($now - $script:LastAppStoreRequestAt).TotalMilliseconds
    $remainingDelayMs = [Math]::Max(0, $AppStoreRequestDelayMs - [int]$elapsedMs)
  }

  $jitterMs = Get-Random -Minimum 0 -Maximum 251
  $totalDelayMs = $remainingDelayMs + $jitterMs
  if ($totalDelayMs -gt 0) {
    Start-Sleep -Milliseconds $totalDelayMs
  }
  $script:LastAppStoreRequestAt = Get-Date
}

function Test-RetryableAppStoreError {
  param([object]$ErrorRecord)

  $statusCode = $null
  try {
    if ($null -ne $ErrorRecord.Exception.Response.StatusCode) {
      $statusCode = [int]$ErrorRecord.Exception.Response.StatusCode
    }
  } catch {
    $statusCode = $null
  }

  if ($null -eq $statusCode) {
    return $true
  }

  return $statusCode -in @(408, 425, 429) -or $statusCode -ge 500
}

function Wait-AppStoreRetryBackoff {
  param([int]$Attempt)

  $exponentialDelayMs = [Math]::Min(15000, 1000 * [Math]::Pow(2, $Attempt))
  $jitterMs = Get-Random -Minimum 0 -Maximum 751
  Start-Sleep -Milliseconds ([int]($exponentialDelayMs + $jitterMs))
}

function Assert-AppStorePageIdentity {
  param([string]$FinalUrl, [string]$CountryCode, [string]$AppleAppId, [int]$Status)

  $uri = $null
  $pathPattern = '^/' + [regex]::Escape($CountryCode.ToLowerInvariant()) +
    '/(?:(?:iphone|ipad|mac|vision)/)?app/(?:[^/]+/)?id' + [regex]::Escape($AppleAppId) + '/?$'
  if (![Uri]::TryCreate($FinalUrl, [UriKind]::Absolute, [ref]$uri) -or
      $uri.Scheme -ne 'https' -or $uri.Host -ne 'apps.apple.com' -or !$uri.IsDefaultPort -or
      $uri.AbsolutePath -notmatch $pathPattern -or $Status -lt 200 -or $Status -ge 300) {
    throw "App Store page identity mismatch for requested $CountryCode app $AppleAppId."
  }
  return $uri.GetLeftPart([UriPartial]::Path)
}

function Get-AppStoreResponseFinalUrl {
  param([object]$Response)

  if ($Response.BaseResponse.RequestMessage.RequestUri) { return [string]$Response.BaseResponse.RequestMessage.RequestUri }
  if ($Response.BaseResponse.ResponseUri) { return [string]$Response.BaseResponse.ResponseUri }
  return [string]$Response.FinalUrl
}

function Get-AppStoreHtml {
  param(
    [string]$CountryCode,
    [string]$AppleAppId,
    [AllowNull()][string]$ConfiguredUrl
  )

  $url = Get-AppStoreUrl -CountryCode $CountryCode -AppleAppId $AppleAppId -ConfiguredUrl $ConfiguredUrl
  $cachePath = Get-AppStoreCachePath -Kind "html" -Url $url
  $cachedJson = Get-FreshAppStoreCacheContent -Path $cachePath
  if ($null -ne $cachedJson) {
    try {
      $cached = $cachedJson | ConvertFrom-Json
      $finalUrl = Assert-AppStorePageIdentity -FinalUrl $cached.finalUrl -CountryCode $CountryCode `
        -AppleAppId $AppleAppId -Status $cached.status
      $captured = Get-AppStoreObservationTime -RawSnapshot $cached -RequireCapturedAt
      if (([DateTimeOffset]::UtcNow - $captured).TotalMinutes -ge $AppStoreCacheTtlMinutes -or
          $cached.html -isnot [string] -or [string]::IsNullOrWhiteSpace($cached.html)) {
        throw "App Store HTML cache evidence expired or incomplete."
      }
      Write-Host "Using fresh App Store HTML cache for $CountryCode."
      return [pscustomobject]@{
        Url = $url
        FinalUrl = $finalUrl
        Status = [int]$cached.status
        Html = $cached.html
        FromCache = $true
        CapturedAt = $captured.ToString("o")
      }
    } catch {
      # Old raw HTML has no final source identity. Re-fetch rather than trust it.
    }
  }

  for ($attempt = 0; $attempt -le $AppStoreMaxRetries; $attempt += 1) {
    try {
      Wait-AppStoreRequestSlot
      $response = Invoke-WebRequest `
        -Uri $url `
        -UseBasicParsing `
        -TimeoutSec 30 `
        -Headers @{
          "User-Agent" = $AppStoreUserAgent
          "Accept-Language" = "en-US,en;q=0.9"
        }
      $finalUrl = Assert-AppStorePageIdentity -FinalUrl (Get-AppStoreResponseFinalUrl -Response $response) `
        -CountryCode $CountryCode -AppleAppId $AppleAppId -Status $response.StatusCode
      $html = Get-Utf8ResponseContent -Response $response
      $capturedAt = [DateTime]::UtcNow
      $cacheRecord = @{html=$html;finalUrl=$finalUrl;status=[int]$response.StatusCode;capturedAt=$capturedAt.ToString("o")}
      Set-AppStoreCacheContent -Path $cachePath -Content ($cacheRecord | ConvertTo-Json -Compress) -CapturedAt $capturedAt

      return [pscustomobject]@{
        Url = $url
        FinalUrl = $finalUrl
        Status = [int]$response.StatusCode
        Html = $html
        FromCache = $false
        CapturedAt = $capturedAt.ToString("o")
      }
    } catch {
      if ($attempt -ge $AppStoreMaxRetries -or !(Test-RetryableAppStoreError -ErrorRecord $_)) {
        throw
      }

      Write-Host "Transient App Store HTML request failure for $CountryCode. Retry $($attempt + 1)/$AppStoreMaxRetries."
      Wait-AppStoreRetryBackoff -Attempt $attempt
    }
  }

  throw "App Store HTML request exhausted its retry budget for $CountryCode."
}

function Get-AppStoreRenderedPage {
  param(
    [string]$CountryCode,
    [string]$AppleAppId,
    [AllowNull()][string]$ConfiguredUrl
  )

  $scriptPath = Join-Path $PSScriptRoot "render-app-store-prices.mjs"
  $url = Get-AppStoreUrl -CountryCode $CountryCode -AppleAppId $AppleAppId -ConfiguredUrl $ConfiguredUrl
  $cachePath = Get-AppStoreCachePath -Kind "json" -Url $url
  $resultJson = Get-FreshAppStoreCacheContent -Path $cachePath
  $result = $null
  $fromCache = $false

  if ($null -ne $resultJson) {
    try {
      $result = $resultJson | ConvertFrom-Json
      if (![bool]$result.ok) {
        $result = $null
      } else {
        $null = Assert-AppStorePageIdentity -FinalUrl $result.finalUrl -CountryCode $CountryCode `
          -AppleAppId $AppleAppId -Status $result.status
        $captured = Get-AppStoreObservationTime -RawSnapshot $result -RequireCapturedAt
        if (([DateTimeOffset]::UtcNow - $captured).TotalMinutes -ge $AppStoreCacheTtlMinutes) {
          throw "app_store_rendered_cache_evidence_expired"
        }
        $fromCache = $true
        Write-Host "Using fresh rendered App Store cache for $CountryCode."
      }
    } catch {
      $result = $null
    }
  }

  if ($null -eq $result) {
    for ($attempt = 0; $attempt -le $AppStoreMaxRetries; $attempt += 1) {
      $outputPath = Join-Path ([IO.Path]::GetTempPath()) "geosub-app-store-$([Guid]::NewGuid().ToString('N')).json"
      $renderArgs = @(
        $scriptPath,
        "--country", $CountryCode,
        "--app-id", $AppleAppId,
        "--chrome-path", $ChromePath,
        "--output-file", $outputPath,
        "--user-agent", $AppStoreUserAgent
      )

      if (![string]::IsNullOrWhiteSpace($ConfiguredUrl)) {
        $renderArgs += @("--url", $ConfiguredUrl)
      }

      try {
        Wait-AppStoreRequestSlot
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
        if (![bool]$result.ok) {
          $resultStatus = if ($null -ne $result.status) { [string]$result.status } else { "unknown" }
          $resultFinalUrl = if ($result.finalUrl) { [string]$result.finalUrl } else { $url }
          throw "Browser-rendered App Store page unavailable. HTTP $resultStatus. Final URL: $resultFinalUrl"
        }

        $null = Assert-AppStorePageIdentity -FinalUrl $result.finalUrl -CountryCode $CountryCode `
          -AppleAppId $AppleAppId -Status $result.status
        $captured = Get-AppStoreObservationTime -RawSnapshot $result -RequireCapturedAt
        Set-AppStoreCacheContent -Path $cachePath -Content $resultJson -CapturedAt $captured.UtcDateTime
        break
      } catch {
        if ($attempt -ge $AppStoreMaxRetries -or !(Test-RetryableAppStoreError -ErrorRecord $_)) {
          throw
        }

        Write-Host "Transient browser-rendered App Store failure for $CountryCode. Retry $($attempt + 1)/$AppStoreMaxRetries."
        Wait-AppStoreRetryBackoff -Attempt $attempt
      } finally {
        Remove-Item -LiteralPath $outputPath -Force -ErrorAction SilentlyContinue
      }
    }
  }

  if ($null -eq $result) {
    throw "Browser-rendered App Store request exhausted its retry budget for $CountryCode."
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
    CapturedAt = (Get-AppStoreObservationTime -RawSnapshot $result -RequireCapturedAt).ToString("o")
    FromCache = $fromCache
    ParserSource = [string]$result.parserSource
    HasInAppPurchasesSection = [bool]$result.hasInAppPurchasesSection
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

function Get-EmbeddedAppStorePurchasePairs {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value -or $Value -is [string] -or $Value -is [ValueType]) { return @() }
  if ($Value -is [array]) {
    foreach ($child in $Value) {
      $found = @(Get-EmbeddedAppStorePurchasePairs -Value $child)
      if ($found.Count -gt 0) { return $found }
    }
    return @()
  }

  if ($Value.title -eq 'In-App Purchases' -and $Value.items -is [array]) {
    $items = @()
    foreach ($item in $Value.items) {
      if ($item.'$kind' -eq 'textPair' -and $item.leadingText -is [string] -and $item.trailingText -is [string]) {
        if (![string]::IsNullOrWhiteSpace($item.leadingText) -and ![string]::IsNullOrWhiteSpace($item.trailingText)) {
          $items += [pscustomobject]@{Name=$item.leadingText.Trim();PriceText=$item.trailingText.Trim()}
        }
      } elseif ($item.textPairs -is [array]) {
        foreach ($pair in $item.textPairs) {
          if (@($pair).Count -ge 2 -and $pair[0] -and $pair[1]) {
            $items += [pscustomobject]@{Name=[string]$pair[0];PriceText=[string]$pair[1]}
          }
        }
      }
    }
    if ($items.Count -gt 0) { return $items }
  }

  foreach ($property in $Value.PSObject.Properties) {
    $found = @(Get-EmbeddedAppStorePurchasePairs -Value $property.Value)
    if ($found.Count -gt 0) { return $found }
  }
  return @()
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

  $hasStructuredPurchaseMetadata = $false
  if ($items.Count -eq 0) {
    $embeddedHtml = [regex]::Replace($Html, '<!--[\s\S]*?-->', '')
    $scripts = [regex]::Matches($embeddedHtml, '<script\b(?<attrs>[^>]*)>(?<json>[\s\S]*?)</script>', 'IgnoreCase')
    foreach ($script in $scripts) {
      $attrs = $script.Groups['attrs'].Value
      if ($attrs -match '\bsrc\s*=' -or $attrs -notmatch '\btype\s*=\s*["\x27]application/json["\x27]') { continue }
      $text = $script.Groups['json'].Value
      if (!$text.Contains('In-App Purchases')) { continue }
      $hasStructuredPurchaseMetadata = $true
      try {
        $data = $text | ConvertFrom-Json
        $items = @(Get-EmbeddedAppStorePurchasePairs -Value $data)
        if ($items.Count -gt 0) { break }
      } catch {
        # Unparseable metadata cannot supply purchase evidence.
      }
    }
  }

  if ($items.Count -eq 0 -and !$hasStructuredPurchaseMetadata) {
    $embeddedPattern = '"title"\s*:\s*"In-App Purchases"[\s\S]*?"textPairs"\s*:\s*(?<pairs>\[\[[\s\S]*?\]\])'
    $embeddedMatch = [regex]::Match(
      $Html,
      $embeddedPattern,
      [Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    if ($embeddedMatch.Success) {
      try {
        $pairs = @($embeddedMatch.Groups["pairs"].Value | ConvertFrom-Json)
        foreach ($pair in $pairs) {
          if (@($pair).Count -ge 2 -and $pair[0] -and $pair[1]) {
            $items += [pscustomobject]@{
              Name = [string]$pair[0]
              PriceText = [string]$pair[1]
            }
          }
        }
      } catch {
        Write-Host "Embedded App Store purchase metadata could not be parsed."
      }
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

function Get-PlanPublishStatus {
  param([AllowNull()][object]$PlanSpec = $null)
  if ($null -ne $PlanSpec -and $PlanSpec.PSObject.Properties.Name -contains "review_only" -and $PlanSpec.review_only -eq $true) {
    return "review"
  }
  return "published"
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
  $publishStatus = Get-PlanPublishStatus -PlanSpec $planSpec
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
  $billingCycle = if (
    $null -ne $planSpec -and
    $planSpec.PSObject.Properties.Name -contains "billing_cycle" -and
    ![string]::IsNullOrWhiteSpace([string]$planSpec.billing_cycle)
  ) {
    ([string]$planSpec.billing_cycle).Trim().ToLowerInvariant()
  } else {
    "monthly"
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
  billing_cycle = $(Quote-SqlString $billingCycle)::billing_cycle,
  status = $(Quote-SqlString $publishStatus)::publish_status,
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
  SELECT id, slug, name, billing_cycle, sort_order
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
    $(Quote-SqlString $billingCycle)::billing_cycle,
    $(Quote-SqlString $publishStatus)::publish_status,
    $effectiveSortOrder,
    NOW(),
    NOW()
  WHERE NOT EXISTS (SELECT 1 FROM existing)
  ON CONFLICT (product_id, slug)
  DO UPDATE SET
    name = EXCLUDED.name,
    billing_cycle = EXCLUDED.billing_cycle,
    status = $(Quote-SqlString $publishStatus)::publish_status,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW()
  RETURNING id, slug, name, billing_cycle, sort_order
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
      SELECT id, slug, name, category, status
      FROM products
      WHERE slug = $(Quote-SqlString $Slug)
      LIMIT 1
    ) p
  ),
  'plans', COALESCE((
    SELECT json_agg(row_to_json(plans))
    FROM (
      SELECT id, slug, name, billing_cycle, sort_order
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
  if ((Get-PlanPublishStatus -PlanSpec $PlanSpec) -eq "review") {
    $reasons += "This new plan requires manual identity and regional price review before publication."
  }

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

function Get-AppStoreSnapshotBillingCycle {
  param([AllowNull()][object]$PlanSpec = $null)
  if ($null -eq $PlanSpec) { return "unknown" }
  if ($PlanSpec.PSObject.Properties.Name -notcontains "billing_cycle") { return "monthly" }
  $cycle = ([string]$PlanSpec.billing_cycle).Trim().ToLowerInvariant()
  if ($cycle -in @("monthly", "yearly", "weekly", "quarterly", "one_time", "lifetime")) { return $cycle }
  return "unknown"
}

function Get-AppStoreObservationTime {
  param([object]$RawSnapshot, [switch]$RequireCapturedAt)

  $captured = $RawSnapshot.capturedAt
  $text = if ($captured -is [DateTimeOffset]) {
    $captured.ToString("o")
  } elseif ($captured -is [DateTime] -and $captured.Kind -ne [DateTimeKind]::Unspecified) {
    $captured.ToUniversalTime().ToString("o")
  } else { [string]$captured }
  if ([string]::IsNullOrWhiteSpace($text)) {
    if ($RequireCapturedAt -or $RawSnapshot.fromCache -eq $true) { throw "app_store_evidence_time_missing" }
    # Legacy direct callers supplied no capture metadata. The normal collector always supplies it.
    return [DateTimeOffset]::UtcNow
  }
  $parsed = [DateTimeOffset]::MinValue
  $explicitTime = '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$'
  if ($text -notmatch $explicitTime -or ![DateTimeOffset]::TryParse(
    $text, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$parsed
  ) -or $parsed -gt [DateTimeOffset]::UtcNow) { throw "app_store_evidence_time_invalid" }
  return $parsed.ToUniversalTime()
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

  $observedAt = Get-AppStoreObservationTime -RawSnapshot $RawSnapshot
  $observedAtSql = (Quote-SqlString $observedAt.ToString("o")) + "::timestamptz"
  if ($DryRun) {
    $anomalyText = if ($AnomalyFlag) { " anomaly=$AnomalyReason" } else { "" }
    Write-Host "[dry-run] $CountryCode $ItemName $ObservedPriceText -> USD $ConvertedUsd via $ParserVersion$anomalyText"
    return "dry-run"
  }

  $existing = 0
  if (!$Force -or $RawSnapshot.fromCache -eq $true) {
    $check = Invoke-PsqlJson @"
WITH scoped AS (
  SELECT id, parser_version, anomaly_flag, raw_price, currency, observed_at, created_at
  FROM price_observations
  WHERE product_id = $(Quote-SqlString $ProductId)::uuid
    AND plan_id = $(Quote-SqlString $PlanId)::uuid
    AND country_id = $(Quote-SqlString $CountryId)::uuid
    AND billing_platform = 'ios'::billing_platform
    AND price_type = 'list_price'::price_type
    AND source_id = $(Quote-SqlString $SourceId)::uuid
    AND status IN ('pending', 'approved', 'ignored')
    AND observed_at <= NOW()
), latest AS (
  SELECT id
  FROM scoped
  ORDER BY observed_at DESC, created_at DESC, id DESC
  LIMIT 1
)
SELECT json_build_object('count', COUNT(*)) AS result
FROM scoped
WHERE parser_version IS NOT DISTINCT FROM $(Quote-SqlString $ParserVersion)
  AND COALESCE(anomaly_flag, FALSE) = $(if ($AnomalyFlag) { "TRUE" } else { "FALSE" })
  AND raw_price = $RawPrice
  AND currency = $(Quote-SqlString $Currency)
  AND (
    -- Replayed source events never become new independent evidence.
    observed_at = $observedAtSql
    OR (
      id = (SELECT id FROM latest)
      AND observed_at > $observedAtSql - INTERVAL '12 hours'
    )
  );
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
  $observedAtSql,
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
    [bool]$Found,
    [object]$CapturedAt
  )

  $evidenceTime = Get-AppStoreObservationTime -RawSnapshot @{capturedAt=$CapturedAt} -RequireCapturedAt
  $evidenceTimeSql = "$(Quote-SqlString ($evidenceTime.ToString('o')))::timestamptz"
  $status = if ($Found) { "available" } else { "pending_absence" }
  $reason = if ($Found) {
    "Canonical plan was present in the latest successful App Store storefront collection."
  } else {
    "Canonical plan was not shown on the public App Store page; the page does not establish complete plan availability."
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
  $evidenceTimeSql,
  $(if ($Found) { $evidenceTimeSql } else { "NULL" }),
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
  status = EXCLUDED.status,
  reason = EXCLUDED.reason,
  checked_at = EXCLUDED.checked_at,
  last_seen_at = CASE
    WHEN EXCLUDED.status = 'available' THEN EXCLUDED.checked_at
    ELSE app_store_plan_availability_checks.last_seen_at
  END,
  updated_at = NOW()
WHERE EXCLUDED.checked_at > app_store_plan_availability_checks.checked_at
  OR (
    EXCLUDED.checked_at = app_store_plan_availability_checks.checked_at
    AND EXCLUDED.status = 'available'
    AND app_store_plan_availability_checks.status <> 'available'
  );
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
  if ([string]$context.product.category -eq "software") {
    throw "Software product '$ProductSlug' requires a maintained subscription plan specification before App Store collection. No plan or price observation was created."
  }
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
  transientCountryCodes = @()
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
    Write-Host "Lightweight App Store collection failed for $code. Falling back to browser rendering."
    Write-Host $_.Exception.Message
    try {
      $renderedPage = Get-AppStoreRenderedPage -CountryCode $code -AppleAppId $AppId -ConfiguredUrl $AppStoreUrl
      $page = [pscustomobject]@{
        Url = $renderedPage.Url
        FinalUrl = $renderedPage.FinalUrl
        Status = $renderedPage.Status
        CapturedAt = $renderedPage.CapturedAt
        FromCache = $renderedPage.FromCache
      }
      $items = @($renderedPage.Items)
      $parserVersion = if ($renderedPage.ParserSource) {
        "$($renderedPage.ParserVersion)/$($renderedPage.ParserSource)"
      } else {
        $renderedPage.ParserVersion
      }
      $collectorName = $renderedPage.CollectorName
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
        $summary.transientCountryCodes += $code
      }
      continue
    }
  }

  $candidateItemsBySlug = @{}
  $ignoredItemCount = 0
  foreach ($item in $items) {
    $planSpec = Resolve-PlanSpec -ProductSpec $productPlanSpec -ItemName $item.Name -ProductName $context.product.name
    $allowIgnoredRecurringItem = Test-PlanAllowsIgnoredRecurringItem -PlanSpec $planSpec -ItemName $item.Name
    if ((Should-IgnoreInAppPurchase -ItemName $item.Name -CountryCode $code) -and !$allowIgnoredRecurringItem) {
      Write-Host "Ignoring non-subscription App Store item: $code $($item.Name)"
      $ignoredItemCount += 1
      continue
    }

    if (!(Test-AppStoreItemMatchesProduct -ItemName $item.Name -ProductName $context.product.name -ProductSpec $productPlanSpec)) {
      Write-Host "Ignoring App Store item that appears to belong to another product: $code $($item.Name)"
      $ignoredItemCount += 1
      continue
    }

    if (!(Test-ProductSpecCountryScope -ProductSpec $productPlanSpec -ItemName $item.Name -CountryCode $code)) {
      Write-Host "Ignoring country-scoped App Store item outside its storefront: $code $($item.Name)"
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
          itemNames = @($_.Group | ForEach-Object { [string]$_.Item.Name } | Sort-Object -Unique)
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
        identityEvidence = "app_store_display_name_only"
        billingCycle = Get-AppStoreSnapshotBillingCycle -PlanSpec $selected.PlanSpec
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
        -Found ($selectedItemsBySlug.ContainsKey($planSlug)) `
        -CapturedAt $page.CapturedAt
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
    $capturedPlanSpec = Resolve-PlanSpec -ProductSpec $productPlanSpec -ItemName $item.Name -ProductName $context.product.name
    $capturedBillingCycle = Get-AppStoreSnapshotBillingCycle -PlanSpec $capturedPlanSpec
    $rawSnapshot = @{
      snapshotSchemaVersion = 1
      capturedAt = [string]$page.CapturedAt
      processedAt = [DateTime]::UtcNow.ToString("o")
      fromCache = [bool]$page.FromCache
      billingCycle = $capturedBillingCycle
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
$collectionOutcome = if ($summary.transientFailures -eq 0) {
  "complete"
} elseif ($summary.confirmedStorefronts -gt 0) {
  "partial_success"
} else {
  "transient_failure"
}
$machineSummary = @{
  collection_outcome = $collectionOutcome
  requested_country_codes = @($CountryCodes | ForEach-Object { $_.ToUpperInvariant() })
  transient_country_codes = @($summary.transientCountryCodes | Select-Object -Unique)
  inserted = [int]$summary.inserted
  skipped = [int]$summary.skipped
  dry_run = [int]$summary.dryRun
  missing = [int]$summary.missing
  confirmed_storefronts = [int]$summary.confirmedStorefronts
  transient_failures = [int]$summary.transientFailures
}
$machineSummaryJson = $machineSummary | ConvertTo-Json -Depth 8 -Compress
Write-Host "GEOSUB_COLLECTION_RESULT=$machineSummaryJson"
if ($summary.transientFailures -gt 0) {
  throw "App Store collection incomplete. $summaryText Temporary storefront failures must be retried.`nGEOSUB_COLLECTION_RESULT=$machineSummaryJson"
}

Write-Host "App Store collection complete. $summaryText"
