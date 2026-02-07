/**
 * Agent utilities for the JACK SDK
 * 
 * This module provides the AgentUtils class with high-level abstractions
 * for batch operations, dry-run validation, policy enforcement, and
 * event subscriptions for automated agent systems.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import type {
  IntentParams,
  Intent,
  BatchSubmitResult,
  DryRunResult,
  ValidationResult,
  Policy,
  Subscription,
  PollOptions
} from './types.js';
import type { JackClient } from './client.js';
import { IntentManager } from './intents.js';
import { ExecutionTracker } from './execution.js';
import { validateIntentParams } from './validation.js';

/**
 * Utilities for agent-based intent orchestration
 * 
 * Provides batch operations, dry-run validation, policy enforcement,
 * and multi-intent subscriptions for automated systems.
 * 
 * @example
 * ```typescript
 * const client = new JackClient({ baseUrl: 'https://api.jack.example' });
 * const agent = new AgentUtils(client);
 * 
 * // Batch submit multiple intents
 * const results = await agent.batchSubmit([
 *   { params: intent1, signature: sig1 },
 *   { params: intent2, signature: sig2 }
 * ]);
 * 
 * results.forEach(result => {
 *   if (result.success) {
 *     console.log('Submitted:', result.intentId);
 *   } else {
 *     console.error('Failed:', result.error);
 *   }
 * });
 * ```
 */
export class AgentUtils {
  private readonly client: JackClient;
  private readonly intentManager: IntentManager;
  private readonly executionTracker: ExecutionTracker;

  /**
   * Creates a new AgentUtils instance
   * 
   * @param client - The JackClient instance to use for API requests
   */
  constructor(client: JackClient) {
    this.client = client;
    this.intentManager = new IntentManager(client);
    this.executionTracker = new ExecutionTracker(client);
  }

