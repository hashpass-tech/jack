/**
 * Yellow Network Integration - BigInt Serialization Utilities
 *
 * Provides helpers to ensure all BigInt values from NitroliteClient responses
 * are converted to string representations in public-facing types, making
 * ChannelState and YellowQuote objects fully JSON-serializable via JSON.stringify.
 *
 * Requirements: 11.1, 11.2, 11.5
 */

import type { ChannelState, ChannelAllocation, YellowQuote } from './types.js';

// ============================================================================
// Core BigInt-to-string conversion
// ============================================================================

/**
 * Recursively converts any BigInt values in an object (or nested objects/arrays)
 * to their string representation. All other value types are left unchanged.
 *
 * This is the foundational utility used by the type-specific helpers below.
 * It handles the case where NitroliteClient responses may contain raw BigInt
 * values that would cause JSON.stringify to throw.
 *
 * @param value - Any value that may contain BigInt values at any nesting level
 * @returns A new value with all BigInt instances replaced by their string form
 *
 * Requirement 11.5: Convert BigInt values to string representation for JSON compatibility
 */
export function serializeBigIntToString<T>(value: T): T {
  if (typeof value === 'bigint') {
    return value.toString() as unknown as T;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeBigIntToString(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializeBigIntToString(val);
    }
    return result as T;
  }

  // Primitive types (string, number, boolean) pass through unchanged
  return value;
}

// ============================================================================
// Type-specific serialization helpers
// ============================================================================

/**
 * Ensures a ChannelState object is fully JSON-serializable.
 *
 * Converts any BigInt values that may be present in the ChannelState
 * (particularly in allocation amounts, challengePeriod, challengeExpiration,
 * stateVersion, chainId, createdAt, updatedAt) to their appropriate
 * JSON-compatible types (string for amounts, number for numeric fields).
 *
 * @param state - A ChannelState that may contain BigInt values from NitroliteClient
 * @returns A new ChannelState with all values JSON-serializable
 *
 * Requirements: 11.1, 11.5
 */
export function toSerializableChannelState(state: ChannelState): ChannelState {
  return {
    channelId: String(state.channelId),
    status: state.status,
    chainId: Number(state.chainId),
    token: String(state.token),
    allocations: state.allocations.map(toSerializableAllocation),
    stateVersion: Number(state.stateVersion),
    stateIntent: String(state.stateIntent),
    stateHash: state.stateHash !== undefined ? String(state.stateHash) : undefined,
    adjudicator: String(state.adjudicator),
    challengePeriod: Number(state.challengePeriod),
    challengeExpiration:
      state.challengeExpiration !== undefined ? Number(state.challengeExpiration) : undefined,
    createdAt: Number(state.createdAt),
    updatedAt: Number(state.updatedAt),
  };
}

/**
 * Ensures a ChannelAllocation object is fully JSON-serializable.
 *
 * The `amount` field is the most likely to contain a BigInt from NitroliteClient
 * responses. This helper converts it to a string representation.
 *
 * @param allocation - A ChannelAllocation that may contain BigInt amount
 * @returns A new ChannelAllocation with amount as string
 *
 * Requirement 11.5
 */
function toSerializableAllocation(allocation: ChannelAllocation): ChannelAllocation {
  return {
    destination: String(allocation.destination),
    token: String(allocation.token),
    amount: typeof allocation.amount === 'bigint'
      ? (allocation.amount as unknown as bigint).toString()
      : String(allocation.amount),
  };
}

/**
 * Ensures a YellowQuote object is fully JSON-serializable.
 *
 * Converts any BigInt values that may be present in the YellowQuote
 * (particularly amountIn and amountOut from solver responses) to their
 * string representation.
 *
 * @param quote - A YellowQuote that may contain BigInt values from ClearNode
 * @returns A new YellowQuote with all values JSON-serializable
 *
 * Requirement 11.2
 */
export function toSerializableYellowQuote(quote: YellowQuote): YellowQuote {
  return {
    solverId: String(quote.solverId),
    channelId: String(quote.channelId),
    amountIn: typeof quote.amountIn === 'bigint'
      ? (quote.amountIn as unknown as bigint).toString()
      : String(quote.amountIn),
    amountOut: typeof quote.amountOut === 'bigint'
      ? (quote.amountOut as unknown as bigint).toString()
      : String(quote.amountOut),
    estimatedTime: Number(quote.estimatedTime),
    timestamp: Number(quote.timestamp),
  };
}
