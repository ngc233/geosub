# Real public display names captured from ID and US; these are not SKU identity proofs.
$ErrorActionPreference='Stop'
$collector=Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$errors=$null;$tokens=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($collector,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'Collector syntax invalid'}
foreach($definition in $ast.FindAll({param($node)
 $node -is [Management.Automation.Language.FunctionDefinitionAst]
},$false)) { . ([scriptblock]::Create($definition.Extent.Text)) }
. (Join-Path $PSScriptRoot '../scripts/app-store-plan-specs.ps1')
$spec=(Read-AppStorePlanSpecs).'invideo-ai'
foreach($name in @('Generative add-on 1x','Generative add-on 2x','Plus and Generative mini pack',
 'Basic Monthly 1x','Basic Yearly 1x','Pro Monthly 1x','Ads Pack 1x','Extra Credits 50 1x')) {
 $match=Resolve-PlanSpec -ProductSpec $spec -ItemName $name -ProductName $spec.name
 if($null -ne $match){throw "Unexpected canonical match for public item: $name"}
}
foreach($case in @(@{name='Generative';slug='generative'},@{name='Plus Monthly 1x';slug='plus'},@{name='Max';slug='max'})) {
 $match=Resolve-PlanSpec -ProductSpec $spec -ItemName $case.name -ProductName $spec.name
 if($match.slug -ne $case.slug){throw 'Maintained public alias lost'}
}
Write-Output 'PASS: 11 InVideo public-item identity boundaries'
