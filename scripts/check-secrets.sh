#!/bin/bash

# Definition of patterns to search for
# Each pattern is a regex
PATTERNS=(
    # PEM / JSON private keys
    "-----BEGIN PRIVATE KEY-----"
    "-----BEGIN RSA PRIVATE KEY-----"
    "\"private_key\":\s*\""
    "\"private_key_id\":\s*\""
    # Cloud / API tokens
    "AIza[0-9A-Za-z\\-_]{35}"
    "ghp_[0-9A-Za-z]{36}"
    "npm_[0-9A-Za-z]{36}"
    # Ethereum / EVM hex private keys (64 hex chars)
    "PRIVATE_DEPLOYER=[0-9a-fA-F]{40,}"
    "DEPLOYER_PRIVATE_KEY=0x[0-9a-fA-F]{40,}"
    "PRIVATE_KEY=[0-9a-fA-F]{64}"
    "_KEY=0x[0-9a-fA-F]{64}"
    "cast wallet address 0x[0-9a-fA-F]{64}"
    # Seed phrases
    "MNEMONIC=.{20,}"
)

# Allowlist patterns that are safe (contract addresses, public env vars, etc.)
ALLOWLIST=(
    "POOL_MANAGER_ADDRESS="
    "HOOK_OWNER="
    "NEXT_PUBLIC_"
    "ETHERSCAN_API_KEY=YOUR_"
    "RPC_URL="
    "YOUR_DEPLOYER_PRIVATE_KEY"
    "YOUR_LOCAL_PRIVATE_KEY"
    "YOUR_TESTNET_PRIVATE_KEY"
    "your_private_key_here"
)

FAILED=0

# Get list of staged files, handle spaces via while loop if needed, but for now simple
# We allow empty initial commit cases
files=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -z "$files" ]; then
    exit 0
fi

echo "🔒 Scanning for secrets..."

for file in $files; do
    # Skip check if file doesn't exist (deleted)
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Skip lock files
    if [[ "$file" == *"lock.yaml"* || "$file" == *"lock.json"* ]]; then
        continue
    fi

    # Skip this script itself
    if [[ "$file" == *"scripts/check-secrets.sh"* ]]; then
        continue
    fi

    for pattern in "${PATTERNS[@]}"; do
        # Use grep to search. -E for extended regex.
        matches=$(grep -E -n -e "$pattern" "$file")
        if [ ! -z "$matches" ]; then
            # Check against allowlist — skip if any allowlist pattern matches
            is_allowed=0
            for allow in "${ALLOWLIST[@]}"; do
                if echo "$matches" | grep -qF "$allow"; then
                    is_allowed=1
                    break
                fi
            done
            if [ $is_allowed -eq 0 ]; then
                echo "❌ POTENTIAL SECRET FOUND in $file:"
                echo "$matches"
                echo "   (matched pattern: $pattern)"
                FAILED=1
            fi
        fi
    done
done

if [ $FAILED -ne 0 ]; then
    echo "----------------------------------------------------"
    echo "⛔ COMMIT REJECTED"
    echo "Sensitive data was found in the staged files."
    echo "Please remove the secrets before committing."
    echo "----------------------------------------------------"
    exit 1
fi

echo "✅ No secrets found."
exit 0
