param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$PnpmPath = "C:\Users\lanad\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd",
  [string]$GitPath = "C:\Users\lanad\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Resolve-ToolPath {
  param([string]$PreferredPath, [string]$CommandName)

  if (![string]::IsNullOrWhiteSpace($PreferredPath) -and (Test-Path -LiteralPath $PreferredPath)) {
    return $PreferredPath
  }

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    throw "Cannot find $CommandName. Install it or pass its path explicitly."
  }

  return $command.Source
}

function Invoke-Step {
  param([string]$Name, [scriptblock]$Block)

  Write-Host ""
  Write-Host "=== $Name ==="
  $global:LASTEXITCODE = 0
  & $Block
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE."
  }
}

function Assert-VersionSync {
  $version = (Get-Content -LiteralPath (Join-Path $Root "VERSION") -Raw).Trim()
  $frontend = (Get-Content -LiteralPath (Join-Path $Root "ai-price-site\package.json") -Raw | ConvertFrom-Json).version
  $backend = (Get-Content -LiteralPath (Join-Path $Root "geosub-backend\package.json") -Raw | ConvertFrom-Json).version

  if ($version -ne $frontend -or $version -ne $backend) {
    throw "Version mismatch. VERSION=$version frontend=$frontend backend=$backend"
  }

  Write-Host "Version synchronized: $version"
}

function Test-PowerShellSyntax {
  $files = @(
    "geosub-backend\scripts\collect-app-store-prices.ps1",
    "geosub-backend\scripts\run-collector-jobs.ps1",
    "geosub-backend\scripts\run-price-accuracy-maintenance.ps1",
    "geosub-backend\scripts\sync-exchange-rates.ps1"
  )

  foreach ($file in $files) {
    $path = Join-Path $Root $file
    if (!(Test-Path -LiteralPath $path)) {
      continue
    }

    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $path), [ref]$tokens, [ref]$errors) | Out-Null
    if ($errors.Count -gt 0) {
      $errors | Format-List
      throw "PowerShell parser failed: $file"
    }
    Write-Host "OK $file"
  }
}

function Test-NodeSyntax {
  $files = @(
    "geosub-backend\scripts\render-app-store-prices.mjs",
    "geosub-backend\scripts\probe-opentherank-price-diffs.mjs"
  )

  foreach ($file in $files) {
    $path = Join-Path $Root $file
    if (Test-Path -LiteralPath $path) {
      node --check $path
      if ($LASTEXITCODE -ne 0) {
        throw "Node syntax check failed: $file"
      }
      Write-Host "OK $file"
    }
  }
}

$PnpmPath = Resolve-ToolPath -PreferredPath $PnpmPath -CommandName "pnpm"
$GitPath = Resolve-ToolPath -PreferredPath $GitPath -CommandName "git"

Invoke-Step -Name "Version sync" -Block { Assert-VersionSync }
Invoke-Step -Name "PowerShell syntax" -Block { Test-PowerShellSyntax }
Invoke-Step -Name "Node script syntax" -Block { Test-NodeSyntax }

Invoke-Step -Name "Frontend lint" -Block {
  & $PnpmPath --dir (Join-Path $Root "ai-price-site") exec eslint
}

if ($SkipBuild) {
  Write-Host "Frontend build skipped."
} else {
  Invoke-Step -Name "Frontend build" -Block {
    & $PnpmPath --dir (Join-Path $Root "ai-price-site") run build
  }
}

Invoke-Step -Name "Git status" -Block {
  & $GitPath -C $Root status --short
}

Write-Host ""
Write-Host "Release checks complete."
