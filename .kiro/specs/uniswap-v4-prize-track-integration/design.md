# Design Document: Uniswap v4 Prize Track Integration

## Overview

This design document outlines the technical approach for completing the Uniswap v4 hooks integration with the JACK SDK and deploying to Sepolia testnet to meet the evaluation criteria for two prize tracks: Yellow Network Prize Track ($15,000) and Uniswap Foundation Prize Track ($10,000).

The system integrates three key components:
1. **Yellow Network state channels** for instant off-chain transfers with on-chain settlement proof
2. **Uniswap v4 hooks** for policy enforcement and slippage protection during settlement
3. **JACK SDK** for unified intent creation, execution tracking, and provider orchestration

The design leverages existing implementations (JACKPolicyHook, JACKSettlementAdapter, YellowProvider, LifiProvider) and focuses on deployment, integration, testing, and documentation to meet prize track requirements.

### Upgrade Strategy

For testnet/development environments, we use a **simple "deploy new version" pattern** rather than complex proxy patterns:

- **Deployment**: Each deployment creates new contract instances with updated logic
- **Version Tracking**: Deployment artifacts are stored in timestamped JSON files (e.g., `deployment-1707408000.json`)
- **Latest Reference**: A `latest.json` file always points to the current deployment
- **SDK Integration**: SDK and scripts load contract addresses from `latest.json`
- **Upgrade Process**: Deploy new versions → Update `latest.json` → Update SDK/script references

**Rationale**: For testnet, this approach provides:
- Fast deployment cycles without proxy complexity
- Clear version history and rollback capability
- No gas overhead from proxy delegatecalls
- Simple debugging (direct contract calls)

**Future Consideration**: For mainnet, consider OpenZeppelin UUPS or Transparent Proxy patterns for upgradeability without redeployment.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         JACK SDK                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Yellow     │  │     LiFi     │  │   Intent     │          │
│  │   Provider   │  │   Provider   │  │   Manager    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Sepolia Testnet                               │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  JACKPolicyHook      │  │ JACKSettlementAdapter│            │
│  │  - Policy storage    │  │ - Intent validation  │            │
│  │  - Slippage checks   │  │ - Unlock/callback    │            │
│  │  - beforeSwap hook   │  │ - Settlement exec    │            │
│  └──────────────────────┘  └──────────────────────┘            │
│              │                        │                          │
│              └────────────┬───────────┘                          │
│                           ▼                                      │
│              ┌──────────────────────┐                           │
│              │  Uniswap v4 Pool     │                           │
│              │  Manager             │                           │
│              └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interactions

1. **SDK Initialization**: Developer initializes JACK_SDK with Yellow and LiFi configurations
2. **Intent Creation**: Developer creates intent with source/destination chains, tokens, amounts
3. **Quote Discovery**: LiFi provider fetches cross-chain quotes and routes
4. **Policy Registration**: JACKPolicyHook stores policy with min amount, deadline, slippage bounds
5. **Off-Chain Execution**: Yellow Network executes instant transfers via state channels
6. **Settlement**: JACKSettlementAdapter triggers Uniswap v4 swap with hook validation
7. **Hook Validation**: JACKPolicyHook.beforeSwap validates policy compliance before swap execution
8. **On-Chain Proof**: Settlement transaction hash provides verifiable on-chain proof

## Components and Interfaces

### 1. Deployment Scripts

**Purpose**: Automate deployment of contracts to Sepolia testnet and capture deployment artifacts.

**Interface**:
```typescript
interface DeploymentConfig {
  rpcUrl: string;
  privateKey: string;
  poolManagerAddress: string;
  verifyContracts: boolean;
}

interface DeploymentResult {
  policyHookAddress: string;
  settlementAdapterAddress: string;
  policyHookTxHash: string;
  settlementAdapterTxHash: string;
  blockNumber: number;
  timestamp: number;
}

async function deployContracts(config: DeploymentConfig): Promise<DeploymentResult>
```

