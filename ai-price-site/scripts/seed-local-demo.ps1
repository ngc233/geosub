$ErrorActionPreference = "Stop"

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$codexNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if ($nodeCommand) {
  & $nodeCommand.Source "scripts\seed-local-demo.cjs"
  exit $LASTEXITCODE
}

if (Test-Path $codexNode) {
  & $codexNode "scripts\seed-local-demo.cjs"
  exit $LASTEXITCODE
}

throw "Node.js was not found. Install Node.js LTS or run this script from Codex with the bundled runtime available."
