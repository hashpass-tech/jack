# JACK TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@jack/sdk.svg)](https://www.npmjs.com/package/@jack/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for the JACK cross-chain execution kernel. Provides a comprehensive, type-safe interface for creating and managing cross-chain intents, tracking execution, and monitoring costs.

## Features

- 🔒 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🔄 **Automatic Retries**: Built-in exponential backoff for transient failures
- 💾 **Smart Caching**: Optional response caching to reduce API calls
- 📊 **Execution Tracking**: Real-time polling and event-based status updates
- 🚀 **Batch Operations**: Submit and track multiple intents efficiently
- 🛡️ **Error Handling**: Detailed error types with context for debugging
- 📦 **Dual Module Support**: Works with both ESM and CommonJS

## Installation

```bash
npm install @jack/sdk
```

Or with pnpm:

```bash
pnpm add @jack/sdk
```

### Peer Dependencies

The SDK requires `viem` for EIP-712 signing:

```bash
npm install viem
```

## Quick Start

### Basic Usage

```typescript
import { JACK_SDK } from '@jack/sdk';

// Initialize the SDK
const sdk = new JACK_SDK({ 
  baseUrl: 'https://api.jack.example' 
});

// Create intent parameters
const params = {
  sourceChain: 'arbitrum',
  destinationChain: 'base',
  tokenIn: '0xUSDC...',
  tokenOut: '0xWETH...',
  amountIn: '1000000', // 1 USDC (6 decimals)
  minAmountOut: '42000000000000000', // 0.042 WETH (18 decimals)
  deadline: Date.now() + 3600000 // 1 hour from now
};

// Get EIP-712 typed data for signing
const typedData = sdk.intents.getTypedData(params);

// Sign with your wallet (using viem, ethers, or any EIP-712 compatible wallet)
const signature = await wallet.signTypedData(typedData);

// Submit the signed intent
const intentId = await sdk.submitIntent(params, signature);
console.log('Intent submitted:', intentId); // "JK-ABC123456"

// Wait for settlement
const intent = await sdk.waitForSettlement(intentId);
console.log('Settlement tx:', intent.settlementTx);
```

### Track Execution Progress

```typescript
import { ExecutionStatus } from '@jack/sdk';

// Poll until specific status is reached
const intent = await sdk.execution.waitForStatus(
  intentId,
  ExecutionStatus.SETTLED,
  { 
    interval: 3000,  // Poll every 3 seconds
    timeout: 120000  // Timeout after 2 minutes
  }
);

// Watch for real-time updates
const watcher = sdk.execution.watch(intentId, { interval: 2000 });

watcher.onUpdate((intent) => {
  console.log('Status updated:', intent.status);
  console.log('Execution steps:', intent.executionSteps);
});

watcher.onComplete((intent) => {
  console.log('Intent completed!');
  console.log('Settlement tx:', intent.settlementTx);
  watcher.stop();
});

watcher.onError((error) => {
  console.error('Polling error:', error);
});
```

## Configuration

### ClientConfig Options

The SDK accepts the following configuration options:

```typescript
interface ClientConfig {
  /** Base URL for the JACK API (required) */
  baseUrl: string;
  
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Initial delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  
  /** Backoff multiplier for exponential retry (default: 2) */
  retryBackoff?: number;
  
  /** Enable response caching for GET requests (default: true) */
  enableCache?: boolean;
  
  /** Cache time-to-live in milliseconds (default: 60000) */
  cacheTTL?: number;
  
  /** Custom HTTP headers for all requests */
  headers?: Record<string, string>;
}
```

### Example Configurations

**Production with authentication:**

```typescript
const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  timeout: 60000,
  maxRetries: 5,
  headers: {
    'Authorization': 'Bearer your-api-token',
    'X-Client-Version': '1.0.0'
  }
});
```

**Development with aggressive caching:**

```typescript
const sdk = new JACK_SDK({
  baseUrl: 'http://localhost:3000',
  enableCache: true,
  cacheTTL: 300000, // 5 minutes
  maxRetries: 1
});
```

**High-reliability configuration:**

```typescript
const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  timeout: 90000,
  maxRetries: 10,
  retryDelay: 2000,
  retryBackoff: 1.5,
  enableCache: false // Always fetch fresh data
});
```

## Error Handling

The SDK provides detailed error types for different failure scenarios:

### Error Types

