# Design Document: JACK TypeScript SDK

## Overview

The JACK TypeScript SDK provides a comprehensive, type-safe interface for interacting with the JACK cross-chain execution kernel. The SDK is designed with modularity, resilience, and developer experience as core principles. It will be published to npm as a standalone package with both ESM and CommonJS support, complete TypeScript declarations, and automated release workflows.

The SDK architecture follows a layered approach:
- **Core Layer**: HTTP client with retry logic, error handling, and caching
- **API Layer**: Type-safe wrappers for all JACK API endpoints
- **Utility Layer**: Helper functions for validation, serialization, and common operations
- **Agent Layer**: High-level abstractions for batch operations and event subscriptions

## Architecture

### Module Structure

```
packages/sdk/
├── src/
│   ├── index.ts                 # Main entry point, exports all public APIs
│   ├── client.ts                # Core HTTP client with retry and caching
│   ├── intents.ts               # Intent management methods
│   ├── execution.ts             # Execution tracking and polling
│   ├── quotes.ts                # Quote management (future)
│   ├── costs.ts                 # Cost tracking methods
│   ├── agent.ts                 # Agent-specific utilities (batch, events)
│   ├── types.ts                 # All TypeScript interfaces and types
│   ├── errors.ts                # Custom error classes
│   ├── validation.ts            # Input validation helpers
│   ├── serialization.ts         # EIP-712 and data serialization
│   └── cache.ts                 # Simple in-memory cache implementation
├── tests/
│   ├── unit/                    # Unit tests for each module
│   ├── integration/             # Integration tests with mock API
│   └── property/                # Property-based tests
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── README.md
└── .npmignore
```

### Build Configuration

The SDK will use TypeScript with dual output (ESM + CommonJS):
- **ESM**: `dist/esm/` - Modern module format for bundlers
- **CommonJS**: `dist/cjs/` - Traditional Node.js format
- **Types**: `dist/types/` - TypeScript declaration files

Build tool: `tsc` with separate configs for ESM and CommonJS, or `tsup` for simplified dual builds.

## Components and Interfaces

### Core HTTP Client

The `JackClient` class provides the foundation for all API interactions:

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

class JackClient {
  constructor(config: ClientConfig);
  
  // Low-level request methods
  async get<T>(path: string, options?: RequestOptions): Promise<T>;
  async post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  
  // Cache management
  clearCache(pattern?: string): void;
  
  // Internal retry logic
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T>;
}
```

**Retry Logic**: Exponential backoff for 5xx errors and network failures. Non-retryable errors (4xx) throw immediately.

**Caching**: Simple in-memory cache with TTL. Only GET requests are cached. Cache keys are based on URL + query params.

### Intent Management

```typescript
interface IntentParams {
  sourceChain: string;
  destinationChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  deadline: number;
}

interface Intent {
  id: string;
  params: IntentParams;
  signature?: string;
  status: ExecutionStatus;
  createdAt: number;
  executionSteps: ExecutionStep[];
  settlementTx?: string;
}

enum ExecutionStatus {
  CREATED = 'CREATED',
  QUOTED = 'QUOTED',
  EXECUTING = 'EXECUTING',
  SETTLING = 'SETTLING',
  SETTLED = 'SETTLED',
  ABORTED = 'ABORTED',
  EXPIRED = 'EXPIRED'
}

interface ExecutionStep {
  step: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  timestamp: number;
  details?: string;
}

class IntentManager {
  constructor(client: JackClient);
  
  // Create EIP-712 typed data for signing
  getTypedData(params: IntentParams): TypedData;
  
  // Submit signed intent
  async submit(params: IntentParams, signature: string): Promise<string>;
  
  // Query single intent
  async get(intentId: string): Promise<Intent>;
  
  // List all intents
  async list(): Promise<Intent[]>;
  
  // Validate intent parameters
  validate(params: IntentParams): ValidationResult;
}
```

### Execution Tracking

```typescript
interface PollOptions {
  interval?: number;        // Polling interval in ms (default: 2000)
  timeout?: number;         // Max time to poll in ms (default: 60000)
  stopStatuses?: ExecutionStatus[];  // Stop polling on these statuses
}

interface ExecutionWatcher {
  intentId: string;
  stop(): void;
  onUpdate(callback: (intent: Intent) => void): void;
  onError(callback: (error: Error) => void): void;
  onComplete(callback: (intent: Intent) => void): void;
}

class ExecutionTracker {
  constructor(client: JackClient);
  
  // Poll until specific status reached
  async waitForStatus(
    intentId: string,
    targetStatus: ExecutionStatus | ExecutionStatus[],
    options?: PollOptions
  ): Promise<Intent>;
  
