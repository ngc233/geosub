$ErrorActionPreference = 'Stop'
function Assert-True { param([bool]$Condition, [string]$Message) if (!$Condition) { throw $Message } }
function Assert-Throws { param([scriptblock]$Action, [string]$Pattern)
  $caught = $null
  try { & $Action | Out-Null } catch { $caught = $_.Exception.Message }
  Assert-True ($null -ne $caught -and $caught -match $Pattern) "Expected '$Pattern', got '$caught'"
}
function Copy-Fixture { param($Value) return $Value | ConvertTo-Json -Depth 20 | ConvertFrom-Json }
function Assert-NoExternalAction { throw 'Unexpected database, collector, review or network call' }
function Invoke-WebRequest { Assert-NoExternalAction }
function Invoke-RestMethod { Assert-NoExternalAction }
function docker { Assert-NoExternalAction }
function psql { Assert-NoExternalAction }
function node { Assert-NoExternalAction }

$specs = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../data/product-plan-specs.json') -Raw | ConvertFrom-Json
$newNames = @('Claude Max - Monthly', 'Claude Ultra - Monthly')
$newSlugs = @('max', 'ultra')
foreach ($slug in $newSlugs) {
  $plans = @($specs.claude.plans | Where-Object slug -eq $slug)
  Assert-True ($plans.Count -eq 1) "Missing independent canonical plan: $slug"
  $plan = $plans[0]
  Assert-True ($plan.review_only -eq $true -and $plan.billing_cycle -eq 'monthly') 'New plan must be monthly and review-only'
  Assert-True ($plan.PSObject.Properties.Name -notcontains 'expected_monthly_usd_min' -and $plan.PSObject.Properties.Name -notcontains 'expected_monthly_usd_max') 'Do not invent a price range'
}
Write-Output 'PASS: independent canonical plans are monthly, review-only and have no fabricated range'

# Load definitions and AST blocks only, never the collector entrypoint.
$collector = Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($collector, [ref]$tokens, [ref]$errors)
Assert-True (!$errors.Count) 'Collector syntax invalid'
foreach ($name in @(
  'Normalize-PlanMatchText', 'Get-AppStorePendingPlanIdentity', 'Resolve-PlanSpec',
  'Should-IgnoreInAppPurchase', 'Test-PlanAllowsIgnoredRecurringItem',
  'Test-AppStoreItemMatchesProduct', 'Test-ProductSpecCountryScope', 'Test-AppStorePlanScope',
  'Get-PlanSlugFromItemName', 'Get-PlanPublishStatus', 'Ensure-Plan', 'Quote-SqlString', 'Quote-SqlJson',
  'Get-AppStoreExpectedRange', 'Get-AppStorePriceSelectionStrategy', 'Get-AppStorePriceSelectionPenalty',
  'Get-AppStoreObservationAnomaly', 'Get-AppStoreSnapshotBillingCycle', 'Get-AppStoreObservationTime',
  'Format-ObservedPriceText'
)) {
  $definition = $ast.Find({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name}, $true)
  Assert-True ($null -ne $definition) "Missing actual collector function: $name"
  . ([scriptblock]::Create($definition.Extent.Text))
}
$legacySpec = Copy-Fixture $specs.claude
$legacySpec.plans = @($legacySpec.plans | Where-Object slug -notin $newSlugs)
foreach ($itemName in $newNames + @('  CLAUDE   MAX -- MONTHLY  ', 'Claude Ultra &#45; Monthly')) {
  $held = Get-AppStorePendingPlanIdentity -ProductSlug claude -AppleAppId 6473753684 -CountryCode kr -ItemName $itemName -ProductSpec $legacySpec
  Assert-True ($held.identity_status -eq 'pending_confirmation' -and $held.item_name -cin $newNames) 'Unregistered label must remain held'
  Assert-True (@($held.PSObject.Properties.Name | Where-Object { $_ -match 'plan|sku|price|url|token|cookie' }).Count -eq 0) 'Hold diagnostics must not invent identity or include raw evidence'
  Assert-True ($null -eq (Get-AppStorePendingPlanIdentity -ProductSlug claude -AppleAppId 6473753684 -CountryCode KR -ItemName $itemName -ProductSpec $specs.claude)) 'Correct registration must release temporary hold'
  $plan = Resolve-PlanSpec -ProductSpec $specs.claude -ItemName $itemName -ProductName Claude
  Assert-True ($plan.slug -in $newSlugs -and (Get-PlanPublishStatus $plan) -eq 'review') 'New label bound to wrong/published plan'
}
Write-Output 'PASS: registration-aware hold releases only independent review-only labels'

