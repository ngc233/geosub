$ErrorActionPreference='Stop'
$collector=Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$errors=$null;$tokens=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($collector,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'Invalid collector syntax' }
foreach ($definition in $ast.FindAll({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst]},$false)) {
  $text=$definition.Extent.Text.Replace('$PSScriptRoot',"'"+(Split-Path $collector -Parent)+"'")
  . ([scriptblock]::Create($text))
}
function Expect($ok,$message) { if (!$ok) { throw "FAIL: $message" }; Write-Output "PASS: $message" }
$root=Join-Path ([IO.Path]::GetTempPath()) ('geosub-page-identity-'+[Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($root)
$AppStoreCacheTtlMinutes=720;$AppStoreMaxRetries=0;$AppStoreUserAgent='Fixture';$ChromePath='no-browser'
$script:fixtureFinal='https://apps.apple.com/cn/iphone/today';$script:requests=0
function Wait-AppStoreRequestSlot {}
function Invoke-WebRequest {
  $script:requests++
  return @{Content='<p>Unrelated page with subscription-looking content</p>';StatusCode=200;FinalUrl=$script:fixtureFinal}
}
try {
  foreach ($case in @(
    @{name='wrong-market-homepage';url='https://apps.apple.com/cn/iphone/today'},
    @{name='wrong-country';url='https://apps.apple.com/ca/app/product/id6448311069'},
    @{name='wrong-app';url='https://apps.apple.com/us/app/product/id1234567890'},
    @{name='app-id-prefix';url='https://apps.apple.com/us/app/product/id64483110690'},
    @{name='wrong-host';url='https://example.invalid/us/app/id6448311069'},
    @{name='missing-url';url=''}
  )) {
    $AppStoreCacheDirectory=Join-Path $root $case.name;[void][IO.Directory]::CreateDirectory($AppStoreCacheDirectory)
    $script:fixtureFinal=$case.url;$rejected=$false
    try { Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069' | Out-Null } catch { $rejected=$true }
    Expect $rejected ($case.name+' HTTP 200 is rejected before parsing')
  }
  $AppStoreCacheDirectory=Join-Path $root 'valid';[void][IO.Directory]::CreateDirectory($AppStoreCacheDirectory)
  $script:fixtureFinal='https://apps.apple.com/us/iphone/app/product/id6448311069'
  $fresh=Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069'
  Expect ($fresh.FinalUrl -eq $script:fixtureFinal -and $fresh.Status -eq 200) 'valid product redirect preserves final source evidence'
  $before=$requests;$cached=Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069'
  Expect ($requests -eq $before -and $cached.FromCache) 'verified static cache needs no new request'
  Expect ([DateTimeOffset]::Parse($fresh.CapturedAt) -eq [DateTimeOffset]::Parse($cached.CapturedAt)) 'cache preserves actual source time'
  $url=Get-AppStoreUrl -CountryCode 'US' -AppleAppId '6448311069'
  $cache=Get-AppStoreCachePath -Kind 'html' -Url $url
  Set-AppStoreCacheContent -Path $cache -Content '<p>Legacy unverified cached HTML</p>'
  $before=$requests;$legacy=Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069'
  Expect ($requests -eq $before+1 -and !$legacy.FromCache) 'legacy cache without source identity is re-fetched'
  $record=@{html='<p>Wrong market cached document</p>';status=200;finalUrl='https://apps.apple.com/cn/iphone/today'
    capturedAt=[DateTime]::UtcNow.ToString('o')}
  Set-AppStoreCacheContent -Path $cache -Content ($record | ConvertTo-Json -Compress)
  $before=$requests;$wrong=Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069'
  Expect ($requests -eq $before+1 -and !$wrong.FromCache) 'wrong-market cached evidence is never consumed'
  $record.finalUrl=$script:fixtureFinal;$record.capturedAt=[DateTime]::UtcNow.AddHours(-13).ToString('o')
  Set-AppStoreCacheContent -Path $cache -Content ($record | ConvertTo-Json -Compress)
  $before=$requests;$expired=Get-AppStoreHtml -CountryCode 'US' -AppleAppId '6448311069'
  Expect ($requests -eq $before+1 -and !$expired.FromCache) 'fresh file time cannot revive old static evidence'

  function node {
    $arguments=@($args);$index=[Array]::IndexOf($arguments,'--output-file')
    if ($index -lt 0) { throw 'Expected renderer output' }
    $record=@{ok=$true;url=$url;finalUrl='https://apps.apple.com/cn/iphone/today';status=200
      capturedAt=[DateTime]::UtcNow.ToString('o');items=@(@{name='Plus';priceText='$20.00'})}
    [IO.File]::WriteAllText($arguments[$index+1],($record | ConvertTo-Json -Depth 8 -Compress),[Text.UTF8Encoding]::new($false))
    $global:LASTEXITCODE=0
  }
  $rejected=$false
  try { Get-AppStoreRenderedPage -CountryCode 'US' -AppleAppId '6448311069' | Out-Null } catch { $rejected=$true }
  Expect $rejected 'rendered HTTP 200 with unrelated IAP data is rejected'
} finally {
  $resolved=[IO.Path]::GetFullPath($root)
  if ([IO.Path]::GetDirectoryName($resolved) -ne [IO.Path]::GetTempPath().TrimEnd([IO.Path]::DirectorySeparatorChar) -or
      ![IO.Path]::GetFileName($resolved).StartsWith('geosub-page-identity-')) { throw 'Unexpected identity cleanup path' }
  Remove-Item -LiteralPath $resolved -Recurse -Force
}
