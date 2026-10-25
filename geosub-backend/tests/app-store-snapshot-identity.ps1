$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw $parseErrors[0] }
$function = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-AppStoreSnapshotBillingCycle' }, $true)
if ($null -eq $function) { throw 'Snapshot identity function missing' }
. ([scriptblock]::Create($function.Extent.Text))
if ((Get-AppStoreSnapshotBillingCycle -PlanSpec $null) -ne 'unknown') { throw 'Unmapped items must retain an unknown period' }
if ((Get-AppStoreSnapshotBillingCycle -PlanSpec ([pscustomobject]@{ slug = 'plus' })) -ne 'monthly') { throw 'Canonical monthly default changed' }
foreach ($cycle in @('monthly', 'yearly', 'weekly', 'quarterly', 'one_time', 'lifetime')) {
  if ((Get-AppStoreSnapshotBillingCycle -PlanSpec ([pscustomobject]@{ billing_cycle = $cycle })) -ne $cycle) { throw 'Captured period mismatch' }
}
foreach ($cycle in @('', 'invalid')) {
  if ((Get-AppStoreSnapshotBillingCycle -PlanSpec ([pscustomobject]@{ billing_cycle = $cycle })) -ne 'unknown') { throw 'Invalid periods must not become monthly' }
}
if ((Get-AppStoreSnapshotBillingCycle -PlanSpec ([pscustomobject]@{ billing_cycle = ' YEARLY ' })) -ne 'yearly') { throw 'Period normalization failed' }
Write-Output 'PASS: captured snapshot identity preserves known periods and refuses to invent unknown ones.'
