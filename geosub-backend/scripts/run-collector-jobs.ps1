param(
  [int]$Limit = 5,
  [string]$JobId,
  [string]$CollectorKind,
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [string[]]$DefaultCountryCodes = @("DEFAULT"),
  [string]$ChromePath = $env:CHROME_PATH,
  [string]$RunId,
  [switch]$DryRun,
  [switch]$Force,
  [switch]$SkipAutoReview
)

$ErrorActionPreference = "Stop"

$utf8Encoding = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8Encoding
[Console]::OutputEncoding = $utf8Encoding
$OutputEncoding = $utf8Encoding

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

function Get-DueJobs {
  $forceSql = if ($Force) { "TRUE" } else { "FALSE" }
  $jobFilterSql = if ([string]::IsNullOrWhiteSpace($JobId)) {
    ""
  } else {
    "AND job.id = $(Quote-SqlString $JobId)::uuid"
  }
  $collectorKindFilterSql = if ([string]::IsNullOrWhiteSpace($CollectorKind)) {
    ""
  } else {
    "AND COALESCE(job.job_config ->> 'collector_kind', source.type::text, 'unknown') = $(Quote-SqlString $CollectorKind)"
  }
  $currentRunFilterSql = if ([string]::IsNullOrWhiteSpace($RunId)) {
    ""
  } else {
    "AND running_run.id <> $(Quote-SqlString $RunId)::uuid"
  }

  $jobs = Invoke-PsqlJson @"
WITH ranked_jobs AS (
  SELECT
    job.id,
    job.product_id,
    job.source_id,
    job.job_type,
    job.schedule,
    job.status,
    job.next_run_at,
    job.error_count,
    job.last_error,
    job.job_config,
    product.slug AS product_slug,
    product.name AS product_name,
    source.type::text AS source_type,
    source.base_url AS source_url,
    job.priority,
    job.created_at,
    COALESCE(job.job_config ->> 'collector_kind', source.type::text, 'unknown') AS collector_kind_key,
    ROW_NUMBER() OVER (
      PARTITION BY
        job.product_id,
        COALESCE(job.job_config ->> 'collector_kind', source.type::text, 'unknown')
      ORDER BY job.priority DESC, job.next_run_at NULLS FIRST, job.created_at
    ) AS product_kind_rank
  FROM collector_jobs job
  JOIN products product ON product.id = job.product_id
  LEFT JOIN price_sources source ON source.id = job.source_id
  WHERE job.status = 'active'
    AND job.job_type = 'ai_pricing'
    $jobFilterSql
    $collectorKindFilterSql
    AND (
      $forceSql
      OR job.next_run_at IS NULL
      OR job.next_run_at <= NOW()
    )
    AND NOT EXISTS (
      SELECT 1
      FROM collector_job_runs running_run
      WHERE running_run.job_id = job.id
        AND running_run.status = 'running'
        AND running_run.started_at > NOW() - INTERVAL '20 minutes'
        $currentRunFilterSql
    )
)
SELECT COALESCE(json_agg(row_to_json(j)), '[]'::json)
FROM (
  SELECT
    id,
    product_id,
    source_id,
    job_type,
    schedule,
    status,
    next_run_at,
    error_count,
    last_error,
    job_config,
    product_slug,
    product_name,
    source_type,
    source_url
  FROM ranked_jobs
  WHERE product_kind_rank = 1
  ORDER BY priority DESC, next_run_at NULLS FIRST, created_at
  LIMIT $Limit
) j;
"@

  if ($null -eq $jobs) {
    return @()
  }

  return @($jobs | Where-Object { $_ -and $_.id })
}

function Get-ConfigValue {
  param([object]$Config, [string]$Name, [AllowNull()][string]$Fallback = $null)

  if ($Config -and $Config.PSObject.Properties.Name -contains $Name) {
    $value = $Config.$Name
    if ($null -ne $value -and ![string]::IsNullOrWhiteSpace([string]$value)) {
      return [string]$value
    }
  }

  return $Fallback
}

function Get-CountryCodes {
  param([object]$Config)

  if ($Config -and $Config.PSObject.Properties.Name -contains "country_codes" -and $Config.country_codes) {
    return @($Config.country_codes | ForEach-Object { [string]$_ })
  }

  return @($DefaultCountryCodes)
}