$negativeNames = @('Claude Max - Annual', 'Claude Ultra - Weekly', 'Claude Ultra - Quarterly',
  'Claude Max', 'Max - Monthly', 'Claude Max Plus - Monthly', 'Claude Ultra - Monthly Trial',
  'Claude Ultra - Monthly Credits', 'Claude Ultra - Monthly One-Time', 'Other Claude Max - Monthly',
  'Claude Claude Max - Monthly', 'Claude Ultra - Monthly Yearly', '')
foreach ($itemName in $negativeNames) {
  Assert-True ($null -eq (Resolve-PlanSpec -ProductSpec $specs.claude -ItemName $itemName -ProductName Claude)) "Overbroad match: $itemName"
}
foreach ($case in @(@('Claude Pro - Monthly','pro'), @('Claude Max 5x - Monthly','max-5x'), @('Claude Max 20x - Monthly','max-20x'))) {
  Assert-True ((Resolve-PlanSpec -ProductSpec $specs.claude -ItemName $case[0] -ProductName Claude).slug -eq $case[1]) "Legacy mapping changed: $($case[0])"
}
Write-Output 'PASS: exact labels exclude annual, consumable, partial and extra-brand names; legacy mappings survive'

foreach ($change in @(
  {param($s) $s.plans[3].review_only = $false}, {param($s) $s.plans[3].billing_cycle = 'yearly'},
  {param($s) $s.plans[3].exact_plan_aliases = $false}, {param($s) $s.plans[3].app_store_id = 'wrong-app'},
  {param($s) $s.plans[3].country_codes = @('US')}, {param($s) $s.plans[3].country_codes = @('KR','US')},
  {param($s) $s.plans[3].slug = 'max-5x'}, {param($s) $s.plans[3].name = 'Claude Max 5x'},
  {param($s) $s.plans[3].aliases += 'max'}, {param($s) $s.plans += (Copy-Fixture $s.plans[3])}
)) {
  $invalid = Copy-Fixture $specs.claude; & $change $invalid
  Assert-True ($null -ne (Get-AppStorePendingPlanIdentity -ProductSlug claude -AppleAppId 6473753684 -CountryCode KR -ItemName $newNames[0] -ProductSpec $invalid)) 'Invalid registration bypassed hold'
}
Write-Output 'PASS: invalid, broadened or duplicate registration fails closed'

$itemLoop = $ast.Find({param($n) $n -is [System.Management.Automation.Language.ForEachStatementAst] -and $n.Variable.Extent.Text -eq '$item' -and $n.Condition.Extent.Text -eq '$items'}, $true)
$selectionLoop = $ast.Find({param($n) $n -is [System.Management.Automation.Language.ForEachStatementAst] -and $n.Variable.Extent.Text -eq '$planSlug' -and $n.Condition.Extent.Text -eq '$candidateItemsBySlug.Keys'}, $true)
$writeLoop = $ast.Find({param($n) $n -is [System.Management.Automation.Language.ForEachStatementAst] -and $n.Variable.Extent.Text -eq '$entry' -and $n.Extent.Text.Contains('Insert-Observation')}, $true)
$availabilityLoop = $ast.Find({param($n) $n -is [System.Management.Automation.Language.ForEachStatementAst] -and $n.Variable.Extent.Text -eq '$planSpec' -and $n.Extent.Text.Contains('Record-AppStorePlanAvailability')}, $true)
$summaryAssignment = $ast.Find({param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] -and $n.Left.Extent.Text -eq '$summary'}, $true)
$machineAssignment = $ast.Find({param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] -and $n.Left.Extent.Text -eq '$machineSummary'}, $true)
Assert-True ($itemLoop -and $selectionLoop -and $writeLoop -and $availabilityLoop -and $summaryAssignment -and $machineAssignment) 'Actual collector blocks missing'

