# JACK SDK Type Definitions

This document provides an overview of all TypeScript types defined in the JACK SDK.

## Overview

All types are defined in `src/types.ts` and re-exported from `src/index.ts` for easy consumption. This ensures a single source of truth for type definitions while maintaining backward compatibility.

## Core Intent Types

### IntentParams
Parameters required to create an intent.

```typescript
interface IntentParams {
  sourceChain: string;
  destinationChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  deadline: number;
  [key: string]: string | number; // Extensible for future fields
}
```

### ExecutionStatus
Enum representing the lifecycle states of an intent.

```typescript
enum ExecutionStatus {
  CREATED = 'CREATED',
  QUOTED = 'QUOTED',
  EXECUTING = 'EXECUTING',
  SETTLING = 'SETTLING',
  SETTLED = 'SETTLED',
  ABORTED = 'ABORTED',
  EXPIRED = 'EXPIRED'
}
```

### ExecutionStep
A discrete step in the intent execution lifecycle.

```typescript
interface ExecutionStep {
  step: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  timestamp: number;
  details?: string;
}
```

### Intent
Complete intent object with execution state.

```typescript
interface Intent {
  id: string;
  params: IntentParams;
  signature?: string;
  status: ExecutionStatus;
  createdAt: number;
  executionSteps: ExecutionStep[];
  settlementTx?: string;
}
```

## Quote Types

### RouteStep
A step in the execution route.

```typescript
interface RouteStep {
  chain: string;
  protocol: string;
  action: string;
}
```

### Quote
A solver's quote for executing an intent.

```typescript
interface Quote {
  solverId: string;
  solverName: string;
  totalFee: string;
  estimatedTime: number;
  route: RouteStep[];
}
```

## Cost Tracking Types

### CostEntry
A single cost entry.

```typescript
interface CostEntry {
  cost: number;
}
```

### IssueCost
Cost tracking for a specific issue.

```typescript
interface IssueCost {
  issueId: string;
  totalCost: number;
  budget: number;
  overBudget: boolean;
}
```

### CostsResponse
Response from the costs API endpoint.

```typescript
interface CostsResponse {
  issueCosts: IssueCost[];
}
```

## Configuration Types

### ClientConfig
Configuration options for the JACK SDK client.

```typescript
interface ClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  retryBackoff?: number;
  enableCache?: boolean;
  cacheTTL?: number;
  headers?: Record<string, string>;
}
```

### RequestOptions
Options for individual HTTP requests.

```typescript
interface RequestOptions {
  timeout?: number;
  noRetry?: boolean;
  noCache?: boolean;
  headers?: Record<string, string>;
}
```

### PollOptions
Options for polling operations.

```typescript
interface PollOptions {
  interval?: number;
  timeout?: number;
  stopStatuses?: ExecutionStatus[];
}
```

## Result Types

### BatchSubmitResult
Result of a single intent submission in a batch operation.

```typescript
interface BatchSubmitResult {
  intentId: string;
  success: boolean;
  error?: Error;
}
```

### DryRunResult
Result of a dry-run validation.

```typescript
interface DryRunResult {
  valid: boolean;
  estimatedCost?: string;
  errors?: string[];
}
```

### ValidationResult
Result of intent parameter validation.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

## EIP-712 Types

### EIP712Domain
EIP-712 domain separator.

```typescript
interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}
```

### TypedData
Complete EIP-712 typed data structure.

```typescript
interface TypedData {
  domain: EIP712Domain;
  types: Record<string, Array<{ name: string; type: string }>>;
  message: Record<string, unknown>;
  primaryType: string;
}
```

## Subscription Types

### Subscription
Subscription handle for event-based updates.

```typescript
interface Subscription {
  unsubscribe(): void;
}
```

### ExecutionWatcher
Watcher for continuous intent status updates.

```typescript
interface ExecutionWatcher extends Subscription {
  intentId: string;
  onUpdate(callback: (intent: Intent) => void): void;
  onError(callback: (error: Error) => void): void;
  onComplete(callback: (intent: Intent) => void): void;
  stop(): void;
}
```

## Policy Types

### Policy
Policy rules for intent validation.

```typescript
interface Policy {
  maxAmountIn?: string;
  minAmountOut?: string;
  allowedSourceChains?: string[];
  allowedDestinationChains?: string[];
  allowedTokensIn?: string[];
  allowedTokensOut?: string[];
  maxDeadlineOffset?: number;
}
```

## Usage Examples

### Importing Types

```typescript
// Import from the main package
import type {
  IntentParams,
  Intent,
  ExecutionStatus,
  ClientConfig,
  ValidationResult
} from '@jack/sdk';

// Import enum
import { ExecutionStatus } from '@jack/sdk';
```

### Using Types

```typescript
// Create intent parameters
const params: IntentParams = {
  sourceChain: 'arbitrum',
  destinationChain: 'base',
  tokenIn: '0xUSDC',
  tokenOut: '0xWETH',
  amountIn: '1000000',
  minAmountOut: '42000000000000000',
  deadline: Date.now() + 3600000
};

// Configure SDK
const config: ClientConfig = {
  baseUrl: 'https://api.jack.example',
  timeout: 30000,
  maxRetries: 3
};

// Handle validation results
const result: ValidationResult = {
  valid: true,
  errors: []
};
```

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 1.5**: Exports IntentParams, Intent, ExecutionStatus, and ExecutionStep types
- **Requirement 3.4**: Exports Quote and RouteStep types
- **Requirement 4.3**: Exports CostEntry, IssueCost, and CostsResponse types
- **Requirement 5.1**: Exports all interfaces, types, and enums used in public APIs

## Testing

All types are thoroughly tested in:
- `tests/unit/types.test.ts` - Tests type definitions and compatibility
- `tests/unit/index-exports.test.ts` - Tests that types are properly exported from index.ts

Run tests with:
```bash
npm test
```

## Future Enhancements

The type system is designed to be extensible:
- IntentParams includes an index signature for additional properties
- All optional fields are clearly marked with `?`
- Enums can be extended with new values
- New types can be added to types.ts and re-exported from index.ts
