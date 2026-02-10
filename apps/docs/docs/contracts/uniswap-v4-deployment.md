# Uniswap v4 Integration - Sepolia Deployment

## Overview

JACK has successfully integrated with Uniswap v4 hooks on Sepolia testnet, enabling policy-based settlement with slippage protection and intent validation.

## Deployed Contracts

### JACKPolicyHook

The JACKPolicyHook contract enforces policy guardrails at settlement time, validating slippage bounds and intent deadlines before allowing swaps to execute.

- **Network**: Sepolia Testnet
- **Address**: [`0xE8142B1Ff0DA631866fec5771f4291CbCe718080`](https://sepolia.etherscan.io/address/0xE8142B1Ff0DA631866fec5771f4291CbCe718080#code)
- **Deployment Transaction**: [`0xfe8a64c351c62df57919d79b85a952bacb5dd410e684d6342e01f060ef18929e`](https://sepolia.etherscan.io/tx/0xfe8a64c351c62df57919d79b85a952bacb5dd410e684d6342e01f060ef18929e)
- **Block Number**: 10,215,727
- **Verification**: ✅ Verified on Sourcify
- **Hook Permissions**: `beforeSwap` only

#### Key Features

- **Policy Registration**: Owners can register policies with minimum amount out, deadline, and slippage bounds
- **Policy Validation**: Automatically validates policies during swap execution via `beforeSwap` hook
- **Slippage Protection**: Enforces maximum slippage percentage on quoted amounts
- **Deadline Enforcement**: Rejects expired intents based on policy deadline
- **Updatable Policies**: Policy updaters can adjust bounds without full re-registration

#### Contract Interface

```solidity
// Register a policy for an intent
function setPolicy(
    bytes32 intentId,
    uint256 minAmountOut,
    uint256 deadline,
    address updater
) external onlyOwner;

// Register a policy with slippage bounds
function setPolicyWithSlippage(
    bytes32 intentId,
    uint256 minAmountOut,
    uint256 referenceAmountOut,
    uint16 maxSlippageBps,
    uint256 deadline,
    address updater
) external onlyOwner;

// Check if a policy allows a quoted amount
function checkPolicy(
    bytes32 intentId,
    uint256 quotedAmountOut
) external view returns (bool allowed, bytes32 reason);
```

### JACKSettlementAdapter

The JACKSettlementAdapter contract integrates with Uniswap v4's unlock/callback pattern to execute settlements with policy validation.

- **Network**: Sepolia Testnet
- **Address**: [`0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A`](https://sepolia.etherscan.io/address/0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A#code)
- **Deployment Transaction**: [`0xf9ce7f6309ce153e66bc4e2160ae5338e6db3fc82e77edc7fadef3ab567098f5`](https://sepolia.etherscan.io/tx/0xf9ce7f6309ce153e66bc4e2160ae5338e6db3fc82e77edc7fadef3ab567098f5)
- **Block Number**: 10,215,727
- **Verification**: ✅ Verified on Sourcify

#### Key Features

- **Intent Validation**: Validates intent signatures using EIP-712
- **Policy Enforcement**: Checks policy compliance before executing swaps
- **Solver Authorization**: Only authorized solvers can settle intents
- **Unlock/Callback Pattern**: Integrates with Uniswap v4 PoolManager for atomic settlement
- **Delta Settlement**: Handles positive and negative deltas for both currencies

#### Contract Interface

```solidity
// Settle an intent via Uniswap v4
function settleIntent(
    Intent calldata intent,
    PoolKey calldata poolKey,
    SwapParams calldata swapParams,
    uint256 quotedAmountOut
) external nonReentrant onlySolver;

// Authorize a solver
function setAuthorizedSolver(
    address solver,
    bool authorized
) external onlyOwner;
```

## Integration Details

### Uniswap v4 PoolManager

The contracts integrate with the official Uniswap v4 PoolManager on Sepolia:

- **Address**: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- **Documentation**: [Uniswap v4 Deployments](https://docs.uniswap.org/contracts/v4/deployments)

### Hook Address Mining

The JACKPolicyHook was deployed using CREATE2 with address mining to ensure the hook address has the correct flags:

- **CREATE2 Salt**: 23048
- **Hook Flags**: `beforeSwap` (bit 7 set to 1)
- **Mining Library**: HookMiner from v4-periphery

This ensures the PoolManager recognizes the hook's permissions and calls `beforeSwap` during swap execution.

## Usage Examples

### Register a Policy

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';

const policyHookAddress = '0xE8142B1Ff0DA631866fec5771f4291CbCe718080';

// Register a policy for an intent
const txHash = await walletClient.writeContract({
  address: policyHookAddress,
  abi: policyHookAbi,
  functionName: 'setPolicy',
  args: [
    intentId,           // bytes32
    minAmountOut,       // uint256
    deadline,           // uint256
    updaterAddress      // address
  ]
});
```

### Settle an Intent

```typescript
const settlementAdapterAddress = '0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A';

// Settle an intent via Uniswap v4
const txHash = await walletClient.writeContract({
  address: settlementAdapterAddress,
  abi: settlementAdapterAbi,
  functionName: 'settleIntent',
  args: [
    intent,             // Intent struct
    poolKey,            // PoolKey struct
    swapParams,         // SwapParams struct
    quotedAmountOut     // uint256
  ]
});
```

## Testing on Sepolia

### Prerequisites

1. Sepolia ETH for gas fees
2. Test tokens for swaps
3. RPC URL (Infura, Alchemy, or public RPC)

### Faucets

- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
- [QuickNode Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)

### Read Contract State

```bash
# Check policy hook owner
cast call 0xE8142B1Ff0DA631866fec5771f4291CbCe718080 \
  "owner()(address)" \
  --rpc-url https://sepolia.infura.io/v3/YOUR_KEY

# Check if a policy exists
cast call 0xE8142B1Ff0DA631866fec5771f4291CbCe718080 \
  "checkPolicy(bytes32,uint256)(bool,bytes32)" \
  <INTENT_ID> <QUOTED_AMOUNT> \
  --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         JACK SDK                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Intent     │  │     V4       │  │   Yellow     │          │
│  │   Manager    │  │   Provider   │  │   Provider   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Sepolia Testnet                               │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  JACKPolicyHook      │  │ JACKSettlementAdapter│            │
│  │  0xE814...8080       │  │ 0xd8f0...1D1A        │            │
│  └──────────────────────┘  └──────────────────────┘            │
│              │                        │                          │
│              └────────────┬───────────┘                          │
│                           ▼                                      │
│              ┌──────────────────────┐                           │
│              │  Uniswap v4 Pool     │                           │
│              │  Manager             │                           │
│              │  0xE03A...3543       │                           │
│              └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Prize Track Submission

This deployment satisfies the requirements for the **Uniswap Foundation Prize Track**:

### Requirements Met

- ✅ **Contracts Deployed**: Both contracts deployed to Sepolia testnet
- ✅ **Transaction Hashes**: Captured and documented
- ✅ **Contract Verification**: Verified on Sourcify (Etherscan compatible)
- ✅ **Functional Code**: Demonstrates v4 hooks integration with policy enforcement
- ✅ **Repository**: Public GitHub repository with complete source code
- ✅ **Documentation**: Comprehensive documentation and setup instructions

### Submission Details

- **Track**: Uniswap Foundation Prize Track
- **Categories**: Agentic Finance, Privacy DeFi
- **Repository**: [GitHub Link]
- **Demo Video**: [Video Link] (max 3 minutes)

## Dashboard Integration

The dashboard manages a singleton `V4Provider` via `lib/v4.ts`:

```typescript
import { V4Provider } from "@jack-kernel/sdk";
import type { V4Config, WalletClient } from "@jack-kernel/sdk";

// Initialize with Sepolia addresses
function initV4Provider(walletClient: WalletClient, chainId = 11155111): V4Provider {
  const config: V4Config = {
    policyHookAddress: "0xE8142B1Ff0DA631866fec5771f4291CbCe718080",
    settlementAdapterAddress: "0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A",
    poolManagerAddress: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
    chainId,
  };
  return new V4Provider(config, walletClient);
}
```

When a user selects **Uniswap v4 Hook** in the `SettlementSelector`, the `ChannelStatusPanel` displays the PolicyHook and Adapter addresses with Etherscan links, plus any settlement transaction hash once the intent is resolved.

The `/api/settlement` endpoint also exposes v4 contract info via `POST { "action": "v4:contracts" }`.

See [Settlement Methods](../integrations/settlement.md) for the full settlement API reference.

## Support

For questions or issues:
- **Documentation**: [JACK Docs](https://jack.build)
- **GitHub**: [JACK Repository](https://github.com/your-org/jack)
- **Discord**: [Community Discord]

---

**Last Updated**: February 8, 2026  
**Deployment Status**: ✅ Live on Sepolia  
**Verification Status**: ✅ Verified on Sourcify
