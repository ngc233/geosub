$ErrorActionPreference = 'Stop'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'), [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw $errors[0] }
foreach ($name in @('Normalize-PlanMatchText', 'Resolve-PlanSpec')) {
 $fn = $ast.Find({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name}, $true)
 . ([scriptblock]::Create($fn.Extent.Text))
}
$spec = (Get-Content (Join-Path $PSScriptRoot '../data/product-plan-specs.json') -Raw | ConvertFrom-Json).heygen
$cases = @(
 @('Creator Monthly','creator'), @('HeyGen Creator Monthly','creator'),
 @('HeyGen Creator Weekly',''), @('HeyGen Creator Credit Weekly',''),
 @('HeyGen Creator Credit Monthly',''), @('Creator Annual',''),
 @('Creator',''), @('Creator Monthly Special Offer',''),
 @('Starter Monthly','starter'), @('HeyGen Pro 1000 Credit Monthly','pro-1000'),
 @('HeyGen Pro 1500 Credit Monthly','pro-1500'), @('250 Premium Credits','')
)
foreach ($case in $cases) {
 $actual = Resolve-PlanSpec -ProductSpec $spec -ProductName 'HeyGen' -ItemName $case[0]
 if ([string]$actual.slug -ne $case[1]) { throw "Incorrect HeyGen identity: $($case[0]) => $($actual.slug)" }
}
# Replay the actual BR storefront collision: only the explicit monthly SKU may feed Creator.
$items = @(
 @{Name='HeyGen Creator Weekly';Price=59.90},
 @{Name='Creator Monthly';Price=149.90},
 @{Name='HeyGen Creator Credit Monthly';Price=199.90}
)
$selected = @($items | Where-Object { (Resolve-PlanSpec -ProductSpec $spec -ProductName 'HeyGen' -ItemName $_.Name).slug -eq 'creator' })
if ($selected.Count -ne 1 -or $selected[0].Price -ne 149.90) { throw 'BR weekly/monthly collision persists' }
$expansion = Get-Content (Join-Path $PSScriptRoot '../data/catalog-expansion-2026-08.json') -Raw | ConvertFrom-Json
$original = $expansion.products | Where-Object slug -eq heygen
foreach ($plan in $spec.plans) {
 $old = $original.plans | Where-Object slug -eq $plan.slug
 if ($plan.billing_cycle -ne $old.billing_cycle -or $plan.expected_monthly_usd_min -ne $old.expected_usd_min -or $plan.expected_monthly_usd_max -ne $old.expected_usd_max) { throw 'Unrelated cycle or price limits changed' }
}
Write-Output 'PASS: 12 HeyGen identity cases and BR storefront replay; existing ranges unchanged'
