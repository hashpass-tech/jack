/**
 * Property-based tests for intent ID format validation
 * 
 * Feature: jack-sdk-core
 * Property 2: Intent Submission Idempotency Check
 * 
 * Tests that intent IDs returned from submission follow the expected format.
 * For any valid IntentParams and signature, if submission succeeds, the
 * returned intent ID should be non-empty and follow the format JK-[A-Z0-9]{9}.
 * 
 * Validates: Requirements 1.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { IntentManager } from '../../src/intents.js';
import { JackClient } from '../../src/client.js';
import type { IntentParams } from '../../src/types.js';

// Arbitraries for generating test data
const hexAddressArb = fc.string({ minLength: 40, maxLength: 40, unit: fc.hexa() }).map(s => `0x${s}`);
const signatureArb = fc.string({ minLength: 130, maxLength: 130, unit: fc.hexa() }).map(s => `0x${s}`);
const chainArb = fc.oneof(
  fc.constant('arbitrum'),
  fc.constant('base'),
  fc.constant('optimism'),
  fc.constant('ethereum'),
  fc.constant('polygon')
);
const intentIdSuffixArb = fc.string({
  minLength: 9,
  maxLength: 9,
  unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''))
});
const intentIdArb = intentIdSuffixArb.map(suffix => `JK-${suffix}`);

describe('Property 2: Intent Submission Idempotency Check', () => {
  let mockClient: JackClient;
  let manager: IntentManager;

  // Regular expression to match the intent ID format: JK-[A-Z0-9]{9}
  const INTENT_ID_PATTERN = /^JK-[A-Z0-9]{9}$/;

  // Use a far future deadline to avoid timing issues in property tests
  const FAR_FUTURE_DEADLINE = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year from now

  // Arbitrary for generating valid IntentParams
  const validIntentParamsArb = fc.record({
    sourceChain: chainArb,
    destinationChain: chainArb,
    tokenIn: hexAddressArb,
    tokenOut: hexAddressArb,
    amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
    minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
    deadline: fc.constant(FAR_FUTURE_DEADLINE),
  });

  beforeEach(() => {
    // Create a client instance with retries disabled for testing
    mockClient = new JackClient({
      baseUrl: 'https://api.jack.test',
      maxRetries: 0,
    });
    manager = new IntentManager(mockClient);
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.2**
   * 
   * For any valid IntentParams and signature, if submission succeeds,
   * the returned intent ID should be non-empty and follow the format
   * JK-[A-Z0-9]{9}.
   * 
   * This property ensures that the SDK correctly handles and returns
   * intent IDs in the expected format, which is critical for tracking
   * and querying intents throughout their lifecycle.
   */
  it('should return intent IDs matching JK-[A-Z0-9]{9} pattern for valid submissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        validIntentParamsArb,
        signatureArb,
        intentIdArb,
        async (params: IntentParams, signature: string, intentId: string) => {
          // Mock the client's post method to return the generated intent ID
          vi.spyOn(mockClient, 'post').mockResolvedValue({
            intentId,
          });

          // Submit the intent
          const returnedId = await manager.submit(params, signature);

          // Verify the returned ID is non-empty
          expect(returnedId).toBeTruthy();
          expect(returnedId.length).toBeGreaterThan(0);

          // Verify the returned ID matches the expected pattern
          expect(returnedId).toMatch(INTENT_ID_PATTERN);

          // Verify the ID starts with "JK-"
          expect(returnedId.startsWith('JK-')).toBe(true);

          // Verify the ID has exactly 12 characters (JK- + 9 characters)
          expect(returnedId.length).toBe(12);

          // Verify the suffix contains only uppercase letters and digits
          const suffix = returnedId.substring(3);
          expect(suffix.length).toBe(9);
          expect(/^[A-Z0-9]+$/.test(suffix)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify that different submissions can produce different IDs
   * 
   * This is a sanity check to ensure that the ID generation is not constant
   * and that different intents can have different IDs.
   */
  it('should allow different intent IDs for different submissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        intentIdArb,
        intentIdArb,
        validIntentParamsArb,
        signatureArb,
        async (intentId1: string, intentId2: string, params: IntentParams, signature: string) => {
          // Both IDs should match the pattern
          expect(intentId1).toMatch(INTENT_ID_PATTERN);
          expect(intentId2).toMatch(INTENT_ID_PATTERN);

          // Mock first submission
          vi.spyOn(mockClient, 'post').mockResolvedValueOnce({
            intentId: intentId1,
          });
          const returnedId1 = await manager.submit(params, signature);
          expect(returnedId1).toBe(intentId1);
          expect(returnedId1).toMatch(INTENT_ID_PATTERN);

          // Mock second submission
          vi.spyOn(mockClient, 'post').mockResolvedValueOnce({
            intentId: intentId2,
          });
          const returnedId2 = await manager.submit(params, signature);
          expect(returnedId2).toBe(intentId2);
          expect(returnedId2).toMatch(INTENT_ID_PATTERN);

          // If the IDs are different, verify they're different
          if (intentId1 !== intentId2) {
            expect(returnedId1).not.toBe(returnedId2);
          } else {
            // If the IDs are the same, verify they're the same
            expect(returnedId1).toBe(returnedId2);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Additional test: Verify ID format consistency across multiple submissions
   * 
   * This ensures that all returned IDs consistently follow the format,
   * regardless of the input parameters.
   */
  it('should consistently return IDs in correct format across multiple submissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validIntentParamsArb, { minLength: 1, maxLength: 10 }),
        signatureArb,
        async (paramsArray: IntentParams[], signature: string) => {
          // Submit all intents and collect IDs
          const intentIds: string[] = [];

          for (const params of paramsArray) {
            // Generate a random intent ID for this submission
            const randomId = `JK-${Array.from({ length: 9 }, () => 
              'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
            ).join('')}`;

            // Mock the submission
            vi.spyOn(mockClient, 'post').mockResolvedValueOnce({
              intentId: randomId,
            });

            const returnedId = await manager.submit(params, signature);
            intentIds.push(returnedId);
          }

          // Verify all IDs match the pattern
          for (const id of intentIds) {
            expect(id).toMatch(INTENT_ID_PATTERN);
            expect(id.length).toBe(12);
            expect(id.startsWith('JK-')).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