function Get-NextRunSql {
  param([object]$Job, [string]$Status)

  if ($Status -eq "failed") {
    return "NOW() + INTERVAL '6 hours'"
  }

  $schedule = if (![string]::IsNullOrWhiteSpace([string]$Job.schedule)) {
    [string]$Job.schedule
  } else {
    Get-ConfigValue -Config $Job.job_config -Name "schedule_strategy" -Fallback "daily_light"
  }

  $intervalHours = Get-ConfigValue -Config $Job.job_config -Name "interval_hours"
  if (![string]::IsNullOrWhiteSpace($intervalHours)) {
    $parsed = 0
    if ([int]::TryParse($intervalHours, [ref]$parsed) -and $parsed -gt 0 -and $parsed -le 720) {
      return "NOW() + INTERVAL '$parsed hours'"
    }
  }

  switch ($schedule) {
    "anomaly_watch" { return "NOW() + INTERVAL '6 hours'" }
    "weekly_full" { return "NOW() + INTERVAL '7 days'" }
    "monthly_audit" { return "NOW() + INTERVAL '30 days'" }
    "daily_light" { return "NOW() + INTERVAL '24 hours'" }
    "daily" { return "NOW() + INTERVAL '24 hours'" }
    default { return "NOW() + INTERVAL '24 hours'" }
  }
}

function Get-FailureNextRunSql {
  param([int]$Attempt)

  switch ($Attempt) {
    1 { return "NOW() + INTERVAL '30 minutes'" }
    2 { return "NOW() + INTERVAL '2 hours'" }
    default { return "NOW() + INTERVAL '6 hours'" }
  }
}

function Test-PermanentCollectorFailure {
  param([object]$Job, [object]$Result)

  $kind = Get-ConfigValue -Config $Job.job_config -Name "collector_kind" -Fallback "unknown"
  $errorText = [string]$Result.Error
  $unsupported = $Result.RawPayload -and $Result.RawPayload.unsupported

  if ($unsupported -or $kind -notin @("app_store", "google_play", "pricing_page", "official_site")) {
    return $true
  }

  if ($kind -eq "app_store" -and [string]::IsNullOrWhiteSpace((Get-ConfigValue -Config $Job.job_config -Name "app_store_id"))) {
    return $true
  }

  if ($kind -eq "google_play" -and [string]::IsNullOrWhiteSpace((Get-ConfigValue -Config $Job.job_config -Name "google_play_package"))) {
    return $true
  }

  return $errorText -match "missing (app_store_id|google_play_package|url/base_url)|Collector identity mismatch|No collector is implemented"
}

function Invoke-OperationalRecovery {
  if ($DryRun) {
    return
  }

  try {
    Invoke-Psql @"
SELECT *
FROM run_operational_recovery_cycle('collector_runner');
"@
  } catch {
    Write-Host "Operational recovery cycle failed: $($_.Exception.Message)"
    throw
  }
}

function Repair-ResolvedSharedSpecFailures {
  if ($DryRun) {
    return
  }

  $specPath = Join-Path (Split-Path $PSScriptRoot -Parent) "data/product-plan-specs.json"
  try {
    Get-Content -LiteralPath $specPath -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
  } catch {
    throw "Product plan specification JSON is invalid. $($_.Exception.Message)"
  }

  Invoke-Psql @"
WITH repaired_jobs AS (
  UPDATE collector_jobs
  SET
    status = 'active',
    next_run_at = NOW(),
    error_count = 0,
    last_error = NULL,
    job_config = COALESCE(job_config, '{}'::jsonb)
      - 'operational_state'
      - 'operational_note'
      - 'retry_attempt'
      - 'last_failure_at'
      - 'last_recovered_at',
    updated_at = NOW()
  WHERE status = 'failed'
    AND job_config ->> 'operational_state' = 'retry_exhausted'
    AND (
      last_error ILIKE 'Invalid array passed in%'
      OR last_error ILIKE '%ConvertFrom-Json%'
      OR last_error ILIKE '%product plan specification JSON is invalid%'
    )
  RETURNING id
), repaired_count AS (
  SELECT COUNT(*)::int AS count
  FROM repaired_jobs
)
INSERT INTO operational_recovery_cycles (
  trigger_kind,
  transient_jobs_requeued,
  details
)
SELECT
  'shared_spec_repaired',
  repaired_count.count,
  jsonb_build_object('reason', 'shared_product_plan_spec_validated')
FROM repaired_count
WHERE repaired_count.count > 0;
"@
}

function Queue-AppStoreRechecks {
  if ($DryRun) {
    return
  }

  try {
    Invoke-Psql @"
SELECT *
FROM run_data_quality_repair_cycle('collector_runner');
"@
  } catch {
    Write-Host "App Store recheck queue skipped: $($_.Exception.Message)"
  }
}

function Get-PlainTextFromHtml {
  param([AllowNull()][string]$Html)

  if ([string]::IsNullOrWhiteSpace($Html)) {
    return ""
  }

  $text = [regex]::Replace($Html, "(?is)<script\b[^>]*>.*?</script>", " ")
  $text = [regex]::Replace($text, "(?is)<style\b[^>]*>.*?</style>", " ")
  $text = [regex]::Replace($text, "(?is)<[^>]+>", " ")
  $text = [System.Net.WebUtility]::HtmlDecode($text)
  $text = [regex]::Replace($text, "\s+", " ").Trim()
  return $text
}

