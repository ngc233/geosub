param([string]$SamplesPath, [string]$ResultPath, [string]$DatabaseFixturePath)
$ErrorActionPreference = 'Stop'
$collector = Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$errors = $null; $tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($collector, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Invalid collector syntax' }
foreach ($definition in $ast.FindAll({param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst]
}, $false)) {
  $definitionText = $definition.Extent.Text
  if ($definition.Name -eq 'Load-ProductPlanSpecs') {
    $scriptsPath = (Split-Path $collector -Parent).Replace("'", "''")
    $definitionText = $definitionText.Replace('$PSScriptRoot', "'$scriptsPath'")
  }
  . ([scriptblock]::Create($definitionText))
}
# All functions are loaded without executing the collector's network/database entrypoint.
function Invoke-Psql { throw 'No database in identity replay' }
function Invoke-PsqlJson { throw 'No database in identity replay' }
function Expect($ok, $message) {
  if (!$ok) { throw "FAIL: $message" }
  Write-Output "PASS: $message"
}
$specs = Load-ProductPlanSpecs
$captions = Get-ProductPlanSpec -Specs $specs -ProductSlug 'captions'
$pollo = Get-ProductPlanSpec -Specs $specs -ProductSlug 'pollo-ai'
$weekly = Resolve-PlanSpec -ProductSpec $captions -ProductName 'Captions' -ItemName 'Captions Basic - weekly'
Expect ($null -eq $weekly) 'Captions weekly cannot become monthly Basic'
foreach ($case in @(
  @{spec=$captions;name='Captions Basic - monthly';slug='basic';cycle='monthly'},
  @{spec=$captions;name='Captions Basic - mensuelle';slug='basic';cycle='monthly'},
  @{spec=$captions;name='Captions Max';slug='max';cycle='monthly'},
  @{spec=$pollo;name='Pollo Lite - Monthly Plan';slug='lite';cycle='monthly'},
  @{spec=$pollo;name='Monthly Subscription Lite';slug='lite';cycle='monthly'},
  @{spec=$pollo;name='Pollo Pro - Monthly Plan';slug='pro';cycle='monthly'},
  @{spec=$pollo;name='Monthly Subscription Pro';slug='pro';cycle='monthly'},
  @{spec=$pollo;name='Pollo Weekly Premium';slug='weekly-premium';cycle='weekly'}
)) {
  $matched = Resolve-PlanSpec -ProductSpec $case.spec -ProductName $case.spec.name -ItemName $case.name
  Expect ($null -ne $matched -and $matched.slug -eq $case.slug -and $matched.billing_cycle -eq $case.cycle) $case.name
}
foreach ($case in @(
  @{spec=$captions;name='Caption Basic - yearly'},
  @{spec=$captions;name='Caption Basic - annuelle'},
  @{spec=$captions;name='Captions Basic'},
  @{spec=$captions;name='Captions Basic - monthly trial'},
  @{spec=$captions;name='Captions Max Annual'},
  @{spec=$captions;name='Captions Frontier'},
  @{spec=$pollo;name='Annual Subscription Lite'},
  @{spec=$pollo;name='Annual Subscription Pro'},
  @{spec=$pollo;name='Pollo Pro - Annual Plan'},
  @{spec=$pollo;name='Pollo Lite - Weekly Plan'},
  @{spec=$pollo;name='Pollo Pro'},
  @{spec=$pollo;name='Pollo Ultra - Monthly Plan'},
  @{spec=$pollo;name='100 Pollo Credits'}
)) {
  Expect ($null -eq (Resolve-PlanSpec -ProductSpec $case.spec -ProductName $case.spec.name -ItemName $case.name)) $case.name
}

