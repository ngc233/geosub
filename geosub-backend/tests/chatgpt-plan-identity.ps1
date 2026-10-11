$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw $parseErrors[0] }
foreach ($name in @('Normalize-PlanMatchText', 'Resolve-PlanSpec', 'Get-PlanPublishStatus', 'Get-AppStoreExpectedRange', 'Get-AppStoreObservationAnomaly')) {
  $function = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
  . ([scriptblock]::Create($function.Extent.Text))
}
$specs = Get-Content (Join-Path $PSScriptRoot '../data/product-plan-specs.json') -Raw | ConvertFrom-Json
$cases = @(
  @('ChatGPT Pro 100', 'pro-5x'), @('Pro 100', 'pro-5x'),
  @('ChatGPT Pro 200', 'pro'), @('Pro 200', 'pro'),
  @('ChatGPT Pro 5x', 'pro-5x'), @('ChatGPT Pro 20x', 'pro'),
  @('ChatGPT Plus', 'plus'), @('ChatGPT Go', 'go'),
  @('ChatGPT Pro 500', 'pro-500'), @('ChatGPT Pro 50x', ''),
  @('ChatGPT Pro 1000', ''), @('100 Credits', ''),
  @('ChatGPT Pro 100 annual', ''), @('ChatGPT Pro', '')
)
foreach ($case in $cases) {
  $actual = Resolve-PlanSpec -ProductSpec $specs.chatgpt -ItemName $case[0] -ProductName 'ChatGPT'
  if ([string]$actual.slug -ne $case[1]) { throw "Unexpected identity for $($case[0]): $($actual.slug)" }
}
$claude = Resolve-PlanSpec -ProductSpec $specs.claude -ItemName 'Claude Max 20x' -ProductName 'Claude'
if ($claude.slug -ne 'max-20x') { throw 'Unrelated Claude matching regressed' }
$newPlan = $specs.chatgpt.plans | Where-Object slug -eq 'pro-500'
if ((Get-PlanPublishStatus $newPlan) -ne 'review') { throw 'New plan must remain review-only' }
$anomaly = Get-AppStoreObservationAnomaly -CountryCurrency USD -ObservedCurrency USD -ConvertedUsd 500 -OriginalObservedPriceText '$500.00' -PlanSpec $newPlan
if (!$anomaly.Flag -or $anomaly.Reason -notmatch 'manual identity') { throw 'New price must not auto-publish' }
if ((Get-PlanPublishStatus ($specs.chatgpt.plans | Where-Object slug -eq 'pro')) -ne 'published') { throw 'Existing plan behavior changed' }
Write-Output "PASS: $($cases.Count) ChatGPT identity cases plus Claude compatibility. Pro 500 identity is independent and remains review-only."
