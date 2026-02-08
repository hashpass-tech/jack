# Contract Verification Guide for Sepolia

This guide explains how to verify the deployed contracts on Sepolia Etherscan.

## Automatic Verification

The deployment script (`deploy-sepolia.sh`) attempts automatic verification during deployment if `ETHERSCAN_API_KEY` is configured.

## Manual Verification

If automatic verification fails or you need to verify contracts manually, use the verification script:

### Prerequisites

1. **Etherscan API Key**: Get from https://etherscan.io/myapikey
2. **Deployment Artifacts**: Ensure `contracts/deployments/sepolia/latest.json` exists
3. **Configure API Key**: Add to `contracts/.env.sepolia`:
   ```bash
   ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
   ```

### Run Verification Script

```bash
./scripts/contracts/verify-sepolia.sh
```

### What the Script Does

1. Loads deployment artifacts from `latest.json`
2. Extracts contract addresses and constructor arguments
3. Verifies JACKPolicyHook with PoolManager address
4. Verifies JACKSettlementAdapter with JACKPolicyHook address
5. Updates deployment artifacts with verification status
6. Displays Etherscan verification links

### Expected Output

```
=== Sepolia Contract Verification Script ===

Loading environment from contracts/.env.sepolia...
Loading deployment artifacts...

Loaded deployment artifacts:
  JACKPolicyHook:        0x...
  JACKSettlementAdapter: 0x...
  PoolManager:           0xE03A1074c86CFeDd5C142C4F04F1a1536e203543

Verifying JACKPolicyHook...
[Verification output from forge]

Verifying JACKSettlementAdapter...
[Verification output from forge]

=== Verification Complete ===

Check verification status on Etherscan:
  JACKPolicyHook:        https://sepolia.etherscan.io/address/0x...#code
  JACKSettlementAdapter: https://sepolia.etherscan.io/address/0x...#code
```

## Manual Verification via Forge

If the script fails, you can verify manually using forge commands:

### Verify JACKPolicyHook

```bash
cd contracts

forge verify-contract \
    <POLICY_HOOK_ADDRESS> \
    src/JACKPolicyHook.sol:JACKPolicyHook \
    --chain-id 11155111 \
    --etherscan-api-key <YOUR_API_KEY> \
    --constructor-args $(cast abi-encode "constructor(address)" "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543") \
    --watch
```

### Verify JACKSettlementAdapter

```bash
forge verify-contract \
    <ADAPTER_ADDRESS> \
    src/JACKSettlementAdapter.sol:JACKSettlementAdapter \
    --chain-id 11155111 \
    --etherscan-api-key <YOUR_API_KEY> \
    --constructor-args $(cast abi-encode "constructor(address)" "<POLICY_HOOK_ADDRESS>") \
    --watch
```

## Manual Verification via Etherscan UI

If forge verification fails, you can verify through the Etherscan web interface:

1. Go to the contract address on Sepolia Etherscan
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Select:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: v0.8.24
   - License Type: MIT
5. Paste the flattened contract source code
6. Add constructor arguments (ABI-encoded)
7. Submit for verification

### Get Flattened Source Code

```bash
cd contracts

# Flatten JACKPolicyHook
forge flatten src/JACKPolicyHook.sol > JACKPolicyHook_flat.sol

# Flatten JACKSettlementAdapter
forge flatten src/JACKSettlementAdapter.sol > JACKSettlementAdapter_flat.sol
```

### Get Constructor Arguments (ABI-encoded)

```bash
# JACKPolicyHook constructor args (PoolManager address)
cast abi-encode "constructor(address)" "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"

# JACKSettlementAdapter constructor args (JACKPolicyHook address)
cast abi-encode "constructor(address)" "<POLICY_HOOK_ADDRESS>"
```

## Verification Status

After verification, check the status:

1. Visit the contract on Etherscan
2. Look for a green checkmark next to the contract name
3. The "Contract" tab should show "Contract Source Code Verified"
4. You should see the source code, ABI, and read/write functions

## Troubleshooting

### Error: "Contract source code already verified"

This is not an error - the contract is already verified. Check Etherscan to confirm.

### Error: "Invalid API key"

- Verify your Etherscan API key is correct
- Ensure you're using a Sepolia-compatible API key
- Try regenerating your API key on Etherscan

### Error: "Compilation failed"

- Ensure you're using the correct compiler version (0.8.24)
- Check that all dependencies are properly installed
- Try flattening the contract and verifying manually

### Error: "Constructor arguments mismatch"

- Verify the constructor arguments are correctly ABI-encoded
- Check that you're using the correct addresses (PoolManager, JACKPolicyHook)
- Ensure the addresses match the deployment artifacts

### Verification takes too long

- Etherscan verification can take 1-5 minutes
- Use the `--watch` flag to monitor progress
- Check Etherscan directly after a few minutes

## Post-Verification

After successful verification:

1. ✅ Confirm source code is visible on Etherscan
2. ✅ Test read functions on Etherscan
3. ✅ Update deployment artifacts with verification URLs
4. ✅ Document verified contract addresses in prize track submission
5. ✅ Share Etherscan links in documentation and README

## Verification Checklist

- [ ] Etherscan API key configured
- [ ] Deployment artifacts exist (`latest.json`)
- [ ] Run verification script: `./scripts/contracts/verify-sepolia.sh`
- [ ] Confirm JACKPolicyHook verified on Etherscan
- [ ] Confirm JACKSettlementAdapter verified on Etherscan
- [ ] Update deployment artifacts with verification status
- [ ] Document verification URLs in prize track submission

---

**Note**: Contract verification is required for the Uniswap Foundation Prize Track submission. Ensure both contracts are verified before submitting.