$source = Get-Content -LiteralPath $collector -Raw
$start = $source.IndexOf('  $candidateItemsBySlug = @{}')
$end = $source.IndexOf('  $subscriptionItemCount = $selectedItemsBySlug.Count', $start)
if ($start -lt 0 -or $end -le $start) { throw 'Selection block not found' }
$selection = [scriptblock]::Create($source.Substring($start, $end - $start))
function Replay-Items($Spec, $Items, $Code = 'US', $Currency = 'USD', $Fx = 1) {
  $productPlanSpec = $Spec; $items = $Items; $code = $Code; $currency = $Currency
  $usdToCurrency = [decimal]$Fx; $usdRates = @{Rates=@{}}
  $context = @{product=@{name=$Spec.name}}; $summary = @{missing=0}
  . $selection
  return $selectedItemsBySlug
}
function Anomaly-For($Entry, $Currency = 'USD', $Fx = 1) {
  $usd = if ($Entry.Currency -eq 'USD') { $Entry.RawPrice } else { $Entry.RawPrice / [decimal]$Fx }
  return Get-AppStoreObservationAnomaly -CountryCurrency $Currency -ObservedCurrency $Entry.Currency `
    -ConvertedUsd $usd -OriginalObservedPriceText $Entry.Item.PriceText `
    -PriceSelection $Entry.PriceSelection -PlanSpec $Entry.PlanSpec
}
$unique = Replay-Items $captions @(
  @{Name='Captions Basic - weekly';PriceText='$5.99'},
  @{Name='Captions Basic - monthly';PriceText='$9.99'},
  @{Name='Captions Basic - monthly';PriceText='$9.99'},
  @{Name='Caption Basic - yearly';PriceText='$64.99'}
)
Expect ($unique.basic.RawPrice -eq 9.99 -and $unique.basic.PriceSelection.variantCount -eq 1) 'weekly and annual excluded before selection'
Expect (!(Anomaly-For $unique.basic).Flag) 'one explicit monthly price is not ambiguous'
$ambiguous = Replay-Items $captions @(
  @{Name='Captions Basic - weekly';PriceText='$5.99'},
  @{Name='Captions Basic - monthly';PriceText='$9.99'},
  @{Name='Captions Basic - monthly';PriceText='$10.49'}
)
Expect ((Anomaly-For $ambiguous.basic).Flag) 'different explicit monthly prices remain isolated'
$polloAmbiguous = Replay-Items $pollo @(
  @{Name='Pollo Lite - Monthly Plan';PriceText='$15.00'},
  @{Name='Monthly Subscription Lite';PriceText='$17.99'},
  @{Name='Annual Subscription Lite';PriceText='$143.99'},
  @{Name='100 Pollo Credits';PriceText='$6.99'}
)
Expect ($polloAmbiguous.lite.PriceSelection.variantCount -eq 2 -and (Anomaly-For $polloAmbiguous.lite).Flag) 'Pollo monthly SKU disagreement is not resolved by choosing cheaper price'
Expect ($polloAmbiguous.lite.PriceSelection.identityEvidence -eq 'app_store_display_name_only') 'display names do not claim verified subscription IDs'
Expect ($polloAmbiguous.lite.PriceSelection.billingCycle -eq 'monthly') 'variant evidence keeps canonical billing cycle'
$lowerVariant = @($polloAmbiguous.lite.PriceSelection.variants | Where-Object rawPrice -eq 15)[0]
$upperVariant = @($polloAmbiguous.lite.PriceSelection.variants | Where-Object rawPrice -eq 17.99)[0]
Expect ($lowerVariant.itemNames.Count -eq 1 -and $lowerVariant.itemNames[0] -eq 'Pollo Lite - Monthly Plan') 'lower variant retains its source name'
Expect ($upperVariant.itemNames.Count -eq 1 -and $upperVariant.itemNames[0] -eq 'Monthly Subscription Lite') 'upper variant retains its source name'

