#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SERVICE_KEY_PATH="${GOOGLE_APPLICATION_CREDENTIALS:-$ROOT_DIR/config/private.json}"

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

gcloud config set project "$PROJECT_ID"

if [[ -z "${GCLOUD_LANDING_BUCKET:-}" ]]; then
  echo "GCLOUD_LANDING_BUCKET is required" >&2
  exit 1
fi

if [[ -z "${GCLOUD_RUN_SERVICE:-}" || -z "${GCLOUD_RUN_REGION:-}" ]]; then
  echo "GCLOUD_RUN_SERVICE and GCLOUD_RUN_REGION are required" >&2
  exit 1
fi

export GCLOUD_PROJECT="$PROJECT_ID"

pnpm release
