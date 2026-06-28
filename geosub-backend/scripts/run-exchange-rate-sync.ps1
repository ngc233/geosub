param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$BaseCurrency = "USD",
  [string[]]$QuoteCurrencies = @("CNY")
)

$ErrorActionPreference = "Stop"

$logDir = Join-Path $ProjectRoot "logs"
$syncScript = Join-Path $ProjectRoot "scripts\sync-exchange-rates.ps1"
$dateStamp = Get-Date -Format "yyyy-MM-dd"
$logFile = Join-Path $logDir "exchange-rate-sync-$dateStamp.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$timestamp] $Message" | Tee-Object -FilePath $logFile -Append
}

try {
  Write-Log "Starting exchange rate sync."
  Write-Log "Base: $BaseCurrency; Quotes: $($QuoteCurrencies -join ',')."

  & powershell -NoProfile -ExecutionPolicy Bypass `
    -File $syncScript `
    -BaseCurrency $BaseCurrency `
    -QuoteCurrencies $QuoteCurrencies 2>&1 |
    Tee-Object -FilePath $logFile -Append

  if ($LASTEXITCODE -ne 0) {
    throw "Exchange rate sync failed with exit code $LASTEXITCODE."
  }

  Write-Log "Exchange rate sync completed."
}
catch {
  Write-Log "Exchange rate sync failed: $($_.Exception.Message)"
  exit 1
}
