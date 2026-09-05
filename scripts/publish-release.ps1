param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$Remote = "origin",
  [string]$Branch = "main",
  [string]$GitPath = "git",
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

# A release publish always checks the freshly fetched target branch, even with
# -SkipChecks or -NoTag. Ordinary development pushes do not use this script.
& $GitPath -C $Root fetch $Remote $Branch
if ($LASTEXITCODE -ne 0) { throw "Cannot fetch release baseline." }
& node (Join-Path $Root "scripts/check-release-version.mjs") --root $Root --git $GitPath --baseline-ref FETCH_HEAD
if ($LASTEXITCODE -ne 0) { throw "Release version must advance before publishing." }

if (!$SkipChecks) {
  & (Join-Path $Root "scripts/release-check.ps1") -Root $Root -GitPath $GitPath -BaselineRef FETCH_HEAD
  if ($LASTEXITCODE -ne 0) {
    throw "Release checks failed."
  }
}

$status = & $GitPath -C $Root status --porcelain
if ([string]::IsNullOrWhiteSpace(($status -join "").Trim())) {
  Write-Host "No local changes to publish."
} else {
  & $GitPath -C $Root add -A
  if ($LASTEXITCODE -ne 0) { throw "Git staging failed." }
  & $GitPath -C $Root commit -m "Release v$version"
  if ($LASTEXITCODE -ne 0) { throw "Release commit failed." }
}

if (!$NoTag) {
  $existingTag = & $GitPath -C $Root tag --list "v$version"
  if ([string]::IsNullOrWhiteSpace(($existingTag -join "").Trim())) {
    & $GitPath -C $Root tag -a "v$version" -m "GeoSub v$version"
    if ($LASTEXITCODE -ne 0) { throw "Release tag creation failed." }
  } else {
    $tagCommit = & $GitPath -C $Root rev-parse "v$version^{commit}"
    if ($LASTEXITCODE -ne 0) { throw "Cannot resolve release tag." }
    $headCommit = & $GitPath -C $Root rev-parse HEAD
    if ($LASTEXITCODE -ne 0 -or $tagCommit -ne $headCommit) {
      throw "Tag v$version identifies another commit; do not reuse a release version."
    }
  }
}

& $GitPath -C $Root push $Remote "HEAD:$Branch"
if ($LASTEXITCODE -ne 0) { throw "Branch push failed." }
if (!$NoTag) {
  & $GitPath -C $Root push $Remote "v$version"
  if ($LASTEXITCODE -ne 0) { throw "Tag push failed." }
}

Write-Host "Published v$version to $Remote/$Branch."
