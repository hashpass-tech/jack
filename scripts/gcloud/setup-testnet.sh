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

if ! gsutil ls -b "gs://${GCLOUD_LANDING_BUCKET}" >/dev/null 2>&1; then
  gsutil mb -p "$PROJECT_ID" -l "${GCLOUD_LANDING_REGION:-us-west1}" -b on "gs://${GCLOUD_LANDING_BUCKET}"
fi

# Configure static website hosting defaults
if [[ -n "${GCLOUD_LANDING_INDEX:-}" || -n "${GCLOUD_LANDING_ERROR:-}" ]]; then
  gsutil web set -m "${GCLOUD_LANDING_INDEX:-index.html}" -e "${GCLOUD_LANDING_ERROR:-404.html}" "gs://${GCLOUD_LANDING_BUCKET}"
fi

# Make landing bucket public (if desired)
if [[ "${GCLOUD_LANDING_PUBLIC:-false}" == "true" ]]; then
  gsutil iam ch allUsers:objectViewer "gs://${GCLOUD_LANDING_BUCKET}"
fi

echo "Landing bucket ready: gs://${GCLOUD_LANDING_BUCKET}"
