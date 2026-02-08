/**
 * Property-based tests for ClearNodeConnection
 *
 * Feature: yellow-network-integration
 * Property 12: Reconnection uses exponential backoff
 *
 * Tests that for any sequence of N failed reconnection attempts,
 * the delay before attempt K equals initialDelay * 2^(K-1).
 *
 * Validates: Requirements 10.2
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { calculateBackoffDelay } from '../../src/yellow/clear-node-connection.js';

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates a positive initial delay in milliseconds.
 * Constrained to reasonable values (1ms to 60000ms) to avoid overflow issues.
 */
const arbInitialDelay = fc.integer({ min: 1, max: 60_000 });

/**
 * Generates a valid reconnection attempt number (1-based).
 * Constrained to 1–20 to keep computed delays within safe integer range.
 */
const arbAttempt = fc.integer({ min: 1, max: 20 });

/**
 * Generates a sequence length N >= 1 for testing multiple consecutive attempts.
 */
const arbSequenceLength = fc.integer({ min: 1, max: 15 });

// ============================================================================
// Property 12: Reconnection uses exponential backoff
// ============================================================================

describe('Feature: yellow-network-integration, Property 12: Reconnection uses exponential backoff', () => {
  /**
   * **Validates: Requirements 10.2**
   *
   * For any initial delay and attempt number K (1-based),
   * the backoff delay equals initialDelay * 2^(K-1).
   */
  it('delay for attempt K equals initialDelay * 2^(K-1)', () => {
    fc.assert(
      fc.property(arbInitialDelay, arbAttempt, (initialDelay, attempt) => {
        const result = calculateBackoffDelay(initialDelay, attempt);
        const expected = initialDelay * Math.pow(2, attempt - 1);

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.2**
   *
   * For any sequence of N consecutive reconnection attempts,
   * each successive delay is exactly double the previous one.
   */
  it('each successive delay doubles the previous delay', () => {
    fc.assert(
      fc.property(arbInitialDelay, arbSequenceLength, (initialDelay, n) => {
        for (let k = 2; k <= n; k++) {
          const prevDelay = calculateBackoffDelay(initialDelay, k - 1);
          const currDelay = calculateBackoffDelay(initialDelay, k);

          expect(currDelay).toBe(prevDelay * 2);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.2**
   *
   * The first reconnection attempt (K=1) always uses the initial delay unchanged.
   */
  it('first attempt delay equals the initial delay', () => {
    fc.assert(
      fc.property(arbInitialDelay, (initialDelay) => {
        const result = calculateBackoffDelay(initialDelay, 1);

        expect(result).toBe(initialDelay);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.2**
   *
   * For any initial delay and attempt K >= 1, the delay is always
   * greater than or equal to the initial delay (delays never decrease
   * below the base).
   */
  it('delay is always >= initialDelay for any attempt >= 1', () => {
    fc.assert(
      fc.property(arbInitialDelay, arbAttempt, (initialDelay, attempt) => {
        const result = calculateBackoffDelay(initialDelay, attempt);

        expect(result).toBeGreaterThanOrEqual(initialDelay);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.2**
   *
   * For any initial delay, the delay sequence is strictly monotonically
   * increasing across consecutive attempts.
   */
  it('delays are strictly increasing across consecutive attempts', () => {
    fc.assert(
      fc.property(arbInitialDelay, arbSequenceLength.filter((n) => n >= 2), (initialDelay, n) => {
        for (let k = 2; k <= n; k++) {
          const prevDelay = calculateBackoffDelay(initialDelay, k - 1);
          const currDelay = calculateBackoffDelay(initialDelay, k);

          expect(currDelay).toBeGreaterThan(prevDelay);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Imports for Property 13
// ============================================================================

import { ClearNodeConnection } from '../../src/yellow/clear-node-connection.js';

// ============================================================================
// Mock WebSocket helpers for Property 13
// ============================================================================

/** Minimal IWebSocket-compatible mock for testing request-response correlation. */
interface MockWebSocket {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
}

const WS_OPEN = 1;

function createMockWebSocket(): MockWebSocket {
  return {
    readyState: WS_OPEN,
    send: () => {},
    close: () => {},
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
  };
}

// ============================================================================
// Generators for Property 13
// ============================================================================

/**
 * Generates a unique method name string suitable for request-response correlation.
 * Uses alphanumeric characters with a prefix to ensure valid method names.
 */
const arbMethodName = fc.stringMatching(/^[a-z][a-z0-9_]{2,15}$/);

/**
 * Generates a non-empty array of unique method names (2–10 elements)
 * representing concurrent sendAndWait calls.
 */
const arbUniqueMethods = fc
  .uniqueArray(arbMethodName, { minLength: 2, maxLength: 10 })
  .filter((arr) => arr.length >= 2);

/**
 * Generates a permutation index array for shuffling response order.
 * Given a length N, produces a shuffled array of indices [0..N-1].
 */
function arbPermutation(length: number): fc.Arbitrary<number[]> {
  // Generate an array of random sort keys, then derive a permutation from them
  return fc
    .array(fc.float({ min: 0, max: 1, noNaN: true }), {
      minLength: length,
      maxLength: length,
    })
    .map((keys) => {
      const indices = Array.from({ length }, (_, i) => i);
      indices.sort((a, b) => keys[a] - keys[b]);
      return indices;
    });
}

// ============================================================================
// Property 13: Request-response correlation is correct under concurrency
// ============================================================================

describe('Feature: yellow-network-integration, Property 13: Request-response correlation is correct under concurrency', () => {
  /**
   * **Validates: Requirements 10.5**
   *
   * For any set of concurrent sendAndWait calls with distinct method names,
   * when responses arrive (possibly out of order), each promise resolves
   * with the correct response matched by method — no cross-talk occurs.
   */
  it('each concurrent sendAndWait resolves with its own correlated response', async () => {
    await fc.assert(
      fc.asyncProperty(arbUniqueMethods, async (methods) => {
        // --- Arrange ---
        let mockWs: MockWebSocket | null = null;

        const wsFactory = (_url: string) => {
          mockWs = createMockWebSocket();
          return mockWs as unknown as ReturnType<typeof wsFactory>;
        };

        const connection = new ClearNodeConnection(
          'ws://test',
          { messageTimeout: 5000 },
          wsFactory as never,
        );

        // Connect: trigger onopen synchronously
        const connectPromise = connection.connect();
        mockWs!.onopen!({});
        await connectPromise;

        // --- Act ---
        // Fire all sendAndWait calls concurrently, each with a unique method
        const promises = methods.map((method) =>
          connection.sendAndWait<{ method: string; payload: string }>(
            JSON.stringify({ method }),
            method,
          ),
        );

        // Simulate responses arriving in the SAME order (we test shuffled order below)
        for (const method of methods) {
          mockWs!.onmessage!({
            data: JSON.stringify({ method, payload: `response_for_${method}` }),
          });
        }

        // --- Assert ---
        const results = await Promise.all(promises);
        for (let i = 0; i < methods.length; i++) {
          expect(results[i].method).toBe(methods[i]);
          expect(results[i].payload).toBe(`response_for_${methods[i]}`);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.5**
   *
   * For any set of concurrent sendAndWait calls with distinct method names,
   * when responses arrive in a randomly shuffled order, each promise still
   * resolves with the correct response — demonstrating order-independence.
   */
  it('responses delivered out of order still correlate correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUniqueMethods.chain((methods) =>
          arbPermutation(methods.length).map((perm) => ({ methods, perm })),
        ),
        async ({ methods, perm }) => {
          // --- Arrange ---
          let mockWs: MockWebSocket | null = null;

          const wsFactory = (_url: string) => {
            mockWs = createMockWebSocket();
            return mockWs as unknown as ReturnType<typeof wsFactory>;
          };

          const connection = new ClearNodeConnection(
            'ws://test',
            { messageTimeout: 5000 },
            wsFactory as never,
          );

          const connectPromise = connection.connect();
          mockWs!.onopen!({});
          await connectPromise;

          // --- Act ---
          const promises = methods.map((method) =>
            connection.sendAndWait<{ method: string; payload: string }>(
              JSON.stringify({ method }),
              method,
            ),
          );

          // Deliver responses in shuffled order determined by the permutation
          for (const idx of perm) {
            const method = methods[idx];
            mockWs!.onmessage!({
              data: JSON.stringify({ method, payload: `response_for_${method}` }),
            });
          }

          // --- Assert ---
          const results = await Promise.all(promises);
          for (let i = 0; i < methods.length; i++) {
            expect(results[i].method).toBe(methods[i]);
            expect(results[i].payload).toBe(`response_for_${methods[i]}`);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.5**
   *
   * For any set of concurrent sendAndWait calls, no two callers receive
   * the same response object — each response is delivered exactly once.
   */
  it('no two callers receive the same response (no duplication)', async () => {
    await fc.assert(
      fc.asyncProperty(arbUniqueMethods, async (methods) => {
        // --- Arrange ---
        let mockWs: MockWebSocket | null = null;

        const wsFactory = (_url: string) => {
          mockWs = createMockWebSocket();
          return mockWs as unknown as ReturnType<typeof wsFactory>;
        };

        const connection = new ClearNodeConnection(
          'ws://test',
          { messageTimeout: 5000 },
          wsFactory as never,
        );

        const connectPromise = connection.connect();
        mockWs!.onopen!({});
        await connectPromise;

        // --- Act ---
        const promises = methods.map((method) =>
          connection.sendAndWait<{ method: string; id: string }>(
            JSON.stringify({ method }),
            method,
          ),
        );

        // Each response has a unique id tied to its method
        for (const method of methods) {
          mockWs!.onmessage!({
            data: JSON.stringify({ method, id: `unique_${method}` }),
          });
        }

        // --- Assert ---
        const results = await Promise.all(promises);
        const ids = results.map((r) => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(methods.length);

        // Each id matches its expected method
        for (let i = 0; i < methods.length; i++) {
          expect(results[i].id).toBe(`unique_${methods[i]}`);
        }
      }),
      { numRuns: 100 },
    );
  });
});
