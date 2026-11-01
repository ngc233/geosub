$ErrorActionPreference = 'Stop'
$tokens = $null
$errors = $null
$runner = Join-Path $PSScriptRoot '../scripts/run-collector-jobs.ps1'
$ast = [System.Management.Automation.Language.Parser]::ParseFile($runner, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw $errors[0] }
foreach ($name in @('New-AppStoreReviewFailure','Complete-JobRun','Get-ConfigValue',
  'Get-NextRunSql','Get-FailureNextRunSql','Test-PermanentCollectorFailure','Quote-SqlString','Quote-SqlJson')) {
  $fn = $ast.Find({ param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name
  }, $true)
  . ([scriptblock]::Create($fn.Extent.Text))
}
$DryRun = $false
$job = [pscustomobject]@{id='10000000-0000-0000-0000-000000000001';product_id='10000000-0000-0000-0000-000000000002';
  product_slug='fault';schedule='daily';error_count=9;source_id=$null;job_config=[pscustomobject]@{collector_kind='app_store'}}
$collected = [pscustomobject]@{Status='succeeded';CollectorKind='app_store';Output='Collected';RawPayload=@{inserted_observation_count=3}}
$failed = New-AppStoreReviewFailure -Result $collected -Reason 'Injected review failure'
function Invoke-Psql { param($Sql) $script:writtenSql=$Sql }
Complete-JobRun -Job $job -Result $failed -StartedAt (Get-Date) -RunId '10000000-0000-0000-0000-000000000003'
if ($writtenSql -notmatch "'review_retry', TRUE" -or $writtenSql -notmatch 'error_count = error_count,') {
  throw 'Review failure must retain the collection counter and schedule review-only retry'
}
if ($writtenSql -match "status = 'failed',\s+job_config" -or $writtenSql -notmatch "status = 'active',\s+job_config") {
  throw 'Review outage must not exhaust or quarantine the collection job'
}
Write-Output 'PASS: actual completion SQL preserves collection count and review retry after nine prior errors'

$batch = $ast.EndBlock.Statements | Where-Object {
  $_ -is [System.Management.Automation.Language.IfStatementAst] -and
  $_.Extent.Text.StartsWith('if (!$SkipAutoReview -and $pendingAppStoreCompletions.Count')
}
$SkipAutoReview = $false
$summary = @{succeeded=2;failed=0}
$pendingAppStoreCompletions = @(
  @{Job=@{product_slug='fault'};Result=$collected;StartedAt=(Get-Date);RunId='fault'},
  @{Job=@{product_slug='healthy'};Result=$collected;StartedAt=(Get-Date);RunId='healthy'}
)
$reportRefreshProducts = @()
$script:completions = @{}
function Invoke-PsqlJson { param($Sql) return @([pscustomobject]@{product_slug='fault';reason_code='app_store_review_failed'}) }
function Add-AppStoreReviewOutcome { param($Job,$Result,$StartedAt) return $Result }
function Complete-JobRun { param($Job,$Result,$StartedAt,$RunId) $script:completions[$RunId]=$Result }
. ([scriptblock]::Create($batch.Extent.Text))
if ($completions.healthy.Status -ne 'succeeded' -or $completions.fault.RawPayload.collector_status -ne 'succeeded' -or
  $completions.fault.RawPayload.auto_review_status -ne 'failed' -or $summary.failed -ne 1 -or $summary.succeeded -ne 1) {
  throw 'A product review failure contaminated a healthy completion'
}
Write-Output 'PASS: actual batch preserves healthy product and marks only the affected review'

$retry = $ast.Find({param($node)
  $node -is [System.Management.Automation.Language.IfStatementAst] -and
  $node.Extent.Text.StartsWith('if (!$DryRun -and !$SkipAutoReview -and')
}, $true)
$job.job_config | Add-Member -NotePropertyName review_retry -NotePropertyValue $true
$pendingAppStoreCompletions = @()
$summary = @{succeeded=0}
function Invoke-PsqlJson { param($Sql) return [pscustomobject]@{inserted_observation_count=3} }
foreach ($attempt in @(1)) { . ([scriptblock]::Create($retry.Extent.Text)) }
if ($pendingAppStoreCompletions.Count -ne 1 -or $pendingAppStoreCompletions[0].Result.RawPayload.inserted_observation_count -ne 3) {
  throw 'Review retry failed to reuse original collection evidence'
}
Write-Output 'PASS: actual retry branch reuses evidence without collector invocation'
$job.job_config.review_retry = $false
$pendingAppStoreCompletions = @()
function Invoke-PsqlJson { throw 'A normal collection must not enter review-only retry' }
foreach ($attempt in @(1)) { . ([scriptblock]::Create($retry.Extent.Text)) }
if ($pendingAppStoreCompletions.Count) { throw 'False retry flag entered review-only branch' }
Write-Output 'PASS: false retry flag retains normal collection'

$fn = $ast.Find({param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Add-AppStoreReviewOutcome'
}, $true)
. ([scriptblock]::Create($fn.Extent.Text))
function Add-AppStoreRunEvidence {
  param($Job,$Result,$StartedAt)
  $script:evidenceTime = $StartedAt
  $Result.RawPayload['collection_evidence'] = @{published_price_count=1}
  return $Result
}
$originalTime = (Get-Date).AddDays(-1)
$collected.RawPayload['collection_started_at'] = $originalTime.ToUniversalTime().ToString('o')
$null = Add-AppStoreReviewOutcome -Job $job -Result $collected -StartedAt (Get-Date)
if ($evidenceTime.ToUniversalTime() -ne $originalTime.ToUniversalTime()) {
  throw 'Review retry lost the original evidence time window'
}
Write-Output 'PASS: review-only retry retains the original evidence time window'