function Get-HtmlTitle {
  param([AllowNull()][string]$Html)

  if ([string]::IsNullOrWhiteSpace($Html)) {
    return $null
  }

  $match = [regex]::Match($Html, "(?is)<title[^>]*>(.*?)</title>")
  if (!$match.Success) {
    return $null
  }

  return ([System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value) -replace "\s+", " ").Trim()
}

function Get-MetaDescription {
  param([AllowNull()][string]$Html)

  if ([string]::IsNullOrWhiteSpace($Html)) {
    return $null
  }

  $match = [regex]::Match($Html, "(?is)<meta\s+[^>]*(?:name|property)=['""](?:description|og:description)['""][^>]*content=['""]([^'""]+)['""][^>]*>")
  if (!$match.Success) {
    $match = [regex]::Match($Html, "(?is)<meta\s+[^>]*content=['""]([^'""]+)['""][^>]*(?:name|property)=['""](?:description|og:description)['""][^>]*>")
  }
  if (!$match.Success) {
    return $null
  }

  return ([System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value) -replace "\s+", " ").Trim()
}

function Get-PriceHints {
  param([AllowNull()][string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return @()
  }

  $patterns = @(
    "(?i)(?:US\$|CA\$|A\$|HK\$|NT\$|S\$|\$)\s?\d+(?:[.,]\d{1,2})?(?:\s?/(?:mo|month|monthly|yr|year|annually))?",
    "(?i)\d+(?:[.,]\d{1,2})?\s?(?:USD|CAD|AUD|EUR|GBP|JPY|INR|PHP|SGD|HKD)(?:\s?/(?:mo|month|monthly|yr|year|annually))?"
  )

  $seen = @{}
  $hints = New-Object System.Collections.Generic.List[string]

  foreach ($pattern in $patterns) {
    foreach ($match in [regex]::Matches($Text, $pattern)) {
      $value = ($match.Value -replace "\s+", " ").Trim()
      $key = $value.ToLowerInvariant()
      if (!$seen.ContainsKey($key)) {
        $seen[$key] = $true
        [void]$hints.Add($value)
      }
      if ($hints.Count -ge 20) {
        return @($hints)
      }
    }
  }

  return @($hints)
}

function Get-WebSnapshotDiagnosis {
  param(
    [AllowNull()][string]$Title,
    [AllowNull()][string]$FinalUrl,
    [AllowNull()][string]$Text,
    [object[]]$PriceHints,
    [bool]$AttemptPriceHints
  )

  $titleText = if ($Title) { $Title.ToLowerInvariant() } else { "" }
  $urlText = if ($FinalUrl) { $FinalUrl.ToLowerInvariant() } else { "" }
  $bodyText = if ($Text) { $Text.ToLowerInvariant() } else { "" }

  if (
    $urlText -match "accounts\.google\.com|/login|/signin|/auth" -or
    $titleText -match "sign in|log in|login" -or
    $bodyText -match "sign in to continue|log in to continue"
  ) {
    return "login_required"
  }

  if ($AttemptPriceHints -and (!$PriceHints -or $PriceHints.Count -eq 0)) {
    return "no_price_hints"
  }

  if ($AttemptPriceHints) {
    return "price_hints_found"
  }

  return "snapshot_ok"
}

function Invoke-BrowserWebSnapshot {
  param(
    [string]$Url,
    [string]$Locale = "en-US"
  )

  $scriptPath = Join-Path $PSScriptRoot "render-web-snapshot.mjs"
  $arguments = @(
    $scriptPath,
    "--url", $Url,
    "--locale", $Locale
  )

  if (![string]::IsNullOrWhiteSpace($ChromePath)) {
    $arguments += @("--chrome-path", $ChromePath)
  }

  $output = & node @arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output | ForEach-Object { [string]$_ }) -join "`n"

  if ($exitCode -ne 0) {
    return [pscustomobject]@{
      ok = $false
      error = "Browser snapshot failed with exit code $exitCode. $text"
    }
  }

  try {
    return $text | ConvertFrom-Json
  } catch {
    return [pscustomobject]@{
      ok = $false
      error = "Browser snapshot returned invalid JSON. $text"
    }
  }
}

function Should-TryBrowserSnapshot {
  param([string]$Diagnosis, [bool]$AttemptPriceHints)

  if (!$AttemptPriceHints) {
    return $false
  }

  return $Diagnosis -eq "login_required" -or $Diagnosis -eq "no_price_hints"
}

