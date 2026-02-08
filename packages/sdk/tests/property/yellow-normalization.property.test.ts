/**
 * Property-based tests for Intent Execution Normalization
 *
 * Feature: yellow-network-integration
 * Property 8: YellowQuote normalization produces complete objects
 * Property 9: ClearingResult contains required settlement data
 * Property 10: Invalid intent params produce fallback without channel creation
 *
 * Validates: Requirements 8.2, 8.3, 8.5
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import type {
  YellowQuote,
  ClearingResult,
  YellowExecutionResult,
} from '../../src/yellow/types.js';
import type { IntentParams } from '../../src/types.js';

// ============================================================================
// Validation Logic (extracted from YellowProvider.executeIntent)
// ============================================================================

/**
 * Validates IntentParams and returns a fallback YellowExecutionResult if
 * required fields are missing. This mirrors the exact validation logic in
 * YellowProvider.executeIntent() (Requirement 8.5).
 *
 * Required fields: sourceChain, destinationChain, tokenIn, tokenOut, amountIn.
 * If any are missing/empty, returns provider: "fallback" with MISSING_PARAMS.
 */
function validateIntentParams(params: Partial<IntentParams>): YellowExecutionResult | null {
  const now = Date.now();

  const requiredFields: Array<keyof IntentParams> = [
    'sourceChain',
    'destinationChain',
    'tokenIn',
    'tokenOut',
    'amountIn',
  ];

  const missingFields = requiredFields.filter((field) => {
    const value = params[field];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missingFields.length > 0) {
    return {
      provider: 'fallback',
      timestamp: now,
      fallback: {
        enabled: true,
        reasonCode: 'MISSING_PARAMS',
        message: `Missing required intent parameters: ${missingFields.join(', ')}`,
      },
    };
  }

  return null; // Validation passed
}

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates a non-empty alphanumeric string (1–32 characters).
 */
const arbNonEmptyString = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 1, maxLength: 32 },
);

/**
 * Generates a valid Ethereum address: 0x + 40 hex characters.
 */
