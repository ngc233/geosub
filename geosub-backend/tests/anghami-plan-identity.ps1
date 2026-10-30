# Public names from the local App Store captures and historical source evidence.
# Matching a display name does not establish a private SKU or entitlement identity.
$ErrorActionPreference='Stop'
$collector=Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$errors=$null;$tokens=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($collector,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'Collector syntax invalid'}
foreach($definition in $ast.FindAll({param($node)
 $node -is [Management.Automation.Language.FunctionDefinitionAst]
},$false)) { . ([scriptblock]::Create($definition.Extent.Text)) }
. (Join-Path $PSScriptRoot '../scripts/app-store-plan-specs.ps1')
$spec=(Read-AppStorePlanSpecs).anghami
$checks=0
foreach($name in @(
 'A special Anghami Plus offer','50% OFF 2 Months Anghami Plus','Anghami Plus Lite',
 '2 Months Free Anghami Plus','Family Plan - 1 Month Free','Anghami Plus Monthly Offer',
 'Anghami Plus for Students','Anghami Plus for Students, no trial',
 'Anghami Plus 2 Month','Anghami Plus 6 Months','Anghami Plus Annual',
 'Anghami Family Lite','Anghami Family 3 Months','Anghami Plus New Tier'
)) {
 $match=Resolve-PlanSpec -ProductSpec $spec -ItemName $name -ProductName $spec.name
 if($null -ne $match){throw "Unexpected regular plan match: $name"}
 $checks++
}
foreach($case in @(
 @{name='Anghami Plus';slug='plus'},
 @{name='Anghami+ Subscription';slug='plus'},
 @{name='Anghami Plus - أنغامي بلاس';slug='plus'},
 @{name='Anghami Plus Monthly';slug='plus'},
 @{name='Anghami Family';slug='family'},
 @{name='Anghami Plus Monthly Family';slug='family'},
 @{name='Anghami Plus Family par Mois';slug='family'},
 @{name='Anghami Gold Family';slug='family'},
 @{name='Anghami Family Plan for Egypt';slug='family'}
)) {
 $match=Resolve-PlanSpec -ProductSpec $spec -ItemName $case.name -ProductName $spec.name
 if($match.slug -ne $case.slug){throw "Regular public alias lost: $($case.name)"}
 $checks++
}
if(!(Test-ProductSpecCountryScope -ProductSpec $spec -ItemName 'Anghami Family Plan for Egypt' -CountryCode 'EG')){
 throw 'Egypt-specific regular alias lost in Egypt'
}
if(Test-ProductSpecCountryScope -ProductSpec $spec -ItemName 'Anghami Family Plan for Egypt' -CountryCode 'PH'){
 throw 'Egypt-specific alias crossed the country boundary'
}
$checks+=2
Write-Output "PASS: $checks Anghami regular-plan identity boundaries"