# Synthetic identities/amounts/rates only. SQL and observation transports stay in memory.
$fixtureProductId = 'fixture-product'; $registry = @{}
foreach ($p in $specs.claude.plans) {
  $registry[$p.slug] = [pscustomobject]@{id="fixture-$($p.slug)"; product_id=$fixtureProductId; slug=$p.slug; name=$p.name; billing_cycle='monthly'; status=(Get-PlanPublishStatus $p); sort_order=$p.sort_order}
}
$script:registryOverride = $null; $script:sqlCalls = @(); $script:observations = @()
function Invoke-PsqlJson { param([string]$Sql)
  $script:sqlCalls += $Sql
  Assert-True ($Sql -notmatch '(?i)\b(INSERT|UPDATE|DELETE)\b') 'Independent binding attempted a mutation'
  if ($Sql -match "slug = '(max|ultra)'") {
    $rows = if ($null -ne $script:registryOverride) { @($script:registryOverride) } else { @($registry[$Matches[1]]) }
    return [pscustomobject]@{plans=@($rows)}
  }
  if ($Sql -match 'FROM price_observations') { return @{count=0} }
  Assert-NoExternalAction
}
function Invoke-Psql { param([string]$Sql) $script:sqlCalls += $Sql }
function Get-ObservedCurrency { return 'KRW' }
function Parse-PriceNumber { param([string]$PriceText) return [decimal]$PriceText }
function Record-AppStorePlanAvailability {
  param($ProductId,$PlanId,$CountryId,$CountryCode,$PlanSlug,$Found,$CapturedAt)
  $script:availability += [pscustomobject]@{planId=$PlanId; country=$CountryCode; found=$Found}
}
function Insert-Observation {
  param($ProductId,$PlanId,$CountryId,$SourceId,$CountryCode,$Currency,$RawPrice,$ConvertedUsd,$FxRateToUsd,$FxRateDate,$SourceUrl,$ObservedPriceText,$ItemName,$RawSnapshot,$AnomalyFlag,$AnomalyReason,$ParserVersion,$CollectorName)
  $script:observations += [pscustomobject]@{planId=$PlanId; name=$ItemName; snapshot=$RawSnapshot; anomaly=$AnomalyFlag; reason=$AnomalyReason}
  return 'inserted'
}
function Replay-Items {
  param([string[]]$Names, [string]$Storefront='KR', [string]$AppleId='6473753684', [object]$Spec=$specs.claude, [decimal[]]$Amounts=@())
  $ProductSlug='claude'; $AppId=$AppleId; $code=$Storefront; $currency='KRW'; $CountryCodes=@($code)
  $context=@{product=@{id=$fixtureProductId;name='Claude'}}; $productPlanSpec=$Spec
  $country=@{id='fixture-country'}; $sourceId='fixture-source'
  $page=@{Url='https://example.invalid/fixture';CapturedAt='2026-01-01T00:00:00Z';FromCache=$false}
  $usdToCurrency=[decimal]1000; $usdRates=@{Rates=@{KRW=1000};RateDate='2026-01-01'}
  $parserVersion='offline-fixture'; $collectorName='offline-fixture'; $planSortOrder=10
  $plansBySlug=@{}; foreach ($p in $registry.Values) { $plansBySlug[$p.slug]=Copy-Fixture $p }
  $items=@(for ($i=0;$i -lt $Names.Count;$i++) { [pscustomobject]@{Name=$Names[$i];PriceText=if($Amounts.Count){[string]$Amounts[$i]}else{'100000'}} })
  $candidateItemsBySlug=@{}; $selectedItemsBySlug=@{}; $ignoredItemCount=0
  $script:observations=@(); $script:sqlCalls=@(); $script:availability=@()
  . ([scriptblock]::Create($summaryAssignment.Extent.Text))
  . ([scriptblock]::Create($itemLoop.Extent.Text))
  . ([scriptblock]::Create($selectionLoop.Extent.Text))
  if ($selectedItemsBySlug.Count -gt 0 -and $null -ne $productPlanSpec) {
    . ([scriptblock]::Create($availabilityLoop.Extent.Text))
  }
  . ([scriptblock]::Create($writeLoop.Extent.Text))
  $collectionOutcome='complete'
  . ([scriptblock]::Create($machineAssignment.Extent.Text))
  return @{candidates=$candidateItemsBySlug; selected=$selectedItemsBySlug; summary=$machineSummary; ignored=$ignoredItemCount; observations=@($script:observations); sql=@($script:sqlCalls); availability=@($script:availability)}
}
$held = Replay-Items -Names ($newNames + $newNames[0]) -Spec $legacySpec
Assert-True ($held.candidates.Count -eq 0 -and $held.ignored -eq 3 -and $held.observations.Count -eq 0 -and $held.sql.Count -eq 0) 'Unregistered items reached binding or observation generation'
Assert-True ($held.summary.pending_identity_item_count -eq 3 -and $held.summary.inserted -eq 0) 'Pending diagnostic count changed'
$broad = Copy-Fixture $legacySpec; $broad.plans[1].aliases += 'max'; $broad.plans[2].aliases += 'ultra'
Assert-True ((Replay-Items -Names $newNames -Spec $broad).candidates.Count -eq 0) 'Legacy broad aliases bypassed hold'
$heldMixed = Replay-Items -Spec $legacySpec -Names ($newNames + @('Claude Pro - Monthly','Claude Max 5x - Monthly','Claude Max 20x - Monthly'))
Assert-True ($heldMixed.observations.Count -eq 3 -and $heldMixed.summary.pending_identity_item_count -eq 2) 'Unregistered mixed batch lost old candidates or inserted new ones'
foreach ($o in $heldMixed.observations) {
  Assert-True ($o.name -notin $newNames -and $o.planId -in @('fixture-pro','fixture-max-5x','fixture-max-20x')) 'Unregistered mixed batch bound a new name to an old ID'
  Assert-True (@($o.snapshot.inAppPurchases | Where-Object Name -in $newNames).Count -eq 2) 'Page snapshots must preserve evidence; do not claim whole-storage exclusion'
}
Write-Output 'PASS: unregistered labels stay isolated through all three loops, including broad legacy aliases'