function Invoke-GenericWebSnapshot {
  param(
    [object]$Job,
    [string]$Kind,
    [AllowNull()][string]$Url,
    [bool]$AttemptPriceHints
  )

  if ([string]::IsNullOrWhiteSpace($Url)) {
    throw "Generic web collector job is missing url/base_url."
  }

  $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 45 -Headers @{
    "User-Agent" = "GeoSubBot/0.1 (+https://geosub.local; pricing discovery)"
    "Accept-Language" = "en-US,en;q=0.9,zh-CN;q=0.8"
  }

  $html = [string]$response.Content
  $title = Get-HtmlTitle -Html $html
  $description = Get-MetaDescription -Html $html
  $plainText = Get-PlainTextFromHtml -Html $html
  $priceHints = if ($AttemptPriceHints) { @(Get-PriceHints -Text $plainText) } else { @() }
  $snippetLength = [Math]::Min(360, $plainText.Length)
  $snippet = if ($snippetLength -gt 0) { $plainText.Substring(0, $snippetLength) } else { "" }
  $finalUrl = if ($response.BaseResponse -and $response.BaseResponse.ResponseUri) { [string]$response.BaseResponse.ResponseUri } else { $Url }
  $statusCode = if ($response.StatusCode) { [int]$response.StatusCode } else { $null }
  $diagnosis = Get-WebSnapshotDiagnosis `
    -Title $title `
    -FinalUrl $finalUrl `
    -Text $plainText `
    -PriceHints $priceHints `
    -AttemptPriceHints $AttemptPriceHints
  $browserSnapshot = $null

  if (Should-TryBrowserSnapshot -Diagnosis $diagnosis -AttemptPriceHints $AttemptPriceHints) {
    $browserSnapshot = Invoke-BrowserWebSnapshot -Url $finalUrl
    if ($browserSnapshot -and $browserSnapshot.ok -and $browserSnapshot.diagnosis) {
      $diagnosis = [string]$browserSnapshot.diagnosis
      if ($browserSnapshot.price_hints) {
        $priceHints = @($browserSnapshot.price_hints | ForEach-Object { [string]$_ })
      }
      if ($browserSnapshot.title) {
        $title = [string]$browserSnapshot.title
      }
      if ($browserSnapshot.final_url) {
        $finalUrl = [string]$browserSnapshot.final_url
      }
    }
  }

  $hintText = if ($priceHints.Count -gt 0) { $priceHints -join ", " } else { "none" }
  $output = "Fetched web page. diagnosis=$diagnosis; title=$title; price_hints=$hintText"

  return [pscustomobject]@{
    Status = "succeeded"
    CollectorKind = $Kind
    Output = $output
    Error = $null
    RawPayload = @{
      collector_kind = $Kind
      product_slug = [string]$Job.product_slug
      source_url = $Url
      final_url = $finalUrl
      http_status = $statusCode
      diagnosis = $diagnosis
      title = $title
      description = $description
      price_hints = @($priceHints)
      text_snippet = $snippet
      text_length = $plainText.Length
      snapshot_only = $true
      browser_snapshot = $browserSnapshot
    }
  }
}

function Invoke-CollectorScript {
  param([object]$Job)

  $config = $Job.job_config
  $kind = Get-ConfigValue -Config $config -Name "collector_kind" -Fallback "unknown"
  $productSlug = [string]$Job.product_slug
  $countryCodes = Get-CountryCodes -Config $config

  if ($DryRun) {
    Write-Host "[dry-run] job $($Job.id): kind=$kind product=$productSlug countries=$($countryCodes -join ',')"
    return [pscustomobject]@{
      Status = "skipped"
      CollectorKind = $kind
      Output = "Dry run only."
      Error = $null
      RawPayload = @{ dry_run = $true; collector_kind = $kind }
    }
  }

  $scriptPath = $null
  $scriptParameters = @{}
  $expectedIdentity = $null

  switch ($kind) {
    "app_store" {
      $appId = Get-ConfigValue -Config $config -Name "app_store_id"
      if ([string]::IsNullOrWhiteSpace($appId)) {
        throw "App Store collector job is missing app_store_id."
      }

      $scriptPath = Join-Path $PSScriptRoot "collect-app-store-prices.ps1"
      $appStoreUrl = Get-ConfigValue -Config $config -Name "url" -Fallback $Job.source_url
      $scriptParameters = @{
        ProductSlug = $productSlug
        AppId = $appId
        AppStoreUrl = $appStoreUrl
        CountryCodes = @($countryCodes)
        ContainerName = $ContainerName
        DbName = $DbName
        DbUser = $DbUser
        Force = $true
      }
      $expectedIdentity = "Using App Store app id $appId for $productSlug."

      if (![string]::IsNullOrWhiteSpace($ChromePath)) {
        $scriptParameters.ChromePath = $ChromePath
      }
    }
    "google_play" {
      $packageName = Get-ConfigValue -Config $config -Name "google_play_package"
      if ([string]::IsNullOrWhiteSpace($packageName)) {
        throw "Google Play collector job is missing google_play_package."
      }

      $scriptPath = Join-Path $PSScriptRoot "collect-google-play-prices.ps1"
      $scriptParameters = @{
        ProductSlug = $productSlug
        PackageName = $packageName
        CountryCodes = @($countryCodes)
        ContainerName = $ContainerName
        DbName = $DbName
        DbUser = $DbUser
        Force = $true
      }
    }
    "pricing_page" {
      $genericUrl = Get-ConfigValue -Config $config -Name "url" -Fallback $Job.source_url
      return Invoke-GenericWebSnapshot -Job $Job -Kind $kind -Url $genericUrl -AttemptPriceHints $true
    }
    "official_site" {
      $siteUrl = Get-ConfigValue -Config $config -Name "url" -Fallback $Job.source_url
      return Invoke-GenericWebSnapshot -Job $Job -Kind $kind -Url $siteUrl -AttemptPriceHints $false
    }
    default {
      return [pscustomobject]@{
        Status = "skipped"
        CollectorKind = $kind
        Output = "No collector is implemented for collector_kind '$kind'."
        Error = $null
        RawPayload = @{ unsupported = $true; collector_kind = $kind }
      }
    }
  }

  $output = & $scriptPath @scriptParameters *>&1
  $exitCode = if ($?) { 0 } else { 1 }
  $text = ($output | ForEach-Object { [string]$_ }) -join "`n"

  if ($exitCode -ne 0) {
    throw "Collector script failed with exit code $exitCode. $text"
  }

  if ($expectedIdentity -and $text -notlike "*$expectedIdentity*") {
    throw "Collector identity mismatch. Expected '$expectedIdentity' Output: $text"
  }

  return [pscustomobject]@{
    Status = "succeeded"
    CollectorKind = $kind
    Output = $text
    Error = $null
    RawPayload = @{ collector_kind = $kind; script = [IO.Path]::GetFileName($scriptPath) }
  }
}

