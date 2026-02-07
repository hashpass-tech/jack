// Re-export all types from types.ts
export type {
  // Core Intent Types
  IntentParams,
  Intent,
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
} from './types.js';

// Re-export enums
export { ExecutionStatus } from './types.js';

// Re-export all error classes
export {
  JackError,
  NetworkError,
  APIError,
  ValidationError,
  TimeoutError,
  RetryError
} from './errors.js';

// Re-export serialization functions
export {
  getTypedData,
  serializeIntentParams,
  parseIntentParams
} from './serialization.js';

// Re-export validation functions
export {
  validateIntentParams
} from './validation.js';

// Re-export IntentManager
export { IntentManager } from './intents.js';

// Re-export ExecutionTracker
export { ExecutionTracker } from './execution.js';

// Re-export CostTracker
export { CostTracker } from './costs.js';

// Re-export AgentUtils
export { AgentUtils } from './agent.js';

// Re-export JackClient
export { JackClient } from './client.js';

// Import manager classes
import { JackClient } from './client.js';
import { IntentManager } from './intents.js';
import { ExecutionTracker } from './execution.js';
import { CostTracker } from './costs.js';
import { AgentUtils } from './agent.js';

// Import types and enums for use in this file
import { ExecutionStatus, type ClientConfig, type IntentParams, type Intent } from './types.js';

/**
 * Main SDK class for JACK cross-chain execution kernel
 * 
 * Provides a comprehensive, type-safe interface for interacting with the JACK system.
 * Initializes all managers (intents, execution, costs, agent) and exposes them as
 * public readonly properties. Also provides convenience methods for common operations.
 * 
 * @example
 * ```typescript
 * // Initialize SDK
 * const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });
 * 
 * // Create and submit intent
 * const typedData = sdk.intents.getTypedData(params);
 * const signature = await wallet.signTypedData(typedData);
 * const intentId = await sdk.submitIntent(params, signature);
 * 
 * // Track execution
 * const intent = await sdk.waitForSettlement(intentId);
 * console.log('Settlement tx:', intent.settlementTx);
 * 
 * // Access managers directly
 * const costs = await sdk.costs.getCosts();
 * const results = await sdk.agent.batchSubmit([...]);
 * ```
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.5**
 */
export class JACK_SDK {
  /**
   * Intent management - create, submit, query intents
   */
  public readonly intents: IntentManager;

  /**
   * Execution tracking - poll status, wait for completion
   */
  public readonly execution: ExecutionTracker;

  /**
   * Cost tracking - query costs and budgets
   */
  public readonly costs: CostTracker;

  /**
   * Agent utilities - batch operations, subscriptions
   */
  public readonly agent: AgentUtils;

  /**
   * Internal HTTP client (exposed for advanced use cases)
   */
  private readonly client: JackClient;

  /**
   * Creates a new JACK_SDK instance
   * 
   * Initializes all managers with the provided configuration. The configuration
   * includes the base URL for the API and optional settings for timeout, retries,
   * caching, and custom headers.
   * 
   * @param config - Client configuration (baseUrl required, other options optional)
   * @throws ValidationError if configuration is invalid
   * 
   * @example
   * ```typescript
   * // Basic initialization
   * const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });
   * 
   * // With custom configuration
   * const sdk = new JACK_SDK({
   *   baseUrl: 'https://api.jack.example',
   *   timeout: 60000,
   *   maxRetries: 5,
   *   enableCache: true,
   *   cacheTTL: 120000,
   *   headers: { 'Authorization': 'Bearer token' }
   * });
   * ```
   */
  constructor(config: ClientConfig) {
    // Initialize core HTTP client
    this.client = new JackClient(config);

    // Initialize all managers
    this.intents = new IntentManager(this.client);
    this.execution = new ExecutionTracker(this.client);
    this.costs = new CostTracker(this.client);
    this.agent = new AgentUtils(this.client);
  }

