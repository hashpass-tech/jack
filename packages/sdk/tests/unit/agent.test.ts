/**
 * Unit tests for AgentUtils
 * 
 * Tests batch submission, dry-run validation, policy enforcement,
 * and multi-intent subscriptions.
 * 
 * Requirements: 8.1, 8.2, 8.4, 8.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentUtils } from '../../src/agent.js';
import { JackClient } from '../../src/client.js';
import { ValidationError } from '../../src/errors.js';
import type { IntentParams, Policy } from '../../src/types.js';

describe('AgentUtils', () => {
  let client: JackClient;
  let agent: AgentUtils;

  const validParams: IntentParams = {
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
    tokenOut: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
    amountIn: '1000000',
    minAmountOut: '42000000000000000',
    deadline: Date.now() + 3600000
  };

  beforeEach(() => {
    client = new JackClient({ baseUrl: 'https://api.jack.example' });
    agent = new AgentUtils(client);
  });

  describe('batchSubmit', () => {
    it('should submit multiple intents successfully', async () => {
      // Mock the fetch function to return successful responses
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ intentId: 'JK-ABC123456' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ intentId: 'JK-DEF789012' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ intentId: 'JK-GHI345678' })
        });

      const intents = [
        { params: validParams, signature: 'sig1' },
        { params: validParams, signature: 'sig2' },
        { params: validParams, signature: 'sig3' }
      ];

      const results = await agent.batchSubmit(intents);

      // Verify result array length matches input array length
      expect(results).toHaveLength(3);

      // Verify all submissions succeeded
      expect(results[0].success).toBe(true);
      expect(results[0].intentId).toBe('JK-ABC123456');
      expect(results[1].success).toBe(true);
      expect(results[1].intentId).toBe('JK-DEF789012');
      expect(results[2].success).toBe(true);
      expect(results[2].intentId).toBe('JK-GHI345678');
    });

    it('should handle mixed success and failure', async () => {
      // Mock fetch to return success, failure, success
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ intentId: 'JK-ABC123456' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({ error: 'Invalid parameters' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ intentId: 'JK-GHI345678' })
        });

      const intents = [
        { params: validParams, signature: 'sig1' },
        { params: validParams, signature: 'sig2' },
        { params: validParams, signature: 'sig3' }
      ];

      const results = await agent.batchSubmit(intents);

      // Verify result array length matches input array length
      expect(results).toHaveLength(3);

      // Verify first submission succeeded
      expect(results[0].success).toBe(true);
      expect(results[0].intentId).toBe('JK-ABC123456');

      // Verify second submission failed
      expect(results[1].success).toBe(false);
      expect(results[1].intentId).toBe('');
      expect(results[1].error).toBeInstanceOf(Error);

      // Verify third submission succeeded
      expect(results[2].success).toBe(true);
      expect(results[2].intentId).toBe('JK-GHI345678');
    });

    it('should handle validation errors', async () => {
      const invalidParams: IntentParams = {
        ...validParams,
        amountIn: '-1000' // Invalid negative amount
      };

      const intents = [
        { params: validParams, signature: 'sig1' },
        { params: invalidParams, signature: 'sig2' },
        { params: validParams, signature: 'sig3' }
      ];

      // Mock fetch for successful submissions
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ intentId: 'JK-ABC123456' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ intentId: 'JK-GHI345678' })
        });

      const results = await agent.batchSubmit(intents);

      // Verify result array length matches input array length
      expect(results).toHaveLength(3);

      // Verify first submission succeeded
      expect(results[0].success).toBe(true);

      // Verify second submission failed with validation error
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeInstanceOf(ValidationError);

      // Verify third submission succeeded
      expect(results[2].success).toBe(true);
    });

    it('should handle all failures', async () => {
      // Mock fetch to always fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      });

      const intents = [
        { params: validParams, signature: 'sig1' },
        { params: validParams, signature: 'sig2' }
      ];

      const results = await agent.batchSubmit(intents);

      // Verify result array length matches input array length
      expect(results).toHaveLength(2);

      // Verify all submissions failed
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeInstanceOf(Error);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeInstanceOf(Error);
    });

    it('should handle empty input array', async () => {
      const results = await agent.batchSubmit([]);

      // Verify empty result array
      expect(results).toHaveLength(0);
    });

    it('should submit intents in parallel', async () => {
      const startTime = Date.now();
      
      // Mock fetch with delays to verify parallel execution
      global.fetch = vi.fn()
        .mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            ok: true,
            json: async () => ({ intentId: 'JK-ABC123456' })
          };
        });

      const intents = [
        { params: validParams, signature: 'sig1' },
        { params: validParams, signature: 'sig2' },
        { params: validParams, signature: 'sig3' }
      ];

      await agent.batchSubmit(intents);
      
      const elapsed = Date.now() - startTime;

      // If executed in parallel, should take ~100ms, not ~300ms
      // Allow some margin for test execution overhead
      expect(elapsed).toBeLessThan(250);
    });
  });

  describe('dryRun', () => {
    it('should validate valid parameters', async () => {
      const result = await agent.dryRun(validParams);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid parameters', async () => {
      const invalidParams: IntentParams = {
        ...validParams,
        amountIn: '-1000'
      };

      const result = await agent.dryRun(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should not make network requests', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      await agent.dryRun(validParams);

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('validatePolicy', () => {
    it('should pass when all policy rules are satisfied', () => {
      const policy: Policy = {
        maxAmountIn: '10000000',
        allowedSourceChains: ['arbitrum', 'optimism'],
        allowedDestinationChains: ['base', 'ethereum'],
        maxDeadlineOffset: 7200000 // 2 hours
      };

      const result = agent.validatePolicy(validParams, policy);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail when amount exceeds maximum', () => {
      const policy: Policy = {
        maxAmountIn: '100000' // Less than validParams.amountIn
      };

      const result = agent.validatePolicy(validParams, policy);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should fail when source chain is not allowed', () => {
      const policy: Policy = {
        allowedSourceChains: ['optimism', 'ethereum'] // arbitrum not included
      };

      const result = agent.validatePolicy(validParams, policy);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not in allowed list');
    });

    it('should fail when destination chain is not allowed', () => {
      const policy: Policy = {
        allowedDestinationChains: ['optimism', 'ethereum'] // base not included
      };

      const result = agent.validatePolicy(validParams, policy);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not in allowed list');
    });

    it('should fail when deadline offset exceeds maximum', () => {
      const policy: Policy = {
        maxDeadlineOffset: 1000 // Very short deadline
      };

      const result = agent.validatePolicy(validParams, policy);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should accumulate multiple policy violations', () => {
      const policy: Policy = {
        maxAmountIn: '100',
        allowedSourceChains: ['ethereum'],
        allowedDestinationChains: ['optimism']
      };

      const result = agent.validatePolicy(validParams, policy);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should pass with empty policy', () => {
      const policy: Policy = {};

      const result = agent.validatePolicy(validParams, policy);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('subscribeToUpdates', () => {
    it('should create a subscription', () => {
      const callback = vi.fn();
      const subscription = agent.subscribeToUpdates(['JK-ABC123456'], callback);

      expect(subscription).toBeDefined();
      expect(subscription.unsubscribe).toBeInstanceOf(Function);

      subscription.unsubscribe();
    });

    it('should stop polling when unsubscribed', async () => {
      const callback = vi.fn();
      
      // Mock fetch to return intent data
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'JK-ABC123456',
          params: validParams,
          status: 'CREATED',
          createdAt: Date.now(),
          executionSteps: []
        })
      });

      const subscription = agent.subscribeToUpdates(['JK-ABC123456'], callback, {
        interval: 100
      });

      // Wait for a few polls
      await new Promise(resolve => setTimeout(resolve, 250));

      const callCountBefore = callback.mock.calls.length;

      // Unsubscribe
      subscription.unsubscribe();

      // Wait to ensure no more polls happen
      await new Promise(resolve => setTimeout(resolve, 250));

      const callCountAfter = callback.mock.calls.length;

      // Callback should not be called after unsubscribe
      expect(callCountAfter).toBe(callCountBefore);
    });
  });
});