function Start-JobRun {
  param(
    [object]$Job,
    [datetime]$StartedAt,
    [AllowNull()][string]$ExistingRunId
  )

  if ($DryRun) {
    return $null
  }

  if (![string]::IsNullOrWhiteSpace($ExistingRunId)) {
    Invoke-Psql @"
UPDATE collector_job_runs
SET raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
  'state', 'started',
  'runner_started_at', NOW()
)
WHERE id = $(Quote-SqlString $ExistingRunId)::uuid
  AND status = 'running';
"@
    return $ExistingRunId
  }

  try {
    $run = Invoke-PsqlJson @"
WITH inserted AS (
  INSERT INTO collector_job_runs (
    id,
    job_id,
    product_id,
    source_id,
    status,
    collector_kind,
    started_at,
    raw_payload,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    $(Quote-SqlString $Job.id)::uuid,
    $(Quote-SqlString $Job.product_id)::uuid,
    $(if ($Job.source_id) { "$(Quote-SqlString $Job.source_id)::uuid" } else { "NULL" }),
    'running',
    $(Quote-SqlString (Get-ConfigValue -Config $Job.job_config -Name "collector_kind" -Fallback "unknown")),
    $(Quote-SqlString ($StartedAt.ToUniversalTime().ToString("o")))::timestamptz,
    '{"state":"started"}'::jsonb,
    NOW()
  )
  RETURNING id::text
)
SELECT row_to_json(inserted) FROM inserted;
"@

    return [string]$run.id
  } catch {
    Write-Host "Could not create running collector run row: $($_.Exception.Message)"
    return $null
  }
}

function Set-JobRunAwaitingReview {
  param(
    [AllowNull()][string]$RunId,
    [object]$Result
  )

  if ($DryRun -or [string]::IsNullOrWhiteSpace($RunId)) {
    return
  }

  $output = if ($Result.Output -and $Result.Output.Length -gt 2000) {
    $Result.Output.Substring(0, 2000)
  } else {
    $Result.Output
  }

  Invoke-Psql @"
UPDATE collector_job_runs
SET
  output_excerpt = $(Quote-SqlString $output),
  raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
    'state', 'collected_waiting_review',
    'collector_status', $(Quote-SqlString ([string]$Result.Status))
  )
WHERE id = $(Quote-SqlString $RunId)::uuid
  AND status = 'running';
"@
}

