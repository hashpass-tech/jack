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
} from './types';

// Re-export enums
export { ExecutionStatus } from './types';

// Re-export all error classes
export {
  JackError,
  NetworkError,
  APIError,
  ValidationError,
  TimeoutError,
  RetryError
} from './errors';

// Import types for use in this file
import type { IntentParams, Intent } from './types';

export class JACK_SDK {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Constructs the EIP-712 typed data for an intent
   */
  getIntentTypedData(params: IntentParams) {
    const domain = {
      name: 'JACK',
      version: '1',
      chainId: 84532, // Base Sepolia
      verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`
    };

    const types = {
      Intent: [
        { name: 'sourceChain', type: 'string' },
        { name: 'destinationChain', type: 'string' },
        { name: 'tokenIn', type: 'string' },
        { name: 'tokenOut', type: 'string' },
        { name: 'amountIn', type: 'string' },
        { name: 'minAmountOut', type: 'string' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    return { domain, types, message: params, primaryType: 'Intent' as const };
  }

  /**
   * Submits a signed intent to the Kernel
   */
  async submitIntent(params: IntentParams, signature: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/intents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, signature })
    });

    if (!response.ok) {
      throw new Error('Failed to submit intent');
    }

    const data = await response.json() as { intentId: string };
    return data.intentId;
  }

  /**
   * Polls the status of an intent execution
   */
  async getExecutionStatus(intentId: string): Promise<Intent> {
    const response = await fetch(`${this.baseUrl}/intents/${intentId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch execution status');
    }

    return await response.json() as Intent;
  }

  /**
   * Fetches the complete list of intents for the dashboard
   */
  async listIntents(): Promise<Intent[]> {
    const response = await fetch(`${this.baseUrl}/intents`);
    if (!response.ok) return [];
    return await response.json() as Intent[];
  }
}
