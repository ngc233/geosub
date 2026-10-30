# Acceptance launcher: native anonymous HTTP; never imported by production scripts.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$uri = $null
if (![Uri]::TryCreate($env:DATABASE_URL,[UriKind]::Absolute,[ref]$uri) -or
    $uri.Scheme -notin @('postgres','postgresql') -or $uri.Host -notin @('localhost','127.0.0.1') -or
    $uri.Port -ne 55433 -or $uri.AbsolutePath -notmatch '^/geosub_collector_test_replay_live_[a-z0-9_]+$') {
  throw 'Disposable live acceptance database required'
}
$runner = [IO.Path]::GetFullPath([string]$args[0])
$expected = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../scripts/run-collector-jobs.ps1'))
if ($runner -ne $expected) { throw 'Canonical runner required' }
$parameters = @{}
for ($index=1;$index -lt $args.Count;$index++) {
  $key=([string]$args[$index]).TrimStart('-')
  if ($key -notin @('ContainerName','DbName','DbUser','Limit','JobId','CollectorKind','ProductSlug')) {
    throw 'Unexpected live acceptance parameter'
  }
  if ($index+1 -ge $args.Count) { throw 'Missing live parameter value' }
  $parameters[$key]=$args[++$index]
}
if ($parameters.DbName -ne $uri.AbsolutePath.TrimStart('/') -or $parameters.Limit -ne '1' -or
    $parameters.JobId -ne $env:GEOSUB_LIVE_JOB -or $parameters.ProductSlug -ne $env:GEOSUB_LIVE_PRODUCT -or
    $parameters.CollectorKind -ne 'app_store') { throw 'Live acceptance task identity mismatch' }
if (!$env:GEOSUB_LIVE_NETWORK_LOG -or !$env:GEOSUB_LIVE_REAL_NODE) { throw 'Live acceptance paths required' }
$global:GeoSubLiveExpectedUrl='https://apps.apple.com/'+$env:GEOSUB_LIVE_COUNTRY.ToLowerInvariant()+'/app/id'+$env:GEOSUB_LIVE_APP_ID
function Write-LiveEvent([object]$Event) {
  [IO.File]::AppendAllText($env:GEOSUB_LIVE_NETWORK_LOG,
    (($Event | ConvertTo-Json -Depth 8 -Compress)+"`n"),[Text.UTF8Encoding]::new($false))
}
function global:Invoke-WebRequest {
  param([string]$Uri,[switch]$UseBasicParsing,[int]$TimeoutSec,[object]$Headers)
  if ($Uri -ne $global:GeoSubLiveExpectedUrl) { throw 'Unexpected live storefront destination' }
  $response=Microsoft.PowerShell.Utility\Invoke-WebRequest @PSBoundParameters
  $final=[Uri]$response.BaseResponse.RequestMessage.RequestUri
  $bytes=if ($response.Content -is [byte[]]) { $response.Content } else { [Text.Encoding]::UTF8.GetBytes([string]$response.Content) }
  $sha=[Security.Cryptography.SHA256]::Create()
  try { $hash=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
  Write-LiveEvent @{kind='app_store';url=$Uri;final_url=$final.GetLeftPart([UriPartial]::Path)
    status=[int]$response.StatusCode;captured_at=[DateTime]::UtcNow.ToString('o');bytes=$bytes.Length;body_utf8_sha256=$hash}
  if ($final.Host -ne 'apps.apple.com' -or
      !$final.AbsolutePath.StartsWith('/'+$env:GEOSUB_LIVE_COUNTRY.ToLowerInvariant()+'/') -or
      $final.AbsolutePath -notmatch ('/id'+[regex]::Escape($env:GEOSUB_LIVE_APP_ID)+'$')) {
    throw 'Live storefront redirected outside the selected market/application'
  }
  return $response
}
function global:Invoke-RestMethod {
  param([string]$Uri,[int]$TimeoutSec)
  $allowed='https://api.frankfurter.app/latest?from=USD&to='+$env:GEOSUB_LIVE_CURRENCY
  if ($Uri -notin @($allowed,'https://open.er-api.com/v6/latest/USD')) { throw 'Unexpected live FX destination' }
  $response=Microsoft.PowerShell.Utility\Invoke-RestMethod @PSBoundParameters
  Write-LiveEvent @{kind='fx';url=([Uri]$Uri).GetLeftPart([UriPartial]::Path);received_at=[DateTime]::UtcNow.ToString('o')}
  return $response
}
function global:node {
  $arguments=@($args)
  if ([IO.Path]::GetFileName([string]$arguments[0]) -eq 'render-app-store-prices.mjs') {
    Write-LiveEvent @{kind='browser_not_executed'}
    throw 'Browser fallback not executed in bounded static live acceptance'
  }
  if ([IO.Path]::GetFileName([string]$arguments[0]) -ne 'db-query.mjs') { throw 'Unexpected live Node command' }
  $input | & $env:GEOSUB_LIVE_REAL_NODE @arguments
  $global:LASTEXITCODE=$LASTEXITCODE
}
& $runner @parameters
