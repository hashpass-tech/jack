/**
 * Property-based tests for batch submission atomicity
 * 
 * Feature: jack-sdk-core
 * Property 6: Batch Submission Atomicity
 * 
 * Tests that batch submission maintains correspondence between input and output arrays.
 * For any array of intents in batchSubmit(), the results array should have the same
 * length as the input array, with each result corresponding to the same index in the input.
 * 
 * **Validates: Requirements 8.2**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { AgentUtils } from '../../src/agent.js';
import { JackClient } from '../../src/client.js';
import type { IntentParams } from '../../src/types.js';

describe('Property 6: Batch Submission Atomicity', () => {
  let client: JackClient;
  let agent: AgentUtils;

  beforeEach(() => {
    // Create a client instance for the AgentUtils
    client = new JackClient({
      baseUrl: 'https://api.jack.test',
      maxRetries: 0,
    });
    agent = new AgentUtils(client);
  });

  /**
   * **Validates: Requirements 8.2**
   * 
   * For any array of intents in batchSubmit(), the results array should have
   * the same length as the input array, with each result corresponding to the
   * same index in the input.
   */
  it('should return results array with same length as input array', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of random length (0 to 20 intents)
        fc.array(
          fc.record({
            params: fc.record({
              sourceChain: fc.oneof(
                fc.constant('arbitrum'),
                fc.constant('base'),
                fc.constant('optimism'),
                fc.constant('ethereum')
              ),
              destinationChain: fc.oneof(
                fc.constant('arbitrum'),
                fc.constant('base'),
                fc.constant('optimism'),
                fc.constant('ethereum')
              ),
              tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
              tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
              amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
              minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
              deadline: fc.integer({ min: Date.now() + 1000, max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
            }),
            signature: fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`)
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (intents) => {
          // Mock fetch to return random success/failure responses
          global.fetch = vi.fn().mockImplementation(async () => {
            // Randomly succeed or fail
            const shouldSucceed = Math.random() > 0.3; // 70% success rate
            
            if (shouldSucceed) {
              return {
                ok: true,
                json: async () => ({
                  intentId: `JK-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
                })
              };
            } else {
              return {
                ok: false,
                status: Math.random() > 0.5 ? 400 : 500,
                statusText: 'Error',
                json: async () => ({ error: 'Random error' })
              };
            }
          });

          // Submit the batch
          const results = await agent.batchSubmit(intents);

          // CRITICAL PROPERTY: Result array length MUST match input array length
          expect(results).toHaveLength(intents.length);

          // Verify each result has the required structure
          results.forEach((result, index) => {
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('intentId');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.intentId).toBe('string');

            // If failed, should have error property
            if (!result.success) {
              expect(result).toHaveProperty('error');
              expect(result.error).toBeInstanceOf(Error);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain index correspondence between input and output', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of intents with at least 3 elements to test correspondence
        fc.array(
          fc.record({
            params: fc.record({
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
            signature: fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`)
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (intents) => {
          // Create a deterministic pattern: success, fail, success, fail, ...
          let callCount = 0;
          global.fetch = vi.fn().mockImplementation(async () => {
            const shouldSucceed = callCount % 2 === 0;
            callCount++;
            
            if (shouldSucceed) {
              return {
                ok: true,
                json: async () => ({
                  intentId: `JK-SUCCESS${callCount}`
                })
              };
            } else {
              return {
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: async () => ({ error: 'Validation error' })
              };
            }
          });

          // Submit the batch
          const results = await agent.batchSubmit(intents);

          // Verify the pattern matches: even indices succeed, odd indices fail
          results.forEach((result, index) => {
            if (index % 2 === 0) {
              // Even indices should succeed
              expect(result.success).toBe(true);
              expect(result.intentId).toMatch(/^JK-SUCCESS\d+$/);
            } else {
              // Odd indices should fail
              expect(result.success).toBe(false);
              expect(result.intentId).toBe('');
              expect(result.error).toBeInstanceOf(Error);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle all successful submissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of valid intents
        fc.array(
          fc.record({
            params: fc.record({
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
            signature: fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`)
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (intents) => {
          // Mock all submissions to succeed
          let callCount = 0;
          global.fetch = vi.fn().mockImplementation(async () => {
            callCount++;
            return {
              ok: true,
              json: async () => ({
                intentId: `JK-${callCount.toString().padStart(9, '0')}`
              })
            };
          });

          // Submit the batch
          const results = await agent.batchSubmit(intents);

          // All results should be successful
          expect(results).toHaveLength(intents.length);
          results.forEach((result) => {
            expect(result.success).toBe(true);
            expect(result.intentId).toMatch(/^JK-\d{9}$/);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle all failed submissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of intents
        fc.array(
          fc.record({
            params: fc.record({
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
            signature: fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`)
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (intents) => {
          // Mock all submissions to fail
          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: 'Server error' })
          });

          // Submit the batch
          const results = await agent.batchSubmit(intents);

          // All results should be failures
          expect(results).toHaveLength(intents.length);
          results.forEach((result) => {
            expect(result.success).toBe(false);
            expect(result.intentId).toBe('');
            expect(result.error).toBeInstanceOf(Error);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty input array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant([]), // Always empty array
        async (intents) => {
          // Submit empty batch
          const results = await agent.batchSubmit(intents);

          // Result should also be empty
          expect(results).toHaveLength(0);
          expect(results).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle mixed valid and invalid parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array with mix of valid and invalid intents
        fc.array(
          fc.oneof(
            // Valid intent
            fc.record({
              params: fc.record({
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
              signature: fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`)
            }),
            // Invalid intent (negative amount)
            fc.record({
              params: fc.record({
                sourceChain: fc.constant('arbitrum'),
                destinationChain: fc.constant('base'),
                tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                amountIn: fc.constant('-1000'),
                minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
                deadline: fc.integer({ min: Date.now() + 1000, max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
              }),
              signature: fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`)
            }),
            // Invalid intent (past deadline)
            fc.record({
              params: fc.record({
                sourceChain: fc.constant('arbitrum'),
                destinationChain: fc.constant('base'),
                tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                amountIn: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
                minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
                deadline: fc.constant(Date.now() - 1000),
              }),
              signature: fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`)
            })
          ),
          { minLength: 2, maxLength: 10 }
        ),
        async (intents) => {
          // Mock successful API responses (validation errors will be caught before API call)
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              intentId: `JK-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
            })
          });

          // Submit the batch
          const results = await agent.batchSubmit(intents);

          // CRITICAL: Result array length MUST match input array length
          expect(results).toHaveLength(intents.length);

          // Each result should have proper structure
          results.forEach((result) => {
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('intentId');
            
            if (!result.success) {
              expect(result).toHaveProperty('error');
              expect(result.error).toBeInstanceOf(Error);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve order of results matching input order', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of intents with unique amounts to track order
        fc.integer({ min: 3, max: 10 }).chain(length => 
          fc.tuple(
            ...Array.from({ length }, (_, i) => 
              fc.record({
                params: fc.record({
                  sourceChain: fc.constant('arbitrum'),
                  destinationChain: fc.constant('base'),
                  tokenIn: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                  tokenOut: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                  amountIn: fc.constant((1000000 + i).toString()), // Unique amount per index
                  minAmountOut: fc.bigInt({ min: 1n, max: 10n ** 30n }).map(n => n.toString()),
                  deadline: fc.integer({ min: Date.now() + 1000, max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
                }),
                signature: fc.hexaString({ minLength: 64, maxLength: 130 }).map(s => `0x${s}`)
              })
            )
          )
        ),
        async (intents) => {
          // Mock fetch to return intent IDs based on the input amount
          global.fetch = vi.fn().mockImplementation(async (url, options) => {
            const body = JSON.parse(options?.body as string);
            const amount = body.params.amountIn;
            const id = parseInt(amount) - 1000000;
            
            return {
              ok: true,
              json: async () => ({
                intentId: `JK-ID${id.toString().padStart(6, '0')}`
              })
            };
          });

          // Submit the batch
          const results = await agent.batchSubmit(intents);

          // Verify order is preserved
          expect(results).toHaveLength(intents.length);
          results.forEach((result, index) => {
            const expectedId = parseInt(intents[index].params.amountIn) - 1000000;
            expect(result.success).toBe(true);
            expect(result.intentId).toBe(`JK-ID${expectedId.toString().padStart(6, '0')}`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
