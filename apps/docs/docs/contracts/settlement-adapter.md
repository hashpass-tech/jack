---
title: JACKSettlementAdapter
sidebar_position: 1
---

# JACKSettlementAdapter

## Overview

`JACKSettlementAdapter` is a production-ready smart contract that settles user intents by executing token swaps through Uniswap v4 with integrated policy validation. It serves as the bridge between intent-based execution and on-chain settlement, enabling solvers to fulfill user intents while enforcing security and policy constraints.

### Key Features

- **EIP-712 Signature Validation**: Cryptographically verifies user intent authenticity
- **Solver Authorization**: Whitelist-based access control for authorized solvers
- **Policy Integration**: Validates intents through `JACKPolicyHook` before execution
- **Atomic Swaps**: Leverages Uniswap v4's unlock/callback pattern for atomic execution
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Owner Management**: Supports ownership transfer and solver authorization updates

## Architecture

The settlement adapter integrates with two core components:

1. **JACKPolicyHook**: Validates intent compliance with system policies
2. **Uniswap v4 PoolManager**: Executes token swaps atomically

```
User → Signs Intent (EIP-712)
         ↓
Solver → settleIntent()
         ↓
Signature Validation
         ↓
Policy Check (JACKPolicyHook)
         ↓
poolManager.unlock()
         ↓
unlockCallback() → swap() → settle deltas
         ↓
Event: IntentSettled
```

### Contract Details

- **Location**: `contracts/src/JACKSettlementAdapter.sol`
- **Inheritance**: `EIP712`, `ReentrancyGuard`, `IUnlockCallback`
- **Dependencies**: OpenZeppelin contracts, Uniswap v4 core

## Settlement Flow

### 1. Intent Signing (Off-Chain)

Users create and sign intents using EIP-712:

```typescript
const intent = {
  id: ethers.utils.formatBytes32String("intent-123"),
  user: userAddress,
  tokenIn: "0x...",
  tokenOut: "0x...",
  amountIn: ethers.utils.parseEther("100"),
  minAmountOut: ethers.utils.parseEther("95"),
  deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  signature: "" // Will be populated after signing
};

const domain = {
  name: "JACKSettlementAdapter",
  version: "1",
  chainId: 1,
  verifyingContract: settlementAdapterAddress
};

const types = {
  Intent: [
    { name: "id", type: "bytes32" },
    { name: "user", type: "address" },
    { name: "tokenIn", type: "address" },
    { name: "tokenOut", type: "address" },
    { name: "amountIn", type: "uint256" },
    { name: "minAmountOut", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

const signature = await signer._signTypedData(domain, types, intent);
intent.signature = signature;
```

### 2. Intent Settlement (On-Chain)

Authorized solvers call `settleIntent()` with swap parameters:

```solidity
function settleIntent(
    Intent calldata intent,
    PoolKey calldata poolKey,
    SwapParams calldata swapParams,
    uint256 quotedAmountOut
) external nonReentrant onlySolver
```

**Parameters**:
- `intent`: The signed user intent
- `poolKey`: Uniswap v4 pool identification
- `swapParams`: Swap execution parameters
- `quotedAmountOut`: Expected output amount for policy validation

**Validation Steps**:
1. Verify intent deadline hasn't expired
2. Check quoted output meets minimum requirement
3. Validate EIP-712 signature
4. Query policy hook for approval
5. Execute swap via unlock/callback pattern

### 3. Atomic Execution

The contract uses Uniswap v4's unlock mechanism for atomic swap execution:

```solidity
// Step 1: Call unlock with settlement data
poolManager.unlock(abi.encode(settlement));

// Step 2: PoolManager calls back
function unlockCallback(bytes calldata data) external override {
    // Decode settlement parameters
    SettlementData memory settlement = abi.decode(data, (SettlementData));
    
    // Execute swap with policy metadata
    bytes memory hookData = abi.encode(settlement.intent.id, settlement.quotedAmountOut);
    BalanceDelta delta = poolManager.swap(settlement.poolKey, settlement.swapParams, hookData);
    
    // Settle token transfers
    _settleDeltas(settlement.intent.user, settlement.poolKey, delta);
}
```

## Public Functions

### settleIntent

```solidity
function settleIntent(
    Intent calldata intent,
    PoolKey calldata poolKey,
    SwapParams calldata swapParams,
    uint256 quotedAmountOut
) external nonReentrant onlySolver
```

Settles a user intent by validating signatures and policy, then executing the swap.

**Access**: Only authorized solvers and owner  
**Emits**: `IntentSettled(intentId, solver)`

**Reverts**:
- `IntentExpired`: Intent deadline has passed
- `QuotedAmountOutTooLow`: Quoted output below minimum
- `InvalidSignature`: EIP-712 signature verification failed
- `PolicyRejected`: Policy hook rejected the intent
- `UnauthorizedSolver`: Caller not authorized

