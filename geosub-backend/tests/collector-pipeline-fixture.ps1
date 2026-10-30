# Test launcher only. Never imported by production scripts; no request falls back to the network.
$ErrorActionPreference = 'Stop'
$uri = $null
if (![Uri]::TryCreate($env:DATABASE_URL, [UriKind]::Absolute, [ref]$uri) -or
  $uri.Scheme -notin @('postgres', 'postgresql') -or $uri.Host -notin @('localhost', '127.0.0.1') -or
  $uri.Port -ne 55433 -or $uri.AbsolutePath -notmatch '^/geosub_collector_test_pipeline_[a-z0-9_]+$') {
  throw 'Disposable pipeline database required'
}
$runner = [IO.Path]::GetFullPath([string]$args[0])
$expected = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../scripts/run-collector-jobs.ps1'))
if ($runner -ne $expected) { throw 'Canonical runner required' }
$parameters = @{}
for ($index = 1; $index -lt $args.Count; $index++) {
  $key = ([string]$args[$index]).TrimStart('-')
  if ($key -notin @('ContainerName','DbName','DbUser','Limit','JobId','CollectorKind','ProductSlug','CountryCodes',
    'PrimarySourceOnly','DryRun','Force','SkipAutoReview')) { throw 'Unsupported fixture runner parameter' }
  if ($index+1 -lt $args.Count -and !([string]$args[$index+1]).StartsWith('-')) {
    $parameters[$key] = $args[++$index]
  } else { $parameters[$key] = $true }
}
if ($parameters.DbName -ne $uri.AbsolutePath.TrimStart('/')) { throw 'Fixture database identity mismatch' }
$global:GeoSubPipelineFixtureUrl = 'https://apps.apple.com/us/app/id1541407007'
$global:GeoSubPipelineFixtureMode = $env:GEOSUB_PIPELINE_MODE
if ($global:GeoSubPipelineFixtureMode -notin @('valid','changed','anomaly','http503')) { throw 'Unknown pipeline fixture mode' }
if (!$env:GEOSUB_PIPELINE_LOG -or !$env:GEOSUB_PIPELINE_REAL_NODE) { throw 'Fixture paths required' }
function Write-FixtureRequest([string]$Kind) {
  [IO.File]::AppendAllText($env:GEOSUB_PIPELINE_LOG,
    ((@{kind=$Kind;mode=$global:GeoSubPipelineFixtureMode} | ConvertTo-Json -Compress)+"`n"), [Text.UTF8Encoding]::new($false))
}
function global:Invoke-WebRequest {
  param([string]$Uri, [switch]$UseBasicParsing, [int]$TimeoutSec, [object]$Headers)
  if ($Uri -ne $global:GeoSubPipelineFixtureUrl) { throw 'Unexpected fixture HTTP destination' }
  Write-FixtureRequest 'html'
  if ($global:GeoSubPipelineFixtureMode -eq 'http503') { throw 'HTTP 503 synthetic source unavailable' }
  $basic = if ($global:GeoSubPipelineFixtureMode -eq 'valid') { '$9.99' } else { '$11.99' }
  $max = if ($global:GeoSubPipelineFixtureMode -eq 'valid') { '$24.99' } else { '$29.99' }
  $rows = @(
    @{'$kind'='textPair';leadingText='Captions Basic - monthly';trailingText=$basic},
    @{'$kind'='textPair';leadingText='Captions Max';trailingText=$max},
    @{'$kind'='textPair';leadingText='Captions Basic - weekly';trailingText='$5.99'}
  )
  if ($global:GeoSubPipelineFixtureMode -eq 'anomaly') {
    $rows += @{'$kind'='textPair';leadingText='Captions Basic - monthly';trailingText='$13.99'}
  }
  $data = @{data=@(@{title='In-App Purchases';items=$rows})} | ConvertTo-Json -Depth 10 -Compress
  return @{Content=('<script type="application/json">'+$data+'</script>');StatusCode=200;FinalUrl=$global:GeoSubPipelineFixtureUrl}
}
function global:node {
  $arguments = @($args)
  if ([IO.Path]::GetFileName([string]$arguments[0]) -eq 'render-app-store-prices.mjs') {
    Write-FixtureRequest 'render'
    if ($global:GeoSubPipelineFixtureMode -ne 'http503') { throw 'Unexpected rendered fallback in valid fixture' }
    $index = [Array]::IndexOf($arguments, '--output-file')
    if ($index -lt 0) { throw 'Fixture output path missing' }
    $data = @{ok=$false;status=503;url=$global:GeoSubPipelineFixtureUrl;finalUrl=$global:GeoSubPipelineFixtureUrl;items=@()}
    [IO.File]::WriteAllText($arguments[$index+1], ($data | ConvertTo-Json -Compress), [Text.UTF8Encoding]::new($false))
    $global:LASTEXITCODE = 0
    return
  }
  if ([IO.Path]::GetFileName([string]$arguments[0]) -ne 'db-query.mjs') { throw 'Unexpected fixture Node command' }
  $input | & $env:GEOSUB_PIPELINE_REAL_NODE @arguments
  $global:LASTEXITCODE = $LASTEXITCODE
}
& $runner @parameters
