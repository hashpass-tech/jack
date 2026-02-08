#!/bin/bash

# Deploy JACKPolicyHook and JACKSettlementAdapter to Sepolia testnet
# This script automates the deployment process and captures deployment artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Sepolia Deployment Script ===${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "contracts/.env.sepolia" ]; then
    echo -e "${RED}Error: contracts/.env.sepolia not found${NC}"
    echo "Please run this script from the repository root"
    exit 1
fi

# Load environment variables
echo -e "${YELLOW}Loading environment from contracts/.env.sepolia...${NC}"
set -a
source contracts/.env
source contracts/.env.sepolia
set +a

# Validate required environment variables
if [ -z "$POOL_MANAGER_ADDRESS" ]; then
    echo -e "${RED}Error: POOL_MANAGER_ADDRESS not set in contracts/.env.sepolia${NC}"
    exit 1
fi

if [ -z "$PRIVATE_DEPLOYER" ]; then
    echo -e "${RED}Error: PRIVATE_DEPLOYER not set in contracts/.env${NC}"
    exit 1
fi

# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address "$PRIVATE_DEPLOYER" 2>/dev/null || echo "")
if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo -e "${RED}Error: Failed to derive deployer address from private key${NC}"
    exit 1
fi

echo -e "${GREEN}Deployer address: ${DEPLOYER_ADDRESS}${NC}"

# Check Sepolia ETH balance (optional, requires RPC)
if [ -n "$RPC_URL" ] && [[ "$RPC_URL" != *"YOUR_"* ]]; then
    echo -e "${YELLOW}Checking Sepolia ETH balance...${NC}"
    BALANCE=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
    BALANCE_ETH=$(cast --from-wei "$BALANCE" 2>/dev/null || echo "0")
    echo -e "${GREEN}Balance: ${BALANCE_ETH} ETH${NC}"
    
    # Warn if balance is low
    if (( $(echo "$BALANCE_ETH < 0.1" | bc -l) )); then
        echo -e "${YELLOW}Warning: Low balance. You may need more Sepolia ETH for deployment.${NC}"
        echo -e "${YELLOW}Get Sepolia ETH from: https://sepoliafaucet.com/${NC}"
    fi
else
    echo -e "${YELLOW}Skipping balance check (RPC_URL not configured)${NC}"
fi

echo ""
echo -e "${GREEN}=== Deployment Configuration ===${NC}"
echo "Network: Sepolia (Chain ID: 11155111)"
echo "PoolManager: $POOL_MANAGER_ADDRESS"
echo "Deployer: $DEPLOYER_ADDRESS"
echo ""

# Confirm deployment
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Run forge script
echo -e "${GREEN}Running forge deployment script...${NC}"
echo ""

cd contracts

# Capture forge output
FORGE_OUTPUT=$(forge script script/DeploySepolia.s.sol \
    --rpc-url "${RPC_URL:-https://rpc.sepolia.org}" \
    --private-key "$PRIVATE_DEPLOYER" \
    --broadcast \
    --verify \
    --etherscan-api-key "${ETHERSCAN_API_KEY:-}" \
    -vvv 2>&1 || true)

echo "$FORGE_OUTPUT"

# Extract deployment addresses and transaction hashes from output
POLICY_HOOK_ADDRESS=$(echo "$FORGE_OUTPUT" | grep -oP "JACKPolicyHook deployed at: \K0x[a-fA-F0-9]{40}" | head -1)
ADAPTER_ADDRESS=$(echo "$FORGE_OUTPUT" | grep -oP "JACKSettlementAdapter deployed at: \K0x[a-fA-F0-9]{40}" | head -1)

if [ -z "$POLICY_HOOK_ADDRESS" ] || [ -z "$ADAPTER_ADDRESS" ]; then
    echo -e "${RED}Error: Failed to extract deployment addresses from forge output${NC}"
    echo -e "${YELLOW}Please check the forge output above for errors${NC}"
    exit 1
fi

