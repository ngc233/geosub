param([string]$WritesPath, [switch]$ClockOnly, [string]$EvidenceProductId, [DateTime]$EvidenceStartedAt)
$ErrorActionPreference = 'Stop'
$collector = Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$errors = $null; $tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($collector, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Collector syntax invalid' }
foreach ($definition in $ast.FindAll({param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst]
}, $false)) {
  $text = $definition.Extent.Text
  if ($definition.Name -in @('Get-AppStoreRenderedPage', 'Load-ProductPlanSpecs')) {
    $scriptsPath = (Split-Path $collector -Parent).Replace("'", "''")
    $text = $text.Replace('$PSScriptRoot', "'$scriptsPath'")
  }
  . ([scriptblock]::Create($text))
}
function Expect($ok, $label) { if (!$ok) { throw "FAIL: $label" }; Write-Output "PASS: $label" }
if ($ClockOnly) {
  $AppStoreCacheDirectory = Join-Path ([IO.Path]::GetTempPath()) ('geosub-sampling-clock-' + [Guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($AppStoreCacheDirectory)
  try {
    $AppStoreCacheTtlMinutes = 720; $AppStoreMaxRetries = 0
    $AppStoreUserAgent = 'Isolated fixture'; $ChromePath = 'synthetic-no-browser'
    $url = Get-AppStoreUrl -CountryCode 'US' -AppleAppId '6448311069'
    $cache = Get-AppStoreCachePath -Kind 'html' -Url $url
    $cacheTime=[DateTime]::UtcNow.AddHours(-1)
    $cacheRecord=@{html='<p>Public fixture</p>';finalUrl=$url;status=200;capturedAt=$cacheTime.ToString('o')}
    Set-AppStoreCacheContent -Path $cache -Content ($cacheRecord | ConvertTo-Json -Compress) -CapturedAt $cacheTime
    $expectedTime = (Get-Item -LiteralPath $cache).LastWriteTimeUtc.ToString('o')
    function Invoke-WebRequest { throw 'Unexpected network request in cache test' }
    function Wait-AppStoreRequestSlot {}
    $page = Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069'
    Expect ($page.FromCache -eq $true -and [DateTimeOffset]::Parse($page.CapturedAt) -eq [DateTimeOffset]::Parse($expectedTime)) 'static cache retains its evidence time'
    [IO.File]::SetLastWriteTimeUtc($cache, [DateTime]::UtcNow.AddHours(-12))
    Expect ($null -eq (Get-FreshAppStoreCacheContent -Path $cache)) 'cache expires at the independent sample boundary'
    [IO.File]::SetLastWriteTimeUtc($cache, [DateTime]::UtcNow.AddHours(1))
    Expect ($null -eq (Get-FreshAppStoreCacheContent -Path $cache)) 'future cache file is not fresh evidence'
    $renderCache = Get-AppStoreCachePath -Kind 'json' -Url $url
    $renderTime = [DateTime]::UtcNow.AddHours(-2).ToString('o')
    $rendered = @{ok=$true;url=$url;finalUrl=$url;status=200;capturedAt=$renderTime
      items=@(@{name='Plus';priceText='$20.00'});parserSource='embedded-json';hasInAppPurchasesSection=$true}
    Set-AppStoreCacheContent -Path $renderCache -Content ($rendered | ConvertTo-Json -Depth 6 -Compress)
    function node { throw 'Unexpected browser process in cache fixture' }
    $page = Get-AppStoreRenderedPage -CountryCode 'US' -AppleAppId '6448311069'
    Expect ($page.FromCache -eq $true -and [DateTimeOffset]::Parse($page.CapturedAt) -eq [DateTimeOffset]::Parse($renderTime)) 'rendered cache retains captured timestamp and cache provenance'
    $parsed = Get-AppStoreObservationTime -RawSnapshot @{capturedAt=$renderTime;fromCache=$true}
    Expect ($parsed.ToString('o') -eq ([DateTimeOffset]::Parse($renderTime)).ToString('o')) 'cache time is not replaced with processing time'
    $script:renderCalls = 0
    function node {
      $renderArguments = @($args)
      $index = [Array]::IndexOf($renderArguments, '--output-file')
      if ($index -lt 0) { throw 'Synthetic renderer output required' }
      $script:renderCalls++
      $record = @{ok=$true;url=$url;finalUrl=$url;status=200;capturedAt=[DateTime]::UtcNow.ToString('o')
        items=@(@{name='Plus';priceText='$20.00'});parserSource='embedded-json';hasInAppPurchasesSection=$true}
      [IO.File]::WriteAllText($renderArguments[$index+1], ($record | ConvertTo-Json -Depth 6 -Compress), [Text.UTF8Encoding]::new($false))
      $global:LASTEXITCODE = 0
    }
    $rendered.Remove('capturedAt')
    Set-AppStoreCacheContent -Path $renderCache -Content ($rendered | ConvertTo-Json -Depth 6 -Compress)
    $refetched = Get-AppStoreRenderedPage -CountryCode 'US' -AppleAppId '6448311069'
    Expect ($renderCalls -eq 1 -and !$refetched.FromCache -and $refetched.CapturedAt) 'legacy rendered cache without time is refetched'
    function Invoke-WebRequest { return @{Content='<p>Fresh synthetic response</p>';StatusCode=200;FinalUrl=$url} }
    $fresh = Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069'
    Expect (!$fresh.FromCache -and $fresh.CapturedAt) 'fresh HTTP response supplies capture time'
    $cachedAgain = Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069'
    Expect ($cachedAgain.FromCache -and [DateTimeOffset]::Parse($cachedAgain.CapturedAt) -eq
      [DateTimeOffset]::Parse($fresh.CapturedAt)) 'static response and subsequent cache share one capture time'
    $rendered.capturedAt = [DateTime]::UtcNow.AddHours(-13).ToString('o')
    Set-AppStoreCacheContent -Path $renderCache -Content ($rendered | ConvertTo-Json -Depth 6 -Compress)
    $expired = Get-AppStoreRenderedPage -CountryCode 'US' -AppleAppId '6448311069'
    Expect ($renderCalls -eq 2 -and !$expired.FromCache) 'new file time cannot refresh old rendered evidence'

    foreach ($bad in @(
      @{fromCache=$true}, @{capturedAt='invalid'}, @{capturedAt='2026-10-30'},
      @{capturedAt=[DateTime]::UtcNow.AddHours(1).ToString('o')}
    )) {
      $rejected = $false
      try { Get-AppStoreObservationTime -RawSnapshot $bad | Out-Null } catch { $rejected = $true }
      Expect $rejected 'missing, ambiguous or future evidence time is rejected'
    }
  } finally {
    $resolved = (Resolve-Path -LiteralPath $AppStoreCacheDirectory).Path
    $expectedParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
    if ([IO.Path]::GetDirectoryName($resolved) -ne $expectedParent -or
      ![IO.Path]::GetFileName($resolved).StartsWith('geosub-sampling-clock-')) { throw 'Unexpected cache cleanup path' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
  return
}
$uri = $null
if (![Uri]::TryCreate($env:DATABASE_URL, [UriKind]::Absolute, [ref]$uri) -or
  $uri.Scheme -notin @('postgres', 'postgresql') -or $uri.Host -notin @('localhost', '127.0.0.1') -or
  $uri.Port -ne 55433 -or $uri.AbsolutePath -notmatch '^/geosub_collector_test_sampling_[a-z0-9_]+$') {
  throw 'Disposable sampling database required'
}
$script:SamplingBridge = Join-Path (Split-Path $collector -Parent) 'db-query.mjs'
function Invoke-Psql {
  param([string]$Sql)
  $output = $Sql | node $script:SamplingBridge --exec 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Sampling fixture write failed' }
}
function Invoke-PsqlJson {
  param([string]$Sql)
  $output = $Sql | node $script:SamplingBridge --json 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Sampling fixture query failed' }
  return ($output -join '') | ConvertFrom-Json
}
$actual = Invoke-PsqlJson "SELECT json_build_object('name', current_database())"
if ('/' + $actual.name -ne $uri.AbsolutePath) { throw 'Sampling database mismatch' }
if ($EvidenceProductId) {
  $runner = Join-Path (Split-Path $collector -Parent) 'run-collector-jobs.ps1'
  $runnerAst = [System.Management.Automation.Language.Parser]::ParseFile($runner, [ref]$tokens, [ref]$errors)
  $definition = $runnerAst.Find({param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-AppStoreReviewOutcome'
  }, $true)
  . ([scriptblock]::Create($definition.Extent.Text))
  $evidence = Get-AppStoreReviewOutcome -Job @{product_id=$EvidenceProductId} -StartedAt $EvidenceStartedAt
  Write-Output ('GEOSUB_SAMPLING_EVIDENCE=' + ($evidence | ConvertTo-Json -Depth 12 -Compress))
  return
}

$writes = Get-Content -LiteralPath $WritesPath -Raw | ConvertFrom-Json
$results = @()
foreach ($write in $writes) {
  $Force = $write.force -eq $true; $DryRun = $write.dry_run -eq $true
  if ($write.availability -eq $true) {
    Record-AppStorePlanAvailability -ProductId $write.product_id -PlanId $write.plan_id `
      -CountryId $write.country_id -CountryCode 'US' -PlanSlug 'plus' `
      -Found ($write.found -eq $true) -CapturedAt $write.captured_at
    $results += 'availability'
    continue
  }
  $params = @{
    ProductId=$write.product_id;PlanId=$write.plan_id;CountryId=$write.country_id;SourceId=$write.source_id
    CountryCode='US';Currency='USD';RawPrice=$write.price;ConvertedUsd=$write.price;FxRateToUsd=1
    FxRateDate=(Get-Date -Format 'yyyy-MM-dd');SourceUrl='https://apps.apple.com/us/app/id6448311069'
    ObservedPriceText=('USD '+$write.price);ItemName='Plus';RawSnapshot=$write.snapshot
    AnomalyFlag=($write.anomaly -eq $true);AnomalyReason=$null;ParserVersion=$write.parser
    CollectorName='isolated-sampling-fixture'
  }
  $results += Insert-Observation @params
}
Write-Output ('GEOSUB_SAMPLING_WRITES=' + (ConvertTo-Json -InputObject $results -Compress))
