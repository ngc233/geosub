param(
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [int]$RecentLimit = 8,
  [switch]$FailOnWarnings
)

$ErrorActionPreference = "Stop"

function Invoke-PsqlText {
  param([string]$Sql)

  $result = $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q `
    -t `
    -A

  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed with exit code $LASTEXITCODE."
  }

  return ($result -join "`n").Trim()
}

function Invoke-PsqlJson {
  param([string]$Sql)

  $text = Invoke-PsqlText $Sql
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  return $text | ConvertFrom-Json
}

function Write-Section {
  param([string]$Title)

  Write-Host ""
  Write-Host "== $Title =="
}

function Write-StatusLine {
  param(
    [string]$Label,
    [object]$Value,
    [string]$Status = "OK"
  )

  $prefix = if ($Status -eq "WARN") { "[warn]" } elseif ($Status -eq "FAIL") { "[fail]" } else { "[ ok ]" }
  Write-Host "$prefix ${Label}: $Value"
}

function Add-Warning {
  param([string]$Message)

  $script:Warnings += $Message
  Write-StatusLine -Label $Message -Value "needs attention" -Status "WARN"
}

$Warnings = @()

Write-Section "Discovery pipeline health"

$summary = Invoke-PsqlJson @"
SELECT row_to_json(summary)
FROM (
  SELECT
    (SELECT COUNT(*)::int FROM product_discovery_candidates) AS candidate_count,
    (SELECT COUNT(*)::int FROM product_discovery_candidates WHERE status = 'new'::discovery_candidate_status) AS new_candidate_count,
    (SELECT COUNT(*)::int FROM product_discovery_candidates WHERE status = 'watching'::discovery_candidate_status) AS watching_candidate_count,
    (SELECT COUNT(*)::int FROM product_discovery_candidates WHERE status IN ('promoted'::discovery_candidate_status, 'merged'::discovery_candidate_status)) AS promoted_or_merged_count,
    (SELECT COUNT(*)::int FROM product_discovery_candidates c WHERE status IN ('promoted'::discovery_candidate_status, 'merged'::discovery_candidate_status) AND NOT EXISTS (SELECT 1 FROM collector_jobs job WHERE job.discovery_candidate_id = c.id AND job.status <> 'archived')) AS promoted_without_job_count,
    (SELECT COUNT(*)::int FROM discovery_sources WHERE status = 'active'::discovery_source_status) AS active_source_count,
    (SELECT COUNT(*)::int FROM discovery_sources WHERE manual_scan_requested_at IS NOT NULL) AS queued_source_count,
    (SELECT COUNT(*)::int FROM discovery_source_checks WHERE checked_at >= NOW() - INTERVAL '24 hours') AS source_checks_24h_count,
    (SELECT COUNT(*)::int FROM collector_jobs WHERE status = 'active') AS active_collector_job_count,
    (SELECT COUNT(*)::int FROM collector_jobs WHERE status = 'active' AND (next_run_at IS NULL OR next_run_at <= NOW())) AS due_collector_job_count,
    (SELECT COUNT(*)::int FROM collector_job_runs WHERE started_at >= NOW() - INTERVAL '24 hours') AS collector_runs_24h_count
) summary;
"@

Write-StatusLine "Candidates" $summary.candidate_count
Write-StatusLine "New candidates" $summary.new_candidate_count
Write-StatusLine "Watching candidates" $summary.watching_candidate_count
Write-StatusLine "Promoted or merged candidates" $summary.promoted_or_merged_count
Write-StatusLine "Active discovery sources" $summary.active_source_count
Write-StatusLine "Sources queued for scan" $summary.queued_source_count
Write-StatusLine "Discovery checks in last 24h" $summary.source_checks_24h_count
Write-StatusLine "Active collector jobs" $summary.active_collector_job_count
Write-StatusLine "Collector jobs due now" $summary.due_collector_job_count
Write-StatusLine "Collector runs in last 24h" $summary.collector_runs_24h_count

