/**
 * Intent management for the JACK SDK
 * 
 * This module provides the IntentManager class for creating, submitting,
 * and querying intents through the JACK API.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import type { IntentParams, Intent, TypedData, ValidationResult } from './types.js';
import { getTypedData } from './serialization.js';
import { validateIntentParams } from './validation.js';
import { ValidationError } from './errors.js';
import type { JackClient } from './client.js';

/**
 * Manager for intent operations
 * 
 * Provides methods to create EIP-712 typed data, validate parameters,
 * submit signed intents, and query intent status.
 * 
 * @example
 * ```typescript
 * const client = new JackClient({ baseUrl: 'https://api.jack.example' });
 * const manager = new IntentManager(client);
 * 
 * // Create typed data for signing
 * const typedData = manager.getTypedData(params);
 * const signature = await wallet.signTypedData(typedData);
 * 
 * // Submit the signed intent
 * const intentId = await manager.submit(params, signature);
 * 
 * // Query the intent
 * const intent = await manager.get(intentId);
 * ```
 */
export class IntentManager {
  private readonly client: JackClient;

  /**
   * Creates a new IntentManager
   * 
   * @param client - The JackClient instance to use for API requests
   */
  constructor(client: JackClient) {
    this.client = client;
  }

  /**
   * Get EIP-712 typed data for intent signing
   * 
   * Constructs properly formatted EIP-712 TypedData that can be signed
   * by a wallet. This method delegates to the serialization module.
   * 
   * @param params - Intent parameters to serialize
   * @param chainId - Chain ID for the domain separator (default: 1)
   * @param verifyingContract - Address of the verifying contract
   * @returns EIP-712 TypedData object ready for signing
   * 
   * @example
   * ```typescript
   * const typedData = manager.getTypedData({
   *   sourceChain: 'arbitrum',
   *   destinationChain: 'base',
   *   tokenIn: '0xUSDC...',
   *   tokenOut: '0xWETH...',
   *   amountIn: '1000000',
   *   minAmountOut: '42000000000000000',
   *   deadline: Date.now() + 3600000
   * });
   * 
   * const signature = await wallet.signTypedData(typedData);
   * ```
   * 
   * **Validates: Requirement 1.1**
   */
  getTypedData(
    params: IntentParams,
    chainId: number = 1,
    verifyingContract: `0x${string}` = '0x0000000000000000000000000000000000000000'
  ): TypedData {
    return getTypedData(params, chainId, verifyingContract);
  }

  /**
   * Validate intent parameters
   * 
   * Checks that all required fields are present, amounts are positive,
   * deadline is in the future, and addresses are valid format.
   * This method delegates to the validation module.
   * 
   * @param params - Intent parameters to validate
   * @returns ValidationResult with valid flag and error messages
   * 
   * @example
   * ```typescript
   * const result = manager.validate(params);
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   * 
   * **Validates: Requirement 5.4**
   */
  validate(params: IntentParams): ValidationResult {
    return validateIntentParams(params);
  }

  /**
   * Submit a signed intent to the JACK API
   * 
   * Validates the intent parameters before submission. If validation fails,
   * throws a ValidationError without making any network request. On success,
   * returns the intent ID.
   * 
   * @param params - Intent parameters
   * @param signature - EIP-712 signature from the user's wallet
   * @returns Promise resolving to the intent ID (format: JK-[A-Z0-9]{9})
   * @throws ValidationError if parameters are invalid
   * @throws APIError if the API returns an error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * const intentId = await manager.submit(params, signature);
   * console.log('Intent submitted:', intentId); // "JK-ABC123456"
   * ```
   * 
   * **Validates: Requirement 1.2**
   */
  async submit(params: IntentParams, signature: string): Promise<string> {
    // Validate parameters before making network request
    const validation = this.validate(params);
    if (!validation.valid) {
      throw new ValidationError(
        'Invalid intent parameters',
        validation.errors
      );
    }

    // Submit to API
    const response = await this.client.post<{ intentId: string }>(
      '/api/intents',
      {
        params,
        signature
      }
    );

    return response.intentId;
  }

  /**
   * Get a single intent by ID
   * 
   * Queries the JACK API for the complete intent object including
   * current status, execution steps, and settlement transaction (if settled).
   * 
   * @param intentId - The intent ID to query (format: JK-[A-Z0-9]{9})
   * @returns Promise resolving to the complete Intent object
   * @throws APIError if the intent is not found (404) or other API error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * const intent = await manager.get('JK-ABC123456');
   * console.log('Status:', intent.status);
   * console.log('Settlement tx:', intent.settlementTx);
   * ```
   * 
   * **Validates: Requirement 1.3**
   */
  async get(intentId: string): Promise<Intent> {
    return this.client.get<Intent>(`/api/intents/${intentId}`);
  }

  /**
   * List all intents
   * 
   * Queries the JACK API for all intents. The API may implement pagination
   * or filtering in the future, but currently returns all intents.
   * 
   * @returns Promise resolving to an array of Intent objects
   * @throws APIError if the API returns an error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * const intents = await manager.list();
   * console.log(`Found ${intents.length} intents`);
   * intents.forEach(intent => {
   *   console.log(`${intent.id}: ${intent.status}`);
   * });
   * ```
   * 
   * **Validates: Requirement 1.4**
   */
  async list(): Promise<Intent[]> {
    return this.client.get<Intent[]>('/api/intents');
  }
}
