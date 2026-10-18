$ErrorActionPreference = 'Stop'
$tokens = $null
$errors = $null
$scriptPath = Join-Path $PSScriptRoot '../scripts/run-collector-jobs.ps1'
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw $errors[0] }
foreach ($name in @('Get-DueJobs', 'Quote-SqlString')) {
  $fn = $ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name}, $true)
  . ([scriptblock]::Create($fn.Extent.Text))
}
function Invoke-PsqlJson { param([string]$Sql) $script:query = $Sql; return @() }
$Limit = 5
Get-DueJobs | Out-Null
if ($env:GEOSUB_TEST_DUE_SQL -eq "true") { Write-Output ($query | ConvertTo-Json -Compress); return }
if ($query -notmatch "job.job_type = 'price_check'\s+AND COALESCE\(job.job_config ->> 'collector_kind', source.type::text, 'unknown'\) = 'official_site'") { throw 'Legacy scope is missing or too broad' }
if ($query -notmatch "job.status = 'active'" -or $query -notmatch 'running_run.status') { throw 'Due job safety filters lost' }
$tail = $ast.EndBlock.Statements[-1].Extent.Text
$summary = @{failed=0}
. ([scriptblock]::Create($tail))
$summary = @{failed=2}
$didThrow = $false
try { . ([scriptblock]::Create($tail)) } catch {
  $didThrow = $_.Exception.Message -match '2 failed job'
}
if (!$didThrow) { throw 'Failed children were hidden by a successful batch result' }
Write-Output 'PASS: legacy official-site scope and actual batch failure propagation'