  /**
   * Submit multiple intents in parallel
   * 
   * Uses Promise.allSettled() to submit all intents concurrently,
   * ensuring that failures in individual submissions don't affect others.
   * The result array length always matches the input array length,
   * with each result corresponding to the same index in the input.
   * 
   * @param intents - Array of intent parameters and signatures to submit
   * @returns Promise resolving to array of BatchSubmitResult objects
   * 
   * @example
   * ```typescript
   * const results = await agent.batchSubmit([
   *   { params: intent1, signature: sig1 },
   *   { params: intent2, signature: sig2 },
   *   { params: intent3, signature: sig3 }
   * ]);
   * 
   * // Results array has same length as input
   * console.log(results.length); // 3
   * 
   * // Check individual results
   * results.forEach((result, index) => {
   *   if (result.success) {
   *     console.log(`Intent ${index} submitted: ${result.intentId}`);
   *   } else {
   *     console.error(`Intent ${index} failed:`, result.error?.message);
   *   }
   * });
   * 
   * // Count successes and failures
   * const successes = results.filter(r => r.success).length;
   * const failures = results.filter(r => !r.success).length;
   * console.log(`${successes} succeeded, ${failures} failed`);
   * ```
   * 
   * **Validates: Requirements 8.1, 8.2**
   */
  async batchSubmit(
    intents: Array<{ params: IntentParams; signature: string }>
  ): Promise<BatchSubmitResult[]> {
    // Submit all intents in parallel using Promise.allSettled
    // This ensures all submissions are attempted regardless of individual failures
    const promises = intents.map(async ({ params, signature }) => {
      return this.intentManager.submit(params, signature);
    });

    const results = await Promise.allSettled(promises);

    // Transform PromiseSettledResult to BatchSubmitResult
    // Ensure result array length matches input array length
    return results.map((result, index): BatchSubmitResult => {
      if (result.status === 'fulfilled') {
        return {
          intentId: result.value,
          success: true
        };
      } else {
        return {
          intentId: '', // Empty string for failed submissions
          success: false,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason))
        };
      }
    });
  }

  /**
   * Simulate intent execution without submission
   * 
   * Validates intent parameters and estimates costs without actually
   * submitting the intent to the API. Useful for testing and validation.
   * 
   * @param params - Intent parameters to validate
   * @returns Promise resolving to DryRunResult with validation status
   * 
   * @example
   * ```typescript
   * const result = await agent.dryRun(params);
   * if (result.valid) {
   *   console.log('Estimated cost:', result.estimatedCost);
   * } else {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   * 
   * **Validates: Requirement 8.4**
   */
  async dryRun(params: IntentParams): Promise<DryRunResult> {
    const validation = validateIntentParams(params);
    
    if (!validation.valid) {
      return {
        valid: false,
        errors: validation.errors
      };
    }

    // In a real implementation, this might call an API endpoint
    // to get cost estimates. For now, we just return validation status.
    return {
      valid: true,
      estimatedCost: undefined, // Could be populated by API call
      errors: []
    };
  }

  /**
   * Validate intent parameters against policy rules
   * 
   * Checks that intent parameters comply with the specified policy,
   * including amount limits, allowed chains, tokens, and deadline constraints.
   * 
   * @param params - Intent parameters to validate
   * @param policy - Policy rules to enforce
   * @returns ValidationResult with valid flag and error messages
   * 
   * @example
   * ```typescript
   * const policy: Policy = {
   *   maxAmountIn: '1000000000',
   *   allowedSourceChains: ['arbitrum', 'optimism'],
   *   allowedDestinationChains: ['base', 'ethereum'],
   *   maxDeadlineOffset: 3600000 // 1 hour
   * };
   * 
   * const result = agent.validatePolicy(params, policy);
   * if (!result.valid) {
   *   console.error('Policy violations:', result.errors);
   * }
   * ```
   * 
   * **Validates: Requirement 8.5**
   */
  validatePolicy(params: IntentParams, policy: Policy): ValidationResult {
    const errors: string[] = [];

    // Check maximum amount in
    if (policy.maxAmountIn !== undefined) {
      const maxAmount = BigInt(policy.maxAmountIn);
      const amount = BigInt(params.amountIn);
      if (amount > maxAmount) {
        errors.push(`Amount in ${params.amountIn} exceeds maximum ${policy.maxAmountIn}`);
      }
    }

    // Check minimum amount out
    if (policy.minAmountOut !== undefined) {
      const minAmount = BigInt(policy.minAmountOut);
      const amount = BigInt(params.minAmountOut);
      if (amount < minAmount) {
        errors.push(`Minimum amount out ${params.minAmountOut} is below policy minimum ${policy.minAmountOut}`);
      }
    }

    // Check allowed source chains
    if (policy.allowedSourceChains !== undefined) {
      if (!policy.allowedSourceChains.includes(params.sourceChain)) {
        errors.push(`Source chain ${params.sourceChain} is not in allowed list: ${policy.allowedSourceChains.join(', ')}`);
      }
    }

    // Check allowed destination chains
    if (policy.allowedDestinationChains !== undefined) {
      if (!policy.allowedDestinationChains.includes(params.destinationChain)) {
        errors.push(`Destination chain ${params.destinationChain} is not in allowed list: ${policy.allowedDestinationChains.join(', ')}`);
      }
    }

    // Check allowed input tokens
    if (policy.allowedTokensIn !== undefined) {
      if (!policy.allowedTokensIn.includes(params.tokenIn)) {
        errors.push(`Input token ${params.tokenIn} is not in allowed list`);
      }
    }

    // Check allowed output tokens
    if (policy.allowedTokensOut !== undefined) {
      if (!policy.allowedTokensOut.includes(params.tokenOut)) {
        errors.push(`Output token ${params.tokenOut} is not in allowed list`);
      }
    }

    // Check maximum deadline offset
    if (policy.maxDeadlineOffset !== undefined) {
      const now = Date.now();
      const deadlineOffset = params.deadline - now;
      if (deadlineOffset > policy.maxDeadlineOffset) {
        errors.push(`Deadline offset ${deadlineOffset}ms exceeds maximum ${policy.maxDeadlineOffset}ms`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Subscribe to status changes for multiple intents
   * 
   * Polls multiple intents in parallel and invokes the callback whenever
   * any intent's status changes. Returns a Subscription object that can
   * be used to unsubscribe and stop polling.
   * 
   * @param intentIds - Array of intent IDs to monitor
   * @param callback - Function to call when any intent status changes
   * @param options - Polling options (interval, timeout)
   * @returns Subscription object with unsubscribe() method
   * 
   * @example
   * ```typescript
   * const subscription = agent.subscribeToUpdates(
   *   ['JK-ABC123456', 'JK-DEF789012'],
   *   (intentId, intent) => {
   *     console.log(`${intentId} status changed to ${intent.status}`);
   *   },
   *   { interval: 5000 }
   * );
   * 
   * // Later, stop polling
   * subscription.unsubscribe();
   * ```
   * 
   * **Validates: Requirement 8.3**
   */
  subscribeToUpdates(
    intentIds: string[],
    callback: (intentId: string, intent: Intent) => void,
    options?: PollOptions
  ): Subscription {
    const interval = options?.interval ?? 2000;
    const timeout = options?.timeout;
    const startTime = Date.now();
    
    // Track last known status for each intent
    const lastStatuses = new Map<string, string>();
    
    let intervalId: NodeJS.Timeout | null = null;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      // Check timeout
      if (timeout && Date.now() - startTime > timeout) {
        stopped = true;
        if (intervalId) clearInterval(intervalId);
        return;
      }

      // Poll all intents in parallel
      const promises = intentIds.map(async (intentId) => {
        try {
          const intent = await this.intentManager.get(intentId);
          
          // Check if status changed
          const lastStatus = lastStatuses.get(intentId);
          if (lastStatus !== intent.status) {
            lastStatuses.set(intentId, intent.status);
            callback(intentId, intent);
          }
        } catch (error) {
          // Silently ignore errors in polling
          // In a production implementation, might want to expose error callbacks
        }
      });

      await Promise.allSettled(promises);
    };

    // Start polling
    intervalId = setInterval(poll, interval);
    
    // Do initial poll
    poll().catch(() => {
      // Ignore initial poll errors
    });

    return {
      unsubscribe() {
        stopped = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };
  }
}