**Implementation Details**:
- Use Foundry forge scripts for contract deployment
- Deploy JACKPolicyHook first with PoolManager address
- Deploy JACKSettlementAdapter with JACKPolicyHook address
- Capture deployment transaction hashes and contract addresses
- Verify contracts on Sepolia Etherscan
- Store deployment artifacts in JSON format

### 2. SDK Contract Integration

**Purpose**: Extend SDK to interact with deployed Uniswap v4 contracts.

**Interface**:
```typescript
interface V4Config {
  policyHookAddress: string;
  settlementAdapterAddress: string;
  poolManagerAddress: string;
  chainId: number;
}

interface V4IntentParams extends IntentParams {
  poolKey: PoolKey;
  swapParams: SwapParams;
  quotedAmountOut: string;
}

class V4Provider {
  constructor(config: V4Config, walletClient: WalletClient);
  
  async registerPolicy(
    intentId: string,
    minAmountOut: bigint,
    deadline: number,
    updater: Address
  ): Promise<Hash>;
  
  async settleIntent(
    intent: V4IntentParams
  ): Promise<Hash>;
  
  encodeHookData(intentId: string, quotedAmountOut: bigint): Hex;
}
```

**Implementation Details**:
- Create V4Provider class in SDK packages/sdk/src/v4/
- Use viem for contract interactions
- Provide helper functions for encoding hook data
- Integrate with existing IntentManager for intent creation
- Support policy registration and settlement execution

### 3. Yellow Network Demo Script

**Purpose**: Demonstrate Yellow Network integration with runnable demo path.

**Interface**:
```typescript
interface YellowDemoConfig {
  custodyAddress: Address;
  adjudicatorAddress: Address;
  chainId: number;
  walletClient: WalletClient;
  counterparty: Address;
  assetAddress: Address;
  initialAmount: bigint;
}

async function runYellowDemo(config: YellowDemoConfig): Promise<void>
```

**Demo Flow**:
1. Initialize JACK_SDK with Yellow configuration
2. Create state channel with counterparty
3. Execute 3-5 off-chain transfers
4. Log channel state after each transfer
5. Close channel and capture settlement transaction hash
6. Display summary with off-chain state updates and on-chain proof

### 4. Uniswap v4 Demo Script

**Purpose**: Demonstrate Uniswap v4 integration with policy enforcement and settlement.

**Interface**:
```typescript
interface V4DemoConfig {
  v4Config: V4Config;
  walletClient: WalletClient;
  intentParams: IntentParams;
  poolKey: PoolKey;
  swapParams: SwapParams;
}

async function runV4Demo(config: V4DemoConfig): Promise<void>
```

**Demo Flow**:
1. Initialize JACK_SDK with V4 configuration
2. Create intent with policy requirements
3. Register policy via JACKPolicyHook
4. Fetch quote via LiFi provider
5. Execute settlement via JACKSettlementAdapter
6. Capture policy registration and settlement transaction hashes
7. Display summary with transaction links and event logs

### 5. Integration Test Suite

**Purpose**: Validate end-to-end flows on Sepolia testnet.

**Test Categories**:
- **Yellow Network Tests**: Channel creation, transfers, settlement
- **Uniswap v4 Tests**: Policy registration, hook validation, settlement execution
- **SDK Integration Tests**: Contract interaction, intent creation, execution tracking
- **Cross-Provider Tests**: Yellow + LiFi + v4 combined workflows

**Test Framework**: Vitest with viem for contract interactions

## Data Models

### Deployment Artifacts

```typescript
interface DeploymentArtifacts {
  version: string; // e.g., "1.0.0", "1.0.1"
  network: 'sepolia';
  deployedAt: number; // Unix timestamp
  contracts: {
    policyHook: {
      address: Address;
      txHash: Hash;
      blockNumber: number;
      verified: boolean;
      verificationUrl?: string;
    };
    settlementAdapter: {
      address: Address;
      txHash: Hash;
      blockNumber: number;
      verified: boolean;
      verificationUrl?: string;
    };
  };
  poolManager: Address;
  deployer: Address;
  previousVersion?: string; // Reference to previous deployment file
}
```