function Complete-JobRun {
  param(
    [object]$Job,
    [object]$Result,
    [datetime]$StartedAt,
    [AllowNull()][string]$RunId
  )

  if ($DryRun) {
    return
  }

  $finishedAt = Get-Date
  $durationMs = [int]([Math]::Max(0, ($finishedAt - $StartedAt).TotalMilliseconds))
  $output = if ($Result.Output -and $Result.Output.Length -gt 2000) { $Result.Output.Substring(0, 2000) } else { $Result.Output }
  $status = [string]$Result.Status
  $errorMessage = if ($Result.Error) { [string]$Result.Error } else { $null }
  $nextRunSql = Get-NextRunSql -Job $Job -Status $status
  $jobStatusSql = "'active'"
  $jobConfigSql = "job_config"
  $errorCountSql = "error_count"
  $lastErrorSql = "last_error"
  $failureAttempt = [int]$Job.error_count + 1
  $permanentFailure = Test-PermanentCollectorFailure -Job $Job -Result $Result
  $unsupportedFailure = $status -eq "skipped" -and $permanentFailure
  $failedAttempt = $status -eq "failed" -or $unsupportedFailure

  if ($status -eq "succeeded") {
    $errorCountSql = "0"
    $lastErrorSql = "NULL"
    $jobConfigSql = "COALESCE(job_config, '{}'::jsonb) - 'operational_state' - 'operational_note' - 'retry_attempt' - 'last_failure_at' - 'last_recovered_at'"
  }

  if ($failedAttempt) {
    $errorCountSql = "error_count + 1"
    $jobLastError = if ($errorMessage) { $errorMessage } else { [string]$output }
    $lastErrorSql = Quote-SqlString $jobLastError
    $operationalState = if ($permanentFailure) {
      "permanent_failure"
    } elseif ($failureAttempt -gt 3) {
      "retry_exhausted"
    } else {
      "retry_scheduled"
    }
    $operationalNote = if ($permanentFailure) {
      "Collector configuration is incomplete or unsupported."
    } elseif ($failureAttempt -gt 3) {
      "Automatic retry attempts were exhausted."
    } else {
      "Transient collector failure scheduled for automatic retry."
    }

    if ($permanentFailure -or $failureAttempt -gt 3) {
      $nextRunSql = "NULL"
      $jobStatusSql = "'failed'"
    } else {
      $nextRunSql = Get-FailureNextRunSql -Attempt $failureAttempt
      $jobStatusSql = "'active'"
    }

    $jobConfigSql = @"
COALESCE(job_config, '{}'::jsonb) || jsonb_build_object(
    'operational_state', $(Quote-SqlString $operationalState),
    'operational_note', $(Quote-SqlString $operationalNote),
    'retry_attempt', $failureAttempt,
    'last_failure_at', NOW()
  )
"@
  }

  if ($Job.schedule -eq "stale_refresh" -and $status -eq "succeeded") {
    $nextRunSql = "NULL"
    $jobStatusSql = "'paused'"
    $jobConfigSql = @"
jsonb_set(
    $jobConfigSql,
    '{stale_success_count}',
    TO_JSONB(COALESCE((job_config ->> 'stale_success_count')::INTEGER, 0) + 1),
    TRUE
  )
"@
  }

  if ($Job.schedule -eq "coverage_refresh" -and $status -eq "succeeded") {
    $nextRunSql = "NULL"
    $jobStatusSql = "'paused'"
    $jobConfigSql = @"
jsonb_set(
    $jobConfigSql,
    '{coverage_success_count}',
    TO_JSONB(COALESCE((job_config ->> 'coverage_success_count')::INTEGER, 0) + 1),
    TRUE
  )
"@
  }

  if ($Job.schedule -eq "anomaly_watch" -and $status -eq "succeeded") {
    $nextRunSql = "NULL"
    $jobStatusSql = "'paused'"
    $jobConfigSql = @"
jsonb_set(
    $jobConfigSql,
    '{anomaly_success_count}',
    TO_JSONB(COALESCE((job_config ->> 'anomaly_success_count')::INTEGER, 0) + 1),
    TRUE
  )
"@
  }

  $runWriteSql = if (![string]::IsNullOrWhiteSpace($RunId)) {
@"
UPDATE collector_job_runs
SET
  status = $(Quote-SqlString $status),
  finished_at = $(Quote-SqlString ($finishedAt.ToUniversalTime().ToString("o")))::timestamptz,
  duration_ms = $durationMs,
  error_message = $(Quote-SqlString $errorMessage),
  output_excerpt = $(Quote-SqlString $output),
  raw_payload = $(Quote-SqlJson $Result.RawPayload)
WHERE id = $(Quote-SqlString $RunId)::uuid;
"@
  } else {
@"
INSERT INTO collector_job_runs (
  id,
  job_id,
  product_id,
  source_id,
  status,
  collector_kind,
  started_at,
  finished_at,
  duration_ms,
  error_message,
  output_excerpt,
  raw_payload,
  created_at
)
VALUES (
  gen_random_uuid(),
  $(Quote-SqlString $Job.id)::uuid,
  $(Quote-SqlString $Job.product_id)::uuid,
  $(if ($Job.source_id) { "$(Quote-SqlString $Job.source_id)::uuid" } else { "NULL" }),
  $(Quote-SqlString $status),
  $(Quote-SqlString $Result.CollectorKind),
  $(Quote-SqlString ($StartedAt.ToUniversalTime().ToString("o")))::timestamptz,
  $(Quote-SqlString ($finishedAt.ToUniversalTime().ToString("o")))::timestamptz,
  $durationMs,
  $(Quote-SqlString $errorMessage),
  $(Quote-SqlString $output),
  $(Quote-SqlJson $Result.RawPayload),
  NOW()
);
"@
  }

$jobWriteSql = @"
UPDATE collector_jobs
SET
  last_run_at = NOW(),
  next_run_at = $nextRunSql,
  success_count = success_count + $(if ($status -eq "succeeded") { 1 } else { 0 }),
  error_count = $errorCountSql,
  last_error = $lastErrorSql,
  status = $jobStatusSql,
  job_config = $jobConfigSql,
  updated_at = NOW()
WHERE id = $(Quote-SqlString $Job.id)::uuid;
"@

  Invoke-Psql ($runWriteSql + "`n" + $jobWriteSql)
}

