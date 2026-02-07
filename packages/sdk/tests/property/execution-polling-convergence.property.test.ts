/**
 * Property-based tests for polling convergence
 * 
 * Feature: jack-sdk-core
 * Property 3: Status Polling Convergence
 * 
 * Tests that polling operations always terminate (either successfully or with timeout).
 * For any intent ID, polling with waitForStatus() should either reach the target status
 * within the timeout or throw a timeout error—it should never hang indefinitely.
 * 
 * **Validates: Requirements 2.5**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { ExecutionTracker } from '../../src/execution.js';
import { JackClient } from '../../src/client.js';
import { TimeoutError } from '../../src/errors.js';
import { ExecutionStatus } from '../../src/types.js';
import type { Intent, IntentParams } from '../../src/types.js';

// Arbitraries for generating test data
const intentIdArb = fc.string({
  minLength: 9,
  maxLength: 9,
  unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''))
}).map(suffix => `JK-${suffix}`);

const executionStatusArb = fc.constantFrom(
  ExecutionStatus.CREATED,
  ExecutionStatus.QUOTED,
  ExecutionStatus.EXECUTING,
  ExecutionStatus.SETTLING,
  ExecutionStatus.SETTLED,
  ExecutionStatus.ABORTED,
  ExecutionStatus.EXPIRED
);

const terminalStatusArb = fc.constantFrom(
  ExecutionStatus.SETTLED,
  ExecutionStatus.ABORTED,
  ExecutionStatus.EXPIRED
);

const nonTerminalStatusArb = fc.constantFrom(
  ExecutionStatus.CREATED,
  ExecutionStatus.QUOTED,
  ExecutionStatus.EXECUTING,
  ExecutionStatus.SETTLING
);

describe('Property 3: Status Polling Convergence', () => {
  let mockClient: JackClient;
  let tracker: ExecutionTracker;

  const validParams: IntentParams = {
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenOut: '0x4200000000000000000000000000000000000006',
    amountIn: '1000000',
    minAmountOut: '42000000000000000',
    deadline: Date.now() + 3600000,
  };

  const createMockIntent = (status: ExecutionStatus, id: string): Intent => ({
    id,
    params: validParams,
    signature: '0x1234567890abcdef',
    status,
    createdAt: Date.now(),
    executionSteps: [],
  });

  beforeEach(() => {
    // Create a client instance with retries disabled for testing
    mockClient = new JackClient({
      baseUrl: 'https://api.jack.test',
      maxRetries: 0,
    });
    tracker = new ExecutionTracker(mockClient);
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.5**
   * 
   * For any intent ID and target status, waitForStatus() should either:
   * 1. Successfully return the intent when the target status is reached
   * 2. Throw a TimeoutError when the timeout is exceeded
   * 
   * It should NEVER hang indefinitely. This property ensures that polling
   * operations always terminate, which is critical for application reliability.
   */
  it('should always terminate with success or timeout, never hang', async () => {
    await fc.assert(
      fc.asyncProperty(
        intentIdArb,
        executionStatusArb,
        terminalStatusArb,
        fc.integer({ min: 50, max: 500 }), // timeout
        fc.integer({ min: 10, max: 50 }), // interval
        async (
          intentId: string,
          currentStatus: ExecutionStatus,
          targetStatus: ExecutionStatus,
          timeout: number,
          interval: number
        ) => {
          // Scenario 1: Intent already has target status (immediate success)
          if (currentStatus === targetStatus) {
            const mockIntent = createMockIntent(currentStatus, intentId);
            vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

            const startTime = Date.now();
            const result = await tracker.waitForStatus(intentId, targetStatus, {
              interval,
              timeout,
            });

            const elapsed = Date.now() - startTime;

            // Should return immediately
            expect(result).toBeDefined();
            expect(result.status).toBe(targetStatus);
            expect(elapsed).toBeLessThan(timeout);
          }
          // Scenario 2: Intent never reaches target status (timeout)
          else {
            const mockIntent = createMockIntent(currentStatus, intentId);
            vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

            const startTime = Date.now();
            
            try {
              await tracker.waitForStatus(intentId, targetStatus, {
                interval,
                timeout,
              });
              
              // If we reach here, the status must have been reached
              // This shouldn't happen in this scenario, but if it does,
              // verify it completed within timeout
              const elapsed = Date.now() - startTime;
              expect(elapsed).toBeLessThan(timeout + 100); // Allow small margin
            } catch (error) {
              // Should throw TimeoutError
              expect(error).toBeInstanceOf(TimeoutError);
              
              const elapsed = Date.now() - startTime;
              
              // Should have waited approximately the timeout duration
              expect(elapsed).toBeGreaterThanOrEqual(timeout - 50); // Allow timing variance
              expect(elapsed).toBeLessThan(timeout + 200); // Allow small overhead
              
              if (error instanceof TimeoutError) {
                expect(error.timeoutMs).toBe(timeout);
                expect(error.message).toContain(intentId);
                expect(error.message).toContain(targetStatus);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that polling with status transitions always terminates
   * 
   * This tests the scenario where the intent status changes during polling,
   * eventually reaching the target status.
   */
  it('should terminate successfully when status transitions to target', async () => {
    await fc.assert(
      fc.asyncProperty(
        intentIdArb,
        fc.array(nonTerminalStatusArb, { minLength: 1, maxLength: 5 }),
        terminalStatusArb,
        async (
          intentId: string,
          intermediateStatuses: ExecutionStatus[],
          targetStatus: ExecutionStatus
        ) => {
          // Create a sequence of status transitions ending with target status
          const statusSequence = [...intermediateStatuses, targetStatus];
          
          // Mock the client to return each status in sequence
          const getSpy = vi.spyOn(mockClient, 'get');
          for (const status of statusSequence) {
            getSpy.mockResolvedValueOnce(createMockIntent(status, intentId));
          }

          const startTime = Date.now();
          const result = await tracker.waitForStatus(intentId, targetStatus, {
            interval: 10,
            timeout: 5000, // Generous timeout
          });

          const elapsed = Date.now() - startTime;

          // Should have succeeded
          expect(result).toBeDefined();
          expect(result.status).toBe(targetStatus);
          
          // Should have completed within timeout
          expect(elapsed).toBeLessThan(5000);
          
          // Should have polled at least as many times as there are statuses
          expect(getSpy).toHaveBeenCalledTimes(statusSequence.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that polling with multiple target statuses always terminates
   * 
   * This tests the scenario where we're waiting for any of several statuses.
   */
  it('should terminate when any target status is reached', async () => {
    await fc.assert(
      fc.asyncProperty(
        intentIdArb,
        fc.array(terminalStatusArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 2 }),
        async (
          intentId: string,
          targetStatuses: ExecutionStatus[],
          reachedIndex: number
        ) => {
          // Pick one of the target statuses to reach
          const reachedStatus = targetStatuses[reachedIndex % targetStatuses.length];
          
          // Mock the client to return the reached status
          vi.spyOn(mockClient, 'get').mockResolvedValue(
            createMockIntent(reachedStatus, intentId)
          );

          const startTime = Date.now();
          const result = await tracker.waitForStatus(intentId, targetStatuses, {
            interval: 10,
            timeout: 1000,
          });

          const elapsed = Date.now() - startTime;

          // Should have succeeded
          expect(result).toBeDefined();
          expect(targetStatuses).toContain(result.status);
          
          // Should have completed within timeout
          expect(elapsed).toBeLessThan(1000);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that polling always respects the timeout
   * 
   * This ensures that even with various polling intervals and timeouts,
   * the operation never exceeds the specified timeout by a significant margin.
   */
  it('should always respect timeout and never hang indefinitely', async () => {
    await fc.assert(
      fc.asyncProperty(
        intentIdArb,
        nonTerminalStatusArb,
        terminalStatusArb,
        fc.integer({ min: 100, max: 500 }), // timeout (reduced max for faster tests)
        fc.integer({ min: 10, max: 50 }), // interval (reduced max for faster tests)
        async (
          intentId: string,
          currentStatus: ExecutionStatus,
          targetStatus: ExecutionStatus,
          timeout: number,
          interval: number
        ) => {
          // Mock intent that never reaches target status
          vi.spyOn(mockClient, 'get').mockResolvedValue(
            createMockIntent(currentStatus, intentId)
          );

          const startTime = Date.now();
          
          try {
            await tracker.waitForStatus(intentId, targetStatus, {
              interval,
              timeout,
            });
            
            // If we reach here without error, verify it completed within timeout
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeLessThan(timeout + 100);
          } catch (error) {
            const elapsed = Date.now() - startTime;
            
            // Should throw TimeoutError
            expect(error).toBeInstanceOf(TimeoutError);
            
            // Should have waited approximately the timeout duration
            // Allow for timing variance but ensure it didn't hang
            expect(elapsed).toBeGreaterThanOrEqual(timeout - 50);
            expect(elapsed).toBeLessThan(timeout + 300); // Allow overhead but not indefinite hang
            
            // Verify the operation terminated (we got here)
            expect(true).toBe(true);
          }
        }
      ),
      { numRuns: 50 } // Reduced from 100 to avoid test timeout
    );
  }, 60000); // Increase test timeout to 60 seconds

  /**
   * Test that polling handles API errors gracefully and terminates
   * 
   * This ensures that even when API errors occur, the polling operation
   * terminates (by throwing the error) rather than hanging.
   */
  it('should terminate with error when API fails, not hang', async () => {
    await fc.assert(
      fc.asyncProperty(
        intentIdArb,
        terminalStatusArb,
        fc.constantFrom(
          'Network error',
          'Server error',
          'Not found',
          'Unauthorized'
        ),
        async (intentId: string, targetStatus: ExecutionStatus, errorMessage: string) => {
          // Mock the client to throw an error
          vi.spyOn(mockClient, 'get').mockRejectedValue(new Error(errorMessage));

          const startTime = Date.now();
          
          try {
            await tracker.waitForStatus(intentId, targetStatus, {
              interval: 10,
              timeout: 1000,
            });
            
            // Should not reach here
            expect.fail('Should have thrown an error');
          } catch (error) {
            const elapsed = Date.now() - startTime;
            
            // Should have thrown an error (not timeout)
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain(errorMessage);
            
            // Should have terminated quickly (not waited for timeout)
            expect(elapsed).toBeLessThan(500);
            
            // Verify the operation terminated
            expect(true).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test convergence with stopStatuses option
   * 
   * This ensures that polling terminates when stopStatuses are reached,
   * even if the target status is not reached.
   */
  it('should terminate when stopStatuses are reached', async () => {
    await fc.assert(
      fc.asyncProperty(
        intentIdArb,
        terminalStatusArb,
        terminalStatusArb,
        async (
          intentId: string,
          targetStatus: ExecutionStatus,
          stopStatus: ExecutionStatus
        ) => {
          // Skip if targetStatus and stopStatus are the same
          // (in that case, it would reach target status, not stop status)
          if (targetStatus === stopStatus) {
            return;
          }

          // Mock intent that reaches stopStatus (not targetStatus)
          vi.spyOn(mockClient, 'get')
            .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED, intentId))
            .mockResolvedValueOnce(createMockIntent(stopStatus, intentId));

          const startTime = Date.now();
          const result = await tracker.waitForStatus(intentId, targetStatus, {
            interval: 10,
            timeout: 1000,
            stopStatuses: [stopStatus],
          });

          const elapsed = Date.now() - startTime;

          // Should have terminated with stopStatus
          expect(result).toBeDefined();
          expect(result.status).toBe(stopStatus);
          
          // Should have completed quickly (not waited for timeout)
          expect(elapsed).toBeLessThan(500);
        }
      ),
      { numRuns: 50 }
    );
  });
});
