import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { JackClient } from '../../src/client.js';
import { ValidationError } from '../../src/errors.js';

describe('Property 10: Configuration Validation', () => {
  it('should throw ValidationError for invalid configs', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Empty baseUrl
          fc.constant({ baseUrl: '' }),
          fc.constant({ baseUrl: '   ' }),
          // Negative timeout
          fc.record({
            baseUrl: fc.constant('https://api.test'),
            timeout: fc.integer({ max: 0 }),
          }),
          // Negative maxRetries
          fc.record({
            baseUrl: fc.constant('https://api.test'),
            maxRetries: fc.integer({ max: -1 }),
          }),
          // Negative retryDelay
          fc.record({
            baseUrl: fc.constant('https://api.test'),
            retryDelay: fc.integer({ max: -1 }),
          }),
          // Invalid retryBackoff
          fc.record({
            baseUrl: fc.constant('https://api.test'),
            retryBackoff: fc.double({ max: 0.99 }),
          }),
          // Negative cacheTTL
          fc.record({
            baseUrl: fc.constant('https://api.test'),
            cacheTTL: fc.integer({ max: -1 }),
          })
        ),
        (config) => {
          expect(() => new JackClient(config as any)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid configs', () => {
    fc.assert(
      fc.property(
        fc.record({
          baseUrl: fc.webUrl(),
          timeout: fc.option(fc.integer({ min: 1, max: 60000 }), { nil: undefined }),
          maxRetries: fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
          retryDelay: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined }),
          retryBackoff: fc.option(fc.double({ min: 1, max: 3 }), { nil: undefined }),
          cacheTTL: fc.option(fc.integer({ min: 0, max: 300000 }), { nil: undefined }),
          enableCache: fc.option(fc.boolean(), { nil: undefined }),
        }),
        (config) => {
          expect(() => new JackClient(config)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