if ($summary.candidate_count -eq 0 -and $summary.active_source_count -eq 0) {
  Add-Warning "No candidates or active sources found; add a lead or monitored source first"
}

if ($summary.promoted_without_job_count -gt 0) {
  Add-Warning "$($summary.promoted_without_job_count) promoted candidates have no collector job"
}

if ($summary.active_collector_job_count -eq 0 -and $summary.promoted_or_merged_count -gt 0) {
  Add-Warning "Promoted candidates exist, but no active collector jobs were found"
}

Write-Section "Recent candidates"
$recentCandidates = Invoke-PsqlJson @"
SELECT COALESCE(json_agg(row_to_json(candidate)), '[]'::json)
FROM (
  SELECT
    c.name,
    c.status::text AS status,
    c.confidence_score,
    c.source_type::text AS source_type,
    c.last_seen_at,
    COALESCE(job_counts.collector_job_count, 0)::int AS collector_job_count
  FROM product_discovery_candidates c
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS collector_job_count
    FROM collector_jobs job
    WHERE job.discovery_candidate_id = c.id
      AND job.status <> 'archived'
  ) job_counts ON TRUE
  ORDER BY c.last_seen_at DESC
  LIMIT $RecentLimit
) candidate;
"@

foreach ($candidate in @($recentCandidates)) {
  Write-StatusLine "$($candidate.name) [$($candidate.status)]" "confidence $($candidate.confidence_score), jobs $($candidate.collector_job_count)"
}

if (@($recentCandidates).Count -eq 0) {
  Write-Host "No candidates yet."
}

Write-Section "Discovery source checks"
$recentChecks = Invoke-PsqlJson @"
SELECT COALESCE(json_agg(row_to_json(check_row)), '[]'::json)
FROM (
  SELECT
    s.name AS source_name,
    c.status,
    c.changed,
    c.change_kind,
    c.importance_score,
    c.error_message,
    c.checked_at
  FROM discovery_source_checks c
  JOIN discovery_sources s ON s.id = c.source_id
  ORDER BY c.checked_at DESC
  LIMIT $RecentLimit
) check_row;
"@

foreach ($check in @($recentChecks)) {
  $result = if ($check.error_message) { $check.error_message } else { "changed=$($check.changed), kind=$($check.change_kind), score=$($check.importance_score)" }
  $status = if ($check.status -eq "failed") { "WARN" } else { "OK" }
  Write-StatusLine "$($check.source_name) [$($check.status)]" $result $status
}

if (@($recentChecks).Count -eq 0) {
  Write-Host "No discovery source checks yet."
}

Write-Section "Recent collector runs"
$recentRuns = Invoke-PsqlJson @"
SELECT COALESCE(json_agg(row_to_json(run_row)), '[]'::json)
FROM (
  SELECT
    product.name AS product_name,
    source.name AS source_name,
    run.collector_kind,
    run.status,
    run.duration_ms,
    run.error_message,
    run.raw_payload ->> 'diagnosis' AS diagnosis,
    run.started_at
  FROM collector_job_runs run
  LEFT JOIN products product ON product.id = run.product_id
  LEFT JOIN price_sources source ON source.id = run.source_id
  ORDER BY run.started_at DESC
  LIMIT $RecentLimit
) run_row;
"@

foreach ($run in @($recentRuns)) {
  $label = "$($run.product_name) / $($run.collector_kind) [$($run.status)]"
  $detail = if ($run.error_message) { $run.error_message } else { "diagnosis=$($run.diagnosis), duration_ms=$($run.duration_ms)" }
  $status = if ($run.status -eq "failed") { "WARN" } else { "OK" }
  Write-StatusLine $label $detail $status
}

if (@($recentRuns).Count -eq 0) {
  Write-Host "No collector runs yet."
}

Write-Section "Result"
if ($Warnings.Count -eq 0) {
  Write-Host "Discovery pipeline verification completed without warnings."
  exit 0
}

Write-Host "Discovery pipeline verification completed with $($Warnings.Count) warning(s)."
if ($FailOnWarnings) {
  exit 1
}

exit 0