$mixed = Replay-Items -Names ($newNames + @('Claude Pro - Monthly','Claude Max 5x - Monthly','Claude Max 20x - Monthly') + $negativeNames)
Assert-True (($mixed.selected.Keys | Sort-Object) -join ',' -eq 'max,max-20x,max-5x,pro,ultra') 'Mixed selection confused plans'
Assert-True ($mixed.observations.Count -eq 5 -and $mixed.summary.inserted -eq 5 -and $mixed.summary.pending_identity_item_count -eq 0) 'Full mixed write loop did not execute'
foreach ($o in $mixed.observations) {
  $p = Resolve-PlanSpec -ProductSpec $specs.claude -ItemName $o.name -ProductName Claude
  Assert-True ($o.planId -eq "fixture-$($p.slug)" -and $o.snapshot.planSpecSlug -eq $p.slug) 'Observation bound to a different canonical identity'
  if ($p.slug -in $newSlugs) { Assert-True ($o.anomaly -and $o.reason -match 'manual identity and regional price review' -and $o.snapshot.billingCycle -eq 'monthly') 'New observation bypassed review' }
}
Assert-True (@($mixed.sql | Where-Object { $_ -match 'UPDATE plans' -and $_ -match "'fixture-(max|ultra)'" }).Count -eq 0) 'New plan changed state during binding'
Write-Output 'PASS: full mixed selection/write loops use five distinct IDs; new observations require review'

foreach ($scope in @(@{country='US';app='6473753684'},@{country='KR';app='wrong-app'},@{country='';app='6473753684'},@{country='KR';app=''})) {
  $outside = Replay-Items -Names ($newNames + 'Claude Pro - Monthly') -Storefront $scope.country -AppleId $scope.app
  Assert-True ($outside.observations.Count -eq 1 -and $outside.observations[0].planId -eq 'fixture-pro') 'New identity escaped app/storefront scope'
  Assert-True (@($outside.availability | Where-Object planId -in @('fixture-max','fixture-ultra')).Count -eq 0) 'Out-of-scope new plan received an availability/absence record'
}
Assert-True ($null -eq (Get-AppStorePendingPlanIdentity -ProductSlug gemini -AppleAppId 6473753684 -CountryCode KR -ItemName $newNames[0] -ProductSpec $specs.gemini)) 'Hold escaped Claude scope'
Write-Output 'PASS: other storefronts/apps cannot create new-plan observations; legacy Pro is unchanged'

$duplicates = Replay-Items -Names @($newNames[0],$newNames[0],$newNames[1],$newNames[1]) -Amounts @(100000,100000,200000,300000)
Assert-True ($duplicates.observations.Count -eq 2 -and $duplicates.selected.max.PriceSelection.selectedCount -eq 2) 'Duplicate labels produced duplicate observations'
Assert-True ($duplicates.selected.ultra.PriceSelection.variantCount -eq 2) 'Multiple prices lost evidence'
$ultra = @($duplicates.observations | Where-Object planId -eq 'fixture-ultra')[0]
Assert-True ($ultra.anomaly -and $ultra.reason -match 'without a clear consensus') 'Ambiguous prices bypassed review'
Write-Output 'PASS: duplicates select once per plan and conflicting prices retain anomaly review'