function Get-AppStoreReviewOutcome {
  param(
    [object]$Job,
    [datetime]$StartedAt
  )

  $startedAtSql = Quote-SqlString ($StartedAt.ToUniversalTime().ToString("o"))
  return Invoke-PsqlJson @"
SELECT row_to_json(outcome)
FROM (
  SELECT
    COUNT(observation.id)::int AS observed_count,
    COUNT(*) FILTER (
      WHERE observation.status = 'approved'::observation_status
    )::int AS approved_count,
    COUNT(*) FILTER (
      WHERE observation.status = 'pending'::observation_status
        AND NOT COALESCE(observation.anomaly_flag, FALSE)
    )::int AS pending_stability_count,
    COUNT(*) FILTER (
      WHERE COALESCE(observation.anomaly_flag, FALSE)
        OR observation.status IN (
          'rejected'::observation_status,
          'ignored'::observation_status
        )
    )::int AS isolated_count,
    COUNT(*) FILTER (
      WHERE observation.status = 'rejected'::observation_status
    )::int AS rejected_count,
    COUNT(*) FILTER (
      WHERE observation.status = 'ignored'::observation_status
    )::int AS ignored_count,
    COUNT(*) FILTER (
      WHERE COALESCE(observation.anomaly_flag, FALSE)
    )::int AS anomaly_count,
    (
      SELECT COUNT(price.id)::int
      FROM region_prices price
      WHERE price.product_id = $(Quote-SqlString $Job.product_id)::uuid
        AND price.status = 'published'::publish_status
        AND price.last_checked_at >= $startedAtSql::timestamptz
        AND price.last_checked_at <= NOW() + INTERVAL '1 minute'
    ) AS published_price_count,
    (
      SELECT COUNT(DISTINCT availability.country_id)::int
      FROM app_store_availability_checks availability
      WHERE availability.product_id = $(Quote-SqlString $Job.product_id)::uuid
        AND availability.checked_at >= $startedAtSql::timestamptz
        AND availability.checked_at <= NOW() + INTERVAL '1 minute'
    ) AS storefront_count,
    NOW() AS captured_at
  FROM price_observations observation
  WHERE observation.product_id = $(Quote-SqlString $Job.product_id)::uuid
    AND observation.observed_at >= $startedAtSql::timestamptz
    AND observation.observed_at <= NOW() + INTERVAL '1 minute'
) outcome;
"@
}

function Add-AppStoreReviewOutcome {
  param(
    [object]$Job,
    [object]$Result,
    [datetime]$StartedAt
  )

  $outcome = Get-AppStoreReviewOutcome -Job $Job -StartedAt $StartedAt
  $payload = @{}

  if ($Result.RawPayload -is [System.Collections.IDictionary]) {
    foreach ($key in $Result.RawPayload.Keys) {
      $payload[[string]$key] = $Result.RawPayload[$key]
    }
  } elseif ($Result.RawPayload) {
    foreach ($property in $Result.RawPayload.PSObject.Properties) {
      $payload[$property.Name] = $property.Value
    }
  }

  $payload["auto_review_status"] = "succeeded"
  $payload["review_outcome"] = $outcome
  $payload["country_codes"] = @(Get-CountryCodes -Config $Job.job_config)
  $payload["schedule"] = [string]$Job.schedule
  $Result.RawPayload = $payload
  return $Result
}

