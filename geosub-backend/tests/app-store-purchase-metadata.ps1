param([string]$CasesPath)
$ErrorActionPreference = 'Stop'
$collector = Join-Path $PSScriptRoot '../scripts/collect-app-store-prices.ps1'
$errors = $null; $tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($collector, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Collector syntax invalid' }
foreach ($definition in $ast.FindAll({param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst]
}, $false)) {
  . ([scriptblock]::Create($definition.Extent.Text))
}
$cases = Get-Content -LiteralPath $CasesPath -Raw | ConvertFrom-Json
foreach ($case in $cases) {
  $items = @(Get-InAppPurchases -Html $case.html)
  $actual = ConvertTo-Json -InputObject @($items | ForEach-Object { ,@($_.Name, $_.PriceText) }) -Depth 8 -Compress
  $expected = ConvertTo-Json -InputObject @($case.expected) -Depth 8 -Compress
  if ($actual -ne $expected) { throw "Purchase metadata mismatch: $($case.name)" }
  Write-Output "PASS: $($case.name)"
}
