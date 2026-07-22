param(
  [int]$Limit = 8,
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin"
)

$ErrorActionPreference = "Stop"

$utf8Encoding = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8Encoding
[Console]::OutputEncoding = $utf8Encoding
$OutputEncoding = $utf8Encoding

$runnerScript = Join-Path $PSScriptRoot "run-collector-jobs.ps1"
$dbBridge = Join-Path $PSScriptRoot "db-query.mjs"

if (!(Test-Path -LiteralPath $runnerScript)) {
  throw "Collector runner not found: $runnerScript"
}

if (!(Test-Path -LiteralPath $dbBridge)) {
  throw "Database bridge not found: $dbBridge"
}

function Invoke-DbJson {
  param([string]$Sql)

  $output = $Sql | node $dbBridge --json 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Database heartbeat command failed. $($output -join "`n")"
  }

  $text = ($output -join "").Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  return $text | ConvertFrom-Json
}

function Invoke-DbCommand {
  param([string]$Sql)

  $output = $Sql | node $dbBridge --exec 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Database heartbeat command failed. $($output -join "`n")"
  }
}

$started = Invoke-DbJson @"
WITH stale AS (
  UPDATE system_task_runs
  SET
    status = 'failed',
    finished_at = NOW(),
    exit_code = 124,
    error_message = COALESCE(error_message, 'Previous local collector task exceeded six hours.')
  WHERE task_key = 'collector_runner'
    AND status = 'running'
    AND started_at < NOW() - INTERVAL '6 hours'
), inserted AS (
  INSERT INTO system_task_runs (
    task_key,
    trigger_kind,
    status,
    metadata
  )
  VALUES (
    'collector_runner',
    'windows_task',
    'running',
    jsonb_build_object('limit', $Limit, 'host', 'local_windows')
  )
  RETURNING id::text
)
SELECT row_to_json(inserted) FROM inserted;
"@

$runId = [string]$started.id
$exitCode = 1
$errorMessage = $null

try {
  & powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $runnerScript `
    -Limit $Limit `
    -ContainerName $ContainerName `
    -DbName $DbName `
    -DbUser $DbUser
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    throw "Collector runner exited with code $exitCode."
  }
} catch {
  $errorMessage = $_.Exception.Message
  if ($exitCode -eq 0) {
    $exitCode = 1
  }
} finally {
  $safeError = if ($errorMessage) {
    "'" + $errorMessage.Replace("'", "''") + "'"
  } else {
    "NULL"
  }
  $status = if ($exitCode -eq 0) { "succeeded" } else { "failed" }

  Invoke-DbCommand @"
UPDATE system_task_runs
SET
  status = '$status',
  finished_at = NOW(),
  exit_code = $exitCode,
  error_message = $safeError
WHERE id = '$runId'::uuid;
"@
}

if ($exitCode -ne 0) {
  throw $errorMessage
}

Write-Host "Local collector task completed successfully."