```typescript
import { 
  JackError,      // Base error class
  APIError,       // API returned an error response
  NetworkError,   // Network-level failure
  ValidationError,// Client-side validation failed
  TimeoutError,   // Operation timed out
  RetryError      // All retry attempts exhausted
} from '@jack/sdk';
```

### Handling Errors

```typescript
try {
  const intentId = await sdk.submitIntent(params, signature);
} catch (error) {
  if (error instanceof ValidationError) {
    // Client-side validation failed
    console.error('Invalid parameters:', error.errors);
    // error.errors is an array of specific validation messages
    
  } else if (error instanceof APIError) {
    // API returned an error
    console.error('API error:', error.message);
    console.error('Status code:', error.statusCode);
    console.error('Response:', error.response);
    
    if (error.statusCode === 404) {
      console.log('Intent not found');
    } else if (error.isServerError()) {
      console.log('Server error - may be retried');
    }
    
  } else if (error instanceof NetworkError) {
    // Network failure (connection, DNS, etc.)
    console.error('Network error:', error.message);
    console.error('Original error:', error.originalError);
    
  } else if (error instanceof TimeoutError) {
    // Operation timed out
    console.error('Timeout after', error.timeoutMs, 'ms');
    
  } else if (error instanceof RetryError) {
    // All retries exhausted
    console.error('Failed after', error.attempts, 'attempts');
    console.error('Last error:', error.lastError);
  }
}
```

### Validation Before Submission

Validate parameters before making network requests:

```typescript
// Validate parameters
const validation = sdk.intents.validate(params);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Handle validation errors without making API call
  return;
}

// Proceed with submission
const intentId = await sdk.submitIntent(params, signature);
```

## Advanced Usage

### Batch Operations

Submit multiple intents in parallel:

```typescript
const intents = [
  { params: intent1Params, signature: sig1 },
  { params: intent2Params, signature: sig2 },
  { params: intent3Params, signature: sig3 }
];

const results = await sdk.agent.batchSubmit(intents);

// Check results
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Intent ${index} submitted: ${result.intentId}`);
  } else {
    console.error(`Intent ${index} failed:`, result.error?.message);
  }
});

// Count successes and failures
const successes = results.filter(r => r.success).length;
const failures = results.filter(r => !r.success).length;
console.log(`${successes} succeeded, ${failures} failed`);
```

### Multi-Intent Subscriptions

Monitor multiple intents simultaneously:

```typescript
const intentIds = ['JK-ABC123456', 'JK-DEF789012', 'JK-GHI345678'];

const subscription = sdk.agent.subscribeToUpdates(
  intentIds,
  (intentId, intent) => {
    console.log(`${intentId} status: ${intent.status}`);
  },
  { interval: 5000 }
);

// Later, stop monitoring
subscription.unsubscribe();
```

### Policy Validation

Enforce custom policies on intent parameters:

```typescript
import { Policy } from '@jack/sdk';

const policy: Policy = {
  maxAmountIn: '1000000000', // Max 1000 USDC
  allowedSourceChains: ['arbitrum', 'optimism'],
  allowedDestinationChains: ['base', 'ethereum'],
  allowedTokensIn: ['0xUSDC...', '0xUSDT...'],
  maxDeadlineOffset: 3600000 // Max 1 hour
};

const result = sdk.agent.validatePolicy(params, policy);

if (!result.valid) {
  console.error('Policy violations:', result.errors);
  return;
}

// Proceed with submission
const intentId = await sdk.submitIntent(params, signature);
```

### Dry Run Validation

Test intent parameters without submission:

```typescript
const dryRunResult = await sdk.agent.dryRun(params);

if (dryRunResult.valid) {
  console.log('Parameters are valid');
  if (dryRunResult.estimatedCost) {
    console.log('Estimated cost:', dryRunResult.estimatedCost);
  }
} else {
  console.error('Validation errors:', dryRunResult.errors);
}
```

### Cost Tracking

Monitor execution costs and budgets:

```typescript
// Get all issue costs
const costs = await sdk.costs.getCosts();

costs.issueCosts.forEach(issueCost => {
  console.log(`Issue ${issueCost.issueId}:`);
  console.log(`  Total cost: ${issueCost.totalCost}`);
  console.log(`  Budget: ${issueCost.budget}`);
  console.log(`  Over budget: ${issueCost.overBudget}`);
});

// Get costs for specific issue
const issueCost = await sdk.costs.getIssueCost('ISSUE-123');
if (issueCost) {
  console.log('Total cost:', issueCost.totalCost);
}

