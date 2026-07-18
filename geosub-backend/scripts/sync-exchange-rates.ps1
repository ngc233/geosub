param(
  [string]$BaseCurrency = "USD",
  [string[]]$QuoteCurrencies = @(
    "AED", "ARS", "AUD", "BRL", "CAD", "CHF", "CLP", "CNY", "COP",
    "DKK", "EGP", "EUR", "GBP", "IDR", "ILS", "INR", "JPY", "KES",
    "KRW", "MXN", "MYR", "NGN", "NOK", "NZD", "PHP", "PKR", "PLN",
    "SAR", "SEK", "SGD", "THB", "TRY", "TWD", "VND", "ZAR"
  ),
  [string]$Provider = "frankfurter",
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = $env:POSTGRES_DB,
  [string]$DbUser = $env:POSTGRES_USER
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DbName)) {
  $DbName = "geosub_app"
}

if ([string]::IsNullOrWhiteSpace($DbUser)) {
  $DbUser = "geosub_admin"
}

function Normalize-CurrencyCode {
  param([string]$Code)
  return $Code.Trim().ToUpperInvariant()
}

function Quote-SqlString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return "'" + $Value.Replace("'", "''") + "'"
}

function Quote-SqlJson {
  param([object]$Value)

  $json = $Value | ConvertTo-Json -Depth 20 -Compress
  return (Quote-SqlString $json) + "::jsonb"
}

function Invoke-Psql {
  param([string]$Sql)

  $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed with exit code $LASTEXITCODE."
  }
}

function Invoke-PsqlScalar {
  param([string]$Sql)

  $result = $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q `
    -t `
    -A

  return ($result | Select-Object -First 1).Trim()
}

function Get-FrankfurterRates {
  param(
    [string]$Base,
    [string[]]$Quotes
  )

  $quoteList = ($Quotes | ForEach-Object { [uri]::EscapeDataString($_) }) -join ","
  $url = "https://api.frankfurter.app/latest?from=$([uri]::EscapeDataString($Base))&to=$quoteList"
  $response = Invoke-RestMethod -Uri $url -TimeoutSec 30

  return [pscustomobject]@{
    Url = $url
    Date = [string]$response.date
    Rates = $response.rates
    Payload = $response
  }
}

function Get-OpenErApiRates {
  param([string]$Base)

  $url = "https://open.er-api.com/v6/latest/$([uri]::EscapeDataString($Base))"
  $response = Invoke-RestMethod -Uri $url -TimeoutSec 30
  $rateDate = (Get-Date).ToString("yyyy-MM-dd")
  if ($response.time_last_update_utc) {
    $rateDate = ([datetime]::Parse([string]$response.time_last_update_utc)).ToString("yyyy-MM-dd")
  }

  return [pscustomobject]@{
    Url = $url
    Date = $rateDate
    Rates = $response.rates
    Payload = $response
  }
}

$base = Normalize-CurrencyCode $BaseCurrency
$quotes = @($QuoteCurrencies |
  ForEach-Object { $_ -split "," } |
  ForEach-Object { Normalize-CurrencyCode $_ } |
  Where-Object { $_ -and $_ -ne $base } |
  Select-Object -Unique)

if ($quotes.Count -eq 0) {
  throw "At least one quote currency different from base currency is required."
}

$quoteSqlArray = "ARRAY[" + (($quotes | ForEach-Object { Quote-SqlString $_ }) -join ",") + "]::text[]"
$runId = Invoke-PsqlScalar @"
INSERT INTO exchange_rate_sync_runs (
  provider,
  base_currency,
  quote_currencies,
  status,
  started_at
)
VALUES (
  $(Quote-SqlString $Provider),
  $(Quote-SqlString $base),
  $quoteSqlArray,
  'running',
  NOW()
)
RETURNING id;
"@

try {
  if ($Provider -notin @("frankfurter", "open-er-api")) {
    throw "Unsupported provider '$Provider'. Current script supports 'frankfurter' and 'open-er-api'."
  }

  $result = if ($Provider -eq "open-er-api") {
    Get-OpenErApiRates -Base $base
  } else {
    try {
      Get-FrankfurterRates -Base $base -Quotes $quotes
    } catch {
      Write-Warning "Frankfurter FX lookup failed: $($_.Exception.Message). Falling back to open.er-api."
      [pscustomobject]@{
        Url = "https://api.frankfurter.app/latest?from=$base"
        Date = (Get-Date).ToString("yyyy-MM-dd")
        Rates = [pscustomobject]@{}
        Payload = @{ error = $_.Exception.Message }
      }
    }
  }
  $rowCount = 0
  $requestedUrls = @($result.Url)
  $syncedQuotes = @{}

  foreach ($quote in $quotes) {
    $rate = $result.Rates.$quote

    if ($null -eq $rate) {
      continue
    }

    $rateText = ([decimal]$rate).ToString([Globalization.CultureInfo]::InvariantCulture)

    Invoke-Psql @"
SELECT upsert_exchange_rate(
  $(Quote-SqlString $base),
  $(Quote-SqlString $quote),
  $rateText,
  $(Quote-SqlString $result.Date)::date,
  $(Quote-SqlString $Provider),
  NOW(),
  $(Quote-SqlString $runId)::uuid,
  $(Quote-SqlJson $result.Payload)
);
"@

    $rowCount += 1
    $syncedQuotes[$quote] = $true
  }

  $missingQuotes = @($quotes | Where-Object { !$syncedQuotes.ContainsKey($_) })
  if ($Provider -eq "frankfurter" -and $missingQuotes.Count -gt 0) {
    $fallbackResult = Get-OpenErApiRates -Base $base
    $requestedUrls += $fallbackResult.Url

    foreach ($quote in $missingQuotes) {
      $rate = $fallbackResult.Rates.$quote

      if ($null -eq $rate) {
        continue
      }

      $rateText = ([decimal]$rate).ToString([Globalization.CultureInfo]::InvariantCulture)

      Invoke-Psql @"
SELECT upsert_exchange_rate(
  $(Quote-SqlString $base),
  $(Quote-SqlString $quote),
  $rateText,
  $(Quote-SqlString $fallbackResult.Date)::date,
  'open-er-api',
  NOW(),
  $(Quote-SqlString $runId)::uuid,
  $(Quote-SqlJson $fallbackResult.Payload)
);
"@

      $rowCount += 1
      $syncedQuotes[$quote] = $true
    }
  }

  $finalStatus = if ($rowCount -eq $quotes.Count) { "succeeded" } else { "partial" }

  Invoke-Psql @"
UPDATE exchange_rate_sync_runs
SET status = $(Quote-SqlString $finalStatus),
    requested_url = $(Quote-SqlString ($requestedUrls -join " | ")),
    row_count = $rowCount,
    completed_at = NOW(),
    error_message = NULL
WHERE id = $(Quote-SqlString $runId)::uuid;
"@

  Write-Host "Exchange rate sync $finalStatus. Run: $runId. Rows: $rowCount/$($quotes.Count)."
}
catch {
  $message = $_.Exception.Message

  Invoke-Psql @"
UPDATE exchange_rate_sync_runs
SET status = 'failed',
    completed_at = NOW(),
    error_message = $(Quote-SqlString $message)
WHERE id = $(Quote-SqlString $runId)::uuid;
"@

  throw
}
