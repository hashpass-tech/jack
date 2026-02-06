#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SERVICE_KEY_PATH="${GOOGLE_APPLICATION_CREDENTIALS:-$ROOT_DIR/config/private.json}"

ensure_trailing_dot() {
  local value="$1"
  if [[ "$value" == *"." ]]; then
    echo "$value"
  else
    echo "${value}."
  fi
}

if [[ -f "$SERVICE_KEY_PATH" ]]; then
  gcloud auth activate-service-account --key-file "$SERVICE_KEY_PATH"
fi

PROJECT_ID="${GCLOUD_PROJECT:-}"
if [[ -z "$PROJECT_ID" && -f "$SERVICE_KEY_PATH" ]]; then
  PROJECT_ID=$(node -e "console.log(require('${SERVICE_KEY_PATH}').project_id)")
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "GCLOUD_PROJECT is required" >&2
  exit 1
fi

ZONE="${GCLOUD_DNS_ZONE:-}"
if [[ -z "$ZONE" ]]; then
  echo "GCLOUD_DNS_ZONE is required (Cloud DNS managed zone name)" >&2
  exit 1
fi

DOCS_DOMAIN="$(ensure_trailing_dot "${DOCS_DOMAIN:-docs.jack.lukas.money}")"
DOCS_GITHUB_PAGES_TARGET="$(ensure_trailing_dot "${DOCS_GITHUB_PAGES_TARGET:-hashpass-tech.github.io}")"
DOCS_DNS_TTL="${DOCS_DNS_TTL:-300}"

gcloud config set project "$PROJECT_ID" >/dev/null

if ! gcloud dns managed-zones describe "$ZONE" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Managed zone '$ZONE' not found in project '$PROJECT_ID'" >&2
  echo "Available zones:" >&2
  gcloud dns managed-zones list --project "$PROJECT_ID" >&2
  exit 1
fi

CONFLICTING_RECORDS="$(gcloud dns record-sets list \
  --zone "$ZONE" \
  --project "$PROJECT_ID" \
  --name "$DOCS_DOMAIN" \
  --format='value(type)' | grep -E '^(A|AAAA|TXT|MX|NS)$' || true)"

if [[ -n "$CONFLICTING_RECORDS" ]]; then
  echo "Cannot create CNAME for ${DOCS_DOMAIN}; conflicting record types already exist:" >&2
  gcloud dns record-sets list \
    --zone "$ZONE" \
    --project "$PROJECT_ID" \
    --name "$DOCS_DOMAIN" >&2
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT
TRANSACTION_FILE="$TMPDIR/dns-transaction.yaml"

gcloud dns record-sets transaction start \
  --zone "$ZONE" \
  --project "$PROJECT_ID" \
  --transaction-file "$TRANSACTION_FILE"

EXISTING_TARGETS="$(gcloud dns record-sets list \
  --zone "$ZONE" \
  --project "$PROJECT_ID" \
  --name "$DOCS_DOMAIN" \
  --type CNAME \
  --format='value(rrdatas)' || true)"
EXISTING_TTL="$(gcloud dns record-sets list \
  --zone "$ZONE" \
  --project "$PROJECT_ID" \
  --name "$DOCS_DOMAIN" \
  --type CNAME \
  --format='value(ttl)' | head -n 1 || true)"

if [[ -n "$EXISTING_TARGETS" ]]; then
  while IFS= read -r target; do
    if [[ -n "$target" ]]; then
      gcloud dns record-sets transaction remove "$target" \
        --name "$DOCS_DOMAIN" \
        --ttl "${EXISTING_TTL:-$DOCS_DNS_TTL}" \
        --type CNAME \
        --zone "$ZONE" \
        --project "$PROJECT_ID" \
        --transaction-file "$TRANSACTION_FILE"
    fi
  done <<<"$EXISTING_TARGETS"
fi

gcloud dns record-sets transaction add "$DOCS_GITHUB_PAGES_TARGET" \
  --name "$DOCS_DOMAIN" \
  --ttl "$DOCS_DNS_TTL" \
  --type CNAME \
  --zone "$ZONE" \
  --project "$PROJECT_ID" \
  --transaction-file "$TRANSACTION_FILE"

gcloud dns record-sets transaction execute \
  --zone "$ZONE" \
  --project "$PROJECT_ID" \
  --transaction-file "$TRANSACTION_FILE"

echo "DNS mapping updated:"
echo "  ${DOCS_DOMAIN} CNAME ${DOCS_GITHUB_PAGES_TARGET}"
echo
echo "Verify:"
echo "  dig +short ${DOCS_DOMAIN%?}"