// Get all over-budget issues
const overBudget = await sdk.costs.getOverBudgetIssues();
console.log(`${overBudget.length} issues are over budget`);
```

### Cache Management

Control response caching:

```typescript
// Clear all cached responses
sdk.client.clearCache();

// Clear cache entries matching a pattern
sdk.client.clearCache('/api/intents');

// Disable cache for specific request
const intent = await sdk.intents.get(intentId, { skipCache: true });
```

### Custom Request Options

Override default settings for individual requests:

```typescript
// Longer timeout for specific request
const intent = await sdk.intents.get(intentId, { 
  timeout: 60000 
});

// Disable retries for specific request
const intents = await sdk.intents.list({ 
  noRetry: true 
});

// Skip cache for specific request
const freshIntent = await sdk.intents.get(intentId, { 
  skipCache: true 
});
```

## TypeScript Usage

### Type Exports

The SDK exports all types for use in your application:

```typescript
import type {
  // Core Intent Types
  IntentParams,
  Intent,
  ExecutionStatus,
  ExecutionStep,
  
  // Quote Types
  Quote,
  RouteStep,
  
  // Cost Types
  CostEntry,
  IssueCost,
  CostsResponse,
  
  // Configuration Types
  ClientConfig,
  RequestOptions,
  PollOptions,
  
  // Result Types
  BatchSubmitResult,
  DryRunResult,
  ValidationResult,
  
  // EIP-712 Types
  EIP712Domain,
  TypedData,
  
  // Subscription Types
  Subscription,
  ExecutionWatcher,
  
  // Policy Types
  Policy
} from '@jack/sdk';
```

### Type-Safe Intent Creation

```typescript
import type { IntentParams } from '@jack/sdk';

function createIntent(
  sourceChain: string,
  destinationChain: string,
  amountIn: string
): IntentParams {
  return {
    sourceChain,
    destinationChain,
    tokenIn: '0xUSDC...',
    tokenOut: '0xWETH...',
    amountIn,
    minAmountOut: calculateMinAmount(amountIn),
    deadline: Date.now() + 3600000
  };
}
```

### Type Guards

```typescript
import { ExecutionStatus } from '@jack/sdk';

function isTerminalStatus(status: ExecutionStatus): boolean {
  return [
    ExecutionStatus.SETTLED,
    ExecutionStatus.ABORTED,
    ExecutionStatus.EXPIRED
  ].includes(status);
}

function isSuccessful(status: ExecutionStatus): boolean {
  return status === ExecutionStatus.SETTLED;
}
```

## API Reference

### JACK_SDK

Main SDK class that provides access to all managers.

```typescript
class JACK_SDK {
  constructor(config: ClientConfig);
  
  // Manager instances
  readonly intents: IntentManager;
  readonly execution: ExecutionTracker;
  readonly costs: CostTracker;
  readonly agent: AgentUtils;
  
  // Convenience methods
  submitIntent(params: IntentParams, signature: string): Promise<string>;
  getIntent(intentId: string): Promise<Intent>;
  listIntents(): Promise<Intent[]>;
  waitForSettlement(intentId: string, timeout?: number): Promise<Intent>;
}
```

### IntentManager

Manages intent creation, validation, and submission.

```typescript
class IntentManager {
  // Get EIP-712 typed data for signing
  getTypedData(params: IntentParams, chainId?: number, verifyingContract?: string): TypedData;
  
  // Validate intent parameters
  validate(params: IntentParams): ValidationResult;
  
  // Submit signed intent
  submit(params: IntentParams, signature: string): Promise<string>;
  
  // Get single intent
  get(intentId: string): Promise<Intent>;
  
  // List all intents
  list(): Promise<Intent[]>;
}
```

### ExecutionTracker

Tracks intent execution status and progress.

```typescript
class ExecutionTracker {
  // Get current status
  getStatus(intentId: string): Promise<Intent>;
  
  // Wait for specific status
  waitForStatus(
    intentId: string,
    targetStatus: ExecutionStatus | ExecutionStatus[],
    options?: PollOptions
  ): Promise<Intent>;
  
  // Watch for continuous updates
  watch(intentId: string, options?: PollOptions): ExecutionWatcher;
}
```

### CostTracker

Monitors execution costs and budgets.

```typescript
class CostTracker {
  // Get all issue costs
  getCosts(): Promise<CostsResponse>;
  
