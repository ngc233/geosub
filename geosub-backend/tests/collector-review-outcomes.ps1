$ErrorActionPreference = 'Stop'
$runner = Join-Path $PSScriptRoot '../scripts/run-collector-jobs.ps1'
$parseErrors = $null
$tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($runner, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'Runner syntax failed' }
$function = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Add-AppStoreReviewOutcome' }, $true)
. ([scriptblock]::Create($function.Extent.Text))
function Add-AppStoreRunEvidence { param($Job, $Result, $StartedAt) return $Result }
$cases = @(
  @{ anomaly_count=1; pending_stability_count=0; published_price_count=2; expected='isolated_unresolved' },
  @{ anomaly_count=0; pending_stability_count=2; published_price_count=2; expected='waiting_for_evidence' },
  @{ anomaly_count=0; pending_stability_count=0; published_price_count=2; expected='published_evidence_updated' },
  @{ anomaly_count=0; pending_stability_count=0; published_price_count=0; expected='no_verified_replacement' }
)
foreach ($case in $cases) {
  $result = Add-AppStoreReviewOutcome -Job @{} -Result ([pscustomobject]@{RawPayload=@{collection_evidence=$case}}) -StartedAt (Get-Date)
  if ($result.RawPayload.repair_outcome -ne $case.expected) { throw "Wrong outcome: $($case.expected)" }
  Write-Output "PASS: $($case.expected)"
}