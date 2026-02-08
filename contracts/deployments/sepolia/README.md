# Sepolia Deployment Artifacts

This directory contains deployment artifacts for JACKPolicyHook and JACKSettlementAdapter contracts deployed to Sepolia testnet.

## File Structure

- `deployment-{timestamp}.json` - Timestamped deployment artifacts
- `latest.json` - Always points to the most recent deployment
- `versions.json` - Version history index

## Deployment Artifact Format

Each deployment artifact file contains:

```json
{
  "version": "1.0.0",
  "network": "sepolia",
  "chainId": 11155111,
  "deployedAt": 1707408000,
  "contracts": {
    "policyHook": {
      "address": "0x...",
      "txHash": "0x...",
      "blockNumber": 12345678,
      "verified": false,
      "verificationUrl": ""
    },
    "settlementAdapter": {
      "address": "0x...",
      "txHash": "0x...",
      "blockNumber": 12345679,
      "verified": false,
      "verificationUrl": ""
    }
  },
  "poolManager": "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  "deployer": "0x...",
  "previousVersion": ""
}
```

## Upgrade Strategy

For testnet deployments, we use a simple "deploy new version" pattern:

1. Deploy new contract instances with updated logic
2. Save deployment artifacts with incremented version
3. Update `latest.json` to point to new deployment
4. SDK and scripts load addresses from `latest.json`

For mainnet, consider using proxy patterns (OpenZeppelin UUPS/Transparent) for upgradeability.

## Etherscan Links

- Sepolia Etherscan: https://sepolia.etherscan.io/
- View contract: https://sepolia.etherscan.io/address/{address}
- View transaction: https://sepolia.etherscan.io/tx/{txHash}
