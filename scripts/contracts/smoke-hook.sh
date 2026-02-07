#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
ENV_FILE="${1:-$CONTRACTS_DIR/.env.testnet}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found at '$ENV_FILE'" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

CAST_BIN="${CAST_BIN:-cast}"
if ! command -v "$CAST_BIN" >/dev/null 2>&1; then
  if [[ -x "$HOME/.foundry/bin/cast" ]]; then
    CAST_BIN="$HOME/.foundry/bin/cast"
  else
    echo "Error: cast not found. Install Foundry first." >&2
    exit 1
  fi
fi

: "${DEPLOY_ENV:=testnet}"
: "${RPC_URL:?RPC_URL must be set in env file}"

if [[ -z "${HOOK_ADDRESS:-}" ]]; then
  latest_file="$CONTRACTS_DIR/deployments/$DEPLOY_ENV/latest.json"
  if [[ -f "$latest_file" ]]; then
    HOOK_ADDRESS="$(node - "$latest_file" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
const payload = JSON.parse(fs.readFileSync(path, "utf8"));
process.stdout.write(payload.hookAddress || "");
NODE
)"
  fi
fi

: "${HOOK_ADDRESS:?HOOK_ADDRESS must be set in env file or deployments/<env>/latest.json}"

signer_key="${SMOKE_PRIVATE_KEY:-${DEPLOYER_PRIVATE_KEY:-}}"
if [[ -z "$signer_key" ]]; then
  echo "Error: SMOKE_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY must be set for smoke checks." >&2
  exit 1
fi

updater_address="${UPDATER_ADDRESS:-$("$CAST_BIN" wallet address --private-key "$signer_key")}"
intent_label="${INTENT_LABEL:-JACK_MVP_DEMO_INTENT}"
intent_id="${INTENT_ID:-$("$CAST_BIN" keccak "$intent_label")}"

min_amount_out="${MIN_AMOUNT_OUT:-90}"
reference_amount_out="${REFERENCE_AMOUNT_OUT:-100}"
max_slippage_bps="${MAX_SLIPPAGE_BPS:-500}"
allow_quoted_amount="${ALLOW_QUOTED_AMOUNT:-95}"
reject_quoted_amount="${REJECT_QUOTED_AMOUNT:-94}"
policy_ttl_seconds="${POLICY_TTL_SECONDS:-3600}"
deadline="$(( $(date +%s) + policy_ttl_seconds ))"

set_tx_raw="$("$CAST_BIN" send \
  --rpc-url "$RPC_URL" \
  --private-key "$signer_key" \
  --async \
  "$HOOK_ADDRESS" \
  "setPolicyWithSlippage(bytes32,uint256,uint256,uint16,uint256,address)" \
  "$intent_id" \
  "$min_amount_out" \
  "$reference_amount_out" \
  "$max_slippage_bps" \
  "$deadline" \
  "$updater_address")"

set_tx_hash="$(echo "$set_tx_raw" | grep -Eo '0x[a-fA-F0-9]{64}' | head -n1 || true)"
if [[ -z "$set_tx_hash" ]]; then
  echo "Error: failed to parse setPolicy tx hash." >&2
  echo "Raw output: $set_tx_raw" >&2
  exit 1
fi

set_receipt_json="$("$CAST_BIN" receipt --json --rpc-url "$RPC_URL" "$set_tx_hash")"
set_receipt_status="$(node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync(0,"utf8")); process.stdout.write(String(data.status));' <<< "$set_receipt_json")"

allow_raw="$("$CAST_BIN" call \
  --rpc-url "$RPC_URL" \
  "$HOOK_ADDRESS" \
  "checkPolicy(bytes32,uint256)(bool,bytes32)" \
  "$intent_id" \
  "$allow_quoted_amount")"

reject_raw="$("$CAST_BIN" call \
  --rpc-url "$RPC_URL" \
  "$HOOK_ADDRESS" \
  "checkPolicy(bytes32,uint256)(bool,bytes32)" \
  "$intent_id" \
  "$reject_quoted_amount")"

allow_decoded="$("$CAST_BIN" abi-decode "(bool,bytes32)" "$allow_raw")"
reject_decoded="$("$CAST_BIN" abi-decode "(bool,bytes32)" "$reject_raw")"

reason_ok="$("$CAST_BIN" call --rpc-url "$RPC_URL" "$HOOK_ADDRESS" "REASON_OK()(bytes32)")"
reason_slippage="$("$CAST_BIN" call --rpc-url "$RPC_URL" "$HOOK_ADDRESS" "REASON_SLIPPAGE_EXCEEDED()(bytes32)")"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
smoke_dir="$CONTRACTS_DIR/deployments/$DEPLOY_ENV/smoke"
mkdir -p "$smoke_dir"
report_file="$smoke_dir/smoke-$timestamp.md"

cat > "$report_file" <<EOF
# JACKPolicyHook Smoke Check

- Environment: \`$DEPLOY_ENV\`
- RPC URL: \`$RPC_URL\`
- Hook address: \`$HOOK_ADDRESS\`
- Intent label: \`$intent_label\`
- Intent ID: \`$intent_id\`
- Updater address: \`$updater_address\`
- Deadline: \`$deadline\`

## Transactions

- setPolicyWithSlippage tx: \`$set_tx_hash\`
- setPolicy receipt status: \`$set_receipt_status\`

## Policy Checks

- allow check raw: \`$allow_raw\`
- allow check decoded: \`$allow_decoded\`
- reject check raw: \`$reject_raw\`
- reject check decoded: \`$reject_decoded\`
- expected REASON_OK: \`$reason_ok\`
- expected REASON_SLIPPAGE_EXCEEDED: \`$reason_slippage\`
EOF

echo "Smoke check complete."
echo "setPolicy tx: $set_tx_hash"
echo "Report: ${report_file#$ROOT_DIR/}"
