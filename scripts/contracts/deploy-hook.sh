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

FORGE_BIN="${FORGE_BIN:-forge}"
CAST_BIN="${CAST_BIN:-cast}"

if ! command -v "$FORGE_BIN" >/dev/null 2>&1; then
  if [[ -x "$HOME/.foundry/bin/forge" ]]; then
    FORGE_BIN="$HOME/.foundry/bin/forge"
  else
    echo "Error: forge not found. Install Foundry first." >&2
    exit 1
  fi
fi

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
: "${POOL_MANAGER_ADDRESS:?POOL_MANAGER_ADDRESS must be set in env file}"

if [[ -z "${CHAIN_ID:-}" ]]; then
  CHAIN_ID="$("$CAST_BIN" chain-id --rpc-url "$RPC_URL")"
fi

if [[ "$DEPLOY_ENV" == "mainnet" ]]; then
  if [[ "${DEPLOY_USE_LEDGER:-false}" != "true" && "${ALLOW_MAINNET_PRIVATE_KEY:-false}" != "true" ]]; then
    echo "Error: mainnet deploy requires DEPLOY_USE_LEDGER=true (recommended) or ALLOW_MAINNET_PRIVATE_KEY=true override." >&2
    exit 1
  fi
  if [[ -z "${HOOK_OWNER:-}" || "${HOOK_OWNER}" == "0x0000000000000000000000000000000000000000" ]]; then
    echo "Error: HOOK_OWNER must be set to a custody address (multisig recommended) for mainnet." >&2
    exit 1
  fi
fi

auth_flags=()
if [[ "${DEPLOY_USE_LEDGER:-false}" == "true" ]]; then
  : "${DEPLOY_SENDER:?DEPLOY_SENDER is required when DEPLOY_USE_LEDGER=true}"
  auth_flags+=(--ledger --sender "$DEPLOY_SENDER")
elif [[ -n "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  auth_flags+=(--private-key "$DEPLOYER_PRIVATE_KEY")
else
  echo "Error: provide DEPLOYER_PRIVATE_KEY or set DEPLOY_USE_LEDGER=true with DEPLOY_SENDER." >&2
  exit 1
fi

verify_flags=()
if [[ "${ENABLE_VERIFY:-false}" == "true" ]]; then
  : "${ETHERSCAN_API_KEY:?ETHERSCAN_API_KEY is required when ENABLE_VERIFY=true}"
  verify_flags+=(--verify --etherscan-api-key "$ETHERSCAN_API_KEY")
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
log_dir="$CONTRACTS_DIR/deployments/$DEPLOY_ENV/logs"
mkdir -p "$log_dir"
log_file="$log_dir/deploy-$timestamp.log"

set +e
(
  cd "$CONTRACTS_DIR"
  "$FORGE_BIN" script script/DeployJACKPolicyHook.s.sol:DeployJACKPolicyHook \
    --rpc-url "$RPC_URL" \
    --broadcast \
    --slow \
    --non-interactive \
    "${auth_flags[@]}" \
    "${verify_flags[@]}" \
    -vvvv
) | tee "$log_file"
status=${PIPESTATUS[0]}
set -e

if [[ $status -ne 0 ]]; then
  echo "Error: deployment failed. See $log_file" >&2
  exit $status
fi

hook_address="$(grep -Eo 'JACK_POLICY_HOOK=0x[a-fA-F0-9]{40}' "$log_file" | tail -n1 | cut -d= -f2 || true)"
hook_owner="$(grep -Eo 'HOOK_OWNER=0x[a-fA-F0-9]{40}' "$log_file" | tail -n1 | cut -d= -f2 || true)"
deployer="$(grep -Eo 'DEPLOYER=0x[a-fA-F0-9]{40}' "$log_file" | tail -n1 | cut -d= -f2 || true)"

if [[ -z "$hook_address" ]]; then
  echo "Error: could not parse hook address from $log_file" >&2
  exit 1
fi

broadcast_file="$CONTRACTS_DIR/broadcast/DeployJACKPolicyHook.s.sol/$CHAIN_ID/run-latest.json"
deploy_tx_hash=""
if [[ -f "$broadcast_file" ]]; then
  deploy_tx_hash="$(node - "$broadcast_file" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
const data = JSON.parse(fs.readFileSync(path, "utf8"));
const txs = Array.isArray(data.transactions) ? data.transactions : [];
const createTx = txs.find((tx) => tx.transactionType === "CREATE") || txs[0];
if (createTx && createTx.hash) {
  process.stdout.write(createTx.hash);
}
NODE
)"
fi

deploy_dir="$CONTRACTS_DIR/deployments/$DEPLOY_ENV"
mkdir -p "$deploy_dir"
latest_file="$deploy_dir/latest.json"
history_file="$deploy_dir/history.ndjson"

deployed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
commit_sha="$(git -C "$ROOT_DIR" rev-parse HEAD)"

cat > "$latest_file" <<EOF
{
  "environment": "$DEPLOY_ENV",
  "networkChainId": "$CHAIN_ID",
  "deployedAt": "$deployed_at",
  "gitCommit": "$commit_sha",
  "poolManager": "$POOL_MANAGER_ADDRESS",
  "hookAddress": "$hook_address",
  "hookOwner": "$hook_owner",
  "deployer": "$deployer",
  "deployTxHash": "$deploy_tx_hash",
  "broadcastFile": "${broadcast_file#$ROOT_DIR/}",
  "logFile": "${log_file#$ROOT_DIR/}"
}
EOF

node - "$latest_file" >> "$history_file" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
const payload = JSON.parse(fs.readFileSync(path, "utf8"));
console.log(JSON.stringify(payload));
NODE

echo "Deployment complete."
echo "Hook address: $hook_address"
echo "Owner: $hook_owner"
echo "Chain ID: $CHAIN_ID"
echo "Latest record: ${latest_file#$ROOT_DIR/}"
echo "History file: ${history_file#$ROOT_DIR/}"
