#!/bin/bash

# Definition of patterns to search for
# Each pattern is a regex
PATTERNS=(
    "-----BEGIN PRIVATE KEY-----"
    "-----BEGIN RSA PRIVATE KEY-----"
    "\"private_key\":\s*\""
    "\"private_key_id\":\s*\""
    "AIza[0-9A-Za-z\\-_]{35}"
    "ghp_[0-9A-Za-z]{36}"
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
            echo "❌ POTENTIAL SECRET FOUND in $file:"
            echo "$matches"
            echo "   (matched pattern: $pattern)"
            FAILED=1
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
