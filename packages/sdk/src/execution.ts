/**
 * Execution tracking for the JACK SDK
 * 
 * This module provides the ExecutionTracker class for polling intent status
 * and waiting for specific execution states.
 * 
 * Requirements: 2.1, 2.5
 */

import { ExecutionStatus, type Intent, type PollOptions, type ExecutionWatcher } from './types.js';
import { TimeoutError } from './errors.js';
import type { JackClient } from './client.js';

/**
 * Manager for execution tracking operations
 * 
 * Provides methods to poll intent status, wait for specific statuses,
 * and track execution progress with configurable timeouts.
 * 
 * @example
 * ```typescript
 * const client = new JackClient({ baseUrl: 'https://api.jack.example' });
 * const tracker = new ExecutionTracker(client);
 * 
 * // Wait for intent to settle
 * const intent = await tracker.waitForStatus(
 *   'JK-ABC123456',
 *   ExecutionStatus.SETTLED,
 *   { timeout: 120000 }
 * );
 * 
 * console.log('Settlement tx:', intent.settlementTx);
 * ```
 */
export class ExecutionTracker {
  private readonly client: JackClient;

  /**
   * Creates a new ExecutionTracker
   * 
   * @param client - The JackClient instance to use for API requests
   */
  constructor(client: JackClient) {
    this.client = client;
  }

  /**
   * Get current status of an intent
   * 
   * Queries the JACK API for the current intent status. This is a single
   * request that returns the intent's current state without polling.
   * This method delegates to the IntentManager's get() method.
   * 
   * @param intentId - The intent ID to query (format: JK-[A-Z0-9]{9})
   * @returns Promise resolving to the complete Intent object
   * @throws APIError if the intent is not found (404) or other API error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * const intent = await tracker.getStatus('JK-ABC123456');
   * console.log('Current status:', intent.status);
   * ```
   * 
   * **Validates: Requirement 2.1**
   */
  async getStatus(intentId: string): Promise<Intent> {
    return this.client.get<Intent>(`/api/intents/${intentId}`);
  }

  /**
   * Wait for intent to reach a specific status
   * 
   * Polls the intent status at regular intervals until it reaches one of the
   * target statuses or the timeout is exceeded. This is useful for waiting
   * for intent completion or specific state transitions.
   * 
   * The polling loop will stop when:
   * - The intent reaches one of the target statuses
   * - The timeout is exceeded (throws TimeoutError)
   * - An API error occurs (throws APIError)
   * 
   * @param intentId - The intent ID to poll
   * @param targetStatus - Single status or array of statuses to wait for
   * @param options - Polling configuration (interval, timeout, stopStatuses)
   * @returns Promise resolving to the Intent when target status is reached
   * @throws TimeoutError if timeout is exceeded before reaching target status
   * @throws APIError if the API returns an error
   * @throws NetworkError if the network request fails
   * 
   * @example
   * ```typescript
   * // Wait for settlement with custom timeout
   * const intent = await tracker.waitForStatus(
   *   'JK-ABC123456',
   *   ExecutionStatus.SETTLED,
   *   { interval: 3000, timeout: 120000 }
   * );
   * 
   * // Wait for any terminal status
   * const intent = await tracker.waitForStatus(
   *   'JK-ABC123456',
   *   [ExecutionStatus.SETTLED, ExecutionStatus.ABORTED, ExecutionStatus.EXPIRED]
   * );
   * ```
   * 
   * **Validates: Requirement 2.5**
   */
  async waitForStatus(
    intentId: string,
    targetStatus: ExecutionStatus | ExecutionStatus[],
    options?: PollOptions
  ): Promise<Intent> {
    const interval = options?.interval ?? 2000;
    const timeout = options?.timeout ?? 60000;
    const targetStatuses = Array.isArray(targetStatus) ? targetStatus : [targetStatus];
    
    const startTime = Date.now();

    while (true) {
      // Check if timeout exceeded
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        throw new TimeoutError(
          `Timeout waiting for intent ${intentId} to reach status ${targetStatuses.join(' or ')}`,
          timeout,
          { intentId, targetStatuses, elapsed }
        );
      }

      // Get current status
      const intent = await this.getStatus(intentId);

      // Check if we've reached target status
      if (targetStatuses.includes(intent.status)) {
        return intent;
      }

      // Check if we should stop polling based on stopStatuses
      if (options?.stopStatuses && options.stopStatuses.includes(intent.status)) {
        return intent;
      }

      // Wait before next poll
      await this.sleep(interval);
    }
  }

  /**
   * Create a watcher for continuous intent status updates
   * 
   * Returns an ExecutionWatcher that polls the intent status at regular
   * intervals and emits events when the status changes. This is useful for
   * real-time monitoring of intent execution.
   * 
   * The watcher will continue polling until:
   * - stop() is called
   * - A terminal status is reached (SETTLED, ABORTED, EXPIRED)
   * - An error occurs (emitted via onError callback)
   * 
   * @param intentId - The intent ID to watch
   * @param options - Polling configuration (interval, timeout)
   * @returns ExecutionWatcher instance with event callbacks
   * 
   * @example
   * ```typescript
   * const watcher = tracker.watch('JK-ABC123456', { interval: 3000 });
   * 
   * watcher.onUpdate((intent) => {
   *   console.log('Status updated:', intent.status);
   * });
   * 
   * watcher.onComplete((intent) => {
   *   console.log('Intent completed:', intent.settlementTx);
   *   watcher.stop();
   * });
   * 
   * watcher.onError((error) => {
   *   console.error('Polling error:', error);
   * });
   * ```
   * 
   * **Validates: Requirements 2.2, 8.3**
   */
  watch(intentId: string, options?: PollOptions): ExecutionWatcher {
    return new ExecutionWatcherImpl(this, intentId, options);
  }

  /**
   * Sleep for specified milliseconds
   * 
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the specified delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Implementation of ExecutionWatcher for continuous intent monitoring
 * 
 * This class implements the event emitter pattern for watching intent status
 * changes. It polls the API at regular intervals and emits events when the
 * status changes or when terminal states are reached.
 * 
 * Requirements: 2.2, 8.3
 */
