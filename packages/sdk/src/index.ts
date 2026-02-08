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

// Re-export Yellow Network provider and configuration
export { YellowProvider } from './yellow/yellow-provider.js';
export type { YellowConfig } from './yellow/yellow-provider.js';
export { NitroliteClient } from './yellow/yellow-provider.js';
export type { NitroliteClientConfig } from './yellow/yellow-provider.js';
export { mapErrorToReasonCode, extractRevertReason } from './yellow/yellow-provider.js';

// Re-export all Yellow types
export type {
  YellowProviderStatus,
  YellowReasonCode,
  YellowFallback,
  ChannelState,
  ChannelAllocation,
  YellowQuote,
  ClearingResult,
  SettlementProof,
  YellowConnectionResult,
  YellowChannelResult,
  YellowTransferResult,
  YellowExecutionResult,
  YellowChannelsResult,
  YellowEvent,
  YellowEventHandler,
  CreateChannelParams,
  ResizeChannelParams,
  CloseChannelParams,
  TransferParams
} from './yellow/types.js';

// Re-export Yellow event mapper functions
export { mapYellowEvent, mapChannelStatus, mapStateIntent, inferMapping } from './yellow/event-mapper.js';

// Import manager classes
import { JackClient } from './client.js';
import { IntentManager } from './intents.js';
import { ExecutionTracker } from './execution.js';
import { CostTracker } from './costs.js';
import { AgentUtils } from './agent.js';

// Import Yellow provider and config for SDK integration
import { YellowProvider } from './yellow/yellow-provider.js';
import type { YellowConfig } from './yellow/yellow-provider.js';

// Import LI.FI provider and types
import { LifiProvider } from './lifi/lifi-provider.js';
import type { LifiConfig } from './lifi/lifi-provider.js';
import type { LifiQuotePayload, LifiRoutePayload } from './lifi/types.js';

// Import types and enums for use in this file
import { ExecutionStatus, type ClientConfig, type IntentParams, type Intent } from './types.js';

// Import WalletClient type from viem for YellowSDKConfig
import type { WalletClient } from 'viem';

/**
 * Extended Yellow configuration for JACK_SDK integration.
 *
 * Extends YellowConfig with a walletClient field, which is required by
 * YellowProvider for signing transactions and EIP-712 messages.
 *
 * **Validates: Requirements 1.6, 1.7**
 */
export interface YellowSDKConfig extends YellowConfig {
  /** viem WalletClient for signing transactions and EIP-712 messages */
  walletClient: WalletClient;
}

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
   * Yellow Network provider - state channel management, clearing, and settlement.
   * Only available when YellowSDKConfig is provided during initialization.
   *
   * **Validates: Requirements 1.6, 1.7**
   */
  public readonly yellow?: YellowProvider;

  /**
   * LI.FI provider - cross-chain quote and route discovery (optional)
   */
  public readonly lifi?: LifiProvider;

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
   * @param config - Client configuration (baseUrl required, other options optional). Optionally includes
   *   a `yellow` field with YellowSDKConfig to enable Yellow Network integration, and/or a `lifi` field
   *   with LifiConfig to enable LI.FI integration.
   * @throws ValidationError if configuration is invalid
   * @throws Error if YellowProvider initialization fails when yellow config is provided
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
   *
   * // With Yellow Network integration
   * const sdk = new JACK_SDK({
   *   baseUrl: 'https://api.jack.example',
   *   yellow: {
   *     custodyAddress: '0x...',
   *     adjudicatorAddress: '0x...',
   *     chainId: 1,
   *     walletClient: myWalletClient,
   *   }
   * });
   * console.log(sdk.yellow); // YellowProvider instance
   *
   * // With LI.FI integration
   * const sdk = new JACK_SDK({
   *   baseUrl: 'https://api.jack.example',
   *   lifi: { integrator: 'jackkernel' }
   * });
   * console.log(sdk.lifi); // LifiProvider instance
   * ```
   */
  constructor(config: ClientConfig & { yellow?: YellowSDKConfig; lifi?: LifiConfig }) {
    // Initialize core HTTP client
    this.client = new JackClient(config);

    // Initialize all managers
    this.intents = new IntentManager(this.client);
    this.execution = new ExecutionTracker(this.client);
    this.costs = new CostTracker(this.client);
    this.agent = new AgentUtils(this.client);

    // Conditionally initialize YellowProvider (Requirements 1.6, 1.7)
    if (config.yellow !== undefined) {
      this.yellow = new YellowProvider(config.yellow, config.yellow.walletClient);
    }

    // Conditionally initialize LI.FI provider
    if (config.lifi !== undefined) {
      this.lifi = new LifiProvider(config.lifi);
    }
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

  /**
   * Convenience method: Get a LI.FI quote for intent params
   * 
   * Delegates to LifiProvider.fetchQuote(). Throws if the SDK was not
   * initialized with a LI.FI configuration.
   * 
   * @param params - Intent parameters
   * @returns Promise resolving to a normalized LifiQuotePayload
   * @throws Error if LI.FI is not configured
   * 
   * @example
   * ```typescript
   * const sdk = new JACK_SDK({ baseUrl: '...', lifi: {} });
   * const quote = await sdk.getLifiQuote(params);
   * console.log('Quote:', quote.quote.amountOut);
   * ```
   * 
   * **Validates: Requirements 1.6, 1.7**
   */
  async getLifiQuote(params: IntentParams): Promise<LifiQuotePayload> {
    if (!this.lifi) throw new Error('LI.FI not configured');
    return this.lifi.fetchQuote(params);
  }

  /**
   * Convenience method: Get a LI.FI route for intent params
   * 
   * Delegates to LifiProvider.fetchRoute(). Throws if the SDK was not
   * initialized with a LI.FI configuration.
   * 
   * @param params - Intent parameters
   * @returns Promise resolving to a normalized LifiRoutePayload
   * @throws Error if LI.FI is not configured
   * 
   * @example
   * ```typescript
   * const sdk = new JACK_SDK({ baseUrl: '...', lifi: {} });
   * const route = await sdk.getLifiRoute(params);
   * console.log('Route:', route.route?.steps);
   * ```
   * 
   * **Validates: Requirements 1.6, 1.7**
   */
  async getLifiRoute(params: IntentParams): Promise<LifiRoutePayload> {
    if (!this.lifi) throw new Error('LI.FI not configured');
    return this.lifi.fetchRoute(params);
  }
}

// LI.FI integration
export * from './lifi/index.js';