  /**
   * Convenience method: Submit a signed intent
   * 
   * Delegates to IntentManager.submit(). This is a convenience method
   * for the most common operation - submitting a signed intent.
   * 
   * @param params - Intent parameters
   * @param signature - EIP-712 signature from wallet
   * @returns Promise resolving to the intent ID
   * @throws ValidationError if parameters are invalid
   * @throws APIError if the API returns an error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * const intentId = await sdk.submitIntent(params, signature);
   * console.log('Intent submitted:', intentId);
   * ```
   * 
   * **Validates: Requirement 1.2**
   */
  async submitIntent(params: IntentParams, signature: string): Promise<string> {
    return this.intents.submit(params, signature);
  }

  /**
   * Convenience method: Get a single intent by ID
   * 
   * Delegates to IntentManager.get(). This is a convenience method
   * for querying a single intent's current state.
   * 
   * @param intentId - The intent ID to query
   * @returns Promise resolving to the complete Intent object
   * @throws APIError if the intent is not found or other API error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * const intent = await sdk.getIntent('JK-ABC123456');
   * console.log('Status:', intent.status);
   * ```
   * 
   * **Validates: Requirement 1.3**
   */
  async getIntent(intentId: string): Promise<Intent> {
    return this.intents.get(intentId);
  }

  /**
   * Convenience method: List all intents
   * 
   * Delegates to IntentManager.list(). This is a convenience method
   * for retrieving all intents.
   * 
   * @returns Promise resolving to an array of Intent objects
   * @throws APIError if the API returns an error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * const intents = await sdk.listIntents();
   * console.log(`Found ${intents.length} intents`);
   * ```
   * 
   * **Validates: Requirement 1.4**
   */
  async listIntents(): Promise<Intent[]> {
    return this.intents.list();
  }

  /**
   * Convenience method: Wait for intent to settle
   * 
   * Polls the intent status until it reaches SETTLED status or the timeout
   * is exceeded. This is a convenience method that wraps ExecutionTracker.waitForStatus()
   * with sensible defaults for waiting for settlement.
   * 
   * @param intentId - The intent ID to wait for
   * @param timeout - Maximum time to wait in milliseconds (default: 120000 = 2 minutes)
   * @returns Promise resolving to the Intent when settled
   * @throws TimeoutError if timeout is exceeded before settlement
   * @throws APIError if the API returns an error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * // Wait with default timeout (2 minutes)
   * const intent = await sdk.waitForSettlement('JK-ABC123456');
   * console.log('Settlement tx:', intent.settlementTx);
   * 
   * // Wait with custom timeout (5 minutes)
   * const intent = await sdk.waitForSettlement('JK-ABC123456', 300000);
   * ```
   * 
   * **Validates: Requirement 2.5**
   */
  async waitForSettlement(intentId: string, timeout: number = 120000): Promise<Intent> {
    return this.execution.waitForStatus(
      intentId,
      ExecutionStatus.SETTLED,
      { timeout, interval: 2000 }
    );
  }

  /**
   * Legacy method: Get execution status
   * 
   * @deprecated Use sdk.getIntent() or sdk.execution.getStatus() instead
   * 
   * This method is kept for backward compatibility with existing dashboard code.
   * It delegates to the execution tracker's getStatus method.
   * 
   * @param intentId - The intent ID to query
   * @returns Promise resolving to the Intent object
   */
  async getExecutionStatus(intentId: string): Promise<Intent> {
    return this.execution.getStatus(intentId);
  }

  /**
   * Legacy method: Get intent typed data
   * 
   * @deprecated Use sdk.intents.getTypedData() instead
   * 
   * This method is kept for backward compatibility with existing dashboard code.
   * It delegates to the intent manager's getTypedData method.
   * 
   * @param params - Intent parameters
   * @returns EIP-712 TypedData object
   */
  getIntentTypedData(params: IntentParams) {
    return this.intents.getTypedData(params);
  }
}