  // Create a watcher for continuous updates
  watch(intentId: string, options?: PollOptions): ExecutionWatcher;
  
  // Get current status (single request)
  async getStatus(intentId: string): Promise<Intent>;
}
```

### Quote Management (Future)

```typescript
interface Quote {
  solverId: string;
  solverName: string;
  totalFee: string;
  estimatedTime: number;
  route: RouteStep[];
}

interface RouteStep {
  chain: string;
  protocol: string;
  action: string;
}

class QuoteManager {
  constructor(client: JackClient);
  
  // Get quotes for intent parameters
  async getQuotes(params: IntentParams): Promise<Quote[]>;
  
  // Sort quotes by cost
  sortByCost(quotes: Quote[]): Quote[];
  
  // Sort quotes by estimated time
  sortByTime(quotes: Quote[]): Quote[];
}
```

### Cost Tracking

```typescript
interface CostEntry {
  cost: number;
}

interface IssueCost {
  issueId: string;
  totalCost: number;
  budget: number;
  overBudget: boolean;
}

interface CostsResponse {
  issueCosts: IssueCost[];
}

class CostTracker {
  constructor(client: JackClient);
  
  // Get all issue costs
  async getCosts(): Promise<CostsResponse>;
  
  // Get costs for specific issue
  async getIssueCost(issueId: string): Promise<IssueCost | null>;
  
  // Check if any issues are over budget
  async getOverBudgetIssues(): Promise<IssueCost[]>;
}
```

### Agent Utilities

```typescript
interface BatchSubmitResult {
  intentId: string;
  success: boolean;
  error?: Error;
}

interface DryRunResult {
  valid: boolean;
  estimatedCost?: string;
  errors?: string[];
}

class AgentUtils {
  constructor(client: JackClient);
  
  // Submit multiple intents in parallel
  async batchSubmit(
    intents: Array<{ params: IntentParams; signature: string }>
  ): Promise<BatchSubmitResult[]>;
  
  // Simulate intent execution without submission
  async dryRun(params: IntentParams): Promise<DryRunResult>;
  
  // Validate against policies
  validatePolicy(params: IntentParams, policy: Policy): ValidationResult;
  
  // Subscribe to status changes (polling-based)
  subscribeToUpdates(
    intentIds: string[],
    callback: (intentId: string, intent: Intent) => void,
    options?: PollOptions
  ): Subscription;
}

interface Subscription {
  unsubscribe(): void;
}
```

### Main SDK Class

```typescript
class JACK_SDK {
  public readonly intents: IntentManager;
  public readonly execution: ExecutionTracker;
  public readonly quotes: QuoteManager;
  public readonly costs: CostTracker;
  public readonly agent: AgentUtils;
  
  constructor(config: ClientConfig);
  
  // Convenience methods (delegate to managers)
  async submitIntent(params: IntentParams, signature: string): Promise<string>;
  async getIntent(intentId: string): Promise<Intent>;
  async listIntents(): Promise<Intent[]>;
  async waitForSettlement(intentId: string, timeout?: number): Promise<Intent>;
}
```

## Data Models

### Type Exports

All types, interfaces, and enums are exported from `src/types.ts`:

```typescript
// Core types
export { IntentParams, Intent, ExecutionStatus, ExecutionStep };

// Quote types
export { Quote, RouteStep };

// Cost types
export { CostEntry, IssueCost, CostsResponse };

// Configuration types
export { ClientConfig, RequestOptions, PollOptions };

// Result types
export { BatchSubmitResult, DryRunResult, ValidationResult };

// Error types
export { JackError, NetworkError, ValidationError, APIError };

// EIP-712 types
export { TypedData, EIP712Domain };
```

### EIP-712 Typed Data

```typescript
interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}

