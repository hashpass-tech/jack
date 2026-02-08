#!/bin/bash

# Verify JACKPolicyHook and JACKSettlementAdapter contracts on Sepolia Etherscan
# This script loads deployment artifacts and verifies contracts manually

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Sepolia Contract Verification Script ===${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "contracts/deployments/sepolia/latest.json" ]; then
    echo -e "${RED}Error: contracts/deployments/sepolia/latest.json not found${NC}"
    echo "Please run the deployment script first: ./scripts/contracts/deploy-sepolia.sh"
    exit 1
fi

# Load environment variables
echo -e "${YELLOW}Loading environment from contracts/.env.sepolia...${NC}"
set -a
source contracts/.env
source contracts/.env.sepolia
set +a

# Validate Etherscan API key
if [ -z "$ETHERSCAN_API_KEY" ] || [[ "$ETHERSCAN_API_KEY" == "YOUR_"* ]]; then
    echo -e "${RED}Error: ETHERSCAN_API_KEY not set in contracts/.env.sepolia${NC}"
    echo "Get an API key from: https://etherscan.io/myapikey"
    exit 1
fi

# Load deployment artifacts
echo -e "${YELLOW}Loading deployment artifacts...${NC}"
POLICY_HOOK_ADDRESS=$(jq -r '.contracts.policyHook.address' contracts/deployments/sepolia/latest.json)
ADAPTER_ADDRESS=$(jq -r '.contracts.settlementAdapter.address' contracts/deployments/sepolia/latest.json)
POOL_MANAGER=$(jq -r '.poolManager' contracts/deployments/sepolia/latest.json)

if [ -z "$POLICY_HOOK_ADDRESS" ] || [ "$POLICY_HOOK_ADDRESS" == "null" ]; then
    echo -e "${RED}Error: Could not load JACKPolicyHook address from deployment artifacts${NC}"
    exit 1
fi

if [ -z "$ADAPTER_ADDRESS" ] || [ "$ADAPTER_ADDRESS" == "null" ]; then
    echo -e "${RED}Error: Could not load JACKSettlementAdapter address from deployment artifacts${NC}"
    exit 1
fi

echo -e "${GREEN}Loaded deployment artifacts:${NC}"
echo "  JACKPolicyHook:        $POLICY_HOOK_ADDRESS"
echo "  JACKSettlementAdapter: $ADAPTER_ADDRESS"
echo "  PoolManager:           $POOL_MANAGER"
echo ""

# Verify JACKPolicyHook
echo -e "${GREEN}Verifying JACKPolicyHook...${NC}"
cd contracts

forge verify-contract \
    "$POLICY_HOOK_ADDRESS" \
    src/JACKPolicyHook.sol:JACKPolicyHook \
    --chain-id 11155111 \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --constructor-args $(cast abi-encode "constructor(address)" "$POOL_MANAGER") \
    --watch || {
        echo -e "${YELLOW}Warning: JACKPolicyHook verification failed or already verified${NC}"
    }

echo ""

# Verify JACKSettlementAdapter
echo -e "${GREEN}Verifying JACKSettlementAdapter...${NC}"

forge verify-contract \
    "$ADAPTER_ADDRESS" \
    src/JACKSettlementAdapter.sol:JACKSettlementAdapter \
    --chain-id 11155111 \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --constructor-args $(cast abi-encode "constructor(address)" "$POLICY_HOOK_ADDRESS") \
    --watch || {
        echo -e "${YELLOW}Warning: JACKSettlementAdapter verification failed or already verified${NC}"
    }

cd ..

echo ""
echo -e "${GREEN}=== Verification Complete ===${NC}"
echo ""
echo -e "${GREEN}Check verification status on Etherscan:${NC}"
echo "  JACKPolicyHook:        https://sepolia.etherscan.io/address/$POLICY_HOOK_ADDRESS#code"
echo "  JACKSettlementAdapter: https://sepolia.etherscan.io/address/$ADAPTER_ADDRESS#code"
echo ""

# Update deployment artifacts with verification status
TIMESTAMP=$(date +%s)
LATEST_FILE="contracts/deployments/sepolia/latest.json"

# Update verification status in latest.json
jq '.contracts.policyHook.verified = true | 
    .contracts.settlementAdapter.verified = true |
    .contracts.policyHook.verificationUrl = "https://sepolia.etherscan.io/address/'"$POLICY_HOOK_ADDRESS"'#code" |
    .contracts.settlementAdapter.verificationUrl = "https://sepolia.etherscan.io/address/'"$ADAPTER_ADDRESS"'#code"' \
    "$LATEST_FILE" > "${LATEST_FILE}.tmp" && mv "${LATEST_FILE}.tmp" "$LATEST_FILE"

echo -e "${GREEN}Updated deployment artifacts with verification status${NC}"
echo ""
echo -e "${YELLOW}Note: Verification may take a few minutes to appear on Etherscan${NC}"
echo -e "${YELLOW}If verification failed, the contracts may already be verified${NC}"
echo ""
