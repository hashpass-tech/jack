/**
 * Property-based tests for validation before submission
 * 
 * Feature: jack-sdk-core
 * Property 7: Validation Before Submission
 * 
 * Tests that invalid intent parameters are caught by validation and throw
 * ValidationError before any network request is made. This ensures that
 * client-side validation prevents unnecessary API calls.
 * 
 * Validates: Requirements 5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { IntentManager } from '../../src/intents.js';
import { JackClient } from '../../src/client.js';
import { ValidationError } from '../../src/errors.js';
import type { IntentParams } from '../../src/types.js';

describe('Property 7: Validation Before Submission', () => {
  let client: JackClient;
  let manager: IntentManager;
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a client instance for the IntentManager
    client = new JackClient({
      baseUrl: 'https://api.jack.test',
      maxRetries: 0,
    });
    manager = new IntentManager(client);

    // Spy on the post method to verify it's never called
    postSpy = vi.spyOn(client, 'post');
  });

  /**
   * **Validates: Requirements 5.4**
   * 
   * For any invalid IntentParams (e.g., negative amounts, past deadline),
   * calling submit() should throw a ValidationError before making any
   * network request.
   */
  it('should throw ValidationError for invalid amountIn before network call', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate IntentParams with invalid amountIn (negative, zero, or non-numeric)
        fc.record({
          sourceChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          destinationChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          amountIn: fc.oneof(
            fc.constant('0'),
            fc.constant('-1'),
            fc.constant('-100'),
            fc.constant(''),
            fc.constant('invalid'),
            fc.constant('abc'),
          ),
          minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
        }),
        fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`), // signature
        async (params: IntentParams, signature: string) => {
          // Reset the spy before each test
          postSpy.mockClear();

          // Attempt to submit the invalid intent
          await expect(manager.submit(params, signature)).rejects.toThrow(ValidationError);

          // Verify that no network request was made
          expect(postSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw ValidationError for invalid minAmountOut before network call', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate IntentParams with invalid minAmountOut
        fc.record({
          sourceChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          destinationChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          minAmountOut: fc.oneof(
            fc.constant('0'),
            fc.constant('-1'),
            fc.constant('-100'),
            fc.constant(''),
            fc.constant('invalid'),
          ),
          deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
        }),
        fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`), // signature
        async (params: IntentParams, signature: string) => {
          // Reset the spy before each test
          postSpy.mockClear();

          // Attempt to submit the invalid intent
          await expect(manager.submit(params, signature)).rejects.toThrow(ValidationError);

          // Verify that no network request was made
          expect(postSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw ValidationError for past deadline before network call', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate IntentParams with deadline in the past
        fc.record({
          sourceChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          destinationChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          deadline: fc.integer({ min: 0, max: Date.now() - 1000 }), // Past deadline
        }),
        fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`), // signature
        async (params: IntentParams, signature: string) => {
          // Reset the spy before each test
          postSpy.mockClear();

          // Attempt to submit the invalid intent
          await expect(manager.submit(params, signature)).rejects.toThrow(ValidationError);

          // Verify that no network request was made
          expect(postSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw ValidationError for invalid token addresses before network call', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate IntentParams with invalid token addresses
        fc.record({
          sourceChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          destinationChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          tokenIn: fc.oneof(
            fc.constant('invalid'),
            fc.constant('0x123'), // Too short
            fc.constant('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'), // Invalid hex
            fc.constant(''), // Empty
            fc.hexaString({ minLength: 41, maxLength: 50 }).map(s => `0x${s}`), // Too long
          ),
          tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
        }),
        fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`), // signature
        async (params: IntentParams, signature: string) => {
          // Reset the spy before each test
          postSpy.mockClear();

          // Attempt to submit the invalid intent
          await expect(manager.submit(params, signature)).rejects.toThrow(ValidationError);

          // Verify that no network request was made
          expect(postSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw ValidationError for empty required fields before network call', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate IntentParams with empty required fields
        fc.oneof(
          // Empty sourceChain
          fc.record({
            sourceChain: fc.constant(''),
            destinationChain: fc.constant('base'),
            tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
            minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
            deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
          }),
          // Empty destinationChain
          fc.record({
            sourceChain: fc.constant('arbitrum'),
            destinationChain: fc.constant(''),
            tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
            minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
            deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
          }),
        ),
        fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`), // signature
        async (params: IntentParams, signature: string) => {
          // Reset the spy before each test
          postSpy.mockClear();

          // Attempt to submit the invalid intent
          await expect(manager.submit(params, signature)).rejects.toThrow(ValidationError);

          // Verify that no network request was made
          expect(postSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw ValidationError with descriptive error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various invalid IntentParams
        fc.oneof(
          // Invalid amountIn
          fc.record({
            sourceChain: fc.constant('arbitrum'),
            destinationChain: fc.constant('base'),
            tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            amountIn: fc.constant('0'),
            minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
            deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
          }),
          // Past deadline
          fc.record({
            sourceChain: fc.constant('arbitrum'),
            destinationChain: fc.constant('base'),
            tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
            minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
            deadline: fc.constant(Date.now() - 1000),
          }),
        ),
        fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`), // signature
        async (params: IntentParams, signature: string) => {
          // Reset the spy before each test
          postSpy.mockClear();

          try {
            await manager.submit(params, signature);
            // Should not reach here
            expect.fail('Expected ValidationError to be thrown');
          } catch (error) {
            // Verify it's a ValidationError
            expect(error).toBeInstanceOf(ValidationError);
            
            // Verify it has error messages
            const validationError = error as ValidationError;
            expect(validationError.errors).toBeDefined();
            expect(validationError.errors.length).toBeGreaterThan(0);
            
            // Verify no network request was made
            expect(postSpy).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow valid parameters to proceed (sanity check)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid IntentParams
        fc.record({
          sourceChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          destinationChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism')
          ),
          tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          deadline: fc.integer({ min: Date.now() + 1000, max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
        }),
        fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`), // signature
        async (params: IntentParams, signature: string) => {
          // Reset the spy and mock a successful response
          postSpy.mockClear();
          postSpy.mockResolvedValue({ intentId: 'JK-TEST12345' });

          // Valid parameters should not throw ValidationError
          // (they may throw other errors like NetworkError, but not ValidationError)
          try {
            await manager.submit(params, signature);
            // If successful, verify network call was made
            expect(postSpy).toHaveBeenCalledTimes(1);
          } catch (error) {
            // If it throws, it should NOT be a ValidationError
            expect(error).not.toBeInstanceOf(ValidationError);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
