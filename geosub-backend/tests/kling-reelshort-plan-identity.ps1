$ErrorActionPreference = 'Stop'
$collector = Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($collector, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw $errors[0] }
foreach ($name in @(
  'Normalize-PlanMatchText', 'Resolve-PlanSpec', 'Get-AppStoreSnapshotBillingCycle',
  'Get-AppStoreExpectedRange', 'Get-AppStorePriceSelectionStrategy', 'Get-AppStoreObservationAnomaly',
  'Get-PlanPublishStatus'
)) {
  $definition = $ast.Find({param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name
  }, $true)
  . ([scriptblock]::Create($definition.Extent.Text))
}
. (Join-Path $PSScriptRoot '../scripts/app-store-plan-specs.ps1')
$specs = Read-AppStorePlanSpecs
$failures = @()
$checked = 0
foreach ($case in @(
  @('kling-ai', 'Standard plan (monthly)', 'standard'),
  @('kling-ai', 'Kling AI Standard Monthly', 'standard'),
  @('kling-ai', 'Pro plan (monthly)', 'pro'),
  @('kling-ai', 'Premier plan (monthly)', 'premier'),
  @('kling-ai', 'Standard Membership-one week', ''),
  @('kling-ai', 'Standard Membership - one week', ''),
  @('kling-ai', 'Standard plan (annual)', ''),
  @('kling-ai', 'Pro plan (annual)', ''),
  @('kling-ai', 'Premier plan (annual)', ''),
  @('kling-ai', 'Standard Membership One-Month', ''),
  @('kling-ai', 'Pro Membership One-Month', ''),
  @('kling-ai', 'Premier Membership One-Month', ''),
  @('kling-ai', 'Standard', ''),
  @('kling-ai', 'Ultra plan (monthly)', ''),
  @('kling-ai', 'Standard plan (monthly) Special Offer', ''),
  @('kling-ai', '660 Credits', ''),
  @('reelshort', 'Monthly Subscription', 'subscription'),
  @('reelshort', 'ReelShort Monthly Subscription', 'subscription'),
  @('reelshort', 'Subscription', ''),
  @('reelshort', 'Weekly Subscription', ''),
  @('reelshort', 'Yearly Subscription', ''),
  @('reelshort', 'One-time Purchase', ''),
  @('reelshort', 'Monthly Subscription Special Offer', '')
)) {
  $spec = $specs.($case[0])
  $actual = Resolve-PlanSpec -ProductSpec $spec -ProductName $spec.name -ItemName $case[1]
  if ([string]$actual.slug -ne $case[2]) { $failures += "$($case[0]): $($case[1]) => $($actual.slug)" }
  if (!$case[2] -and $null -eq $actual -and (Get-AppStoreSnapshotBillingCycle -PlanSpec $actual) -ne 'unknown') {
    $failures += 'An unmatched identity acquired a billing cycle'
  }
  $checked++
}
$expansion = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../data/catalog-expansion-2026-08.json') -Raw | ConvertFrom-Json
foreach ($slug in @('kling-ai', 'reelshort')) {
  $original = @($expansion.products | Where-Object slug -eq $slug)[0]
  $current = $specs.$slug
  if (@($current.plans).Count -ne @($original.plans).Count) { $failures += 'Canonical plan count changed' }
  foreach ($plan in $current.plans) {
    $before = @($original.plans | Where-Object slug -eq $plan.slug)[0]
    if ($plan.billing_cycle -ne $before.billing_cycle -or
        $plan.expected_monthly_usd_min -ne $before.expected_usd_min -or
        $plan.expected_monthly_usd_max -ne $before.expected_usd_max) {
      $failures += "Existing cycle or price range changed: $slug/$($plan.slug)"
    }
  }
}
# The captured CH page had two weekly labels at CHF 1 versus one explicit monthly at CHF 10.
$items = @(
  @{Name='Standard Membership-one week';Price=1},
  @{Name='Standard Membership - one week';Price=1},
  @{Name='Standard plan (monthly)';Price=10}
)
$selected = @($items | Where-Object {
  (Resolve-PlanSpec -ProductSpec $specs.'kling-ai' -ProductName 'Kling AI' -ItemName $_.Name).slug -eq 'standard'
})
if ($selected.Count -ne 1 -or $selected[0].Price -ne 10) { $failures += 'CH weekly majority still enters Standard monthly' }
$monthly = @($specs.'kling-ai'.plans | Where-Object slug -eq 'standard')[0]
$collision = Get-AppStoreObservationAnomaly -CountryCurrency 'USD' -ObservedCurrency 'USD' `
  -ConvertedUsd 10 -OriginalObservedPriceText 'USD 10' -PlanSpec $monthly -PriceSelection @{
    variantCount=2;selectedCount=1;runnerUpCount=1;expectedFitPenalty=0;runnerUpExpectedFitPenalty=0
  }
if (!$collision.Flag -or $collision.Reason -notlike '*Multiple App Store prices*') {
  $failures += 'Conflicting registered monthly prices were no longer isolated'
}
if ($failures.Count) { throw ($failures -join '; ') }
Write-Output "PASS: $checked Kling/ReelShort identity cases; CH weekly majority rejected; existing cycles and ranges unchanged"