# Get transaction hashes from broadcast artifacts
BROADCAST_DIR="broadcast/DeploySepolia.s.sol/11155111"
if [ -f "$BROADCAST_DIR/run-latest.json" ]; then
    POLICY_HOOK_TX=$(jq -r '.transactions[] | select(.contractName == "JACKPolicyHook") | .hash' "$BROADCAST_DIR/run-latest.json" 2>/dev/null || echo "")
    ADAPTER_TX=$(jq -r '.transactions[] | select(.contractName == "JACKSettlementAdapter") | .hash' "$BROADCAST_DIR/run-latest.json" 2>/dev/null || echo "")
    BLOCK_NUMBER=$(jq -r '.receipts[0].blockNumber' "$BROADCAST_DIR/run-latest.json" 2>/dev/null || echo "0")
else
    echo -e "${YELLOW}Warning: Could not find broadcast artifacts for transaction hashes${NC}"
    POLICY_HOOK_TX=""
    ADAPTER_TX=""
    BLOCK_NUMBER="0"
fi

# Generate timestamp and version
TIMESTAMP=$(date +%s)
VERSION="1.0.0"

# Check if there's a previous deployment
if [ -f "deployments/sepolia/latest.json" ]; then
    PREV_VERSION=$(jq -r '.version' deployments/sepolia/latest.json 2>/dev/null || echo "1.0.0")
    # Increment patch version
    VERSION=$(echo "$PREV_VERSION" | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
fi

# Create deployment artifact JSON
ARTIFACT_FILE="deployments/sepolia/deployment-${TIMESTAMP}.json"

cat > "$ARTIFACT_FILE" <<EOF
{
  "version": "$VERSION",
  "network": "sepolia",
  "chainId": 11155111,
  "deployedAt": $TIMESTAMP,
  "contracts": {
    "policyHook": {
      "address": "$POLICY_HOOK_ADDRESS",
      "txHash": "$POLICY_HOOK_TX",
      "blockNumber": $BLOCK_NUMBER,
      "verified": false,
      "verificationUrl": "https://sepolia.etherscan.io/address/$POLICY_HOOK_ADDRESS"
    },
    "settlementAdapter": {
      "address": "$ADAPTER_ADDRESS",
      "txHash": "$ADAPTER_TX",
      "blockNumber": $BLOCK_NUMBER,
      "verified": false,
      "verificationUrl": "https://sepolia.etherscan.io/address/$ADAPTER_ADDRESS"
    }
  },
  "poolManager": "$POOL_MANAGER_ADDRESS",
  "deployer": "$DEPLOYER_ADDRESS",
  "previousVersion": ""
}
EOF

# Copy to latest.json
cp "$ARTIFACT_FILE" "deployments/sepolia/latest.json"

echo ""
echo -e "${GREEN}=== Deployment Successful ===${NC}"
echo ""
echo -e "${GREEN}Deployment artifacts saved to:${NC}"
echo "  - $ARTIFACT_FILE"
echo "  - deployments/sepolia/latest.json"
echo ""
echo -e "${GREEN}Contract Addresses:${NC}"
echo "  JACKPolicyHook:        $POLICY_HOOK_ADDRESS"
echo "  JACKSettlementAdapter: $ADAPTER_ADDRESS"
echo ""
echo -e "${GREEN}Sepolia Etherscan Links:${NC}"
echo "  JACKPolicyHook:        https://sepolia.etherscan.io/address/$POLICY_HOOK_ADDRESS"
echo "  JACKSettlementAdapter: https://sepolia.etherscan.io/address/$ADAPTER_ADDRESS"
echo ""

if [ -n "$POLICY_HOOK_TX" ]; then
    echo -e "${GREEN}Transaction Hashes:${NC}"
    echo "  JACKPolicyHook:        https://sepolia.etherscan.io/tx/$POLICY_HOOK_TX"
    echo "  JACKSettlementAdapter: https://sepolia.etherscan.io/tx/$ADAPTER_TX"
    echo ""
fi

echo -e "${YELLOW}Note: Contract verification may take a few minutes to complete on Etherscan${NC}"
echo -e "${YELLOW}Run scripts/contracts/verify-sepolia.sh to verify contracts manually if needed${NC}"
echo ""
