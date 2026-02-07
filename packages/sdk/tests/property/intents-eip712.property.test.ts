/**
 * Property-based tests for EIP-712 serialization consistency
 * 
 * Feature: jack-sdk-core
 * Property 1: EIP-712 Serialization Consistency
 * 
 * Tests that EIP-712 typed data generation is deterministic and consistent.
 * For any valid IntentParams, calling getTypedData() multiple times should
 * produce identical output.
 * 
 * Validates: Requirements 14.1
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { IntentManager } from '../../src/intents.js';
import { JackClient } from '../../src/client.js';
import type { IntentParams } from '../../src/types.js';

describe('Property 1: EIP-712 Serialization Consistency', () => {
  // Create a client instance for the IntentManager
  const client = new JackClient({
    baseUrl: 'https://api.jack.test',
    maxRetries: 0,
  });
  const manager = new IntentManager(client);

  /**
   * **Validates: Requirements 14.1**
   * 
   * For any valid IntentParams object, calling getTypedData() twice with
   * the same parameters should produce identical typed data structures.
   * This ensures that serialization is deterministic and consistent.
   */
  it('should produce identical typed data for the same intent parameters', () => {
    fc.assert(
      fc.property(
        // Generate random valid IntentParams
        fc.record({
          sourceChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism'),
            fc.constant('ethereum'),
            fc.constant('polygon')
          ),
          destinationChain: fc.oneof(
            fc.constant('arbitrum'),
            fc.constant('base'),
            fc.constant('optimism'),
            fc.constant('ethereum'),
            fc.constant('polygon')
          ),
          tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
          amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
          deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
        }),
        (params: IntentParams) => {
          // Call getTypedData() twice with the same parameters
          const typedData1 = manager.getTypedData(params);
          const typedData2 = manager.getTypedData(params);

          // Verify that both calls produce identical output
          expect(JSON.stringify(typedData1)).toBe(JSON.stringify(typedData2));
          
          // Also verify structural equality
          expect(typedData1.domain).toEqual(typedData2.domain);
          expect(typedData1.types).toEqual(typedData2.types);
          expect(typedData1.message).toEqual(typedData2.message);
          expect(typedData1.primaryType).toBe(typedData2.primaryType);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify consistency with custom chainId and verifyingContract
   * 
   * This ensures that even when optional parameters are provided, the
   * serialization remains consistent.
   */
  it('should produce identical typed data with custom chainId and verifyingContract', () => {
    fc.assert(
      fc.property(
        // Generate random valid IntentParams
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
          deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
        }),
        // Generate random chainId and verifyingContract
        fc.integer({ min: 1, max: 1000000 }),
        fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}` as `0x${string}`),
        (params: IntentParams, chainId: number, verifyingContract: `0x${string}`) => {
          // Call getTypedData() twice with the same parameters
          const typedData1 = manager.getTypedData(params, chainId, verifyingContract);
          const typedData2 = manager.getTypedData(params, chainId, verifyingContract);

          // Verify that both calls produce identical output
          expect(JSON.stringify(typedData1)).toBe(JSON.stringify(typedData2));
          
          // Verify the custom parameters are used
          expect(typedData1.domain.chainId).toBe(chainId);
          expect(typedData1.domain.verifyingContract).toBe(verifyingContract);
          expect(typedData2.domain.chainId).toBe(chainId);
          expect(typedData2.domain.verifyingContract).toBe(verifyingContract);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify that different parameters produce different typed data
   * 
   * This is a sanity check to ensure that the serialization is actually
   * sensitive to the input parameters.
   */
  it('should produce different typed data for different intent parameters', () => {
    fc.assert(
      fc.property(
        // Generate two different IntentParams
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
          deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
        }),
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
          deadline: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
        }),
        (params1: IntentParams, params2: IntentParams) => {
          // Skip if the parameters are identical
          if (JSON.stringify(params1) === JSON.stringify(params2)) {
            return;
          }

          // Get typed data for both parameters
          const typedData1 = manager.getTypedData(params1);
          const typedData2 = manager.getTypedData(params2);

          // Verify that different parameters produce different typed data
          expect(JSON.stringify(typedData1.message)).not.toBe(JSON.stringify(typedData2.message));
        }
      ),
      { numRuns: 100 }
    );
  });
});
