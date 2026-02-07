import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { JackClient } from '../../src/client.js';

describe('Property 5: Cache Invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch fresh data after TTL expires', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 200 }), // cacheTTL in ms
        fc.string({ minLength: 1, maxLength: 20 }), // path
        async (cacheTTL, path) => {
          const client = new JackClient({
            baseUrl: 'https://api.test',
            cacheTTL,
            enableCache: true,
          });

          let callCount = 0;
          global.fetch = vi.fn().mockImplementation(async () => {
            callCount++;
            return {
              ok: true,
              json: async () => ({ data: `response-${callCount}` }),
            };
          });

          // First request - should hit API
          const result1 = await client.get(`/${path}`);
          expect(result1).toEqual({ data: 'response-1' });
          expect(callCount).toBe(1);

          // Second request immediately - should use cache
          const result2 = await client.get(`/${path}`);
          expect(result2).toEqual({ data: 'response-1' });
          expect(callCount).toBe(1); // Still 1, used cache

          // Wait for TTL to expire
          await new Promise(resolve => setTimeout(resolve, cacheTTL + 50));

          // Third request after TTL - should hit API again
          const result3 = await client.get(`/${path}`);
          expect(result3).toEqual({ data: 'response-2' });
          expect(callCount).toBe(2); // Now 2, cache expired
        }
      ),
      { numRuns: 20 } // Fewer runs since this involves timeouts
    );
  });
});