Repair-ResolvedSharedSpecFailures
Invoke-OperationalRecovery
Queue-AppStoreRechecks

$jobs = @(Get-DueJobs)
$requestedRunId = $RunId

if ($jobs.Count -eq 0) {
  Write-Host "No collector jobs are due."
  return
}

$summary = @{
  checked = 0
  succeeded = 0
  skipped = 0
  failed = 0
  appStoreSucceeded = 0
}
$pendingAppStoreCompletions = @()

foreach ($job in $jobs) {
  $summary.checked += 1
  $startedAt = Get-Date
  $existingRunId = if ($summary.checked -eq 1) { $requestedRunId } else { $null }
  $jobRunId = Start-JobRun -Job $job -StartedAt $startedAt -ExistingRunId $existingRunId
  Write-Host "Running collector job: $($job.id) product=$($job.product_slug)"

  try {
    $result = Invoke-CollectorScript -Job $job
    if ($result.Status -eq "succeeded") { $summary.succeeded += 1 }
    elseif ($result.Status -eq "skipped") { $summary.skipped += 1 }
    else { $summary.failed += 1 }
    if ($result.Status -eq "succeeded" -and $result.CollectorKind -eq "app_store") {
      $summary.appStoreSucceeded += 1
    }
    if (
      !$SkipAutoReview -and
      $result.Status -eq "succeeded" -and
      $result.CollectorKind -eq "app_store"
    ) {
      Set-JobRunAwaitingReview -RunId $jobRunId -Result $result
      $pendingAppStoreCompletions += [pscustomobject]@{
        Job = $job
        Result = $result
        StartedAt = $startedAt
        RunId = $jobRunId
      }
    } else {
      Complete-JobRun -Job $job -Result $result -StartedAt $startedAt -RunId $jobRunId
    }
  } catch {
    $summary.failed += 1
    $failedResult = [pscustomobject]@{
      Status = "failed"
      CollectorKind = Get-ConfigValue -Config $job.job_config -Name "collector_kind" -Fallback "unknown"
      Output = $null
      Error = $_.Exception.Message
      RawPayload = @{ error = $_.Exception.Message }
    }
    Complete-JobRun -Job $job -Result $failedResult -StartedAt $startedAt -RunId $jobRunId
    Write-Host "Failed: $($_.Exception.Message)"
  }
}

if (!$SkipAutoReview -and $pendingAppStoreCompletions.Count -gt 0) {
  Write-Host "Running App Store stability auto-review after collection."
  try {
    Invoke-Psql @"
SELECT refresh_matching_app_store_prices() AS revalidated_prices;

SELECT *
FROM run_app_store_stability_auto_review(FALSE, 3, 80, 14);

SELECT quarantine_published_app_store_price_outliers() AS quarantined_published_outliers;

SELECT quarantine_unconfirmed_stale_app_store_prices(14, 3) AS quarantined_unconfirmed_stale_prices;

SELECT *
FROM close_exhausted_app_store_anomalies(3);

SELECT refresh_plan_affordability_metrics() AS refreshed_rows;

SELECT refresh_inferred_app_store_tax_profiles() AS inserted_tax_profiles;
"@

    foreach ($completion in $pendingAppStoreCompletions) {
      $completedResult = Add-AppStoreReviewOutcome `
        -Job $completion.Job `
        -Result $completion.Result `
        -StartedAt $completion.StartedAt
      Complete-JobRun `
        -Job $completion.Job `
        -Result $completedResult `
        -StartedAt $completion.StartedAt `
        -RunId $completion.RunId
    }
  } catch {
    $reviewError = $_.Exception.Message
    $summary.succeeded -= $pendingAppStoreCompletions.Count
    $summary.failed += $pendingAppStoreCompletions.Count

    foreach ($completion in $pendingAppStoreCompletions) {
      $failedResult = [pscustomobject]@{
        Status = "failed"
        CollectorKind = "app_store"
        Output = $completion.Result.Output
        Error = "Automatic review failed after collection: $reviewError"
        RawPayload = @{
          error = $reviewError
          collector_status = $completion.Result.Status
          collector_payload = $completion.Result.RawPayload
          auto_review_status = "failed"
        }
      }
      Complete-JobRun `
        -Job $completion.Job `
        -Result $failedResult `
        -StartedAt $completion.StartedAt `
        -RunId $completion.RunId
    }

    Write-Host "App Store auto-review failed. Affected jobs were scheduled for retry: $reviewError"
  }
}

Write-Host "Collector jobs complete. Checked: $($summary.checked). Succeeded: $($summary.succeeded). Skipped: $($summary.skipped). Failed: $($summary.failed)."