interface TypedData {
  domain: EIP712Domain;
  types: Record<string, Array<{ name: string; type: string }>>;
  message: Record<string, unknown>;
  primaryType: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: EIP-712 Serialization Consistency

*For any* valid IntentParams object, calling `getTypedData()` twice with the same parameters should produce identical typed data structures.

**Validates: Requirements 14.1**

### Property 2: Intent Submission Idempotency Check

*For any* valid IntentParams and signature, if submission succeeds, the returned intent ID should be non-empty and follow the format `JK-[A-Z0-9]{9}`.

**Validates: Requirements 1.2**

### Property 3: Status Polling Convergence

*For any* intent ID, polling with `waitForStatus()` should either reach the target status within the timeout or throw a timeout error—it should never hang indefinitely.

**Validates: Requirements 2.5**

### Property 4: Retry Exhaustion

*For any* request that fails with retryable errors, after exhausting max retries, the SDK should throw an error containing the retry count and final failure reason.

**Validates: Requirements 6.2**

### Property 5: Cache Invalidation

*For any* cached GET request, after the TTL expires, the next request should fetch fresh data from the API rather than returning stale cached data.

**Validates: Requirements 7.3**

### Property 6: Batch Submission Atomicity

*For any* array of intents in `batchSubmit()`, the results array should have the same length as the input array, with each result corresponding to the same index in the input.

**Validates: Requirements 8.2**

### Property 7: Validation Before Submission

*For any* invalid IntentParams (e.g., negative amounts, past deadline), calling `validate()` should return errors, and `submit()` should throw a ValidationError before making any network request.

**Validates: Requirements 5.4**

### Property 8: Error Type Discrimination

*For any* API error response, the SDK should throw the correct error subclass (APIError for 4xx/5xx, NetworkError for network failures, ValidationError for client-side validation).

**Validates: Requirements 5.3**

### Property 9: Type Safety Round-Trip

*For any* Intent object returned by the API, all fields should match the TypeScript interface definition, and accessing any defined field should not result in undefined (unless explicitly optional).

**Validates: Requirements 5.1**

### Property 10: Configuration Validation

*For any* invalid ClientConfig (e.g., negative timeout, empty baseUrl), the SDK constructor should throw a ValidationError with a descriptive message.

**Validates: Requirements 13.5**

## Error Handling

### Error Hierarchy

```typescript
class JackError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>);
}

class NetworkError extends JackError {
  constructor(message: string, public readonly originalError: Error);
}

class APIError extends JackError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown
  );
}

class ValidationError extends JackError {
  constructor(message: string, public readonly errors: string[]);
}

class TimeoutError extends JackError {
  constructor(message: string, public readonly timeoutMs: number);
}

class RetryError extends JackError {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  );
}
```

### Error Handling Strategy

1. **Validation Errors**: Thrown synchronously before any network request
2. **Network Errors**: Wrapped in `NetworkError` with original error preserved
3. **API Errors**: Parsed from response body, include status code and response data
4. **Retry Errors**: Include attempt count and final error after exhaustion
5. **Timeout Errors**: Thrown when polling or requests exceed configured timeout

All errors include context for debugging (request URL, parameters, timestamps).

## Testing Strategy

### Unit Tests

Unit tests validate individual methods and edge cases:

- **Intent Manager**: Test typed data generation, validation, parameter parsing
- **Execution Tracker**: Test polling logic, timeout handling, status transitions
- **Cost Tracker**: Test response parsing, filtering, budget calculations
- **Client**: Test retry logic, cache behavior, error handling
- **Validation**: Test all validation rules for IntentParams
- **Serialization**: Test EIP-712 encoding, timestamp formatting

**Framework**: Vitest (fast, TypeScript-native, compatible with modern tooling)

**Coverage Target**: >80% line coverage

### Property-Based Tests

Property tests validate universal correctness properties:

- **Property 1**: EIP-712 serialization consistency (same input → same output)
- **Property 2**: Intent ID format validation (all IDs match pattern)
- **Property 3**: Polling convergence (always terminates)
- **Property 4**: Retry exhaustion (correct error after max retries)
- **Property 5**: Cache TTL expiration (fresh data after expiry)
- **Property 6**: Batch result correspondence (input/output length match)
- **Property 7**: Validation before submission (invalid params never sent)
- **Property 8**: Error type discrimination (correct error class thrown)
- **Property 9**: Type safety (API responses match TypeScript types)
- **Property 10**: Config validation (invalid config rejected)

**Framework**: fast-check (mature, well-documented, TypeScript-first)

**Configuration**: Minimum 100 iterations per property test

**Tagging**: Each test tagged with `Feature: jack-sdk-core, Property N: [description]`

### Integration Tests

Integration tests use mock API responses:

- Mock server using `msw` (Mock Service Worker)
- Test complete flows: submit → poll → settle
- Test error scenarios: 404, 500, network failures
- Test retry behavior with flaky mock responses
- Test cache behavior with repeated requests

### Test Utilities for Consumers

Export test helpers for SDK consumers:

```typescript
export class MockJackSDK extends JACK_SDK {
  // Override methods to return mock data
}

export function createMockIntent(overrides?: Partial<Intent>): Intent;
export function createMockQuote(overrides?: Partial<Quote>): Quote;
```

## NPM Package Configuration

### package.json

```json
{
  "name": "@jack/sdk",
  "version": "1.0.0",
  "description": "TypeScript SDK for JACK cross-chain execution kernel",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "npm run build:esm && npm run build:cjs && npm run build:types",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:types": "tsc -p tsconfig.types.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/**/*.ts",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["jack", "cross-chain", "intent", "blockchain", "sdk"],
  "author": "JACK Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/jack.git",
    "directory": "packages/sdk"
  },
  "peerDependencies": {
    "viem": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "fast-check": "^3.0.0",
    "msw": "^2.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^9.0.0"
  }
}
```

### Build Outputs

- **ESM**: `dist/esm/` - ES modules for modern bundlers
- **CommonJS**: `dist/cjs/` - CommonJS for Node.js
- **Types**: `dist/types/` - TypeScript declarations

### .npmignore

```
src/
tests/
*.config.ts
*.config.js
tsconfig*.json
.env*
.git*
```

## GitHub Actions Release Workflow

### Workflow Trigger

The workflow triggers on git tags matching `sdk-v*.*.*`:

```yaml
name: Publish SDK to NPM

on:
  push:
    tags:
      - 'sdk-v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build SDK
        run: cd packages/sdk && pnpm build
      
      - name: Run tests
        run: cd packages/sdk && pnpm test
      
      - name: Publish to NPM
        run: cd packages/sdk && pnpm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: SDK ${{ github.ref }}
          draft: false
          prerelease: false
```

### Release Process

1. Update version in `packages/sdk/package.json`
2. Commit changes: `git commit -am "chore: bump SDK to v1.0.0"`
3. Create tag: `git tag sdk-v1.0.0`
4. Push tag: `git push origin sdk-v1.0.0`
5. GitHub Actions automatically builds, tests, and publishes

### NPM Authentication

Requires `NPM_TOKEN` secret in GitHub repository settings:
1. Generate token at npmjs.com (Automation token type)
2. Add to GitHub: Settings → Secrets → Actions → New repository secret
3. Name: `NPM_TOKEN`, Value: `npm_xxx...`

## Documentation

### README Structure

1. **Installation**: `npm install @jack/sdk` or `pnpm add @jack/sdk`
2. **Quick Start**: Basic example of creating and tracking an intent
3. **API Reference**: Brief overview with links to detailed docs
4. **Configuration**: All ClientConfig options explained
5. **Error Handling**: How to catch and handle different error types
6. **Advanced Usage**: Batch operations, caching, retries
7. **TypeScript**: How to use exported types
8. **Contributing**: Link to contribution guidelines
9. **License**: MIT

### Code Examples

**Basic Usage**:
```typescript
import { JACK_SDK } from '@jack/sdk';

const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });

const params = {
  sourceChain: 'arbitrum',
  destinationChain: 'base',
  tokenIn: '0xUSDC',
  tokenOut: '0xWETH',
  amountIn: '1000000',
  minAmountOut: '42000000000000000',
  deadline: Date.now() + 3600000
};

const typedData = sdk.intents.getTypedData(params);
const signature = await wallet.signTypedData(typedData);
const intentId = await sdk.submitIntent(params, signature);

const intent = await sdk.execution.waitForStatus(intentId, 'SETTLED');
console.log('Settlement tx:', intent.settlementTx);
```

**Agent Usage**:
```typescript
const results = await sdk.agent.batchSubmit([
  { params: intent1, signature: sig1 },
  { params: intent2, signature: sig2 }
]);

results.forEach(result => {
  if (result.success) {
    console.log('Intent submitted:', result.intentId);
  } else {
    console.error('Failed:', result.error);
  }
});
```

### API Reference

Generate API docs using TypeDoc or similar:
- All public classes, methods, interfaces documented with JSDoc comments
- Parameter descriptions, return types, error conditions
- Usage examples in doc comments

### Migration Guide

For breaking changes between major versions:
- List all breaking changes
- Provide before/after code examples
- Explain rationale for changes
- Offer migration scripts if applicable

## Implementation Notes

### Phased Approach

**Phase 1** (MVP):
- Core client with retry and basic error handling
- Intent management (create, submit, query, list)
- Execution tracking (poll, wait for status)
- Cost tracking
- Basic tests (unit + integration)
- NPM package setup

**Phase 2** (Enhanced):
- Quote management
- Agent utilities (batch, dry-run)
- Caching layer
- Property-based tests
- GitHub Actions workflow

**Phase 3** (Polish):
- Comprehensive documentation
- Test utilities for consumers
- Performance optimizations
- Advanced agent features (webhooks, subscriptions)

### Dependencies

- **viem**: For EIP-712 typed data (peer dependency, already used by dashboard)
- **vitest**: Test framework
- **fast-check**: Property-based testing
- **msw**: Mock API for integration tests

### Backward Compatibility

The current `JACK_SDK` class in `packages/sdk/index.ts` will be replaced, but the public API will remain compatible:
- `submitIntent()` → same signature
- `getExecutionStatus()` → same signature
- `listIntents()` → same signature
- `getIntentTypedData()` → renamed to `intents.getTypedData()` but kept as alias

Existing dashboard code should work with minimal changes (import paths may need updates).