  // Get costs for specific issue
  getIssueCost(issueId: string): Promise<IssueCost | null>;
  
  // Get over-budget issues
  getOverBudgetIssues(): Promise<IssueCost[]>;
}
```

### AgentUtils

High-level utilities for automated systems.

```typescript
class AgentUtils {
  // Submit multiple intents in parallel
  batchSubmit(
    intents: Array<{ params: IntentParams; signature: string }>
  ): Promise<BatchSubmitResult[]>;
  
  // Validate without submission
  dryRun(params: IntentParams): Promise<DryRunResult>;
  
  // Validate against policy
  validatePolicy(params: IntentParams, policy: Policy): ValidationResult;
  
  // Subscribe to multiple intents
  subscribeToUpdates(
    intentIds: string[],
    callback: (intentId: string, intent: Intent) => void,
    options?: PollOptions
  ): Subscription;
}
```

## Examples

### Complete Intent Lifecycle

```typescript
import { JACK_SDK, ExecutionStatus } from '@jack/sdk';

async function executeIntent() {
  const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });
  
  // 1. Create intent parameters
  const params = {
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    tokenIn: '0xUSDC...',
    tokenOut: '0xWETH...',
    amountIn: '1000000',
    minAmountOut: '42000000000000000',
    deadline: Date.now() + 3600000
  };
  
  // 2. Validate parameters
  const validation = sdk.intents.validate(params);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  // 3. Get typed data and sign
  const typedData = sdk.intents.getTypedData(params);
  const signature = await wallet.signTypedData(typedData);
  
  // 4. Submit intent
  const intentId = await sdk.submitIntent(params, signature);
  console.log('Intent submitted:', intentId);
  
  // 5. Track execution
  const watcher = sdk.execution.watch(intentId);
  
  watcher.onUpdate((intent) => {
    console.log(`Status: ${intent.status}`);
    intent.executionSteps.forEach(step => {
      console.log(`  ${step.step}: ${step.status}`);
    });
  });
  
  watcher.onComplete((intent) => {
    if (intent.status === ExecutionStatus.SETTLED) {
      console.log('✅ Intent settled successfully!');
      console.log('Settlement tx:', intent.settlementTx);
    } else {
      console.log('❌ Intent failed:', intent.status);
    }
    watcher.stop();
  });
  
  watcher.onError((error) => {
    console.error('Tracking error:', error);
  });
}
```

### Agent with Batch Processing

```typescript
import { JACK_SDK } from '@jack/sdk';

async function processIntentBatch(intentRequests: IntentRequest[]) {
  const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });
  
  // Prepare intents with signatures
  const intents = await Promise.all(
    intentRequests.map(async (req) => ({
      params: req.params,
      signature: await wallet.signTypedData(
        sdk.intents.getTypedData(req.params)
      )
    }))
  );
  
  // Submit batch
  const results = await sdk.agent.batchSubmit(intents);
  
  // Track all successful submissions
  const successfulIds = results
    .filter(r => r.success)
    .map(r => r.intentId);
  
  if (successfulIds.length > 0) {
    const subscription = sdk.agent.subscribeToUpdates(
      successfulIds,
      (intentId, intent) => {
        console.log(`${intentId}: ${intent.status}`);
      }
    );
    
    // Unsubscribe after 5 minutes
    setTimeout(() => subscription.unsubscribe(), 300000);
  }
  
  return results;
}
```

## Migration from Legacy SDK

If you're upgrading from an older version of the SDK:

### Import Changes

```typescript
// Old
import JACK_SDK from '@jack/sdk';

// New (both work)
import { JACK_SDK } from '@jack/sdk';
// or
import JACK_SDK from '@jack/sdk';
```

### Method Changes

```typescript
// Old
const typedData = sdk.getIntentTypedData(params);
const intent = await sdk.getExecutionStatus(intentId);

// New (old methods still work but are deprecated)
const typedData = sdk.intents.getTypedData(params);
const intent = await sdk.execution.getStatus(intentId);
```

## Contributing

Contributions are welcome! Please see the [contribution guidelines](../../CONTRIBUTING.md) for details.

## License

MIT © JACK Team

## Support

- **Documentation**: [Full API Documentation](https://docs.jack.example)
- **Issues**: [GitHub Issues](https://github.com/your-org/jack/issues)
- **Discord**: [Join our community](https://discord.gg/jack)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history and migration guides.