### hashIntent

```solidity
function hashIntent(Intent calldata intent) public view returns (bytes32)
```

Computes the EIP-712 hash of an intent for signature verification.

**Returns**: The typed data hash for the intent

### transferOwnership

```solidity
function transferOwnership(address newOwner) external onlyOwner
```

Transfers contract ownership to a new address.

**Access**: Only current owner  
**Emits**: `OwnershipTransferred(previousOwner, newOwner)`

**Reverts**:
- `Unauthorized`: Caller is not owner or newOwner is zero address

### setAuthorizedSolver

```solidity
function setAuthorizedSolver(address solver, bool authorized) external onlyOwner
```

Updates solver authorization status.

**Access**: Only owner  
**Emits**: `SolverAuthorizationUpdated(solver, authorized)`

**Example**:
```solidity
// Authorize a solver
settlementAdapter.setAuthorizedSolver(solverAddress, true);

// Revoke authorization
settlementAdapter.setAuthorizedSolver(solverAddress, false);
```

### unlockCallback

```solidity
function unlockCallback(bytes calldata data) external override returns (bytes memory)
```

Callback invoked by PoolManager during unlock to execute the swap.

**Access**: Only PoolManager  
**Internal**: Not called directly by users

**Reverts**:
- `UnauthorizedPoolManager`: Caller is not the PoolManager

## Data Structures

### Intent

```solidity
struct Intent {
    bytes32 id;              // Unique intent identifier
    address user;            // Intent creator/signer
    address tokenIn;         // Input token address
    address tokenOut;        // Output token address
    uint256 amountIn;        // Input token amount
    uint256 minAmountOut;    // Minimum acceptable output
    uint256 deadline;        // Intent expiration timestamp
    bytes signature;         // EIP-712 signature
}
```

### SettlementData

```solidity
struct SettlementData {
    Intent intent;           // User intent being settled
    PoolKey poolKey;         // Uniswap v4 pool key
    SwapParams swapParams;   // Swap parameters
    uint256 quotedAmountOut; // Expected output for policy check
    address solver;          // Solver executing settlement
}
```

## Events

### IntentSettled

```solidity
event IntentSettled(bytes32 indexed intentId, address indexed solver)
```

Emitted when an intent is successfully settled.

