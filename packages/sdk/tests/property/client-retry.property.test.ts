import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { JackClient } from '../../src/client.js';
import { RetryError, APIError } from '../../src/errors.js';

describe('Property 4: Retry Exhaustion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include retry count in error after exhaustion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }), // maxRetries
        fc.integer({ min: 500, max: 599 }), // status code
        async (maxRetries, statusCode) => {
          const client = new JackClient({
            baseUrl: 'https://api.test',
            maxRetries,
            retryDelay: 1, // Fast retries for testing
          });

          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: statusCode,
            statusText: 'Server Error',
            text: async () => JSON.stringify({ error: 'Test error' }),
          });

          try {
            await client.get('/test');
            // Should not reach here
            return false;
          } catch (error) {
            if (maxRetries === 0) {
              // With 0 retries, should throw APIError directly
              return error instanceof APIError;
            } else {
              // With retries, should throw RetryError
              return (
                error instanceof RetryError &&
                (error as RetryError).attempts === maxRetries + 1 &&
                (error as RetryError).lastError instanceof APIError
              );
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
