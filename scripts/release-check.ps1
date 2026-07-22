param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$NpmPath = "npm.cmd",
  [string]$GitPath = "git",
  [string]$BashPath = "",
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

function Resolve-BashPath {
  param([string]$PreferredPath)

  $candidates = @($PreferredPath)
  if (![string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
    $candidates += Join-Path $env:ProgramFiles "Git\bin\bash.exe"
    $candidates += Join-Path $env:ProgramFiles "Git\usr\bin\bash.exe"
  }
  $candidates = $candidates | Where-Object { ![string]::IsNullOrWhiteSpace($_) }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  $command = Get-Command bash -ErrorAction SilentlyContinue
  if ($null -ne $command -and $command.Source -notlike "*\Windows\System32\bash.exe") {
    return $command.Source
  }

  throw "Cannot find a usable Bash executable. Install Git Bash or pass -BashPath."
}

function Test-BashSyntax {
  param([string]$Executable)

  $deployDir = Join-Path $Root "geosub-backend\deploy\linux-arm64"
  $files = Get-ChildItem -LiteralPath $deployDir -Filter "*.sh" -File

  foreach ($file in $files) {
    & $Executable -n $file.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "Bash parser failed: $($file.FullName)"
    }
    Write-Host "OK $($file.Name)"
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

function Test-RepositorySecrets {
  $trackedFiles = & $GitPath -C $Root ls-files
  $findings = @()
  $privateKeyPattern = ("BEGIN " + "(RSA |EC |OPENSSH )?PRIVATE KEY")
  $credentialUrlPattern = ("postgres(?:ql)?://" + "[^\s:]+:[^@\s]+@")

  foreach ($file in $trackedFiles) {
    $normalized = $file.Replace("\", "/")
    $name = [System.IO.Path]::GetFileName($normalized)
    $extension = [System.IO.Path]::GetExtension($normalized)

    if (
      ($name -like ".env*" -and $name -notin @(".env.example", ".env.sample")) -or
      $extension -in @(".pem", ".key", ".p12", ".pfx") -or
      $name -in @("id_rsa", "id_ed25519")
    ) {
      $findings += "$file is a tracked secret-bearing filename"
      continue
    }

    $path = Join-Path $Root $file
    if (!(Test-Path -LiteralPath $path)) {
      continue
    }

    $content = Get-Content -LiteralPath $path -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) {
      continue
    }

    if ($content -match $privateKeyPattern) {
      $findings += "$file contains a private-key header"
    }
    if ($content -match $credentialUrlPattern) {
      $findings += "$file contains a database URL with embedded credentials"
    }
  }

  if ($findings.Count -gt 0) {
    $findings | ForEach-Object { Write-Host "BLOCKED $_" }
    throw "Repository secret check failed."
  }

  Write-Host "No tracked environment secrets, private keys, or credential URLs found."
}

$NpmPath = Resolve-ToolPath -PreferredPath $NpmPath -CommandName "npm"
$GitPath = Resolve-ToolPath -PreferredPath $GitPath -CommandName "git"
$BashPath = Resolve-BashPath -PreferredPath $BashPath
$FrontendDir = Join-Path $Root "ai-price-site"

Invoke-Step -Name "Version sync" -Block { Assert-VersionSync }
Invoke-Step -Name "PowerShell syntax" -Block { Test-PowerShellSyntax }
Invoke-Step -Name "Node script syntax" -Block { Test-NodeSyntax }
Invoke-Step -Name "Bash deployment syntax" -Block { Test-BashSyntax -Executable $BashPath }
Invoke-Step -Name "Repository hygiene" -Block { Test-RepositoryHygiene }
Invoke-Step -Name "Repository secrets" -Block { Test-RepositorySecrets }

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