**Parameters**:
- `intentId`: Unique identifier of the settled intent
- `solver`: Address of the solver that executed the settlement

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```

Emitted when contract ownership is transferred.

### SolverAuthorizationUpdated

```solidity
event SolverAuthorizationUpdated(address indexed solver, bool authorized)
```

Emitted when solver authorization status changes.

**Parameters**:
- `solver`: Solver address
- `authorized`: New authorization status

## Errors

### PolicyRejected

```solidity
error PolicyRejected(bytes32 intentId, bytes32 reason)
```

Thrown when the policy hook rejects an intent.

**When**: Policy validation fails during settlement

### InvalidSignature

```solidity
error InvalidSignature()
```

Thrown when EIP-712 signature verification fails.

**When**: Signature doesn't match intent hash or signer is not the intent user

### UnauthorizedSolver

```solidity
error UnauthorizedSolver(address solver)
```

Thrown when an unauthorized address attempts to settle an intent.

**When**: Caller is not owner and not in authorized solvers mapping

### UnauthorizedPoolManager

```solidity
error UnauthorizedPoolManager(address caller)
```

Thrown when unlockCallback is called by an address other than the PoolManager.

**When**: Prevents unauthorized callback execution

### IntentExpired

```solidity
error IntentExpired(uint256 deadline, uint256 currentTimestamp)
```

Thrown when attempting to settle an expired intent.

**When**: Current block timestamp exceeds intent deadline

### QuotedAmountOutTooLow

```solidity
error QuotedAmountOutTooLow(uint256 quotedAmountOut, uint256 minAmountOut)
```

Thrown when quoted output doesn't meet minimum requirements.

**When**: Solver's quoted amount is below user's minimum acceptable output

### Unauthorized

```solidity
error Unauthorized()
```

Thrown for general authorization failures.

**When**: Non-owner calls owner-only functions

## Security Features

### Reentrancy Protection

The contract uses OpenZeppelin's `ReentrancyGuard` to prevent reentrancy attacks on the `settleIntent` function. The unlock/callback pattern is carefully designed to prevent nested calls.

### Solver Authorization

Only addresses explicitly authorized by the owner can settle intents. The owner always has settlement privileges. This creates a permissioned solver network while maintaining centralized control.

```solidity
modifier onlySolver() {
    if (msg.sender != owner && !authorizedSolvers[msg.sender]) {
        revert UnauthorizedSolver(msg.sender);
    }
    _;
}
```

### Signature Verification

All intents must be signed by the user using EIP-712 typed data signatures. This ensures:
- Intent authenticity
- Protection against replay attacks
- User consent for settlement

### Deadline Enforcement

Intents include a deadline timestamp, preventing stale intents from being settled. This protects users from executing trades at outdated prices.

### Minimum Output Enforcement

Users specify `minAmountOut` in their intent, and solvers must quote at least this amount. This protects against slippage and manipulation.

## Integration Guide

### For Solvers

1. **Get Authorized**: Contact the contract owner to be added as an authorized solver
2. **Monitor Intents**: Listen for new user intents (off-chain infrastructure)
3. **Calculate Route**: Determine optimal swap parameters via Uniswap v4
4. **Settle Intent**: Call `settleIntent()` with intent and swap parameters
5. **Handle Errors**: Implement retry logic for temporary failures

```typescript
// Example solver implementation
async function settleUserIntent(intent: Intent) {
  // Verify solver is authorized
  const isAuthorized = await settlementAdapter.authorizedSolvers(solverAddress);
  if (!isAuthorized) throw new Error("Not authorized");
  
  // Calculate swap parameters
  const { poolKey, swapParams, quotedAmountOut } = await calculateSwapRoute(intent);
  
  // Execute settlement
  const tx = await settlementAdapter.settleIntent(
    intent,
    poolKey,
    swapParams,
    quotedAmountOut
  );
  
  await tx.wait();
  console.log(`Intent ${intent.id} settled in tx ${tx.hash}`);
}
```

### For Users

1. **Create Intent**: Define desired swap parameters
2. **Sign Intent**: Use EIP-712 to sign the intent
3. **Submit Off-Chain**: Send signed intent to solver network
4. **Monitor Settlement**: Watch for `IntentSettled` event

### For Protocol Operators

1. **Deploy Contract**: Deploy with `JACKPolicyHook` address
2. **Authorize Solvers**: Use `setAuthorizedSolver()` to manage solver network
3. **Monitor Events**: Track settlement activity and policy rejections
4. **Update Policies**: Work with policy hook to refine validation rules

## Policy Hook Integration

The settlement adapter delegates policy validation to the immutable `JACKPolicyHook`:

```solidity
(bool allowed, bytes32 reason) = policyHook.checkPolicy(intent.id, quotedAmountOut);
if (!allowed) revert PolicyRejected(intent.id, reason);
```

This design allows policy rules to evolve independently while maintaining a stable settlement interface. The policy hook can enforce:
- Volume limits
- Rate limiting
- Token allowlists
- Liquidity requirements
- Risk thresholds

See [JACKPolicyHook documentation](./policy-hook.md) for details on policy configuration.

## Deployment

### Constructor

```solidity
constructor(address _policyHook) EIP712("JACKSettlementAdapter", "1")
```

**Parameters**:
- `_policyHook`: Address of the deployed JACKPolicyHook contract

The constructor:
- Initializes EIP-712 domain with name "JACKSettlementAdapter" and version "1"
- Stores the policy hook reference
- Retrieves PoolManager address from policy hook
- Sets deployer as initial owner

### Deployment Steps

1. Deploy `JACKPolicyHook` first
2. Deploy `JACKSettlementAdapter` with policy hook address
3. Authorize initial solvers via `setAuthorizedSolver()`
4. Transfer ownership if needed via `transferOwnership()`

### Deployment Script Example

```bash
# Deploy using Foundry
forge script script/DeployJACKSettlementAdapter.s.sol:DeployJACKSettlementAdapter \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## Testing

The contract includes a comprehensive test suite at `contracts/test/JACKSettlementAdapter.t.sol` covering:

- ✅ Signature validation (valid and invalid cases)
- ✅ Solver authorization enforcement
- ✅ Deadline expiration handling
- ✅ Minimum output validation
- ✅ Policy rejection scenarios
- ✅ Reentrancy attack prevention
- ✅ Ownership transfer
- ✅ Solver authorization updates
- ✅ Delta settlement logic
- ✅ Unlock callback security

Run tests with:

```bash
cd contracts
forge test --match-contract JACKSettlementAdapterTest -vv
```

## Future Enhancements

Potential improvements for future versions:

- **Multi-hop Swaps**: Support complex routing through multiple pools
- **Batch Settlement**: Settle multiple intents atomically
- **Partial Fills**: Allow intents to be partially fulfilled
- **Cancel Mechanism**: Enable users to cancel pending intents
- **Fee Collection**: Implement protocol fee capture
- **Solver Reputation**: Track and reward reliable solvers
- **Dynamic Slippage**: Adjust slippage based on market conditions

## References

- [Uniswap v4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [EIP-712: Typed Structured Data Hashing and Signing](https://eips.ethereum.org/EIPS/eip-712)
- [OpenZeppelin ReentrancyGuard](https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard)
- [Contract Source Code](https://github.com/hashpass-tech/JACK/blob/main/contracts/src/JACKSettlementAdapter.sol)
