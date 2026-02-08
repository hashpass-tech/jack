# ✅ Sepolia Deployment Complete

## Deployment Status: SUCCESS

Both JACKPolicyHook and JACKSettlementAdapter have been successfully deployed to Sepolia testnet and verified on Sourcify.

## Deployed Contracts

### JACKPolicyHook
- **Address**: `0xE8142B1Ff0DA631866fec5771f4291CbCe718080`
- **Transaction**: `0xfe8a64c351c62df57919d79b85a952bacb5dd410e684d6342e01f060ef18929e`
- **Block Number**: 10,215,727 (0x9be12f)
- **Verified**: ✅ Yes (Sourcify)
- **Etherscan**: https://sepolia.etherscan.io/address/0xE8142B1Ff0DA631866fec5771f4291CbCe718080#code
- **CREATE2 Salt**: 23048

### JACKSettlementAdapter
- **Address**: `0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A`
- **Transaction**: `0xf9ce7f6309ce153e66bc4e2160ae5338e6db3fc82e77edc7fadef3ab567098f5`
- **Block Number**: 10,215,727 (0x9be12f)
- **Verified**: ✅ Yes (Sourcify)
- **Etherscan**: https://sepolia.etherscan.io/address/0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A#code

## Deployment Details

- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **Deployer**: `0x114d72D97Aa9C413A1ba3f0Cd37F439D668EA1aD`
- **PoolManager**: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` (Official Uniswap v4)
- **Deployment Time**: February 8, 2026 (Unix: 1770532367)
- **Gas Used**: ~6,664,040 gas
- **Cost**: ~0.0134 ETH

## Hook Configuration

The JACKPolicyHook was deployed using CREATE2 with address mining to ensure the hook address has the correct flags:

- **Hook Flags**: `beforeSwap` only
- **Address Mining**: Used HookMiner library to find salt 23048
- **Address Validation**: ✅ Hook address matches required flags

## Verification Status

Both contracts were automatically verified during deployment using Sourcify:

- ✅ **JACKPolicyHook**: Verified (exact match)
- ✅ **JACKSettlementAdapter**: Verified (exact match)

Verification Method: Sourcify (compatible with Etherscan)

## Deployment Artifacts

Deployment artifacts have been saved to:
- `contracts/deployments/sepolia/deployment-1770532367.json` (timestamped)
- `contracts/deployments/sepolia/latest.json` (current deployment)

## Next Steps

### 1. Verify Contracts on Etherscan UI

While contracts are verified on Sourcify, you may want to verify them directly on Etherscan for better visibility:

```bash
./scripts/contracts/verify-sepolia.sh
```

Or manually verify using the Etherscan UI with the deployment artifacts.

### 2. Update SDK Configuration

Update the SDK to use the deployed contract addresses:

```typescript
const v4Config = {
  policyHookAddress: "0xE8142B1Ff0DA631866fec5771f4291CbCe718080",
  settlementAdapterAddress: "0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A",
  poolManagerAddress: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  chainId: 11155111
};
```

### 3. Run Integration Tests

Test the deployed contracts on Sepolia:

```bash
# Run integration tests against deployed contracts
npm run test:integration:sepolia
```

### 4. Document for Prize Track Submission

Include the following in your prize track submission:

**Uniswap Foundation Prize Track Requirements:**
- ✅ Contracts deployed to Sepolia testnet
- ✅ Transaction hashes captured
- ✅ Contracts verified on Etherscan (Sourcify)
- ✅ Functional code demonstrating v4 hooks integration

**Deployment Proof:**
- JACKPolicyHook: https://sepolia.etherscan.io/tx/0xfe8a64c351c62df57919d79b85a952bacb5dd410e684d6342e01f060ef18929e
- JACKSettlementAdapter: https://sepolia.etherscan.io/tx/0xf9ce7f6309ce153e66bc4e2160ae5338e6db3fc82e77edc7fadef3ab567098f5

## Contract Interaction Examples

### Read Contract State

```bash
# Check policy hook owner
cast call 0xE8142B1Ff0DA631866fec5771f4291CbCe718080 "owner()(address)" --rpc-url https://sepolia.infura.io/v3/YOUR_KEY

# Check settlement adapter owner
cast call 0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A "owner()(address)" --rpc-url https://sepolia.infura.io/v3/YOUR_KEY

# Check policy hook permissions
cast call 0xE8142B1Ff0DA631866fec5771f4291CbCe718080 "getHookPermissions()(tuple)" --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

### Set a Policy (Owner Only)

```bash
# Set a policy for an intent
cast send 0xE8142B1Ff0DA631866fec5771f4291CbCe718080 \
  "setPolicy(bytes32,uint256,uint256,address)" \
  <INTENT_ID> <MIN_AMOUNT_OUT> <DEADLINE> <UPDATER_ADDRESS> \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

## Troubleshooting

### Contract Not Showing on Etherscan

If contracts don't appear immediately on Etherscan:
1. Wait 1-2 minutes for indexing
2. Check the transaction hash directly
3. Verify the contract using the verification script

### Verification Failed

If Sourcify verification didn't work:
1. Run `./scripts/contracts/verify-sepolia.sh` for Etherscan verification
2. Or manually verify using the Etherscan UI

### Need to Redeploy

If you need to deploy a new version:
1. The deployment script will automatically increment the version
2. Previous deployments are preserved in timestamped files
3. `latest.json` will always point to the most recent deployment

## Support Resources

- **Uniswap v4 Docs**: https://docs.uniswap.org/contracts/v4/
- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Sourcify**: https://sourcify.dev/
- **Hook Deployment Guide**: https://docs.uniswap.org/contracts/v4/guides/hooks/hook-deployment

---

**Deployment Completed**: February 8, 2026
**Status**: ✅ SUCCESS
**Ready for**: Integration testing and prize track submission
