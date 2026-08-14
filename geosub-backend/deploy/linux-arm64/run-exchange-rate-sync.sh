#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
BASE_CURRENCY="${GEOSUB_EXCHANGE_RATE_BASE:-USD}"
REQUIRED_QUOTE_CURRENCIES="AED,ARS,AUD,BRL,CAD,CHF,CLP,CNY,COP,DKK,EGP,EUR,GBP,HKD,IDR,ILS,INR,JPY,KES,KRW,MXN,MYR,NGN,NOK,NZD,PHP,PKR,PLN,SAR,SEK,SGD,THB,TRY,TWD,VND,ZAR"
QUOTE_CURRENCIES="${REQUIRED_QUOTE_CURRENCIES},${GEOSUB_EXCHANGE_RATE_QUOTES:-}"
DB_CONTAINER="${GEOSUB_DB_CONTAINER:-geosub-postgres}"
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"
SHADOW_VERIFY="${GEOSUB_EXCHANGE_RATE_SHADOW_VERIFY:-0}"
RUNTIME_MODE="${GEOSUB_EXCHANGE_RATE_RUNTIME:-legacy}"

if [[ -z "${QUOTE_CURRENCIES//[[:space:],]/}" ]]; then
  echo "No quote currencies configured. Set GEOSUB_EXCHANGE_RATE_QUOTES in $ENV_FILE."
  exit 1
fi

cd "$BACKEND_DIR"

case "$RUNTIME_MODE" in
  legacy)
    pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass \
      -File "$BACKEND_DIR/scripts/sync-exchange-rates.ps1" \
      -BaseCurrency "$BASE_CURRENCY" \
      -QuoteCurrencies "$QUOTE_CURRENCIES" \
      -ContainerName "$DB_CONTAINER" \
      -DbName "$DB_NAME" \
      -DbUser "$DB_USER"
    ;;
  node)
    if ! node "$BACKEND_DIR/scripts/check-exchange-rate-shadow-evidence.mjs" --required-cycles 3; then
      echo "Exchange-rate Node cutover refused: three consecutive shadow cycles are required." >&2
      exit 1
    fi

    node "$BACKEND_DIR/scripts/sync-exchange-rates.mjs" \
      --base "$BASE_CURRENCY" \
      --quotes "$QUOTE_CURRENCIES"
    ;;
  *)
    echo "Invalid GEOSUB_EXCHANGE_RATE_RUNTIME=$RUNTIME_MODE; expected legacy or node." >&2
    exit 2
    ;;
esac

if [[ "$RUNTIME_MODE" == "legacy" && "$SHADOW_VERIFY" == "1" ]]; then
  if ! node "$BACKEND_DIR/scripts/verify-exchange-rate-shadow.mjs"; then
    echo "Warning: exchange-rate shadow comparison failed; the legacy sync remains authoritative." >&2
  fi
  if ! node "$BACKEND_DIR/scripts/check-exchange-rate-shadow-evidence.mjs"; then
    echo "Exchange-rate shadow gate is not ready; no production cutover is allowed." >&2
  fi
fi
