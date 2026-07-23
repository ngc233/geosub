param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$BaseCurrency = "USD",
  [string[]]$QuoteCurrencies = @(
    "AED", "ARS", "AUD", "BRL", "CAD", "CHF", "CLP", "CNY", "COP",
    "DKK", "EGP", "EUR", "GBP", "HKD", "IDR", "ILS", "INR", "JPY", "KES",
    "KRW", "MXN", "MYR", "NGN", "NOK", "NZD", "PHP", "PKR", "PLN",
    "SAR", "SEK", "SGD", "THB", "TRY", "TWD", "VND", "ZAR"
  )
)

$ErrorActionPreference = "Stop"

$logDir = Join-Path $ProjectRoot "logs"
$syncScript = Join-Path $ProjectRoot "scripts\sync-exchange-rates.ps1"
$dateStamp = Get-Date -Format "yyyy-MM-dd"
$logFile = Join-Path $logDir "exchange-rate-sync-$dateStamp.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Get-PowerShellHost {
  $pwsh = Get-Command "pwsh" -ErrorAction SilentlyContinue
  if ($pwsh) {
    return $pwsh.Source
  }

  $windowsPowerShell = Get-Command "powershell" -ErrorAction SilentlyContinue
  if ($windowsPowerShell) {
    return $windowsPowerShell.Source
  }

  $windowsPowerShellExe = Get-Command "powershell.exe" -ErrorAction SilentlyContinue
  if ($windowsPowerShellExe) {
    return $windowsPowerShellExe.Source
  }

  throw "PowerShell executable not found. Install PowerShell 7 or Windows PowerShell."
}

function Write-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$timestamp] $Message" | Tee-Object -FilePath $logFile -Append
}

try {
  Write-Log "Starting exchange rate sync."
  Write-Log "Base: $BaseCurrency; Quotes: $($QuoteCurrencies -join ',')."

  & (Get-PowerShellHost) -NoProfile -ExecutionPolicy Bypass `
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
