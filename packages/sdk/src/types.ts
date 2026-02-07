/**
 * Core TypeScript types for the JACK SDK
 * 
 * This module exports all interfaces, types, and enums used in the public API.
 * Requirements: 1.5, 3.4, 4.3, 5.1
 */

// ============================================================================
// Core Intent Types
// ============================================================================

/**
 * Parameters required to create an intent
 * Requirement 1.5
 */
export interface IntentParams {
  /** Source blockchain identifier (e.g., 'arbitrum', 'ethereum') */
  sourceChain: string;
  /** Destination blockchain identifier (e.g., 'base', 'optimism') */
  destinationChain: string;
  /** Address of the input token on the source chain */
  tokenIn: string;
  /** Address of the output token on the destination chain */
  tokenOut: string;
  /** Amount of input token (in smallest unit, e.g., wei) */
  amountIn: string;
  /** Minimum acceptable amount of output token */
  minAmountOut: string;
  /** Unix timestamp (milliseconds) after which the intent expires */
  deadline: number;
  /** Allow additional properties for extensibility */
  [key: string]: string | number;
}

/**
 * Execution status of an intent
 * Requirement 1.5
 */
export enum ExecutionStatus {
  /** Intent created but not yet quoted */
  CREATED = 'CREATED',
  /** Solver quotes received */
  QUOTED = 'QUOTED',
  /** Intent is being executed */
  EXECUTING = 'EXECUTING',
  /** Settlement transaction is being processed */
  SETTLING = 'SETTLING',
  /** Intent successfully settled on-chain */
  SETTLED = 'SETTLED',
  /** Intent execution was aborted */
  ABORTED = 'ABORTED',
  /** Intent expired before completion */
  EXPIRED = 'EXPIRED'
}

/**
 * A discrete step in the intent execution lifecycle
 * Requirement 1.5
 */
export interface ExecutionStep {
  /** Name of the execution step (e.g., 'signing', 'quoting', 'routing') */
  step: string;
  /** Current status of this step */
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  /** Unix timestamp (milliseconds) when this step was updated */
  timestamp: number;
  /** Optional additional details about the step */
  details?: string;
}

/**
 * Complete intent object with execution state
 * Requirement 1.5
 */
export interface Intent {
  /** Unique intent identifier (format: JK-[A-Z0-9]{9}) */
  id: string;
  /** Intent parameters */
  params: IntentParams;
  /** EIP-712 signature (if signed) */
  signature?: string;
  /** Current execution status */
  status: ExecutionStatus;
  /** Unix timestamp (milliseconds) when intent was created */
  createdAt: number;
  /** Array of execution steps with their statuses */
  executionSteps: ExecutionStep[];
  /** Settlement transaction hash (if settled) */
  settlementTx?: string;
}

// ============================================================================
// Quote Types
// ============================================================================

/**
 * A step in the execution route
 * Requirement 3.4
 */
export interface RouteStep {
  /** Blockchain where this step executes */
  chain: string;
  /** Protocol used for this step (e.g., 'uniswap', 'stargate') */
  protocol: string;
  /** Action performed (e.g., 'swap', 'bridge') */
  action: string;
}

/**
 * A solver's quote for executing an intent
 * Requirement 3.4
 */
export interface Quote {
  /** Unique identifier of the solver */
  solverId: string;
  /** Human-readable name of the solver */
  solverName: string;
  /** Total fee charged by the solver (in output token units) */
  totalFee: string;
  /** Estimated execution time in seconds */
  estimatedTime: number;
  /** Detailed execution route */
  route: RouteStep[];
}

// ============================================================================
// Cost Tracking Types
// ============================================================================

/**
 * A single cost entry
 * Requirement 4.3
 */
export interface CostEntry {
  /** Cost amount */
  cost: number;
}

/**
 * Cost tracking for a specific issue
 * Requirement 4.3
 */
export interface IssueCost {
  /** Issue identifier */
  issueId: string;
  /** Total cost accumulated for this issue */
  totalCost: number;
  /** Budget allocated for this issue */
  budget: number;
  /** Whether the issue has exceeded its budget */
  overBudget: boolean;
}

/**
 * Response from the costs API endpoint
 * Requirement 4.3
 */
