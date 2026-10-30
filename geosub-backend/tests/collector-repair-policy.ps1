param([string]$QueryOutputPath, [string]$IssuesInputPath, [string]$PreviousRunnerPath)
$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '../scripts/run-collector-jobs.ps1'
$errors = $null; $tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Invalid runner syntax' }
foreach ($definition in $ast.FindAll({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst]}, $false)) {
  $text = $definition.Extent.Text
  if ($definition.Name -eq 'Get-AppStoreRepairAction') {
    $text = $text.Replace('$PSScriptRoot', "'" + (Split-Path $path -Parent) + "'")
  }
  . ([scriptblock]::Create($text))
}
function Expect($ok, $label) {
  if (!$ok) { throw "FAIL: $label" }
  Write-Output "PASS: $label"
}
foreach ($case in @(
  @{reason='app_store_plan_order_conflict';text='';action='repair_plan_mapping'},
  @{reason='app_store_currency_mismatch';text='';action='repair_currency_parser'},
  @{reason='';text='Multiple App Store prices matched this plan without a clear consensus.';action='repair_plan_mapping'},
  @{reason='';text='Price outside expected USD range';action='verify_price_range'},
  @{reason='';text='This new plan requires manual identity and regional price review before publication.';action='verify_plan_eligibility'},
  @{reason='waiting_for_more_app_store_samples';text='';action='collect_independent_evidence'},
  @{reason='app_store_price_changed';text='';action='collect_independent_evidence'},
  @{reason='app_store_non_monthly_or_region_restricted_item';text='';action='repair_plan_mapping'},
  @{reason='unknown';text='';action='collect_independent_evidence'}
)) {
  $action = Get-AppStoreRepairAction @{reason_code=$case.reason;anomaly_reason=$case.text;resolved=$false}
  Expect ($action -eq $case.action) $case.action
}
foreach ($case in @(
  @{product='canva';plan='pro';cycle='monthly';expected='verify_plan_eligibility'},
  @{product='notion';plan='plus';cycle='monthly';expected='verify_plan_eligibility'},
  @{product='canva';plan='teams';cycle='monthly';expected='repair_plan_mapping'},
  @{product='kimi';plan='give-some-snacks';cycle='monthly';expected='repair_plan_mapping'},
  @{product='disney';plan='premier-access-black-widow';cycle='monthly';expected='repair_plan_mapping'},
  @{product='captions';plan='basic';cycle='yearly';expected='repair_plan_mapping'},
  @{product='captions';plan='basic';cycle='monthly';expected='collect_independent_evidence'},
  @{product='kimi';plan='moderato';cycle='monthly';expected='collect_independent_evidence'},
  @{product='pollo-ai';plan='weekly-premium';cycle='weekly';expected='collect_independent_evidence'}
)) {
  $issue = @{identity_key='qualification';country_code='US';product_slug=$case.product;plan_slug=$case.plan
    billing_cycle=$case.cycle;reason_code='waiting_for_more_app_store_samples';anomaly_reason='';resolved=$false}
  Expect ((Get-AppStoreRepairAction $issue) -eq $case.expected) ($case.product + ':' + $case.plan + ' repair qualification')
}
$blocked = @{identity_key='blocked';country_code='US';reason_code='app_store_plan_order_conflict';resolved=$false}
$waiting = @{identity_key='waiting';country_code='CA';reason_code='waiting_for_more_app_store_samples';resolved=$false}
$done = @{identity_key='done';country_code='DE';resolved=$true}
$skuOnly = @{identity_key='sku-only';country_code='US';product_slug='invideo-ai';plan_slug='max'
  billing_cycle='monthly';reason_code='app_store_observation_anomaly';resolved=$false
  anomaly_reason='Multiple App Store prices matched this plan without a clear consensus.'
  price_identity_evidence='app_store_display_name_only'}
Expect ((Get-AppStoreRepairAction $skuOnly) -eq 'verify_sku_entitlements') 'display-only ambiguity requires SKU entitlement evidence'
$skuPlan = New-AppStoreRepairPlan @($skuOnly)
Expect ($skuPlan.country_codes.Count -eq 0) 'SKU evidence task does not request another identical collection'
$skuMixed = New-AppStoreRepairPlan @($skuOnly,$waiting)
Expect (($skuMixed.country_codes -join ',') -eq 'CA') 'mixed SKU hold retains independently collectible countries'
Expect ((Measure-AppStoreRepairResolution $skuPlan.targets @($skuOnly)).state -eq 'unresolved') 'SKU evidence task remains unresolved'
$legacySku = $skuOnly.Clone();$legacySku.Remove('price_identity_evidence')
Expect ((Get-AppStoreRepairAction $legacySku) -eq 'repair_plan_mapping') 'legacy evidence does not invent SKU provenance'
$currencySku = $skuOnly.Clone();$currencySku.reason_code='app_store_currency_mismatch'
Expect ((Get-AppStoreRepairAction $currencySku) -eq 'repair_currency_parser') 'explicit currency failure keeps priority'
$unknownSku = $skuOnly.Clone();$unknownSku.plan_slug='unregistered-old-plan'
Expect ((Get-AppStoreRepairAction $unknownSku) -eq 'repair_plan_mapping') 'unregistered plan still requires a mapping fix'
$doneSku = $skuOnly.Clone();$doneSku.resolved=$true
Expect ((Get-AppStoreRepairAction $doneSku) -eq 'resolved') 'verified publication resolves identity task'

