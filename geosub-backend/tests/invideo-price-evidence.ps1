# Captured public price formats and ambiguity are evidence; no production writes or network.
$ErrorActionPreference='Stop'
$collector=Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$errors=$null;$tokens=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($collector,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'Collector syntax invalid'}
foreach($definition in $ast.FindAll({param($node)
 $node -is [Management.Automation.Language.FunctionDefinitionAst]
},$false)){ . ([scriptblock]::Create($definition.Extent.Text)) }
. (Join-Path $PSScriptRoot '../scripts/app-store-plan-specs.ps1')
$spec=(Read-AppStorePlanSpecs).'invideo-ai'
$max=@($spec.plans|Where-Object slug -eq 'max')[0]
$generative=@($spec.plans|Where-Object slug -eq 'generative')[0]
$script:checks=0
function Expect($ok,$label){if(!$ok){throw "FAIL: $label"};$script:checks++}
foreach($case in @(
 @{text='$59.990';amount=59990;currency='CLP'},
 @{text='$1,990.00';amount=1990;currency='TWD'},
 @{text='$ 999.900,00';amount=999900;currency='COP'}
)){
 Expect ((Parse-PriceNumber $case.text) -eq $case.amount) 'captured price numeric value'
 Expect ((Get-ObservedCurrency -PriceText $case.text -FallbackCurrency $case.currency) -eq $case.currency) 'local dollar is not USD'
}
$converted=[math]::Round(([decimal]999900/[decimal]3198.099135),2)
Expect ($converted -eq [decimal]312.65) 'stored Colombian FX reproduces the high value without a decimal error'
foreach($case in @(@{currency='CLP';usd=60.24;text='$59.990'},@{currency='TWD';usd=61.06;text='$1,990.00'})){
 foreach($name in @('Max','Max Monthly 1x')){
  Expect ((Resolve-PlanSpec -ProductSpec $spec -ItemName $name -ProductName $spec.name).slug -eq 'max') 'both current aliases retain identity uncertainty'
 }
 $selection=@{variantCount=2;selectedCount=1;runnerUpCount=1;expectedFitPenalty=0;runnerUpExpectedFitPenalty=0}
 $anomaly=Get-AppStoreObservationAnomaly -CountryCurrency $case.currency -ObservedCurrency $case.currency `
  -ConvertedUsd $case.usd -OriginalObservedPriceText $case.text -PriceSelection $selection -PlanSpec $max
 Expect ($anomaly.Flag -and $anomaly.Reason -like '*without a clear consensus*') 'in-range multi-price tie must not auto-publish'
}
$single=Get-AppStoreObservationAnomaly -CountryCurrency 'TWD' -ObservedCurrency 'TWD' -ConvertedUsd 61.06 `
 -OriginalObservedPriceText '$1,990.00' -PlanSpec $max `
 -PriceSelection @{variantCount=1;selectedCount=3;runnerUpCount=0;expectedFitPenalty=0;runnerUpExpectedFitPenalty=0}
Expect (!$single.Flag) 'one clean price is not falsely blocked by the multi-price guard'
$high=Get-AppStoreObservationAnomaly -CountryCurrency 'COP' -ObservedCurrency 'COP' -ConvertedUsd $converted `
 -OriginalObservedPriceText '$ 999.900,00' -PlanSpec $generative
Expect ($high.Flag -and $high.Reason -like '*above the expected range*') 'real but out-of-policy price stays unconfirmed'
Write-Output "PASS: $checks InVideo price evidence checks"