foreach ($slug in $newSlugs) {
  $name = if ($slug -eq 'max') {$newNames[0]} else {$newNames[1]}
  foreach ($change in @(
    {param($p) $p.slug='max-5x'}, {param($p) $p.name='Claude Max 20x'},
    {param($p) $p.billing_cycle='yearly'}, {param($p) $p.status='published'},
    {param($p) $p.status='archived'}, {param($p) $p.product_id='wrong-product'},
    {param($p) $p.id='fixture-max-5x'}, {param($p) $p.id=''}, {param($p) $p.sort_order=999}
  )) {
    $row=Copy-Fixture $registry[$slug]; & $change $row; $script:registryOverride=@($row); $script:sqlCalls=@()
    Assert-Throws { Ensure-Plan -ProductId $fixtureProductId -ProductName Claude -ItemName $name -PlansBySlug $registry -SortOrder 10 -ProductSpec $specs.claude -AppleAppId 6473753684 -CountryCode KR } 'independent_plan_binding_conflict'
    Assert-True (@($script:sqlCalls | Where-Object {$_ -match '(?i)\b(INSERT|UPDATE|DELETE)\b'}).Count -eq 0) 'Collision attempted adoption/mutation'
  }
  foreach ($rows in @(@(), @($registry[$slug],$registry['max-5x']))) {
    $script:registryOverride=$rows
    Assert-Throws { Ensure-Plan -ProductId $fixtureProductId -ProductName Claude -ItemName $name -PlansBySlug $registry -SortOrder 10 -ProductSpec $specs.claude -AppleAppId 6473753684 -CountryCode KR } 'independent_plan_binding_conflict'
  }
}
$script:registryOverride=$null
Assert-Throws { Ensure-Plan -ProductId $fixtureProductId -ProductName Claude -ItemName $newNames[0] -PlansBySlug $registry -SortOrder 10 -ProductSpec $specs.claude -AppleAppId wrong -CountryCode KR } 'independent_plan_scope_mismatch'
Write-Output 'PASS: missing, duplicate, old-ID and mismatched registry rows stop before mutation or name adoption'

# Exercise actual observation SQL via an in-memory transport, never a database.
$insertDefinition=$ast.Find({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Insert-Observation'}, $true)
. ([scriptblock]::Create($insertDefinition.Extent.Text))
$script:sqlCalls=@(); $DryRun=$false; $Force=$false
$o=@($mixed.observations | Where-Object planId -eq 'fixture-max')[0]
$result=Insert-Observation -ProductId $fixtureProductId -PlanId $o.planId -CountryId fixture-country -SourceId fixture-source -CountryCode KR -Currency KRW -RawPrice 100000 -ConvertedUsd 100 -FxRateToUsd 0.001 -FxRateDate '2026-01-01' -SourceUrl 'https://example.invalid/fixture' -ObservedPriceText 'synthetic' -ItemName $o.name -RawSnapshot $o.snapshot -AnomalyFlag $o.anomaly -AnomalyReason $o.reason
$observationSql=@($script:sqlCalls | Where-Object {$_ -match 'INSERT INTO price_observations'})
Assert-True ($result -eq 'inserted' -and $observationSql.Count -eq 1) 'Actual observation SQL not exercised'
Assert-True ($observationSql[0] -match "'pending'::observation_status" -and $observationSql[0] -match "'fixture-max'::uuid" -and $observationSql[0] -notmatch "'fixture-max-(5x|20x)'::uuid") 'Actual insert targeted old ID or publishable status'
Assert-True ($observationSql[0] -notmatch '(?i)UPDATE\s+prices|INSERT\s+INTO\s+prices') 'Observation path wrote formal prices'
Write-Output 'PASS: actual Insert-Observation emits pending SQL for the new ID only through an in-memory double'

$runnerAst=[System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '../scripts/run-collector-jobs.ps1'),[ref]$tokens,[ref]$errors)
Assert-True (!$errors.Count) 'Runner syntax invalid'
$reader=$runnerAst.Find({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Get-CollectionResultFromText'},$true)
. ([scriptblock]::Create($reader.Extent.Text))
$roundTrip=Get-CollectionResultFromText -Text ('GEOSUB_COLLECTION_RESULT=' + ($held.summary | ConvertTo-Json -Depth 8 -Compress))
Assert-True ($roundTrip.pending_identity_item_count -eq 3 -and $roundTrip.pending_plan_identities.Count -eq 3) 'Machine summary lost diagnostics'
Write-Output 'PASS: batch reader preserves pending diagnostics distinct from observations and publication'