$notShown = @{identity_key='not-shown';country_code='US';product_slug='kimi';plan_slug='moderato'
  billing_cycle='monthly';reason_code='waiting_for_more_app_store_samples';resolved=$false;public_plan_not_shown=$true}
Expect ((Get-AppStoreRepairAction $notShown) -eq 'verify_source_visibility') 'public omission requests source coverage verification'
$visibilityPlan = New-AppStoreRepairPlan @($notShown)
Expect ($visibilityPlan.country_codes.Count -eq 0) 'public omission does not request blind anomaly collection'
Expect ((Measure-AppStoreRepairResolution $visibilityPlan.targets @($notShown)).state -eq 'unresolved') 'source omission remains unresolved'
$notShown.resolved=$true
Expect ((Get-AppStoreRepairAction $notShown) -eq 'resolved') 'fresh published evidence can resolve source omission'
$notShown.resolved=$false
$plan = New-AppStoreRepairPlan @($blocked,$waiting,$done)
Expect (($plan.country_codes -join ',') -eq 'CA') 'only actionable countries selected'
Expect ($plan.targets.Count -eq 2) 'only original unresolved targets retained for evaluation'
$evaluation = Measure-AppStoreRepairResolution $plan.targets @($done)
Expect ($evaluation.state -eq 'unresolved' -and $evaluation.unresolved_count -eq 2) 'missing evidence cannot close an issue'
Expect ((Measure-AppStoreRepairResolution @() @()).state -eq 'no_open_targets') 'empty target set cannot claim repair'
$fixed = @($plan.targets | ForEach-Object { @{identity_key=$_.identity_key;resolved=$true} })
Expect ((Measure-AppStoreRepairResolution $plan.targets $fixed).state -eq 'resolved') 'all original targets require positive proof'
Expect ((Measure-AppStoreRepairResolution $plan.targets @($done,@{identity_key='unrelated';resolved=$true})).state -eq 'unresolved') 'unrelated publication cannot close targets'

# Exercise the actual dispatch branch with capture doubles; no network or DB.
$source = Get-Content -LiteralPath $path -Raw
$start = $source.IndexOf('    $repairPlan = $null')
$end = $source.IndexOf('    if (!$SkipAutoReview -and $result.CollectorKind', $start)
$dispatch = [scriptblock]::Create($source.Substring($start,$end-$start))
function Get-AppStoreRepairIssues { param($Job,$CountryCodes) $script:reads++; return $script:issues }
function Invoke-CollectorScript { param($Job) $script:called++; return @{Status='succeeded';RawPayload=@{}} }
$DryRun = $false; $script:reads=0; $script:called=0; $script:issues=@($blocked)
$job=@{schedule='anomaly_watch';job_config=[pscustomobject]@{collector_kind='app_store';country_codes=@('US','CA')}}
. $dispatch
Expect ($called -eq 0 -and $result.Status -eq 'skipped') 'rule-only repair makes no collector request'
$script:issues=@($skuOnly)
. $dispatch
Expect ($called -eq 0 -and $result.Status -eq 'skipped') 'SKU evidence-only repair performs no collection'

$script:issues=@($notShown)
. $dispatch
Expect ($called -eq 0 -and $result.Status -eq 'skipped') 'public omission skips anomaly request without claiming closure'
$script:issues=@(@{identity_key='review-only';country_code='US';product_slug='canva';plan_slug='pro'
  billing_cycle='monthly';reason_code='waiting_for_more_app_store_samples';resolved=$false})
. $dispatch
Expect ($called -eq 0 -and $result.Status -eq 'skipped') 'current review-only registration makes no repair request'
$script:issues=@(@{identity_key='donation';country_code='US';product_slug='kimi';plan_slug='give-some-snacks'
  billing_cycle='monthly';reason_code='superseded_by_published_price';resolved=$false})
. $dispatch
Expect ($called -eq 0 -and $result.Status -eq 'skipped') 'unregistered donation makes no repair request'

$script:issues=@($blocked,$waiting); . $dispatch
Expect ($called -eq 1 -and ($job.job_config.country_codes -join ',') -eq 'CA') 'mixed repair actually calls collector for CA only'
$script:issues=@($blocked);$job.schedule='daily';$job.job_config.country_codes=@('US','CA'); . $dispatch
Expect ($called -eq 2 -and ($job.job_config.country_codes -join ',') -eq 'US,CA') 'normal scheduled scope preserved'
$job.schedule='anomaly_watch';$beforeCalls=$called
$script:issues=@(
  @{identity_key='donation';country_code='US';product_slug='kimi';plan_slug='give-some-snacks'
    billing_cycle='monthly';reason_code='superseded_by_published_price';resolved=$false},
  @{identity_key='moderato';country_code='CA';product_slug='kimi';plan_slug='moderato'
    billing_cycle='monthly';reason_code='waiting_for_more_app_store_samples';resolved=$false}
)
. $dispatch
Expect ($called -eq $beforeCalls+1 -and ($job.job_config.country_codes -join ',') -eq 'CA') 'registered subscription alone selects repair country'

