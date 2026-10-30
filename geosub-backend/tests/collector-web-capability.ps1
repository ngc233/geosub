$ErrorActionPreference='Stop'
$runner=Join-Path $PSScriptRoot '../scripts/run-collector-jobs.ps1'
$errors=$null;$tokens=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($runner,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'Runner syntax invalid'}
foreach($function in $ast.FindAll({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst]},$false)) {
  . ([scriptblock]::Create($function.Extent.Text))
}
function Expect($ok,$label){if(!$ok){throw "FAIL: $label"};Write-Output "PASS: $label"}
function Invoke-PsqlJson {param($Sql) $script:query=$Sql;return @()}
$Force=$false;$JobId=$null;$RunId=$null;$CollectorKind='app_store'
$ProductSlug="test'product";$PrimarySourceOnly=$true;$Limit=5
Get-DueJobs | Out-Null
Expect ($query.Contains("AND product.slug = 'test''product'")) 'exact quoted product scope reaches canonical query'
Expect ($query.Contains("job.schedule NOT IN ('anomaly_watch', 'stale_refresh', 'coverage_refresh')")) 'compatibility excludes one-off repair jobs'
$ProductSlug=$null;$PrimarySourceOnly=$false;Get-DueJobs|Out-Null
Expect (!$query.Contains('AND product.slug =') -and !$query.Contains('job.schedule NOT IN')) 'default scheduler scope remains unchanged'
$script:CountryCodes=@('CA','US')
$codes=@(Get-CountryCodes -Config ([pscustomobject]@{country_codes=@('DE')}))
Expect (($codes -join ',') -eq 'CA,US') 'explicit country scope overrides configured scope'
$retryConfig=[pscustomobject]@{
  operational_state='app_store_partial_retry';retry_country_codes=@('BR');country_codes=@('DE')
}
$codes=@(Get-CountryCodes -Config $retryConfig)
Expect (($codes -join ',') -eq 'BR') 'transient retries keep their narrow scope ahead of compatibility overrides'
$script:CountryCodes=@();$codes=@(Get-CountryCodes -Config ([pscustomobject]@{country_codes=@('DE')}))
Expect (($codes -join ',') -eq 'DE') 'normal job retains configured countries'
function Invoke-WebRequest {
  return [pscustomobject]@{Content='<html><title>Official fixture</title><body>Monthly price USD 9.99</body></html>';StatusCode=200}
}
function Should-TryBrowserSnapshot {return $false}
foreach($hints in @($false,$true)) {
  $result=Invoke-GenericWebSnapshot -Job @{product_slug='fixture'} -Kind 'official_site' -Url 'https://example.invalid/' -AttemptPriceHints $hints
  Expect ($result.RawPayload.publication_eligible -eq $false -and $result.RawPayload.observed_count -eq 0) 'website monitor cannot claim price observations or publication'
  Expect ($result.RawPayload.collection_outcome -eq 'source_monitoring_only') 'snapshot execution has a distinct business outcome'
  Expect ($result.RawPayload.next_action -eq 'configure_verified_price_adapter') 'unimplemented adapter has an explicit next action'
}