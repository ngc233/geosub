$ErrorActionPreference = 'Stop'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'), [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw $errors[0] }
foreach ($name in @('Normalize-PlanMatchText', 'Resolve-PlanSpec', 'Get-PlanPublishStatus', 'Get-AppStoreExpectedRange', 'Get-AppStoreObservationAnomaly')) {
  $fn = $ast.Find({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name}, $true)
  . ([scriptblock]::Create($fn.Extent.Text))
}
$specs = Get-Content (Join-Path $PSScriptRoot '../data/product-plan-specs.json') -Raw | ConvertFrom-Json
$cases = @(
 @('canva','Canva Pro - Monthly','pro'), @('canva','Canva Business - Monthly','business'),
 @('canva','Canva Pro - Yearly',''), @('canva','Canva Teams - Monthly',''),
 @('canva','Canva Credit',''), @('canva','Canva Credit 2 Pack',''),
 @('canva','Afbeeldingen voor bruiloft',''), @('canva','Canva Business – årligen',''),
 @('canva','Canva Pro',''), @('notion','Notion – Plus Monthly','plus'),
 @('notion','Notion – Plus Yearly',''), @('notion','Notion Business',''),
 @('notion','Notion 商業版',''), @('notion','Notion Plus','')
)
foreach ($case in $cases) {
 $spec = $specs.($case[0])
 $plan = Resolve-PlanSpec -ProductSpec $spec -ProductName $spec.name -ItemName $case[1]
 if ([string]$plan.slug -ne $case[2]) { throw "Unexpected mapping: $($case[1])" }
 if ($null -ne $plan) {
  if ((Get-PlanPublishStatus $plan) -ne 'review') { throw 'Software plan must remain review-only' }
  $a = Get-AppStoreObservationAnomaly -CountryCurrency USD -ObservedCurrency USD -ConvertedUsd 15 -OriginalObservedPriceText '$15.00' -PlanSpec $plan
  if (!$a.Flag -or $a.Reason -notmatch 'manual identity') { throw 'Software observation could auto-publish' }
 }
}
Write-Output "PASS: $($cases.Count) software identity and review-only cases"