$job.schedule='anomaly_watch';$DryRun=$true;$before=$reads;. $dispatch
Expect ($reads -eq $before) 'dry run does not query repair evidence'

$DryRun=$false
function Invoke-Psql {param($Sql) $script:write=$Sql}
$job.id='11111111-1111-4111-8111-111111111111'
$job.product_id=$job.id;$job.source_id=$null;$job.error_count=0
$job.job_config | Add-Member -NotePropertyName app_store_id -NotePropertyValue '12345'
$skip=@{Status='skipped';CollectorKind='app_store';Output='Policy hold';Error=$null;
  RawPayload=@{repair_plan=$plan;repair_resolution=@{state='unresolved'}}}
Complete-JobRun -Job $job -Result $skip -StartedAt (Get-Date) -RunId $job.id
Expect ($write.Contains("status = 'paused'") -and $write.Contains('next_run_at = NULL')) 'policy skip pauses the one-off task'
Expect ($write.Contains('success_count = success_count + 0') -and $write.Contains('error_count = error_count')) 'policy hold is neither collection success nor failure'
Expect (!$write.Contains("'country_codes'")) 'narrowed execution does not overwrite persisted country scope'

function Add-AppStoreRunEvidence {param($Job,$Result,$StartedAt) return $Result}
$script:issues=@($blocked)
$result=@{RawPayload=@{repair_plan=$plan;collection_evidence=@{published_price_count=99}}}
$measured=Add-AppStoreReviewOutcome -Job $job -Result $result -StartedAt (Get-Date)
Expect ($measured.RawPayload.repair_outcome -eq 'unresolved') 'publication count cannot override unresolved original targets'
$script:issues=$fixed
$measured=Add-AppStoreReviewOutcome -Job $job -Result $result -StartedAt (Get-Date)
Expect ($measured.RawPayload.repair_outcome -eq 'resolved') 'post-review closure uses positive evidence for every original target'

function Invoke-CollectorScript {param($Job) throw 'Controlled transport failure fixture'}
$mainTry=$ast.Find({param($n)
  $n -is [System.Management.Automation.Language.TryStatementAst] -and
  $n.Body.Extent.Text.Contains('$repairPlan = $null')
},$true)
$summary=@{failed=0;succeeded=0;skipped=0;appStoreSucceeded=0}
$script:issues=@($blocked,$waiting)
$job.job_config.country_codes=@('US','CA')
$startedAt=Get-Date;$jobRunId=$job.id
. ([scriptblock]::Create($mainTry.Extent.Text))
Expect ($summary.failed -eq 1 -and $write.Contains('repair_plan')) 'transport failure retains original repair targets'
Expect ($write.Contains("'unresolved'")) 'failed collection cannot claim repair closure'

if ($QueryOutputPath) {
  # Restore the real query function and capture its actual interpolated SQL.
  $definition=$ast.Find({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Get-AppStoreRepairIssues'},$true)
  . ([scriptblock]::Create($definition.Extent.Text))
  function Invoke-PsqlJson {param($Sql) $script:query=$Sql; return @()}
  Get-AppStoreRepairIssues -Job @{product_id='11111111-1111-4111-8111-111111111111'} -CountryCodes @('US') | Out-Null
  [IO.File]::WriteAllText($QueryOutputPath,$script:query,[Text.UTF8Encoding]::new($false))
}

if ($IssuesInputPath) {
  $inputIssues = @(Get-Content -LiteralPath $IssuesInputPath -Raw | ConvertFrom-Json)
  $inputPlan = New-AppStoreRepairPlan -Issues $inputIssues
  Write-Output ('GEOSUB_HISTORY_ACTIONS=' + (ConvertTo-Json -InputObject @($inputPlan.targets) -Depth 8 -Compress))
  if ($PreviousRunnerPath) {
    $errors=$null;$tokens=$null
    $previousAst=[Management.Automation.Language.Parser]::ParseFile($PreviousRunnerPath,[ref]$tokens,[ref]$errors)
    if ($errors.Count) { throw 'Previous runner syntax invalid' }
    $previous=$previousAst.Find({param($node)
      $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-AppStoreRepairAction'
    },$true)
    if ($null -eq $previous) { throw 'Previous action classifier missing' }
    $text=$previous.Extent.Text.Replace('function Get-AppStoreRepairAction {','function Get-PreviousAppStoreRepairAction {')
    . ([scriptblock]::Create($text))
    $previousTargets=@($inputIssues | Where-Object { $_.resolved -ne $true } | ForEach-Object {
      @{identity_key=$_.identity_key;action=(Get-PreviousAppStoreRepairAction $_)}
    })
    Write-Output ('GEOSUB_HISTORY_PREVIOUS_ACTIONS=' + (ConvertTo-Json -InputObject @($previousTargets) -Depth 8 -Compress))
  }

}
