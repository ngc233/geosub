param(
  [string]$ProfileFile = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "data\country-tax-profiles.json"),
  [string]$SourceName = "local_tax_profile_file",
  [string]$SourceKind = "manual",
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = $env:POSTGRES_DB,
  [string]$DbUser = $env:POSTGRES_USER
)

$ErrorActionPreference = "Stop"

$syncScript = Join-Path $PSScriptRoot "sync-country-tax-profiles.ps1"

& $syncScript `
  -ProfileFile $ProfileFile `
  -SourceName $SourceName `
  -SourceKind $SourceKind `
  -ContainerName $ContainerName `
  -DbName $DbName `
  -DbUser $DbUser