**File Structure**:
```
contracts/deployments/sepolia/
├── deployment-1707408000.json  # Timestamped deployment
├── deployment-1707494400.json  # Newer deployment
├── latest.json                 # Symlink/copy to most recent
└── versions.json               # Version history index
```

### Intent with V4 Settlement

```typescript
interface V4Intent {
  id: string;
  params: IntentParams;
  signature: Hex;
  v4Settlement: {
    poolKey: PoolKey;
    swapParams: SwapParams;
    quotedAmountOut: bigint;
    hookData: Hex;
  };
  policy: {
    minAmountOut: bigint;
    deadline: number;
    maxSlippageBps: number;
    registrationTxHash?: Hash;
  };
  settlementTxHash?: Hash;
}
```

### Yellow Channel State

```typescript
interface YellowChannelState {
  channelId: string;
  counterparty: Address;
  asset: Address;
  allocation: {
    user: bigint;
    counterparty: bigint;
  };
  nonce: number;
  status: 'open' | 'closing' | 'closed';
  transfers: Array<{
    amount: bigint;
    direction: 'send' | 'receive';
    timestamp: number;
    nonce: number;
  }>;
  settlementTxHash?: Hash;
}
```

### Prize Track Metadata

```typescript
interface PrizeTrackMetadata {
  yellowNetwork: {
    trackName: 'Yellow Network Prize Track';
    prizeAmount: '$15,000';
    repositoryUrl: string;
    demoVideoUrl: string;
    integrationProof: {
      sdkInitialization: string; // Code reference
      channelCreation: string; // Code reference
      offChainTransfers: string; // Code reference
      onChainSettlement: string; // Tx hash
    };
    deliverables: {
      runnableDemoPath: boolean;
      offChainProof: boolean;
      onChainProof: boolean;
      demoVideo: boolean;
      submissionMetadata: boolean;
    };
  };
  uniswapFoundation: {
    trackName: 'Uniswap Foundation Prize Track';
    prizeAmount: '$10,000';
    targetTracks: Array<'Agentic Finance' | 'Privacy DeFi'>;
    repositoryUrl: string;
    demoVideoUrl: string;
    testnetProof: {
      policyHookDeployment: Hash;
      settlementAdapterDeployment: Hash;
      policyRegistration: Hash;
      settlementExecution: Hash;
    };
    deliverables: {
      contractsDeployed: boolean;
      testnetTxHashes: boolean;
      functionalCode: boolean;
      demoVideo: boolean;
      trackSelection: boolean;
    };
  };
}
```

## Error Handling

### Deployment Errors

```typescript
class DeploymentError extends Error {
  constructor(
    message: string,
    public readonly stage: 'policyHook' | 'settlementAdapter' | 'verification',
    public readonly txHash?: Hash
  ) {
    super(message);
    this.name = 'DeploymentError';
  }
}
```

**Error Scenarios**:
- Insufficient gas for deployment
- Invalid PoolManager address
- Contract verification failure
- Network connectivity issues

**Handling Strategy**:
- Retry deployment with increased gas limit
- Validate configuration before deployment
- Provide detailed error messages with transaction hashes
- Support manual verification if automatic verification fails

### Settlement Errors

```typescript
class SettlementError extends Error {
  constructor(
    message: string,
    public readonly reason: 'policy_rejected' | 'invalid_signature' | 'expired' | 'slippage_exceeded',
    public readonly intentId: string,
    public readonly txHash?: Hash
  ) {
    super(message);
    this.name = 'SettlementError';
  }
}
```

**Error Scenarios**:
- Policy validation failure (REASON_POLICY_MISSING, REASON_POLICY_EXPIRED, REASON_SLIPPAGE_EXCEEDED)
- Invalid intent signature
- Intent deadline expired
- Quoted amount below minimum
- Unauthorized solver

