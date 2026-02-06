#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FORGE_BIN="${FORGE_BIN:-forge}"
if ! command -v "$FORGE_BIN" >/dev/null 2>&1; then
  if [[ -x "$HOME/.foundry/bin/forge" ]]; then
    FORGE_BIN="$HOME/.foundry/bin/forge"
  else
    echo "Error: forge not found. Install Foundry (https://book.getfoundry.sh/getting-started/installation)." >&2
    exit 1
  fi
fi

cd "$ROOT_DIR/contracts"
exec "$FORGE_BIN" "$@"
