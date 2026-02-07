/**
 * Input validation helpers for the JACK SDK
 * 
 * This module provides validation functions for intent parameters and other inputs.
 * Requirements: 5.4, 8.5
 */

import type { IntentParams, ValidationResult } from './types.js';

/**
 * Validates that a string is a valid Ethereum address format
 * @param address - The address string to validate
 * @returns true if the address is valid, false otherwise
 */
function isValidAddress(address: string): boolean {
  // Check if it's a valid hex string starting with 0x and has 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates that a string represents a positive number
 * @param value - The string value to validate
 * @returns true if the value is a positive number, false otherwise
 */
function isPositiveAmount(value: string): boolean {
  try {
    const num = BigInt(value);
    return num > 0n;
  } catch {
    return false;
  }
}

/**
 * Validates intent parameters before submission
 * 
 * This function checks:
 * - All required fields are present and non-empty
 * - Amounts (amountIn, minAmountOut) are positive numbers
 * - Deadline is in the future
 * - Token addresses are valid Ethereum address format
 * 
 * @param params - The intent parameters to validate
 * @returns ValidationResult with valid flag and array of error messages
 * 
 * @example
 * ```typescript
 * const result = validateIntentParams({
 *   sourceChain: 'arbitrum',
 *   destinationChain: 'base',
 *   tokenIn: '0x...',
 *   tokenOut: '0x...',
 *   amountIn: '1000000',
 *   minAmountOut: '950000',
 *   deadline: Date.now() + 3600000
 * });
 * 
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 * 
 * **Validates: Requirements 5.4, 8.5**
 */
export function validateIntentParams(params: IntentParams): ValidationResult {
  const errors: string[] = [];

  // Validate required fields are present and non-empty
  if (!params.sourceChain || params.sourceChain.trim() === '') {
    errors.push('sourceChain is required and must not be empty');
  }

  if (!params.destinationChain || params.destinationChain.trim() === '') {
    errors.push('destinationChain is required and must not be empty');
  }

  if (!params.tokenIn || params.tokenIn.trim() === '') {
    errors.push('tokenIn is required and must not be empty');
  }

  if (!params.tokenOut || params.tokenOut.trim() === '') {
    errors.push('tokenOut is required and must not be empty');
  }

  if (!params.amountIn || params.amountIn.trim() === '') {
    errors.push('amountIn is required and must not be empty');
  }

  if (!params.minAmountOut || params.minAmountOut.trim() === '') {
    errors.push('minAmountOut is required and must not be empty');
  }

  if (params.deadline === undefined || params.deadline === null) {
    errors.push('deadline is required');
  }

  // Validate amounts are positive
  if (params.amountIn && !isPositiveAmount(params.amountIn)) {
    errors.push('amountIn must be a positive number');
  }

  if (params.minAmountOut && !isPositiveAmount(params.minAmountOut)) {
    errors.push('minAmountOut must be a positive number');
  }

  // Validate deadline is in the future
  if (typeof params.deadline === 'number') {
    const now = Date.now();
    if (params.deadline <= now) {
      errors.push('deadline must be in the future');
    }
  }

  // Validate addresses are valid format
  if (params.tokenIn && !isValidAddress(params.tokenIn)) {
    errors.push('tokenIn must be a valid Ethereum address (0x followed by 40 hex characters)');
  }

  if (params.tokenOut && !isValidAddress(params.tokenOut)) {
    errors.push('tokenOut must be a valid Ethereum address (0x followed by 40 hex characters)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