export interface CostsResponse {
  /** Array of cost data per issue */
  issueCosts: IssueCost[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for the JACK SDK client
 * Requirement 5.1
 */
export interface ClientConfig {
  /** Base URL for the JACK API (e.g., 'https://api.jack.example') */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  /** Initial delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Backoff multiplier for exponential retry delay (default: 2) */
  retryBackoff?: number;
  /** Enable response caching for GET requests (default: false) */
  enableCache?: boolean;
  /** Cache time-to-live in milliseconds (default: 60000) */
  cacheTTL?: number;
  /** Custom HTTP headers to include in all requests */
  headers?: Record<string, string>;
}

/**
 * Options for individual HTTP requests
 * Requirement 5.1
 */
export interface RequestOptions {
  /** Override the default timeout for this request */
  timeout?: number;
  /** Disable retries for this request */
  noRetry?: boolean;
  /** Disable caching for this request */
  noCache?: boolean;
  /** Skip cache for this request (alias for noCache) */
  skipCache?: boolean;
  /** Query parameters for the request */
  params?: Record<string, unknown>;
  /** Additional headers for this request */
  headers?: Record<string, string>;
}

/**
 * Options for polling operations
 * Requirement 5.1
 */
export interface PollOptions {
  /** Polling interval in milliseconds (default: 2000) */
  interval?: number;
  /** Maximum time to poll in milliseconds (default: 60000) */
  timeout?: number;
  /** Stop polling when any of these statuses are reached */
  stopStatuses?: ExecutionStatus[];
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of a single intent submission in a batch operation
 * Requirement 5.1
 */
export interface BatchSubmitResult {
  /** Intent ID if submission succeeded */
  intentId: string;
  /** Whether the submission was successful */
  success: boolean;
  /** Error object if submission failed */
  error?: Error;
}

/**
 * Result of a dry-run validation
 * Requirement 5.1
 */
export interface DryRunResult {
  /** Whether the intent parameters are valid */
  valid: boolean;
  /** Estimated cost if validation succeeded */
  estimatedCost?: string;
  /** Array of validation error messages */
  errors?: string[];
}

/**
 * Result of intent parameter validation
 * Requirement 5.1
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of validation error messages */
  errors: string[];
}

// ============================================================================
// EIP-712 Types
// ============================================================================

/**
 * EIP-712 domain separator
 * Requirement 5.1
 */
export interface EIP712Domain {
  /** Protocol name */
  name: string;
  /** Protocol version */
  version: string;
  /** Chain ID where the contract is deployed */
  chainId: number;
  /** Address of the verifying contract */
  verifyingContract: `0x${string}`;
}

/**
 * Complete EIP-712 typed data structure
 * Requirement 5.1
 */
export interface TypedData {
  /** Domain separator */
  domain: EIP712Domain;
  /** Type definitions */
  types: Record<string, Array<{ name: string; type: string }>>;
  /** Message data to be signed */
  message: Record<string, unknown>;
  /** Primary type being signed */
  primaryType: string;
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * Subscription handle for event-based updates
 * Requirement 5.1
 */
export interface Subscription {
  /** Unsubscribe from updates and stop polling */
  unsubscribe(): void;
}

/**
 * Watcher for continuous intent status updates
 * Requirement 5.1
 */
export interface ExecutionWatcher extends Subscription {
  /** Intent ID being watched */
  intentId: string;
  /** Register callback for status updates */
  onUpdate(callback: (intent: Intent) => void): void;
  /** Register callback for errors */
  onError(callback: (error: Error) => void): void;
  /** Register callback for completion (SETTLED, ABORTED, or EXPIRED) */
  onComplete(callback: (intent: Intent) => void): void;
  /** Stop watching and clean up resources */
  stop(): void;
}

// ============================================================================
// Policy Types
// ============================================================================

/**
 * Policy rules for intent validation
 * Requirement 5.1
 */
export interface Policy {
  /** Maximum allowed amount in (in smallest unit) */
  maxAmountIn?: string;
  /** Minimum allowed amount out (in smallest unit) */
  minAmountOut?: string;
  /** Allowed source chains */
  allowedSourceChains?: string[];
  /** Allowed destination chains */
  allowedDestinationChains?: string[];
  /** Allowed input tokens */
  allowedTokensIn?: string[];
  /** Allowed output tokens */
  allowedTokensOut?: string[];
  /** Maximum deadline offset in milliseconds */
  maxDeadlineOffset?: number;
}