class ExecutionWatcherImpl implements ExecutionWatcher {
  public readonly intentId: string;
  
  private readonly tracker: ExecutionTracker;
  private readonly interval: number;
  private readonly timeout: number;
  private readonly startTime: number;
  
  private updateCallbacks: Array<(intent: Intent) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];
  private completeCallbacks: Array<(intent: Intent) => void> = [];
  
  private isRunning = false;
  private isStopped = false;
  private timeoutHandle: NodeJS.Timeout | null = null;
  private lastStatus: ExecutionStatus | null = null;

  /**
   * Creates a new ExecutionWatcher
   * 
   * @param tracker - The ExecutionTracker instance to use for polling
   * @param intentId - The intent ID to watch
   * @param options - Polling configuration
   */
  constructor(tracker: ExecutionTracker, intentId: string, options?: PollOptions) {
    this.tracker = tracker;
    this.intentId = intentId;
    this.interval = options?.interval ?? 2000;
    this.timeout = options?.timeout ?? 60000;
    this.startTime = Date.now();
    
    // Start polling immediately
    this.startPolling();
  }

  /**
   * Register callback for status updates
   * 
   * The callback is invoked whenever the intent status changes. Multiple
   * callbacks can be registered and will all be invoked in order.
   * 
   * @param callback - Function to call with updated intent
   */
  onUpdate(callback: (intent: Intent) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Register callback for errors
   * 
   * The callback is invoked when an error occurs during polling (e.g.,
   * network error, API error, timeout). Multiple callbacks can be registered.
   * 
   * @param callback - Function to call with error
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Register callback for completion
   * 
   * The callback is invoked when the intent reaches a terminal status
   * (SETTLED, ABORTED, or EXPIRED). Multiple callbacks can be registered.
   * After completion, polling stops automatically.
   * 
   * @param callback - Function to call with final intent state
   */
  onComplete(callback: (intent: Intent) => void): void {
    this.completeCallbacks.push(callback);
  }

  /**
   * Stop watching and clean up resources
   * 
   * Stops the polling loop and clears all callbacks. This method is
   * idempotent and can be called multiple times safely.
   */
  stop(): void {
    this.isStopped = true;
    this.isRunning = false;
    
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    
    // Clear all callbacks to prevent memory leaks
    this.updateCallbacks = [];
    this.errorCallbacks = [];
    this.completeCallbacks = [];
  }

  /**
   * Alias for stop() to implement Subscription interface
   */
  unsubscribe(): void {
    this.stop();
  }

  /**
   * Start the polling loop
   */
  private startPolling(): void {
    if (this.isStopped || this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.poll();
  }

  /**
   * Execute a single poll iteration
   */
  private async poll(): Promise<void> {
    if (this.isStopped || !this.isRunning) {
      return;
    }

    try {
      // Check if timeout exceeded
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.timeout) {
        const error = new TimeoutError(
          `Timeout watching intent ${this.intentId}`,
          this.timeout,
          { intentId: this.intentId, elapsed }
        );
        this.emitError(error);
        this.stop();
        return;
      }

      // Get current status
      const intent = await this.tracker.getStatus(this.intentId);

      // Check if status changed
      const statusChanged = this.lastStatus !== null && this.lastStatus !== intent.status;
      this.lastStatus = intent.status;

      // Emit update if status changed
      if (statusChanged) {
        this.emitUpdate(intent);
      }

      // Check if we've reached a terminal status
      const terminalStatuses: ExecutionStatus[] = [
        ExecutionStatus.SETTLED,
        ExecutionStatus.ABORTED,
        ExecutionStatus.EXPIRED
      ];
      
      if (terminalStatuses.includes(intent.status)) {
        this.emitComplete(intent);
        this.stop();
        return;
      }

      // Schedule next poll
      this.scheduleNextPoll();
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)));
      this.stop();
    }
  }

  /**
   * Schedule the next poll iteration
   */
  private scheduleNextPoll(): void {
    if (this.isStopped || !this.isRunning) {
      return;
    }

    this.timeoutHandle = setTimeout(() => {
      this.poll();
    }, this.interval);
  }

  /**
   * Emit update event to all registered callbacks
   */
  private emitUpdate(intent: Intent): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(intent);
      } catch (error) {
        // Catch errors in callbacks to prevent them from breaking the polling loop
        console.error('Error in onUpdate callback:', error);
      }
    }
  }

  /**
   * Emit error event to all registered callbacks
   */
  private emitError(error: Error): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (err) {
        // Catch errors in callbacks
        console.error('Error in onError callback:', err);
      }
    }
  }

  /**
   * Emit complete event to all registered callbacks
   */
  private emitComplete(intent: Intent): void {
    for (const callback of this.completeCallbacks) {
      try {
        callback(intent);
      } catch (error) {
        // Catch errors in callbacks
        console.error('Error in onComplete callback:', error);
      }
    }
  }
}
