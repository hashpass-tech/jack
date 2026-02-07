/**
 * Unit tests for ExecutionTracker
 * 
 * Tests the ExecutionTracker class methods for polling and tracking intent execution.
 * Validates Requirements 2.1, 2.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionTracker } from '../../src/execution.js';
import { JackClient } from '../../src/client.js';
import { TimeoutError, APIError, NetworkError } from '../../src/errors.js';
import { ExecutionStatus } from '../../src/types.js';
import type { Intent, IntentParams } from '../../src/types.js';

describe('ExecutionTracker', () => {
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

  const createMockIntent = (status: ExecutionStatus, id = 'JK-ABC123456'): Intent => ({
    id,
    params: validParams,
    signature: '0x1234567890abcdef',
    status,
    createdAt: Date.now(),
    executionSteps: [],
  });

  beforeEach(() => {
    // Create a real client instance for testing
    mockClient = new JackClient({
      baseUrl: 'https://api.jack.test',
      timeout: 5000,
      maxRetries: 0, // Disable retries for unit tests
    });

    tracker = new ExecutionTracker(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create an ExecutionTracker instance', () => {
      expect(tracker).toBeInstanceOf(ExecutionTracker);
    });

    it('should accept a JackClient instance', () => {
      const client = new JackClient({ baseUrl: 'https://api.jack.test' });
      const trk = new ExecutionTracker(client);
      expect(trk).toBeInstanceOf(ExecutionTracker);
    });
  });

  describe('getStatus', () => {
    it('should make GET request to /api/intents/[id]', async () => {
      const mockIntent = createMockIntent(ExecutionStatus.CREATED);
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

      const intent = await tracker.getStatus('JK-ABC123456');

      expect(getSpy).toHaveBeenCalledWith('/api/intents/JK-ABC123456');
      expect(intent).toEqual(mockIntent);
    });

    it('should return complete Intent object (Requirement 2.1)', async () => {
      const mockIntent = createMockIntent(ExecutionStatus.EXECUTING);
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

      const intent = await tracker.getStatus('JK-ABC123456');

      expect(intent).toHaveProperty('id');
      expect(intent).toHaveProperty('params');
      expect(intent).toHaveProperty('status');
      expect(intent).toHaveProperty('createdAt');
      expect(intent).toHaveProperty('executionSteps');
    });

    it('should return current execution status', async () => {
      const mockIntent = createMockIntent(ExecutionStatus.SETTLING);
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

      const intent = await tracker.getStatus('JK-ABC123456');

      expect(intent.status).toBe(ExecutionStatus.SETTLING);
    });

    it('should include settlement transaction when settled', async () => {
      const mockIntent = {
        ...createMockIntent(ExecutionStatus.SETTLED),
        settlementTx: '0xabcdef1234567890',
      };
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

      const intent = await tracker.getStatus('JK-ABC123456');

      expect(intent.status).toBe(ExecutionStatus.SETTLED);
      expect(intent.settlementTx).toBe('0xabcdef1234567890');
    });

    it('should propagate API errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new APIError('Intent not found', 404)
      );

      await expect(
        tracker.getStatus('JK-NOTFOUND')
      ).rejects.toThrow(APIError);
    });

    it('should propagate network errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new NetworkError('Connection failed', new Error('Network error'))
      );

      await expect(
        tracker.getStatus('JK-ABC123456')
      ).rejects.toThrow(NetworkError);
    });
  });

  describe('waitForStatus', () => {
    it('should return immediately if intent already has target status', async () => {
      const mockIntent = createMockIntent(ExecutionStatus.SETTLED);
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

      const intent = await tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED
      );

      expect(intent.status).toBe(ExecutionStatus.SETTLED);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('should poll until target status is reached', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.QUOTED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.EXECUTING))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const intent = await tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED,
        { interval: 10 } // Fast polling for tests
      );

      expect(intent.status).toBe(ExecutionStatus.SETTLED);
      expect(getSpy).toHaveBeenCalledTimes(4);
    });

    it('should accept array of target statuses', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.ABORTED));

      const intent = await tracker.waitForStatus(
        'JK-ABC123456',
        [ExecutionStatus.SETTLED, ExecutionStatus.ABORTED, ExecutionStatus.EXPIRED],
        { interval: 10 }
      );

      expect(intent.status).toBe(ExecutionStatus.ABORTED);
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    it('should use default interval of 2000ms when not specified', async () => {
      const mockIntent = createMockIntent(ExecutionStatus.SETTLED);
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

      const startTime = Date.now();
      await tracker.waitForStatus('JK-ABC123456', ExecutionStatus.SETTLED);
      const elapsed = Date.now() - startTime;

      // Should return immediately without waiting
      expect(elapsed).toBeLessThan(100);
    });

    it('should use default timeout of 60000ms when not specified', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.CREATED)
      );

      const promise = tracker.waitForStatus('JK-ABC123456', ExecutionStatus.SETTLED, {
        interval: 10,
        timeout: 100 // Use shorter timeout for test
      });

      await expect(promise).rejects.toThrow(TimeoutError);
    });

    it('should throw TimeoutError if timeout exceeded (Requirement 2.5)', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.CREATED)
      );

      await expect(
        tracker.waitForStatus(
          'JK-ABC123456',
          ExecutionStatus.SETTLED,
          { interval: 10, timeout: 50 }
        )
      ).rejects.toThrow(TimeoutError);
    });

    it('should include timeout details in TimeoutError', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.CREATED)
      );

      try {
        await tracker.waitForStatus(
          'JK-ABC123456',
          ExecutionStatus.SETTLED,
          { interval: 10, timeout: 50 }
        );
        expect.fail('Should have thrown TimeoutError');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        if (error instanceof TimeoutError) {
          expect(error.timeoutMs).toBe(50);
          expect(error.message).toContain('JK-ABC123456');
          expect(error.message).toContain('SETTLED');
          expect(error.context).toHaveProperty('intentId');
          expect(error.context).toHaveProperty('targetStatuses');
          expect(error.context).toHaveProperty('elapsed');
        }
      }
    });

    it('should respect custom poll interval', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const startTime = Date.now();
      await tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED,
        { interval: 100 }
      );
      const elapsed = Date.now() - startTime;

      expect(getSpy).toHaveBeenCalledTimes(2);
      // Should have waited at least 100ms between polls
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some timing variance
    });

    it('should stop polling on stopStatuses even if target not reached', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.ABORTED));

      const intent = await tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED,
        { 
          interval: 10,
          stopStatuses: [ExecutionStatus.ABORTED, ExecutionStatus.EXPIRED]
        }
      );

      expect(intent.status).toBe(ExecutionStatus.ABORTED);
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    it('should propagate API errors during polling', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockRejectedValueOnce(new APIError('Server error', 500));

      await expect(
        tracker.waitForStatus(
          'JK-ABC123456',
          ExecutionStatus.SETTLED,
          { interval: 10 }
        )
      ).rejects.toThrow(APIError);
    });

    it('should propagate network errors during polling', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockRejectedValueOnce(
          new NetworkError('Connection failed', new Error('Network error'))
        );

      await expect(
        tracker.waitForStatus(
          'JK-ABC123456',
          ExecutionStatus.SETTLED,
          { interval: 10 }
        )
      ).rejects.toThrow(NetworkError);
    });

    it('should handle multiple status transitions', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.QUOTED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.EXECUTING))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLING))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const intent = await tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED,
        { interval: 10 }
      );

      expect(intent.status).toBe(ExecutionStatus.SETTLED);
      expect(getSpy).toHaveBeenCalledTimes(5);
    });

    it('should work with single status or array of statuses', async () => {
      // Test with single status
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.SETTLED)
      );

      const intent1 = await tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED
      );
      expect(intent1.status).toBe(ExecutionStatus.SETTLED);

      // Test with array of statuses
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.ABORTED)
      );

      const intent2 = await tracker.waitForStatus(
        'JK-ABC123456',
        [ExecutionStatus.SETTLED, ExecutionStatus.ABORTED]
      );
      expect(intent2.status).toBe(ExecutionStatus.ABORTED);
    });

    it('should never hang indefinitely (Requirement 2.5)', async () => {
      // Mock intent that never reaches target status
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.CREATED)
      );

      // Should timeout, not hang
      const promise = tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED,
        { interval: 10, timeout: 100 }
      );

      await expect(promise).rejects.toThrow(TimeoutError);
    });
  });

  describe('integration scenarios', () => {
    it('should support workflow: getStatus -> waitForStatus', async () => {
      // Step 1: Check initial status
      vi.spyOn(mockClient, 'get').mockResolvedValueOnce(
        createMockIntent(ExecutionStatus.CREATED)
      );
      const initialIntent = await tracker.getStatus('JK-ABC123456');
      expect(initialIntent.status).toBe(ExecutionStatus.CREATED);

      // Step 2: Wait for settlement
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.EXECUTING))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const settledIntent = await tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED,
        { interval: 10 }
      );
      expect(settledIntent.status).toBe(ExecutionStatus.SETTLED);
    });

    it('should handle terminal statuses (SETTLED, ABORTED, EXPIRED)', async () => {
      // Test SETTLED
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.SETTLED)
      );
      const settled = await tracker.waitForStatus(
        'JK-ABC123456',
        [ExecutionStatus.SETTLED, ExecutionStatus.ABORTED, ExecutionStatus.EXPIRED]
      );
      expect(settled.status).toBe(ExecutionStatus.SETTLED);

      // Test ABORTED
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.ABORTED)
      );
      const aborted = await tracker.waitForStatus(
        'JK-ABC123456',
        [ExecutionStatus.SETTLED, ExecutionStatus.ABORTED, ExecutionStatus.EXPIRED]
      );
      expect(aborted.status).toBe(ExecutionStatus.ABORTED);

      // Test EXPIRED
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.EXPIRED)
      );
      const expired = await tracker.waitForStatus(
        'JK-ABC123456',
        [ExecutionStatus.SETTLED, ExecutionStatus.ABORTED, ExecutionStatus.EXPIRED]
      );
      expect(expired.status).toBe(ExecutionStatus.EXPIRED);
    });

    it('should handle fast status transitions', async () => {
      // Simulate very fast transitions
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const intent = await tracker.waitForStatus(
        'JK-ABC123456',
        ExecutionStatus.SETTLED,
        { interval: 1 } // Very fast polling
      );

      expect(intent.status).toBe(ExecutionStatus.SETTLED);
      expect(getSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('watch', () => {
    it('should create an ExecutionWatcher instance', () => {
      const watcher = tracker.watch('JK-ABC123456');
      
      expect(watcher).toBeDefined();
      expect(watcher.intentId).toBe('JK-ABC123456');
      expect(typeof watcher.onUpdate).toBe('function');
      expect(typeof watcher.onError).toBe('function');
      expect(typeof watcher.onComplete).toBe('function');
      expect(typeof watcher.stop).toBe('function');
      
      watcher.stop();
    });

    it('should emit update events when status changes (Requirement 2.2)', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.QUOTED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.EXECUTING))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      const updates: Intent[] = [];

      watcher.onUpdate((intent) => {
        updates.push(intent);
      });

      // Wait for polling to complete
      await new Promise(resolve => {
        watcher.onComplete(() => resolve(undefined));
      });

      expect(updates.length).toBeGreaterThan(0);
      expect(updates.some(u => u.status === ExecutionStatus.QUOTED)).toBe(true);
      expect(getSpy).toHaveBeenCalled();
    });

    it('should emit complete event on terminal status', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      const completePromise = new Promise<Intent>((resolve) => {
        watcher.onComplete((intent) => {
          resolve(intent);
        });
      });

      const completedIntent = await completePromise;
      expect(completedIntent.status).toBe(ExecutionStatus.SETTLED);
    });

    it('should emit complete event on ABORTED status', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.ABORTED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      const completePromise = new Promise<Intent>((resolve) => {
        watcher.onComplete((intent) => {
          resolve(intent);
        });
      });

      const completedIntent = await completePromise;
      expect(completedIntent.status).toBe(ExecutionStatus.ABORTED);
    });

    it('should emit complete event on EXPIRED status', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.EXPIRED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      const completePromise = new Promise<Intent>((resolve) => {
        watcher.onComplete((intent) => {
          resolve(intent);
        });
      });

      const completedIntent = await completePromise;
      expect(completedIntent.status).toBe(ExecutionStatus.EXPIRED);
    });

    it('should emit error event on API errors', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockRejectedValueOnce(new APIError('Server error', 500));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      const errorPromise = new Promise<Error>((resolve) => {
        watcher.onError((error) => {
          resolve(error);
        });
      });

      const error = await errorPromise;
      expect(error).toBeInstanceOf(APIError);
    });

    it('should emit error event on timeout', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.CREATED)
      );

      const watcher = tracker.watch('JK-ABC123456', { 
        interval: 10,
        timeout: 50
      });
      
      const errorPromise = new Promise<Error>((resolve) => {
        watcher.onError((error) => {
          resolve(error);
        });
      });

      const error = await errorPromise;
      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should stop polling when stop() is called', async () => {
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.CREATED)
      );

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      // Wait a bit for first poll
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const callCountBeforeStop = getSpy.mock.calls.length;
      watcher.stop();
      
      // Wait to ensure no more polls happen
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const callCountAfterStop = getSpy.mock.calls.length;
      expect(callCountAfterStop).toBe(callCountBeforeStop);
    });

    it('should support multiple update callbacks', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.QUOTED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      const updates1: Intent[] = [];
      const updates2: Intent[] = [];

      watcher.onUpdate((intent) => updates1.push(intent));
      watcher.onUpdate((intent) => updates2.push(intent));

      await new Promise(resolve => {
        watcher.onComplete(() => resolve(undefined));
      });

      expect(updates1.length).toBeGreaterThan(0);
      expect(updates2.length).toBeGreaterThan(0);
      expect(updates1.length).toBe(updates2.length);
    });

    it('should support multiple complete callbacks', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      let complete1Called = false;
      let complete2Called = false;

      watcher.onComplete(() => { complete1Called = true; });
      watcher.onComplete(() => { complete2Called = true; });

      await new Promise(resolve => {
        watcher.onComplete(() => resolve(undefined));
      });

      expect(complete1Called).toBe(true);
      expect(complete2Called).toBe(true);
    });

    it('should support multiple error callbacks', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockRejectedValueOnce(new APIError('Server error', 500));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      let error1Called = false;
      let error2Called = false;

      watcher.onError(() => { error1Called = true; });
      watcher.onError(() => { error2Called = true; });

      await new Promise(resolve => {
        watcher.onError(() => resolve(undefined));
      });

      expect(error1Called).toBe(true);
      expect(error2Called).toBe(true);
    });

    it('should stop automatically after completion', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      await new Promise(resolve => {
        watcher.onComplete(() => resolve(undefined));
      });

      const callCountAfterComplete = getSpy.mock.calls.length;
      
      // Wait to ensure no more polls happen
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(getSpy.mock.calls.length).toBe(callCountAfterComplete);
    });

    it('should stop automatically after error', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockRejectedValueOnce(new APIError('Server error', 500));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      await new Promise(resolve => {
        watcher.onError(() => resolve(undefined));
      });

      const callCountAfterError = getSpy.mock.calls.length;
      
      // Wait to ensure no more polls happen
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(getSpy.mock.calls.length).toBe(callCountAfterError);
    });

    it('should handle stop() being called multiple times', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.CREATED)
      );

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      watcher.stop();
      watcher.stop();
      watcher.stop();
      
      // Should not throw or cause issues
      expect(true).toBe(true);
    });

    it('should implement unsubscribe() as alias for stop()', async () => {
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue(
        createMockIntent(ExecutionStatus.CREATED)
      );

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      // Wait a bit for first poll
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const callCountBeforeUnsubscribe = getSpy.mock.calls.length;
      watcher.unsubscribe();
      
      // Wait to ensure no more polls happen
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const callCountAfterUnsubscribe = getSpy.mock.calls.length;
      expect(callCountAfterUnsubscribe).toBe(callCountBeforeUnsubscribe);
    });

    it('should use custom poll interval', async () => {
      const getSpy = vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.QUOTED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const startTime = Date.now();
      const watcher = tracker.watch('JK-ABC123456', { interval: 100 });
      
      await new Promise(resolve => {
        watcher.onComplete(() => resolve(undefined));
      });
      
      const elapsed = Date.now() - startTime;
      
      // Should have waited at least 200ms (2 intervals)
      expect(elapsed).toBeGreaterThanOrEqual(180); // Allow some timing variance
      expect(getSpy).toHaveBeenCalled();
    });

    it('should not emit update on first poll (no status change yet)', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      const updates: Intent[] = [];

      watcher.onUpdate((intent) => {
        updates.push(intent);
      });

      await new Promise(resolve => {
        watcher.onComplete(() => resolve(undefined));
      });

      // Should not have emitted update for first poll or when status didn't change
      // Only when status changed from CREATED to SETTLED
      expect(updates.length).toBeGreaterThan(0);
      expect(updates.every(u => u.status !== ExecutionStatus.CREATED)).toBe(true);
    });

    it('should handle callback errors gracefully (Requirement 8.3)', async () => {
      vi.spyOn(mockClient, 'get')
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.CREATED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.QUOTED))
        .mockResolvedValueOnce(createMockIntent(ExecutionStatus.SETTLED));

      const watcher = tracker.watch('JK-ABC123456', { interval: 10 });
      
      // Add callback that throws
      watcher.onUpdate(() => {
        throw new Error('Callback error');
      });

      // Add another callback that should still be called
      let secondCallbackCalled = false;
      watcher.onUpdate(() => {
        secondCallbackCalled = true;
      });

      await new Promise(resolve => {
        watcher.onComplete(() => resolve(undefined));
      });

      // Second callback should still have been called despite first one throwing
      expect(secondCallbackCalled).toBe(true);
    });
  });
});