**Handling Strategy**:
- Check policy exists before settlement
- Validate intent signature before submission
- Ensure deadline is in the future
- Verify quoted amount meets minimum requirements
- Authorize solver addresses before settlement

### Yellow Network Errors

```typescript
class YellowError extends Error {
  constructor(
    message: string,
    public readonly reason: 'channel_creation_failed' | 'transfer_failed' | 'settlement_failed',
    public readonly channelId?: string
  ) {
    super(message);
    this.name = 'YellowError';
  }
}
```

**Error Scenarios**:
- Channel creation failure (insufficient balance, invalid counterparty)
- Transfer failure (insufficient channel balance, invalid amount)
- Settlement failure (channel not in closing state, invalid final state)

**Handling Strategy**:
- Validate channel parameters before creation
- Check channel balance before transfers
- Ensure channel is in correct state for settlement
- Provide detailed error messages with channel state

## Testing Strategy

### Unit Tests

**Purpose**: Test individual components in isolation.

**Coverage**:
- V4Provider contract interaction methods
- Hook data encoding/decoding functions
- Policy validation logic
- Intent parameter validation
- Error handling for all error types

**Framework**: Vitest with mocked contract calls

### Integration Tests

**Purpose**: Test end-to-end flows on Sepolia testnet.

**Test Scenarios**:

1. **Yellow Network Integration**
   - Initialize SDK with Yellow configuration
   - Create channel with test counterparty
   - Execute multiple off-chain transfers
   - Close channel and verify settlement transaction
   - Validate channel state updates

2. **Uniswap v4 Integration**
   - Deploy contracts to Sepolia (or use existing deployment)
   - Register policy for test intent
   - Execute settlement with valid parameters
   - Verify hook validation occurred
   - Capture all transaction hashes

3. **Combined Workflow**
   - Create intent with Yellow + v4 settlement
   - Execute off-chain transfers via Yellow
   - Settle final state via v4 adapter
   - Verify policy enforcement
   - Validate end-to-end transaction flow

4. **Error Scenarios**
   - Test policy rejection (expired, slippage exceeded)
   - Test invalid signature rejection
   - Test unauthorized solver rejection
   - Test channel creation failure
   - Test transfer failure (insufficient balance)

**Framework**: Vitest with viem for contract interactions

**Configuration**:
- Use Sepolia testnet RPC
- Use test wallet with Sepolia ETH
- Use deployed contract addresses from deployment artifacts
- Run tests with minimum 100 iterations for property-based tests (where applicable)

### Property-Based Tests

**Purpose**: Validate universal properties across all inputs.

**Properties** (to be defined in Correctness Properties section):
- Policy validation properties
- Settlement execution properties
- Channel state transition properties
- Intent signature verification properties

**Framework**: fast-check with Vitest integration

**Configuration**:
- Minimum 100 iterations per property test
- Tag each test with feature name and property number
- Reference design document properties in test comments


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:
- Properties 1.1 and 4.1 both test configuration storage (Yellow config vs V4 config) - these can remain separate as they test different providers
- Properties 1.3 and 1.6 both relate to off-chain state updates - 1.6 (logging) is subsumed by 1.3 (state updates)
- Properties 3.2, 3.3, and 4.3 all test contract interactions - these should remain separate as they test different contract methods
- Properties 3.6 and 8.7 both test transaction hash capture - 8.7 is more comprehensive and subsumes 3.6

After reflection, the following properties provide unique validation value:

### Property 1: Yellow Provider Initialization
*For any* valid Yellow configuration (custody address, adjudicator address, chain ID, wallet client), initializing the SDK should create a YellowProvider instance with those exact configuration values.

**Validates: Requirements 1.1**

### Property 2: Channel Creation
*For any* valid counterparty address, asset address, and initial allocation amount, creating a state channel should initialize a session with those exact parameters and return a valid channel ID.

**Validates: Requirements 1.2**

### Property 3: Off-Chain State Updates
*For any* open channel and valid transfer amount, executing an off-chain transfer should update the channel allocation without producing an on-chain transaction hash.

