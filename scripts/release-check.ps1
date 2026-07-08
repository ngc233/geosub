param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$NpmPath = "npm.cmd",
  [string]$GitPath = "git",
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

function Test-RepositoryHygiene {
  $blockedPatterns = @(
    @{ Label = "local Windows user path"; Pattern = ("C:" + "\\Users\\") },
    @{ Label = "old .com domain"; Pattern = ("geosub" + "\.com") },
    @{ Label = "deployment server IP"; Pattern = ("89\.58" + "\.25\.190") }
  )
  $textExtensions = @(
    ".cjs", ".css", ".env", ".example", ".js", ".json", ".jsx", ".md", ".mjs",
    ".ps1", ".sh", ".sql", ".ts", ".tsx", ".txt", ".yaml", ".yml"
  )
  $hygieneFindings = @()
  $files = & $GitPath -C $Root ls-files

  foreach ($file in $files) {
    $path = Join-Path $Root $file
    if (!(Test-Path -LiteralPath $path)) {
      continue
    }

    $extension = [System.IO.Path]::GetExtension($file)
    if ($textExtensions -notcontains $extension) {
      continue
    }

    $content = Get-Content -LiteralPath $path -Raw -ErrorAction SilentlyContinue
    foreach ($blocked in $blockedPatterns) {
      if ($content -match $blocked["Pattern"]) {
        $hygieneFindings += ("{0} contains {1}" -f $file, $blocked["Label"])
      }
    }
  }

  if ($hygieneFindings.Count -gt 0) {
    $hygieneFindings | ForEach-Object { Write-Host "BLOCKED $_" }
    throw "Repository hygiene check failed."
  }

  Write-Host "No blocked local paths, old domains, or server IPs found."
}

$NpmPath = Resolve-ToolPath -PreferredPath $NpmPath -CommandName "npm"
$GitPath = Resolve-ToolPath -PreferredPath $GitPath -CommandName "git"
$FrontendDir = Join-Path $Root "ai-price-site"

Invoke-Step -Name "Version sync" -Block { Assert-VersionSync }
Invoke-Step -Name "PowerShell syntax" -Block { Test-PowerShellSyntax }
Invoke-Step -Name "Node script syntax" -Block { Test-NodeSyntax }
Invoke-Step -Name "Repository hygiene" -Block { Test-RepositoryHygiene }

Invoke-Step -Name "Frontend typecheck" -Block {
  & $NpmPath --prefix $FrontendDir run typecheck
}

Invoke-Step -Name "Frontend lint" -Block {
  & $NpmPath --prefix $FrontendDir run lint
}

Invoke-Step -Name "Frontend tests" -Block {
  & $NpmPath --prefix $FrontendDir test
}

if ($SkipBuild) {
  Write-Host "Frontend build skipped."
} else {
  Invoke-Step -Name "Frontend build" -Block {
    & $NpmPath --prefix $FrontendDir run build
  }
}

Invoke-Step -Name "Git status" -Block {
  & $GitPath -C $Root status --short
}

Write-Host ""
Write-Host "Release checks complete."
