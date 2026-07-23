param(
  [ValidatePattern('^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$')]
  [string]$Version,
  [ValidateSet("patch", "minor", "major")]
  [string]$Bump = "patch",
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom {
  param([string]$Path, [string]$Value)

  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Value, $encoding)
}

function Get-CurrentVersion {
  $versionPath = Join-Path $Root "VERSION"
  if (!(Test-Path -LiteralPath $versionPath)) {
    return "0.0.0"
  }

  return (Get-Content -LiteralPath $versionPath -Raw).Trim()
}

function Get-BumpedVersion {
  param([string]$Current, [string]$Kind)

  $core = ($Current -split "-", 2)[0]
  $parts = $core.Split(".") | ForEach-Object { [int]$_ }
  while ($parts.Count -lt 3) {
    $parts += 0
  }

  switch ($Kind) {
    "major" {
      $parts[0] += 1
      $parts[1] = 0
      $parts[2] = 0
    }
    "minor" {
      $parts[1] += 1
      $parts[2] = 0
    }
    default {
      $parts[2] += 1
    }
  }

  return "$($parts[0]).$($parts[1]).$($parts[2])"
}

function Set-PackageVersion {
  param([string]$Path, [string]$NextVersion)

  if (!(Test-Path -LiteralPath $Path)) {
    return
  }

  $script = @'
const fs = require("fs");
const path = process.argv[2];
const version = process.argv[3];
const packageJson = JSON.parse(fs.readFileSync(path, "utf8"));
packageJson.version = version;
fs.writeFileSync(path, `${JSON.stringify(packageJson, null, 4)}\n`);
'@
  $tempScript = New-TemporaryFile
  $tempJsPath = [IO.Path]::ChangeExtension($tempScript.FullName, ".js")
  Move-Item -LiteralPath $tempScript.FullName -Destination $tempJsPath -Force
  try {
    Write-Utf8NoBom -Path $tempJsPath -Value $script
    node $tempJsPath $Path $NextVersion
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to update package version: $Path"
    }
  } finally {
    if (Test-Path -LiteralPath $tempJsPath) {
      Remove-Item -LiteralPath $tempJsPath -Force
    }
  }
}

function Set-PackageLockVersion {
  param([string]$Path, [string]$NextVersion)

  if (!(Test-Path -LiteralPath $Path)) {
    return
  }

  $script = @'
const fs = require("fs");
const path = process.argv[2];
const version = process.argv[3];
const lock = JSON.parse(fs.readFileSync(path, "utf8"));
if (Object.prototype.hasOwnProperty.call(lock, "version")) lock.version = version;
if (lock.packages && lock.packages[""] && Object.prototype.hasOwnProperty.call(lock.packages[""], "version")) {
  lock.packages[""].version = version;
}
fs.writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`);
'@
  $tempScript = New-TemporaryFile
  $tempJsPath = [IO.Path]::ChangeExtension($tempScript.FullName, ".js")
  Move-Item -LiteralPath $tempScript.FullName -Destination $tempJsPath -Force
  try {
    Write-Utf8NoBom -Path $tempJsPath -Value $script
    node $tempJsPath $Path $NextVersion
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to update package lock: $Path"
    }
  } finally {
    if (Test-Path -LiteralPath $tempJsPath) {
      Remove-Item -LiteralPath $tempJsPath -Force
    }
  }
}

$currentVersion = Get-CurrentVersion
$nextVersion = if ([string]::IsNullOrWhiteSpace($Version)) {
  Get-BumpedVersion -Current $currentVersion -Kind $Bump
} else {
  $Version
}

Set-Content -LiteralPath (Join-Path $Root "VERSION") -Value ($nextVersion + "`n") -Encoding ASCII
Set-PackageVersion -Path (Join-Path $Root "ai-price-site\package.json") -NextVersion $nextVersion
Set-PackageVersion -Path (Join-Path $Root "geosub-backend\package.json") -NextVersion $nextVersion
Set-PackageLockVersion -Path (Join-Path $Root "ai-price-site\package-lock.json") -NextVersion $nextVersion
Set-PackageLockVersion -Path (Join-Path $Root "geosub-backend\package-lock.json") -NextVersion $nextVersion

$today = Get-Date -Format "yyyy-MM-dd"
$changelogPath = Join-Path $Root "CHANGELOG.md"
if (Test-Path -LiteralPath $changelogPath) {
  $changelog = Get-Content -LiteralPath $changelogPath -Raw
  $changelog = $changelog -replace "## $([regex]::Escape($nextVersion)) - Unreleased", "## $nextVersion - $today"
  Write-Utf8NoBom -Path $changelogPath -Value $changelog
}

Write-Host "Prepared release version: $nextVersion"
Write-Host "Updated VERSION, package.json, and package-lock.json files."