**Validates: Requirements 1.3, 1.6**

### Property 4: Channel Settlement Round Trip
*For any* channel with off-chain state updates, closing the channel should produce an on-chain settlement transaction hash, and querying that transaction should show the final channel state.

**Validates: Requirements 1.4**

### Property 5: Yellow-Intent Integration
*For any* valid intent parameters, creating an intent with Yellow settlement should successfully execute Yellow Network workflows and complete with a settlement transaction.

**Validates: Requirements 1.7**

### Property 6: V4 Intent Creation
*For any* valid intent parameters with v4 settlement, the generated intent should include policy requirements (min amount out, deadline, max slippage).

**Validates: Requirements 3.1**

### Property 7: Policy Registration
*For any* valid policy parameters (intent ID, min amount out, deadline, updater address), calling setPolicy should store the policy in JACKPolicyHook and be retrievable via checkPolicy.

**Validates: Requirements 3.2**

### Property 8: Settlement Execution
*For any* valid intent with registered policy, calling settleIntent should trigger beforeSwap hook validation and emit IntentSettled event with correct intent ID and solver address.

**Validates: Requirements 3.3, 3.4, 3.5**

### Property 9: Transaction Hash Capture
*For any* successful contract interaction (policy registration or settlement), the system should capture and store the transaction hash in a retrievable format.

**Validates: Requirements 3.6, 8.7**

### Property 10: V4 Configuration Storage
*For any* valid V4 configuration (policy hook address, settlement adapter address, pool manager address, chain ID), initializing the SDK should store those exact addresses and make them accessible.

**Validates: Requirements 4.1**

### Property 11: Hook Data Encoding
*For any* intent ID and quoted amount out, encoding hook data should produce a valid hex string that can be decoded back to the original values.

**Validates: Requirements 4.2**

### Property 12: Contract Interaction via Wallet
*For any* intent submission with v4 settlement, the system should make contract calls via the configured viem wallet client and return transaction hashes.

**Validates: Requirements 4.3**

### Property 13: Hook Data Helper Functions
*For any* intent ID and quoted amount, the encodeHookData helper function should produce valid ABI-encoded data that matches the expected format for JACKPolicyHook.beforeSwap.

**Validates: Requirements 4.6**

### Property 14: Policy Validation Correctness
*For any* policy with min amount out M and quoted amount Q, checkPolicy should return (true, REASON_OK) if Q >= M and deadline is in the future, and (false, REASON_*) otherwise.

**Validates: Requirements 3.4** (implicit policy validation requirement)

### Property 15: Slippage Bound Enforcement
*For any* policy with reference amount R and max slippage S bps, the effective minimum should be max(minAmountOut, R * (10000 - S) / 10000), and checkPolicy should enforce this bound.

**Validates: Requirements 3.4** (implicit slippage enforcement requirement)

### Property 16: Intent Signature Verification
*For any* intent with EIP-712 signature, settleIntent should only succeed if the signature is valid for the intent hash and signed by the intent user address.

**Validates: Requirements 3.3** (implicit signature validation requirement)

### Property 17: Settlement Authorization
*For any* settlement attempt, settleIntent should only succeed if called by an authorized solver (owner or explicitly authorized address).

**Validates: Requirements 3.3** (implicit authorization requirement)

### Property 18: Intent Deadline Enforcement
*For any* intent with deadline D, settleIntent should revert with IntentExpired if block.timestamp > D.

**Validates: Requirements 3.3** (implicit deadline enforcement requirement)

### Property 19: Minimum Amount Enforcement
*For any* intent with minAmountOut M and quotedAmountOut Q, settleIntent should revert with QuotedAmountOutTooLow if Q < M.

**Validates: Requirements 3.3** (implicit minimum amount enforcement requirement)

### Property 20: Event Emission Completeness
*For any* successful settlement, the IntentSettled event should be emitted with the correct intent ID and solver address, and the event should be queryable from the transaction receipt.

**Validates: Requirements 3.5**