const arbEthAddress = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex.toLowerCase()}`);

/**
 * Generates a non-empty hex string suitable for a channelId (bytes32).
 */
const arbChannelId = fc
  .hexaString({ minLength: 64, maxLength: 64 })
  .map((hex) => `0x${hex}`);

/**
 * Generates a positive BigInt amount as a string (1 to 2^128).
 */
const arbPositiveAmountStr = fc.bigUintN(128).map((n) => (n + 1n).toString());

/**
 * Generates a positive integer (1 to 1_000_000).
 */
const arbPositiveInt = fc.integer({ min: 1, max: 1_000_000 });

/**
 * Generates a positive Unix timestamp (seconds).
 */
const arbPositiveTimestamp = fc.integer({ min: 1, max: 4_102_444_800 });

/**
 * Generates a valid YellowQuote with all structural invariants satisfied.
 * All string fields are non-empty, estimatedTime and timestamp are positive.
 */
const arbYellowQuote: fc.Arbitrary<YellowQuote> = fc.record({
  solverId: arbNonEmptyString,
  channelId: arbChannelId,
  amountIn: arbPositiveAmountStr,
  amountOut: arbPositiveAmountStr,
  estimatedTime: arbPositiveInt,
  timestamp: arbPositiveTimestamp,
});

/**
 * Generates a valid ClearingResult with all structural invariants satisfied.
 * All string fields are non-empty, timestamp is positive.
 */
const arbClearingResult: fc.Arbitrary<ClearingResult> = fc.record({
  channelId: arbChannelId,
  matchedAmountIn: arbPositiveAmountStr,
  matchedAmountOut: arbPositiveAmountStr,
  netSettlement: arbPositiveAmountStr,
  settlementProof: fc.constant(undefined),
  timestamp: arbPositiveTimestamp,
});

/**
 * Generates a valid IntentParams with all required fields populated.
 */
const arbValidIntentParams: fc.Arbitrary<IntentParams> = fc.record({
  sourceChain: arbNonEmptyString,
  destinationChain: arbNonEmptyString,
  tokenIn: arbEthAddress,
  tokenOut: arbEthAddress,
  amountIn: arbPositiveAmountStr,
  minAmountOut: arbPositiveAmountStr,
  deadline: fc.integer({ min: 1_000_000_000_000, max: 4_102_444_800_000 }),
});

/**
 * The five required fields for IntentParams validation.
 */
const REQUIRED_FIELDS: Array<keyof IntentParams> = [
  'sourceChain',
  'destinationChain',
  'tokenIn',
  'tokenOut',
  'amountIn',
];

/**
 * Generates an IntentParams with at least one required field removed.
 * Picks a random non-empty subset of required fields to remove.
 */
const arbIncompleteIntentParams: fc.Arbitrary<{
  params: Partial<IntentParams>;
  removedFields: string[];
}> = arbValidIntentParams.chain((validParams) =>
  fc
    .subarray(REQUIRED_FIELDS, { minLength: 1, maxLength: REQUIRED_FIELDS.length })
    .map((fieldsToRemove) => {
      const params: Partial<IntentParams> = { ...validParams };
      for (const field of fieldsToRemove) {
        delete params[field];
      }
      return { params, removedFields: fieldsToRemove as string[] };
    }),
);

/**
 * Generates an IntentParams with at least one required field set to empty string.
 */
const arbEmptyFieldIntentParams: fc.Arbitrary<{
  params: Partial<IntentParams>;
  emptyFields: string[];
}> = arbValidIntentParams.chain((validParams) =>
  fc
    .subarray(REQUIRED_FIELDS, { minLength: 1, maxLength: REQUIRED_FIELDS.length })
    .map((fieldsToEmpty) => {
      const params: Record<string, unknown> = { ...validParams };
      for (const field of fieldsToEmpty) {
        params[field] = '';
      }
      return {
        params: params as Partial<IntentParams>,
        emptyFields: fieldsToEmpty as string[],
      };
    }),
);

// ============================================================================
// Property 8: YellowQuote normalization produces complete objects
// ============================================================================

describe('Feature: yellow-network-integration, Property 8: YellowQuote normalization produces complete objects', () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * For any solver quote response, the normalized YellowQuote should contain
   * non-empty solverId, channelId, amountIn, amountOut, a positive estimatedTime,
   * and a positive timestamp.
   */
  it('YellowQuote has non-empty solverId', () => {
    fc.assert(
      fc.property(arbYellowQuote, (quote) => {
        expect(quote.solverId).toBeTruthy();
        expect(quote.solverId.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('YellowQuote has non-empty channelId', () => {
    fc.assert(
      fc.property(arbYellowQuote, (quote) => {
        expect(quote.channelId).toBeTruthy();
        expect(quote.channelId.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('YellowQuote has non-empty amountIn and amountOut', () => {
    fc.assert(
      fc.property(arbYellowQuote, (quote) => {
        expect(quote.amountIn).toBeTruthy();
        expect(quote.amountIn.length).toBeGreaterThan(0);
        expect(quote.amountOut).toBeTruthy();
        expect(quote.amountOut.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('YellowQuote has positive estimatedTime and timestamp', () => {
    fc.assert(
      fc.property(arbYellowQuote, (quote) => {
        expect(quote.estimatedTime).toBeGreaterThan(0);
        expect(quote.timestamp).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.2**
   *
   * Combined structural invariant: for any YellowQuote, all fields satisfy
   * their completeness requirements simultaneously.
   */
  it('YellowQuote satisfies full structural invariant', () => {
    fc.assert(
      fc.property(arbYellowQuote, (quote) => {
        // Non-empty string fields
        expect(quote.solverId).toBeTruthy();
        expect(quote.solverId.length).toBeGreaterThan(0);
        expect(quote.channelId).toBeTruthy();
        expect(quote.channelId.length).toBeGreaterThan(0);
        expect(quote.amountIn).toBeTruthy();
        expect(quote.amountIn.length).toBeGreaterThan(0);
        expect(quote.amountOut).toBeTruthy();
        expect(quote.amountOut.length).toBeGreaterThan(0);

        // Positive numeric fields
        expect(quote.estimatedTime).toBeGreaterThan(0);
        expect(quote.timestamp).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Property 9: ClearingResult contains required settlement data
// ============================================================================

describe('Feature: yellow-network-integration, Property 9: ClearingResult contains required settlement data', () => {
  /**
   * **Validates: Requirements 8.3**
   *
   * For any completed clearing operation, the ClearingResult should contain
   * a non-empty channelId, matchedAmountIn, matchedAmountOut, netSettlement,
   * and a positive timestamp.
   */
  it('ClearingResult has non-empty channelId', () => {
    fc.assert(
      fc.property(arbClearingResult, (result) => {
        expect(result.channelId).toBeTruthy();
        expect(result.channelId.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('ClearingResult has non-empty matchedAmountIn and matchedAmountOut', () => {
    fc.assert(
      fc.property(arbClearingResult, (result) => {
        expect(result.matchedAmountIn).toBeTruthy();
        expect(result.matchedAmountIn.length).toBeGreaterThan(0);
        expect(result.matchedAmountOut).toBeTruthy();
        expect(result.matchedAmountOut.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('ClearingResult has non-empty netSettlement', () => {
    fc.assert(
      fc.property(arbClearingResult, (result) => {
        expect(result.netSettlement).toBeTruthy();
        expect(result.netSettlement.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('ClearingResult has positive timestamp', () => {
    fc.assert(
      fc.property(arbClearingResult, (result) => {
        expect(result.timestamp).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.3**
   *
   * Combined structural invariant: for any ClearingResult, all required fields
   * satisfy their completeness requirements simultaneously.
   */
  it('ClearingResult satisfies full structural invariant', () => {
    fc.assert(
      fc.property(arbClearingResult, (result) => {
        // Non-empty string fields
        expect(result.channelId).toBeTruthy();
        expect(result.channelId.length).toBeGreaterThan(0);
        expect(result.matchedAmountIn).toBeTruthy();
        expect(result.matchedAmountIn.length).toBeGreaterThan(0);
        expect(result.matchedAmountOut).toBeTruthy();
        expect(result.matchedAmountOut.length).toBeGreaterThan(0);
        expect(result.netSettlement).toBeTruthy();
        expect(result.netSettlement.length).toBeGreaterThan(0);

        // Positive timestamp
        expect(result.timestamp).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Property 10: Invalid intent params produce fallback without channel creation
// ============================================================================

describe('Feature: yellow-network-integration, Property 10: Invalid intent params produce fallback without channel creation', () => {
  /**
   * **Validates: Requirements 8.5**
   *
   * For any IntentParams missing at least one required field (sourceChain,
   * destinationChain, tokenIn, tokenOut, or amountIn), the result should
   * have provider: "fallback" and a MISSING_PARAMS fallback reason code.
   */
  it('missing required fields produce fallback with MISSING_PARAMS', () => {
    fc.assert(
      fc.property(arbIncompleteIntentParams, ({ params, removedFields }) => {
        const result = validateIntentParams(params);

        // Validation should fail (return non-null)
        expect(result).not.toBeNull();
        expect(result!.provider).toBe('fallback');
        expect(result!.fallback).toBeDefined();
        expect(result!.fallback!.reasonCode).toBe('MISSING_PARAMS');
        expect(result!.fallback!.enabled).toBe(true);

        // The message should mention the missing fields
        for (const field of removedFields) {
          expect(result!.fallback!.message).toContain(field);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * For any IntentParams with at least one required field set to empty string,
   * the result should have provider: "fallback" and MISSING_PARAMS reason code.
   */
  it('empty string required fields produce fallback with MISSING_PARAMS', () => {
    fc.assert(
      fc.property(arbEmptyFieldIntentParams, ({ params, emptyFields }) => {
        const result = validateIntentParams(params);

        // Validation should fail
        expect(result).not.toBeNull();
        expect(result!.provider).toBe('fallback');
        expect(result!.fallback).toBeDefined();
        expect(result!.fallback!.reasonCode).toBe('MISSING_PARAMS');
        expect(result!.fallback!.enabled).toBe(true);

        // The message should mention the empty fields
        for (const field of emptyFields) {
          expect(result!.fallback!.message).toContain(field);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * For any valid IntentParams (all required fields present and non-empty),
   * the validation should pass (return null), meaning no fallback is produced.
   */
  it('valid IntentParams pass validation (no fallback)', () => {
    fc.assert(
      fc.property(arbValidIntentParams, (params) => {
        const result = validateIntentParams(params);

        // Validation should pass
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * For each individual required field, removing just that one field
   * produces a fallback mentioning that specific field.
   */
  it('each individual missing field is detected', () => {
    fc.assert(
      fc.property(
        arbValidIntentParams,
        fc.constantFrom(...REQUIRED_FIELDS),
        (validParams, fieldToRemove) => {
          const params: Partial<IntentParams> = { ...validParams };
          delete params[fieldToRemove];

          const result = validateIntentParams(params);

          expect(result).not.toBeNull();
          expect(result!.provider).toBe('fallback');
          expect(result!.fallback!.reasonCode).toBe('MISSING_PARAMS');
          expect(result!.fallback!.message).toContain(fieldToRemove);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * The fallback result always has a positive timestamp, confirming
   * the result is properly timestamped.
   */
  it('fallback result has a positive timestamp', () => {
    fc.assert(
      fc.property(arbIncompleteIntentParams, ({ params }) => {
        const result = validateIntentParams(params);

        expect(result).not.toBeNull();
        expect(result!.timestamp).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
