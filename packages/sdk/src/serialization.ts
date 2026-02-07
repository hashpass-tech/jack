/**
 * EIP-712 serialization for JACK intents
 * 
 * This module provides functions to construct EIP-712 typed data for intent signing.
 * The typed data follows the EIP-712 standard for structured data hashing and signing.
 * 
 * Requirements: 1.1, 14.1
 */

import type { IntentParams, TypedData, EIP712Domain } from './types.js';

/**
 * Get EIP-712 typed data for an intent
 * 
 * Constructs a properly formatted EIP-712 TypedData object that can be used
 * with wallet signing methods (e.g., eth_signTypedData_v4). The typed data
 * includes the domain separator, type definitions, and the intent message.
 * 
 * @param params - Intent parameters to serialize
 * @param chainId - Chain ID for the domain separator (default: 1 for Ethereum mainnet)
 * @param verifyingContract - Address of the verifying contract
 * @returns EIP-712 TypedData object ready for signing
 * 
 * @example
 * ```typescript
 * const params = {
 *   sourceChain: 'arbitrum',
 *   destinationChain: 'base',
 *   tokenIn: '0xUSDC...',
 *   tokenOut: '0xWETH...',
 *   amountIn: '1000000',
 *   minAmountOut: '42000000000000000',
 *   deadline: Date.now() + 3600000
 * };
 * 
 * const typedData = getTypedData(
 *   params,
 *   1,
 *   '0x1234567890123456789012345678901234567890'
 * );
 * 
 * // Sign with wallet
 * const signature = await wallet.signTypedData(typedData);
 * ```
 * 
 * Validates: Requirements 1.1, 14.1
 */
export function getTypedData(
  params: IntentParams,
  chainId: number = 1,
  verifyingContract: `0x${string}` = '0x0000000000000000000000000000000000000000'
): TypedData {
  // Define the EIP-712 domain
  const domain: EIP712Domain = {
    name: 'JACK',
    version: '1',
    chainId,
    verifyingContract,
  };

  // Define the Intent type structure
  // This must match the on-chain struct definition
  const types = {
    Intent: [
      { name: 'sourceChain', type: 'string' },
      { name: 'destinationChain', type: 'string' },
      { name: 'tokenIn', type: 'string' },
      { name: 'tokenOut', type: 'string' },
      { name: 'amountIn', type: 'string' },
      { name: 'minAmountOut', type: 'string' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  // Construct the message from intent parameters
  // Only include the fields defined in the Intent type
  const message = {
    sourceChain: params.sourceChain,
    destinationChain: params.destinationChain,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    minAmountOut: params.minAmountOut,
    deadline: params.deadline,
  };

  // Return the complete TypedData structure
  return {
    domain,
    types,
    message,
    primaryType: 'Intent',
  };
}

/**
 * Serialize intent parameters to a consistent string representation
 * 
 * This function is useful for generating cache keys, logging, or debugging.
 * It produces a deterministic string representation of the intent parameters.
 * 
 * @param params - Intent parameters to serialize
 * @returns JSON string representation of the parameters
 * 
 * @example
 * ```typescript
 * const params = { sourceChain: 'arbitrum', ... };
 * const serialized = serializeIntentParams(params);
 * console.log(serialized); // {"sourceChain":"arbitrum",...}
 * ```
 */
export function serializeIntentParams(params: IntentParams): string {
  // Create a clean object with only the core intent fields
  const cleanParams = {
    sourceChain: params.sourceChain,
    destinationChain: params.destinationChain,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    minAmountOut: params.minAmountOut,
    deadline: params.deadline,
  };

  // Return deterministic JSON string (sorted keys)
  return JSON.stringify(cleanParams, Object.keys(cleanParams).sort());
}

/**
 * Parse a serialized intent parameters string back to IntentParams
 * 
 * This is the inverse of serializeIntentParams(). It parses a JSON string
 * back into an IntentParams object.
 * 
 * @param serialized - JSON string representation of intent parameters
 * @returns Parsed IntentParams object
 * @throws Error if the string cannot be parsed or is missing required fields
 * 
 * @example
 * ```typescript
 * const serialized = '{"sourceChain":"arbitrum",...}';
 * const params = parseIntentParams(serialized);
 * console.log(params.sourceChain); // 'arbitrum'
 * ```
 */
export function parseIntentParams(serialized: string): IntentParams {
  try {
    const parsed = JSON.parse(serialized);
    
    // Validate required fields are present
    const requiredFields = [
      'sourceChain',
      'destinationChain',
      'tokenIn',
      'tokenOut',
      'amountIn',
      'minAmountOut',
      'deadline',
    ];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return parsed as IntentParams;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse intent parameters: ${error.message}`);
    }
    throw new Error('Failed to parse intent parameters: Unknown error');
  }
}
