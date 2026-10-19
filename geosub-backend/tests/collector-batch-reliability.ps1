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

# Execute the actual batch scope expression and interpolated SQL with a capture
# double; no collector or database connection is opened by this harness.
$pendingAppStoreCompletions = @(
  @{ Job = @{ product_slug = 'reelshort' } },
  @{ Job = @{ product_slug = 'viki' } },
  @{ Job = @{ product_slug = 'reelshort' } }
)
$scopeAssignment = $ast.Find({ param($node)
  $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
  $node.Left.Extent.Text -eq '$completedIdentityProductsSql'
}, $true)
. ([scriptblock]::Create($scopeAssignment.Extent.Text))
if ($completedIdentityProductsSql -ne "'reelshort', 'viki'") { throw 'Identity lifecycle product scope is incorrect' }
function Invoke-Psql { param([string]$Sql) $script:identitySql = $Sql }
$reviewCommand = $ast.Find({ param($node)
  $node -is [System.Management.Automation.Language.CommandAst] -and
  $node.GetCommandName() -eq 'Invoke-Psql' -and
  $node.Extent.Text -match 'reconcile_app_store_identity_ambiguities'
}, $true)
. ([scriptblock]::Create($reviewCommand.Extent.Text))
if (!$identitySql.Contains("unnest(ARRAY['reelshort', 'viki']::TEXT[])")) { throw 'Identity lifecycle SQL lost its completed-product scope' }
if ($identitySql.IndexOf('reconcile_app_store_identity_ambiguities') -lt $identitySql.IndexOf('run_app_store_stability_auto_review')) { throw 'Identity lifecycle must follow automatic approval' }
Write-Output 'PASS: completed-product identity lifecycle scope and actual SQL interpolation'

$reportAssignment = $ast.Find({param($node)
  $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
  $node.Left.Extent.Text -eq '$reportRefreshProducts' -and $node.Right.Extent.Text -match 'pendingAppStoreCompletions'
}, $true)
. ([scriptblock]::Create($reportAssignment.Extent.Text))
$reportBlock = $ast.EndBlock.Statements | Where-Object { $_ -is [System.Management.Automation.Language.IfStatementAst] -and $_.Extent.Text.Contains('refresh-collected-reports.mjs') }
function node { $script:reportArgs = @($args); $global:LASTEXITCODE = $script:reportExit }
$priorDistribution = $env:GEOSUB_CONTENT_DISTRIBUTION
try {
  $env:GEOSUB_CONTENT_DISTRIBUTION = 'cloudflare'
  $script:reportExit = 0
  . ([scriptblock]::Create($reportBlock.Extent.Text.Replace('$PSScriptRoot', "'/isolated/scripts'")))
  $parsedProducts = @($script:reportArgs[2] | ConvertFrom-Json)
  if ($script:reportArgs[1] -ne '--products-json' -or ($parsedProducts -join ',') -ne 'reelshort,viki') { throw 'Actual report refresh arguments lost completed-product scope' }
  $script:reportExit = 1
  $cacheFailureVisible = $false
  try { . ([scriptblock]::Create($reportBlock.Extent.Text.Replace('$PSScriptRoot', "'/isolated/scripts'"))) } catch { $cacheFailureVisible = $_.Exception.Message -match 'report cache refresh failed' }
  if (!$cacheFailureVisible) { throw 'Report cache refresh failure was hidden' }
} finally { $env:GEOSUB_CONTENT_DISTRIBUTION = $priorDistribution }
Write-Output 'PASS: actual report refresh command arguments and failure propagation'