$rows = @()
if ($SamplesPath) {
  $samples = (Get-Content -LiteralPath $SamplesPath -Raw | ConvertFrom-Json).rows
  foreach ($sample in $samples) {
    if (!$sample.items.Count) { continue }
    $spec = Get-ProductPlanSpec -Specs $specs -ProductSlug $sample.product
    $selected = Replay-Items $spec $sample.items $sample.country $sample.country_currency $sample.fx_usd_to_currency
    $entry = $selected[$sample.plan]
    $rows += [pscustomobject]@{
      product=$sample.product;plan=$sample.plan;country=$sample.country;previous_name=$sample.selected_name
      previous_status=$sample.status;selected_name=$(if ($entry) { $entry.Item.Name } else { $null })
      raw_price=$(if ($entry) { $entry.RawPrice } else { $null });currency=$sample.currency
      variant_count=$(if ($entry) { $entry.PriceSelection.variantCount } else { 0 })
      anomalous=$(if ($entry) { (Anomaly-For $entry $sample.country_currency $sample.fx_usd_to_currency).Flag } else { $true })
    }
    if ($entry -and $sample.product -eq 'captions' -and $sample.plan -eq 'basic') {
      Expect ($entry.Item.Name -notmatch 'weekly|yearly|annuelle') 'snapshot Basic retains explicit monthly identity'
    }
  }
}
if ($ResultPath) {
  @{passed=$true;scope='identity/selection replay only; no source fetch, database or publication';rows=$rows} |
    ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ResultPath -Encoding utf8NoBOM
}
if ($DatabaseFixturePath) {
  $uri = $null
  if (![Uri]::TryCreate($env:DATABASE_URL, [UriKind]::Absolute, [ref]$uri) -or
    $uri.Scheme -notin @('postgres', 'postgresql') -or $uri.Host -notin @('localhost', '127.0.0.1') -or
    $uri.Port -ne 55433 -or $uri.AbsolutePath -notmatch '^/geosub_collector_test_identity_[a-z0-9_]+$') {
    throw 'Disposable identity database required'
  }
  $script:IdentityDbBridge = Join-Path (Split-Path $collector -Parent) 'db-query.mjs'
  function Invoke-Psql {
    param([string]$Sql)
    $output = $Sql | node $script:IdentityDbBridge --exec 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Identity fixture database write failed' }
  }
  function Invoke-PsqlJson {
    param([string]$Sql)
    $output = $Sql | node $script:IdentityDbBridge --json 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Identity fixture database query failed' }
    return ($output -join '') | ConvertFrom-Json
  }
  $actual = Invoke-PsqlJson "SELECT json_build_object('name', current_database())"
  if ('/' + $actual.name -ne $uri.AbsolutePath) { throw 'Identity database mismatch' }
  $fixture = Get-Content -LiteralPath $DatabaseFixturePath -Raw | ConvertFrom-Json
  $basicConflict = Replay-Items $captions @(
    @{Name='Captions Basic - weekly';PriceText='$5.99'},
    @{Name='Captions Basic - monthly';PriceText='$10.49'},
    @{Name='Captions Basic - monthly';PriceText='$11.99'}
  )
  $polloUnique = Replay-Items $pollo @(
    @{Name='Monthly Subscription Pro';PriceText='$34.99'},
    @{Name='Pollo Weekly Premium';PriceText='$5.99'}
  )
  $writes = @(
    @{product='captions';plan='basic';entry=$unique.basic},
    @{product='captions';plan='basic';entry=$basicConflict.basic},
    @{product='pollo-ai';plan='lite';entry=$polloAmbiguous.lite},
    @{product='pollo-ai';plan='pro';entry=$polloUnique.pro},
    @{product='pollo-ai';plan='weekly-premium';entry=$polloUnique['weekly-premium']}
  )
  $DryRun = $false; $Force = $false
  foreach ($round in @(1, 2)) {
    foreach ($write in $writes) {
      $identity = @($fixture.identities | Where-Object { $_.product -eq $write.product -and $_.plan -eq $write.plan })[0]
      $entry = $write.entry; $anomaly = Anomaly-For $entry
      $cycle = Get-AppStoreSnapshotBillingCycle $entry.PlanSpec
      $snapshot = @{snapshotSchemaVersion=1;billingCycle=$cycle;country='US';planSpecSlug=$write.plan
        priceSelection=$entry.PriceSelection;originalObservedPriceText=$entry.Item.PriceText;fixture=$true}
      $observationArgs = @{
        ProductId=$identity.product_id;PlanId=$identity.plan_id;CountryId=$fixture.country_id
        SourceId=$fixture.source_id;CountryCode='US';Currency='USD';RawPrice=$entry.RawPrice
        ConvertedUsd=$entry.RawPrice;FxRateToUsd=1;FxRateDate=(Get-Date -Format 'yyyy-MM-dd')
        SourceUrl=('https://apps.apple.com/us/app/id' + $identity.app_store_id)
        ObservedPriceText=$entry.Item.PriceText;ItemName=$entry.Item.Name;RawSnapshot=$snapshot
        AnomalyFlag=$anomaly.Flag;AnomalyReason=$anomaly.Reason;ParserVersion='identity-fixture-v1'
        CollectorName='collect-app-store-prices.ps1/isolated-identity-fixture'
      }
      $result = Insert-Observation @observationArgs
      $expected = if ($round -eq 1) { 'inserted' } else { 'skipped' }
      Expect ($result -eq $expected) "real observation write $expected $($write.product)/$($write.plan)"
    }
  }
}
Write-Output 'PASS: identity replay leaves review policies and price thresholds unchanged'
