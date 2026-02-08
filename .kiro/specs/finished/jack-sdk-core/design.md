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
  
  getTypedData(params: IntentParams): TypedData;
  async submit(params: IntentParams, signature: string): Promise<string>;
  async get(intentId: string): Promise<Intent>;
  async list(): Promise<Intent[]>;
  validate(params: IntentParams): ValidationResult;
}
```

### Execution Tracking

```typescript
interface PollOptions {
  interval?: number;
  timeout?: number;
  stopStatuses?: ExecutionStatus[];
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
  async waitForStatus(intentId: string, targetStatus: ExecutionStatus | ExecutionStatus[], options?: PollOptions): Promise<Intent>;
  watch(intentId: string, options?: PollOptions): ExecutionWatcher;
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
  async getQuotes(params: IntentParams): Promise<Quote[]>;
  sortByCost(quotes: Quote[]): Quote[];
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
  async getCosts(): Promise<CostsResponse>;
  async getIssueCost(issueId: string): Promise<IssueCost | null>;
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
  async batchSubmit(intents: Array<{ params: IntentParams; signature: string }>): Promise<BatchSubmitResult[]>;
  async dryRun(params: IntentParams): Promise<DryRunResult>;
  validatePolicy(params: IntentParams, policy: Policy): ValidationResult;
  subscribeToUpdates(intentIds: string[], callback: (intentId: string, intent: Intent) => void, options?: PollOptions): Subscription;
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
  
  async submitIntent(params: IntentParams, signature: string): Promise<string>;
  async getIntent(intentId: string): Promise<Intent>;
  async listIntents(): Promise<Intent[]>;
  async waitForSettlement(intentId: string, timeout?: number): Promise<Intent>;
}
```

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
  constructor(message: string, public readonly statusCode: number, public readonly response?: unknown);
}

class ValidationError extends JackError {
  constructor(message: string, public readonly errors: string[]);
}

class TimeoutError extends JackError {
  constructor(message: string, public readonly timeoutMs: number);
}

class RetryError extends JackError {
  constructor(message: string, public readonly attempts: number, public readonly lastError: Error);
}
```

## Testing Strategy

### Unit Tests
- Intent Manager, Execution Tracker, Cost Tracker, Client, Validation, Serialization
- Framework: Vitest
- Coverage Target: >80%

### Property-Based Tests
- Properties 1-10 covering serialization, submission, polling, retry, cache, batch, validation, errors, types, config
- Framework: fast-check
- Minimum 100 iterations per property

### Integration Tests
- Mock server using msw
- Complete flows, error scenarios, retry behavior, cache behavior

## Correctness Properties

1. EIP-712 Serialization Consistency
2. Intent Submission Idempotency Check
3. Status Polling Convergence
4. Retry Exhaustion
5. Cache Invalidation
6. Batch Submission Atomicity
7. Validation Before Submission
8. Error Type Discrimination
9. Type Safety Round-Trip
10. Configuration Validation

## NPM Package Configuration

- Dual output: ESM + CommonJS + Types
- Automated release via GitHub Actions on `sdk-v*.*.*` tags
- Semantic versioning
