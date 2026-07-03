param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$Remote = "origin",
  [string]$Branch = "main",
  [string]$GitPath = "C:\Users\lanad\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe",
  [switch]$SkipChecks,
  [switch]$NoTag
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

$GitPath = Resolve-ToolPath -PreferredPath $GitPath -CommandName "git"

$version = (Get-Content -LiteralPath (Join-Path $Root "VERSION") -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($version)) {
  throw "VERSION is empty."
}

if (!$SkipChecks) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\release-check.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Release checks failed."
  }
}

$status = & $GitPath -C $Root status --porcelain
if ([string]::IsNullOrWhiteSpace(($status -join "").Trim())) {
  Write-Host "No local changes to publish."
} else {
  & $GitPath -C $Root add -A
  & $GitPath -C $Root commit -m "Release v$version"
}

if (!$NoTag) {
  $existingTag = & $GitPath -C $Root tag --list "v$version"
  if ([string]::IsNullOrWhiteSpace(($existingTag -join "").Trim())) {
    & $GitPath -C $Root tag -a "v$version" -m "GeoSub v$version"
  } else {
    Write-Host "Tag v$version already exists locally."
  }
}

& $GitPath -C $Root push $Remote "HEAD:$Branch"
if (!$NoTag) {
  & $GitPath -C $Root push $Remote "v$version"
}

Write-Host "Published v$version to $Remote/$Branch."
